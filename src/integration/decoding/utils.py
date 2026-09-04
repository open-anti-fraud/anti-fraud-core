import asyncio
import multiprocessing
import time
from io import BytesIO
from multiprocessing import Pipe
from multiprocessing.shared_memory import SharedMemory
from pickle import dumps, UnpicklingError
from pickle import loads
from typing import Any

import cv2

from core.business_logic.types import PixelFormat
from integration.decoding.messages import ProcessMessage, MessageTypes
from integration.decoding.types import NumpyDataType
from settings import PIPE_WAIT_TO_RETRY, PIPE_RETRY_COUNT, SH_MEM_RETRY_COUNT, SH_MEM_WAIT_TO_RETRY
from utils.correlation import get_logger

logger = get_logger(__name__)

rotate_to_exif_map = {
    "": 1, # empty rotate metadata set no rotate exif
    "0": 1,
    "90": 6,
    "180": 8,
    "270": 3
}

pixel_format_to_np_data_type_map = {
    PixelFormat.yuv420p: NumpyDataType.uint8,
    PixelFormat.yuv422p: NumpyDataType.uint8,
    PixelFormat.yuvj420p: NumpyDataType.uint8,
    PixelFormat.bayer_bggr8: NumpyDataType.uint8,
    PixelFormat.bayer_gbrg8: NumpyDataType.uint8,
    PixelFormat.bayer_grbg8: NumpyDataType.uint8,
    PixelFormat.bayer_rggb8: NumpyDataType.uint8,
    PixelFormat.bayer_bggr16le: NumpyDataType.uint16,
    PixelFormat.bayer_bggr16be: NumpyDataType.uint16,
    PixelFormat.bayer_gbrg16le: NumpyDataType.uint16,
    PixelFormat.bayer_gbrg16be: NumpyDataType.uint16,
    PixelFormat.bayer_grbg16le: NumpyDataType.uint16,
    PixelFormat.bayer_grbg16be: NumpyDataType.uint16,
    PixelFormat.bayer_rggb16le: NumpyDataType.uint16,
    PixelFormat.bayer_rggb16be: NumpyDataType.uint16,
    PixelFormat.bgr24: NumpyDataType.uint8,
    PixelFormat.bgr8: NumpyDataType.uint8,
    PixelFormat.gbrp: NumpyDataType.uint8,
    PixelFormat.gbrp10be: NumpyDataType.uint16,
    PixelFormat.gbrp10le: NumpyDataType.uint16,
    PixelFormat.gbrp12be: NumpyDataType.uint16,
    PixelFormat.gbrp12le: NumpyDataType.uint16,
    PixelFormat.gbrp14be: NumpyDataType.uint16,
    PixelFormat.gbrp14le: NumpyDataType.uint16,
    PixelFormat.gbrp16be: NumpyDataType.uint16,
    PixelFormat.gbrp16le: NumpyDataType.uint16,
    PixelFormat.gbrpf32be: NumpyDataType.float32,
    PixelFormat.gbrpf32le: NumpyDataType.float32,
    PixelFormat.rgb24: NumpyDataType.uint8,
    PixelFormat.rgb48be: NumpyDataType.uint16,
    PixelFormat.rgb48le: NumpyDataType.uint16,
    PixelFormat.rgb8: NumpyDataType.uint8,
    PixelFormat.rgba: NumpyDataType.uint8,
    PixelFormat.rgba64be: NumpyDataType.uint16,
    PixelFormat.rgba64le: NumpyDataType.uint16,
    PixelFormat.yuyv422: NumpyDataType.uint8,
}


pixel_format_to_cv_conversion = {
    PixelFormat.yuv420p: cv2.COLOR_YUV420P2BGR,
    PixelFormat.yuv422p: cv2.COLOR_YUV2BGR_Y422,
    PixelFormat.yuvj420p: cv2.COLOR_YUV420P2BGR,
    PixelFormat.bayer_bggr8: cv2.COLOR_BAYER_BG2BGR,
    PixelFormat.bayer_gbrg8: cv2.COLOR_BAYER_GB2BGR,
    PixelFormat.bayer_grbg8: cv2.COLOR_BAYER_GR2BGR,
    PixelFormat.bayer_rggb8: cv2.COLOR_BAYER_RG2BGR,
    PixelFormat.bayer_bggr16le: cv2.COLOR_BAYER_BG2BGR,
    PixelFormat.bayer_bggr16be: cv2.COLOR_BAYER_BG2BGR,
    PixelFormat.bayer_gbrg16le: cv2.COLOR_BAYER_GB2BGR,
    PixelFormat.bayer_gbrg16be: cv2.COLOR_BAYER_GB2BGR,
    PixelFormat.bayer_grbg16le: cv2.COLOR_BAYER_GR2BGR,
    PixelFormat.bayer_grbg16be: cv2.COLOR_BAYER_GR2BGR,
    PixelFormat.bayer_rggb16le: cv2.COLOR_BAYER_RG2BGR,
    PixelFormat.bayer_rggb16be: cv2.COLOR_BAYER_RG2BGR,
    PixelFormat.bgr24: cv2.COLOR_BGR2RGB,
    PixelFormat.bgr8: cv2.COLOR_BGR2RGB,

    # gbrp colors already in rgb
    #
    # from pyav docs
    # .. note:: For ``gbrp`` formats, channels are flipped to RGB order.
    #
    PixelFormat.gbrp: None,
    PixelFormat.gbrp10be: None,
    PixelFormat.gbrp10le: None,
    PixelFormat.gbrp12be: None,
    PixelFormat.gbrp12le: None,
    PixelFormat.gbrp14be: None,
    PixelFormat.gbrp14le: None,
    PixelFormat.gbrp16be: None,
    PixelFormat.gbrp16le: None,
    PixelFormat.gbrpf32be: None,
    PixelFormat.gbrpf32le: None,


    PixelFormat.yuyv422: cv2.COLOR_YUV2BGR_YUYV

}

# TODO think about more pythonc way to create async func versions
def send_to_shared_memory(
        signal_pipe: Pipe,
        sh_mem: SharedMemory,
        message: ProcessMessage):

    message_data = dumps(message)

    if len(message_data) > sh_mem.size:
        # clear shared memory signal for send first chunk.
        sh_mem.buf[0] = 0

        message_buf = BytesIO(message_data)
        try:
            while chunk := message_buf.read(sh_mem.size):
                retry_send_on_empty_shared_memory(sh_mem, chunk)

                blocking_retry_send(
                    signal_pipe,
                    ProcessMessage(
                        type=MessageTypes.chunk_shared_memory,
                        correlation_id="none",
                        data=len(chunk),
                        # rack and session_id must be equal to original message
                        session_id=message.session_id,
                        rack=message.rack
                    )
                )

            blocking_retry_send(
                signal_pipe,
                ProcessMessage(
                    type=MessageTypes.chunk_shared_memory_fin,
                    correlation_id="none",
                    session_id=message.session_id,
                    # rack must be equal to original message
                    rack = message.rack
                )
            )
        finally:
            message_buf.close()
    else:
        message_data_size = len(message_data)

        sh_mem.buf[:message_data_size] = message_data

        blocking_retry_send(
            signal_pipe,
            ProcessMessage(
                type=MessageTypes.check_shared_memory,
                correlation_id="none",
                data=message_data_size,
                session_id=message.session_id,
                # rack must be equal to original message
                rack=message.rack
            )
        )

async def async_get_from_shared_memory(
        signal_pipe: Pipe,
        sh_mem: SharedMemory,
        previous_get_message: ProcessMessage) -> ProcessMessage:
    if previous_get_message.type == MessageTypes.check_shared_memory:
        message = loads(sh_mem.buf[:previous_get_message.data])
    elif previous_get_message.type == MessageTypes.chunk_shared_memory:
        result_buffer = BytesIO()

        try:
            while True:
                result_buffer.write(sh_mem.buf[:previous_get_message.data])

                # signal that data is read on manager side
                sh_mem.buf[0] = 0

                previous_get_message = await async_blocking_retry_recv(signal_pipe)

                # stop buffer filling if end chunk signal get
                if previous_get_message.type == MessageTypes.chunk_shared_memory_fin:
                    result_buffer.write(sh_mem.buf[:previous_get_message.data])
                    break

            message = loads(result_buffer.getvalue())
        finally:
            result_buffer.close()
    else:
        raise Exception(f"Expected shared memory operation got {previous_get_message.type.name} type message")

    return message

def retry_send_on_empty_shared_memory(sh_mem: SharedMemory, data: bytes) -> None:
    send_count = 0

    while True:
        if send_count >= SH_MEM_RETRY_COUNT:
            raise BlockingIOError("Too much wait to send next chunk on memory view. Probably client dont read sent chunks")

        send_count += 1
        # check that shared memory is empty
        if sh_mem.buf[0] == 0:
            sh_mem.buf[:len(data)] = data
            return

        time.sleep(SH_MEM_WAIT_TO_RETRY)


def blocking_retry_recv(pipe: Pipe) -> Any:
    send_count = 0
    while True:
        # try to recv chunk if BlockingIOError occurred
        if send_count >= PIPE_RETRY_COUNT:
            raise BlockingIOError("Too much attempts to retry recv on blocked pipe")

        send_count += 1
        try:
            return pipe.recv()
        except (BlockingIOError, EOFError, UnpicklingError) as ex:
            logger.warning(f"Error on pipe sync recv: {type(ex).__name__}-{ex}")
            time.sleep(PIPE_WAIT_TO_RETRY)

def blocking_retry_send(pipe: Pipe, data: Any) -> None:
    send_count = 0
    while True:
        # try to send chunk if BlockingIOError occurred
        if send_count >= PIPE_RETRY_COUNT:
            raise BlockingIOError("Too much attempts to retry send on blocked pipe")

        send_count += 1
        try:
            pipe.send(data)
            return
        except (BlockingIOError, EOFError)as ex:
            logger.warning(f"Error on pipe sync send: {type(ex).__name__}-{ex}")

        time.sleep(PIPE_WAIT_TO_RETRY)

async def async_blocking_retry_recv(pipe: Pipe, session_id = None) -> Any:
    send_count = 0
    while True:
        # try to recv chunk if BlockingIOError occurred
        if send_count >= PIPE_RETRY_COUNT:
            raise BlockingIOError(f"[{session_id}] Too much attempts to retry recv on blocked pipe")

        send_count += 1
        try:
            if pipe.poll():
                return pipe.recv()
        except (BlockingIOError, EOFError, UnpicklingError) as ex:
            logger.warning(f"Error on pipe recv: {type(ex).__name__}-{ex}")

        await asyncio.sleep(PIPE_WAIT_TO_RETRY)

async def async_blocking_retry_send(pipe: Pipe, data: Any) -> None:
    send_count = 0
    while True:
        # try to send chunk if BlockingIOError occurred
        if send_count >= PIPE_RETRY_COUNT:
            raise BlockingIOError("Too much attempts to retry send on blocked pipe")

        send_count += 1
        try:
            pipe.send(data)
            return
        except (BlockingIOError, EOFError, UnpicklingError) as ex:
            logger.warning(f"Error on pipe recv: {type(ex).__name__}-{ex}")
            await asyncio.sleep(PIPE_WAIT_TO_RETRY)


def clear_pipe(pipe: multiprocessing.Pipe) -> int:
    remain_messages = 0
    while pipe.poll():
        try:
            pipe.recv()
            remain_messages += 1
        except (BlockingIOError, EOFError, UnpicklingError) as ex:
            logger.warning(f"Error on clean pipe recv: {type(ex).__name__}-{ex}")
            pass

    return remain_messages