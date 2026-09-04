import asyncio
import logging
import multiprocessing
import secrets
from collections import defaultdict
from contextlib import asynccontextmanager
from multiprocessing.shared_memory import SharedMemory
from typing import Optional, List, Tuple, AsyncGenerator, Any, Callable, Dict

import settings
from core.business_logic.interface.cpu_commands_interface import CPUCommandsInterface
from core.business_logic.types import VideoContainer, VideoCodec
from integration.decoding.messages import ProcessMessage, MessageTypes
from integration.decoding.process.data_processors.processors.packet_to_frames_and_video import SessionInitInfo
from integration.decoding.process.worker import DecodingProcessWorker
from integration.decoding.types import CommandType, PixelFormat
from integration.decoding.utils import (async_blocking_retry_send, async_blocking_retry_recv, clear_pipe,
                                        async_get_from_shared_memory)
from utils.correlation import BASE_LOGGING_FORMAT, get_logger
from utils.exceptions import DecodingProcessCriticalError, FreeProcessObtainTimeout, PipeMessageReceiveTimeout


class DecodingProcessManager:
    """
    Manager MUST be instantiated in code where current active async loop is working otherwise pipe message handling will not work
    """

    def __init__(self, process_count: int):
        self.process_info = {}

        self.free_process_event = asyncio.Event()
        self.sessions: Dict[str, Tuple[asyncio.Lock, int]] = {}

        formatter = logging.Formatter(
            f'{BASE_LOGGING_FORMAT}|%(message)s'
        )
        self.logger = get_logger(
            __name__,
            formatter
        )

        for _ in range(process_count):
            process_info = self._start_process()
            self.process_info[process_info[0].pid] = process_info

    async def _search_and_update_not_busy_process(
            self,
            session_id: Optional[str] = None,
    ) -> Tuple[
        int,
        multiprocessing.Pipe,
        multiprocessing.Pipe,
        SharedMemory,
        asyncio.Event,
        asyncio.Lock
    ]:

        if self.logger.getEffectiveLevel() == logging.DEBUG:
            pid_session_map = defaultdict(int)
            for key, value in self.sessions.items():
                pid_session_map[value[1]] += 1
            self.logger.debug(
                f"Process distribution: %s",
                {k: v for k, v in sorted(pid_session_map.items(), key=lambda item: item[1])}
            )

        # if process with this request session not found or request not linked to session search for any free process
        if session_id is None:
            while True:
                for key, (
                        _, busy_lock, send, recv, transfer_memory, pipe_data_event, _, _) in self.process_info.items():
                    if not busy_lock.locked():
                        # acquire lock that mean process occupied by request
                        await busy_lock.acquire()

                        self.logger.debug("No session| Get free process with pid: %s", key)
                        return key, send, recv, transfer_memory, pipe_data_event, busy_lock

                # if all process busy wait for task finish event
                await self.free_process_event.wait()
                self.free_process_event.clear()

        # if process with this session found wait for process release
        else:
            # only one session request must wait for free process
            # because if no process for this session found two subsequent requests for one session may go to different processes
            session_info = self.sessions.get(session_id)

            if session_info is None:
                search_free_process_lock = asyncio.Lock()
                self.sessions[session_id] = (search_free_process_lock, None)
            else:
                search_free_process_lock = session_info[0]

            await search_free_process_lock.acquire()

            if (pid := self.sessions.get(session_id)[1]) is not None:
                _, busy_lock, send, recv, transfer_memory, pipe_data_event, _, _ = self.process_info[pid]

                await busy_lock.acquire()

                search_free_process_lock.release()

                return pid, send, recv, transfer_memory, pipe_data_event, busy_lock
            else:
                occupied_pids = set([value[1] for key, value in self.sessions.items() if value[1] is not None])
                all_pids = set(self.process_info.keys())

                free_pids = all_pids.difference(occupied_pids)

                if free_pids:
                    most_free_process = free_pids.pop()
                    self.sessions[session_id] = (search_free_process_lock, most_free_process)
                else:
                    pid_session_map = defaultdict(int)
                    for key, value in self.sessions.items():
                        if value[1] is not None:
                            pid_session_map[value[1]] += 1
                    most_free_process = min(pid_session_map.items(), key=lambda item: item[1])[0]

                    self.sessions[session_id] = (search_free_process_lock, most_free_process)

                _, busy_lock, send, recv, transfer_memory, pipe_data_event, _, _ = self.process_info[most_free_process]

                await busy_lock.acquire()
                search_free_process_lock.release()

                self.logger.debug("%s| Get free process with pid: %s", session_id, most_free_process)
                return most_free_process, send, recv, transfer_memory, pipe_data_event, busy_lock

    def _start_process(self) -> Tuple[
        multiprocessing.Process,
        multiprocessing.Lock,
        multiprocessing.Pipe,
        multiprocessing.Pipe,
        SharedMemory,
        asyncio.Event,
        multiprocessing.Pipe,
        multiprocessing.Pipe
    ]:
        recv_d, send_d = multiprocessing.Pipe(duplex=False)
        recv_m, send_m = multiprocessing.Pipe(duplex=False)
        transfer_memory = SharedMemory(create=True, size=settings.SHARED_MEMORY_SIZE_MB)

        # add event for receiving data from pipe
        data_available = asyncio.Event()
        asyncio.get_event_loop().add_reader(recv_m.fileno(), data_available.set)

        busy_lock = asyncio.Lock()

        process = DecodingProcessWorker(
            send_pipe=send_m,
            recv_pipe=recv_d,
            transfer_memory_name=transfer_memory.name
        )
        process.start()

        self.logger.info(
            f"Start new process with pid: {process.pid}. "
            f"PIPE pids: {recv_d.fileno()}, {send_d.fileno()}, {recv_m.fileno()}, {send_m.fileno()}. "
            f"Shared memory: {transfer_memory.name}. "
        )

        return process, busy_lock, send_d, recv_m, transfer_memory, data_available, send_m, recv_d

    def _stop_process(self, pid: int):
        process, busy_lock, send, recv, transfer_memory, pipe_data_event, p_send, p_recv = self.process_info[pid]

        # clear prev process resources
        try:
            asyncio.get_event_loop().remove_reader(recv.fileno())
        except (RuntimeError, OSError):
            # supress exception if loop already stopped. Usually this happens on server shutdown
            # supress OSError if channel already closed.
            pass

        send.close()
        recv.close()
        p_send.close()
        p_recv.close()

        transfer_memory.close()
        transfer_memory.unlink()

        # awake all process pipe waiters
        pipe_data_event.set()

        process.kill()

        self.logger.warning(f"Stop process with pid: {process.pid}.")

    def _restart_process(self, pid: int):
        try:
            self._stop_process(pid)
        except KeyError:
            # skip process restart if process already restarted. For example cascade error caused by process restart.
            return

        # clear process info
        del self.process_info[pid]

        # clear session info witch linked to stopped process
        sessions_to_clear = [item[0] for item in self.sessions.items() if item[1][1] == pid]
        for session_to_clear in sessions_to_clear:
            del self.sessions[session_to_clear]

        # start new process
        process_info = self._start_process()
        self.process_info[process_info[0].pid] = process_info

    @asynccontextmanager
    async def _send_message(self, message: ProcessMessage) -> AsyncGenerator[Tuple[ProcessMessage, multiprocessing.Pipe, SharedMemory]]:
        try:
            pid, send, recv, transfer_memory, pipe_data_event, busy_lock = await asyncio.wait_for(
                self._search_and_update_not_busy_process(message.session_id),
                settings.PROCESS_HUNG_TIMEOUT
            )
        except asyncio.TimeoutError as ex:
            raise FreeProcessObtainTimeout() from ex

        logger_prefix = f"{message.session_id}|{message.rack}"

        # clear pipe before sending message because some error situations or early connection close can cause messages leaved in pipes
        remain_messages = clear_pipe(recv)
        if remain_messages:
            self.logger.warning(
                f"{logger_prefix}|Pipe was dirty: {remain_messages} messages remain after previous session"
            )


        try:
            # clear event because sometimes it set but no message sent from process
            pipe_data_event.clear()
            await async_blocking_retry_send(
                send,
                message
            )

            get_message_count = 0
            while True:
                get_message_count += 1

                if not recv.poll():
                    try:
                        retry_count = 0
                        while True:
                            if retry_count >= 20:
                                raise Exception("Too much retry on broken readability file signal")

                            await asyncio.wait_for(
                                pipe_data_event.wait(),
                                settings.PROCESS_HUNG_TIMEOUT
                            )

                            # skip event false positives when poll if false but pipe_data_event is set
                            if not recv.poll():
                                pipe_data_event.clear()
                                retry_count += 1
                                continue
                            else:
                                break

                    except asyncio.TimeoutError as ex:
                        raise PipeMessageReceiveTimeout() from ex

                try:
                    answ_message = await async_blocking_retry_recv(recv)
                except OSError as ex:
                    raise OSError(f"{logger_prefix}|Process probably closed externally or pipe broke: {type(ex).__name__}-{ex}")

                if isinstance(answ_message, Exception):
                    raise answ_message

                if type(answ_message) != ProcessMessage:
                    raise Exception(f"{logger_prefix}|Get unexpected message type: {type(answ_message).__name__}")

                if message.session_id != answ_message.session_id or message.rack != answ_message.rack:
                    self.logger.warning(
                        f"{logger_prefix}|Got message of type {answ_message.type} "
                        f"from another session: {answ_message.session_id} "
                        f"or another rack: {answ_message.rack}"
                    )

                    if get_message_count >= 5:
                        raise OSError(f"{logger_prefix}|Pipe broke. Too much messages from another sessions.")

                    continue

                break

            yield answ_message, recv, transfer_memory
        except (
            PipeMessageReceiveTimeout,
            asyncio.TimeoutError,
            BlockingIOError,
            BrokenPipeError,
            OSError,
            DecodingProcessCriticalError
        ) as ex:
            # spare error logging
            self.logger.error(f"Restart process: {pid} because of error: {type(ex).__name__}-{ex}")
            # try to fix process by restarting if one error above occurred
            self._restart_process(pid)
            raise
        finally:
            # clear pipe_data event
            pipe_data_event.clear()

            # release lock that mean process free for new requests
            busy_lock.release()

            # set event that some process end its request
            self.free_process_event.set()

    async def send_message_with_result(self, message: ProcessMessage) -> Any:
        async with self._send_message(message) as (answ_message, recv, transfer_memory):
            result = await async_get_from_shared_memory(
                recv,
                transfer_memory,
                answ_message
            )

        return result.data

    async def send_message_without_result(self, message: ProcessMessage):
        async with self._send_message(message) as (answ_message, _, _):
            if answ_message.type != MessageTypes.ok:
                raise Exception(f"Unexpected message type get: {answ_message.type}")

    async def init_session(self, session_id: str, command: CommandType, init_data: Any):
        self.logger.info(f"{session_id}|Init session")

        if self.sessions.get(session_id) is not None:
            raise Exception(f"Session with id: {session_id} already exists")

        async with self._send_message(
            ProcessMessage(
                type=MessageTypes.init_session,
                correlation_id="None",
                command=command,
                data=init_data,
                session_id=session_id
            )
        ) as (message, _, _):
            if message.type != MessageTypes.ok:
                raise Exception(f"Unexpected message type get: {message.type}")

    async def clear_session(self, session_id: str, command: CommandType):
        self.logger.info(f"{session_id}|Clear session")

        # check for session existence
        try:
            pid = self.sessions[session_id][1]
        except KeyError:
            self.logger.warning(f"{session_id}|Skip clear session. No key found")
            return

        # return if no session not linked to process e.d. no process need to clear
        if pid is None:
            return

        try:
            async with self._send_message(
                ProcessMessage(
                    type=MessageTypes.clear,
                    correlation_id="None",
                    command=command,
                    session_id=session_id
                )
            ) as (_, _, _):
                pass
        finally:
            # clear session info on manager side
            del self.sessions[session_id]

    async def clear_session_with_result(self, session_id: str, command: CommandType) -> Optional[bytes]:
        self.logger.info(f"{session_id}| Clear session")

        # check for session existence
        try:
            pid = self.sessions[session_id][1]
        except KeyError:
            self.logger.warning("No session key found. Can't return result")
            return None

        # return if no session not linked to process e.d. no process need to clear
        if pid is None:
            self.logger.warning("Session with no process linked. Can't return result")
            return None

        try:
            async with self._send_message(
                ProcessMessage(
                    type=MessageTypes.clear,
                    correlation_id="None",
                    command=command,
                    session_id=session_id
                )
            ) as (message, recv, transfer_memory):
                result = await async_get_from_shared_memory(
                    recv,
                    transfer_memory,
                    message
                )

            return result.data
        finally:
            # clear session info on manager side
            del self.sessions[session_id]

    def stop_processes(self):
        for key in self.process_info.keys():
            self._stop_process(key)


class DummyCPUCommands(CPUCommandsInterface):
    @asynccontextmanager
    async def decode_video_chunks_to_frames(self, session_id: str) -> AsyncGenerator[Callable]:
        raise NotImplementedError("CPU commands disabled")

    async def get_random_frame_from_video(self, video: bytes) -> bytes:
        raise NotImplementedError("CPU commands disabled")

    async def cast_video_frame_to_image(self, frame_data: bytes) -> bytes:
        raise NotImplementedError("CPU commands disabled")

    @asynccontextmanager
    async def cast_packets_to_frames_and_video(
            self,
            session_id: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
    ) -> AsyncGenerator[Tuple[Callable, List]]:
        raise NotImplementedError("CPU commands disabled")

    @asynccontextmanager
    async def cast_packets_to_video(
            self,
            session_id: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
    ) -> AsyncGenerator[Tuple[Callable, List]]:
        raise NotImplementedError("CPU commands disabled")

class CPUCommands(CPUCommandsInterface):
    def __init__(self, decoding_process_manager: DecodingProcessManager):
        self.decoding_process_manager = decoding_process_manager

    @asynccontextmanager
    async def decode_video_chunks_to_frames(self, session_id: str) -> AsyncGenerator[Callable]:
        async def work_function(chunk: bytes) -> List[bytes]:
            return await self.decoding_process_manager.send_message_with_result(
                ProcessMessage(
                    type=MessageTypes.data,
                    correlation_id="None",
                    command=CommandType.video_to_frames,
                    session_id=session_id,
                    data=chunk
                )
            )

        try:
            yield work_function
        finally:
            await self.decoding_process_manager.clear_session(session_id, CommandType.video_to_frames)

    async def get_random_frame_from_video(self, video: bytes) -> bytes:
        frames = await self.decoding_process_manager.send_message_with_result(
            ProcessMessage(
                type=MessageTypes.data,
                correlation_id="None",
                command=CommandType.video_to_frames,
                data=video
            )
        )
        return secrets.choice(frames)

    async def cast_video_frame_to_image(self, frame_data: bytes) -> bytes:
        return await self.decoding_process_manager.send_message_with_result(
            ProcessMessage(
                type=MessageTypes.data,
                correlation_id="None",
                command=CommandType.frame_to_image,
                data=frame_data
            )
        )

    @asynccontextmanager
    async def cast_packets_to_frames_and_video(
            self,
            session_id: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
    ) -> AsyncGenerator[Tuple[Callable, List]]:
        # fake ref var by list
        data = []

        async def work_function(frames: List[bytes]) -> List[bytes]:
            return await self.decoding_process_manager.send_message_with_result(
                ProcessMessage(
                    type=MessageTypes.data,
                    correlation_id="None",
                    command=CommandType.packet_to_frames_and_video,
                    session_id=session_id,
                    data=frames
                )
            )

        await self.decoding_process_manager.init_session(
            session_id,
            CommandType.packet_to_frames_and_video,
            init_data=SessionInitInfo(
                container,
                codec,
                pixel_format,
                width_x_height,
                bitrate,
                fps
            )
        )

        try:
            yield work_function, data
        finally:
            data.append(
                await self.decoding_process_manager.clear_session_with_result(
                    session_id,
                    CommandType.packet_to_frames_and_video
                )
            )

    @asynccontextmanager
    async def cast_packets_to_video(
            self,
            session_id: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
    ) -> AsyncGenerator[Tuple[Callable, List]]:
        # fake ref var by list
        data = []

        async def work_function(frames: List[bytes]):
            return await self.decoding_process_manager.send_message_without_result(
                ProcessMessage(
                    type=MessageTypes.data,
                    correlation_id="None",
                    command=CommandType.packet_to_video,
                    session_id=session_id,
                    data=frames
                )
            )

        await self.decoding_process_manager.init_session(
            session_id,
            CommandType.packet_to_video,
            init_data=SessionInitInfo(
                container,
                codec,
                pixel_format,
                width_x_height,
                bitrate,
                fps
            )
        )

        try:
            yield work_function, data
        finally:
            data.append(
                await self.decoding_process_manager.clear_session_with_result(
                    session_id,
                    CommandType.packet_to_video,
                )
            )