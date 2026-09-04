from dataclasses import dataclass
from io import BytesIO
from pickle import dumps
from typing import Tuple, Optional

import av
from av import CodecContext, Packet
from av.container import OutputContainer

from core.business_logic.types import VideoCodec, VideoContainer
from integration.decoding.messages import MessageTypes, ProcessMessage
from integration.decoding.process.data_processors.processors.interface import MessageProcessor, ProcessorContext
from integration.decoding.types import Frame, PixelFormat, CommandType
from integration.decoding.utils import (pixel_format_to_np_data_type_map, send_to_shared_memory, blocking_retry_send)


@dataclass
class SessionInitInfo:
    container: VideoContainer
    codec: VideoCodec
    pixel_format: PixelFormat
    width_x_height: Tuple[int, int]
    # in bits per second
    bitrate: int
    fps: int


@dataclass
class PacketToFramesAndVideoContext(ProcessorContext):
    container_buffer: BytesIO
    codec_context: CodecContext
    container_context: OutputContainer

class PacketToFramesAndVideo(MessageProcessor):
    @staticmethod
    def _parse_packet(packet: bytes) -> Tuple[int, int, bool, bytes]:
        is_key_frame = bool(packet[0])
        pts = dts = int.from_bytes(packet[1:9], 'little')
        payload = packet[13:]

        return pts, dts, is_key_frame, payload

    def init_session(self, message: ProcessMessage):
        message_data: SessionInitInfo = message.data
        width, height = message_data.width_x_height

        session_context = self._sessions.get(message.session_id)
        if session_context is not None:
            raise Exception(f"Session with id: {message.session_id} already exists")

        container_buffer = BytesIO()
        container_context = av.open(
            container_buffer,
            'w',
            format=message_data.container.name
        )
        stream = container_context.add_stream(message_data.codec.name, rate=message_data.fps)
        stream.width = width
        stream.height = height
        stream.pix_fmt = message_data.pixel_format.value
        stream.bit_rate = message_data.bitrate

        codec_context = CodecContext.create(
            message_data.codec.name,
            'r'
        )

        session_context = PacketToFramesAndVideoContext(
            command_type=CommandType.packet_to_frames_and_video,
            container_buffer=container_buffer,
            container_context=container_context,
            codec_context=codec_context
        )

        self._logger.info(f"{message.session_id}|PtFaV|Init session")
        self._sessions[message.session_id] = session_context

        blocking_retry_send(
            self._client_pipe,
            ProcessMessage(
                type=MessageTypes.ok,
                correlation_id="none",
                # rack and session_id must be equal to original message
                session_id=message.session_id,
                rack=message.rack
            )
        )


    def clear_session(self, session_id: str, rack: Optional[str] = None, auto_clear: Optional[bool] = False):
        self._logger.info(f"{session_id}|PtFaV|Clear session")
        session_data: PacketToFramesAndVideoContext = self._sessions[session_id]

        try:
            session_data.container_context.close()
        except Exception as ex:
            self._logger.warning(f"Exception occurred: {type(ex).__name__}-{ex} while closing video container")

        # somehow file can be closed
        try:
            video_data = session_data.container_buffer.getvalue()
        except ValueError:
            if not auto_clear:
                raise

        try:
            session_data.container_buffer.close()
        except ValueError:
            pass

        del self._sessions[session_id]

        # no send message to client if session is cleared by algorithm
        if not auto_clear:
            send_to_shared_memory(
                self._client_pipe,
                self._client_shared_memory,
                ProcessMessage(
                    type=MessageTypes.data,
                    data=video_data,
                    correlation_id="none",
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

        if session_id is None:
            raise Exception("Session must specified for PtFaV command processing")

        session_context: PacketToFramesAndVideoContext  = self._sessions.get(session_id)

        if session_context is None:
            raise Exception(f"Session with id: {session_id} not exists but processing requested")
        else:
            container_context = session_context.container_context
            codec_context = session_context.codec_context
            stream = container_context.streams[0]

        frames_list = []
        for packet in data:
            pts, dts, keyframe, packet_data = self._parse_packet(packet)
            av_packet = Packet(packet_data)
            av_packet.pts = pts
            av_packet.dts = dts
            av_packet.is_keyframe = keyframe

            frames = codec_context.decode(av_packet)

            for frame in frames:
                img_array = frame.to_ndarray()
                pixel_format = PixelFormat(frame.format.name)

                frames_list.append(
                    dumps(Frame(
                        data=img_array.tobytes(),
                        shape=img_array.shape,
                        pixel_format=pixel_format,
                        data_type=pixel_format_to_np_data_type_map[pixel_format]
                    ))
                )

                del frame
                del img_array

            av_packet.stream = stream
            container_context.mux(av_packet)

            del packet
            del av_packet

        send_to_shared_memory(
            self._client_pipe,
            self._client_shared_memory,
            ProcessMessage(
                type=MessageTypes.data,
                data=frames_list,
                correlation_id="none",
                # rack and session_id must be equal to original message
                session_id=session_id,
                rack=rack
            )
        )