import secrets
import tempfile
from dataclasses import dataclass
from io import BytesIO
from pickle import dumps
from typing import Optional

import av
from PIL import ExifTags
from av import CodecContext
from pymediainfo import MediaInfo

import settings
from integration.decoding.messages import MessageTypes, ProcessMessage
from integration.decoding.process.data_processors.processors.interface import MessageProcessor, ProcessorContext
from integration.decoding.types import Frame, PixelFormat, CommandType
from integration.decoding.utils import (rotate_to_exif_map,
                                        pixel_format_to_np_data_type_map, send_to_shared_memory, blocking_retry_send)


@dataclass
class VideoToFramesContext(ProcessorContext):
    video_data: bytes
    codec_context: CodecContext
    packet_processed: int

class VideoToFramesProcessor(MessageProcessor):
    def clear_session(self, session_id: str, rack: Optional[str] = None, auto_clear: Optional[bool] = False):
        self._logger.info(f"{session_id}|VtF|Clear session")
        try:
            del self._sessions[session_id]
        except KeyError:
            # skip if session already cleared. For example process restarted.
            pass

        # no send message to client if session is cleared by algorithm
        if not auto_clear:
            blocking_retry_send(
                self._client_pipe,
                ProcessMessage(
                    type=MessageTypes.ok,
                    correlation_id=correlation_id.get(),
                    # rack and session_id must be equal to original message
                    session_id=session_id,
                    rack=rack
                )
            )

    @MessageProcessor.check_message_type
    def process_message(self, message: ProcessMessage):
        session_id = message.session_id
        rack = message.rack
        data = message.data
        session_context = None
        # set rotate value to None
        rotate = None
        random_choose = False

        if session_id is not None:
            session_context = self._sessions.get(session_id)

            if session_context is None:
                segment_buffer = BytesIO(data)
                input_container = av.open(
                    segment_buffer
                )
                codec_context = CodecContext.create(
                    input_container.streams.video[0].codec_context.name,
                    'r'
                )
                packet_processed = 0

                session_context = VideoToFramesContext(
                    command_type=CommandType.video_to_frames,
                    video_data=data,
                    codec_context=codec_context,
                    packet_processed=packet_processed
                )
                decode_function = lambda _packet: codec_context.decode(_packet)

                self._logger.info(f"{message.session_id}|VtF|Init session")
                self._sessions[session_id] = session_context
            else:
                session_context.video_data += data

                segment_buffer = BytesIO(session_context.video_data)
                input_container = av.open(
                    segment_buffer
                )
                packet_processed = session_context.packet_processed
                decode_function = lambda _packet: session_context.codec_context.decode(_packet)
        else:
            random_choose = True
            # get mp4 rotate tag if exists
            with tempfile.NamedTemporaryFile(mode='wb') as temp_video:
                temp_video.write(data)

                media_info = MediaInfo.parse(temp_video.name)
                for track in media_info.tracks:
                    if track.track_type == "Video" and track.rotation:
                        rotate = track.rotation.split('.')[0]

            segment_buffer = BytesIO(data)
            input_container = av.open(
                segment_buffer
            )
            decode_function = lambda _packet: _packet.decode()
            packet_processed = 0

            self._logger.info(f"{message.session_id}|VtF|Handle no session message")

        packets = input_container.demux()
        decoded_images = []

        try:
            for i, packet in enumerate(packets):
                # input_container.demux() object not support slicing so skip processed packets like this.
                if i < packet_processed:
                    del packet
                    continue

                # skip packet that close codec_context
                if packet.dts is None:
                    del packet
                    continue

                frames = decode_function(packet)

                packet_processed += 1

                for frame in frames:
                    img_array = frame.to_ndarray()
                    pixel_format = PixelFormat(frame.format.name)

                    # set exif rotate tag to image if rotate tag exists in video
                    exif = None
                    if rotate is not None:
                        exif = {ExifTags.Base.Orientation: rotate_to_exif_map[rotate]}

                    decoded_images.append(
                        dumps(Frame(
                            data=img_array.tobytes(),
                            shape=img_array.shape,
                            pixel_format=pixel_format,
                            data_type=pixel_format_to_np_data_type_map[pixel_format],
                            exif=exif
                        ))
                    )
                    del frame
                    del img_array

                del packet

            if session_context is not None:
                session_context.packet_processed = packet_processed

            if random_choose:
                choose = [secrets.choice(decoded_images)]
                del decoded_images
            else:
                choose = decoded_images

            send_to_shared_memory(
                self._client_pipe,
                self._client_shared_memory,
                ProcessMessage(
                    type=MessageTypes.data,
                    data=choose,
                    correlation_id=correlation_id.get(),
                    # rack and session_id must be equal to original message
                    session_id=session_id,
                    rack=rack
                )
            )
        finally:
            segment_buffer.close()
            input_container.close()
            del input_container