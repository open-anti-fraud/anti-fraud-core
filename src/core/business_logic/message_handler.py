import asyncio
import logging
from typing import Optional
from uuid import UUID

from aiohttp import ClientConnectorDNSError, ClientConnectorError
from anyio import get_cancelled_exc_class, CancelScope
from starlette.websockets import WebSocketDisconnect
from websockets import ConnectionClosed

import settings
from core.business_logic.content_handle_flows.factory import ContentHandleFlowFactory
from core.business_logic.contexts import MessageHandlingContext
from core.business_logic.interface.cpu_commands_interface import CPUCommandsInterface
from core.business_logic.interface.video_transport_adapter import VideoTransportAdapterInterface
from core.business_logic.types import ContentHandleRequest
from core.managers import EndeavorManagerBL
from integration.database import get_session
from utils.correlation import BASE_LOGGING_FORMAT, get_logger
from utils.exceptions import (UnexpectedMessageType, ComponentPacketDataSendTimeout,
                              ComponentBinaryDataSendTimeout, ComponentMessageSendTimeout,
                              ComponentVideoChunkDataSendTimeout, NoVideoTransferred)
from utils.transport_messages.types import IncomingMessageType


class MessageHandler:
    # specify exception type for equality comparison not inheritance type
    not_to_save_content_exception_types = {
        ComponentMessageSendTimeout,
        ComponentBinaryDataSendTimeout,
        ComponentPacketDataSendTimeout,
        ComponentVideoChunkDataSendTimeout,
        ClientConnectorDNSError,
        ClientConnectorError,
        NoVideoTransferred
    }

    def __init__(self,
                 video_transport_adapter: VideoTransportAdapterInterface,
                 endeavor_id: UUID,
                 aggregate_entity_id: UUID,
                 cpu_commands: CPUCommandsInterface):
        self.video_transport_adapter = video_transport_adapter
        self.context = MessageHandlingContext(
            cpu_commands=cpu_commands,
            endeavor_id=endeavor_id,
            aggregate_entity_id=aggregate_entity_id
        )

        # init logger for websocket connection
        formatter = logging.Formatter(
            f'{BASE_LOGGING_FORMAT}|{endeavor_id}|BusinessLogic|%(message)s'
        )
        self.logger = get_logger(
            __name__,
            formatter
        )

        self.video_transport_adapter.add_bl_logger(self.logger)

    async def save_content(self, only_error_content: Optional[bool] = False):
        orm_session = get_session()

        try:
            end_manager_bl = EndeavorManagerBL(session=orm_session)
            content_to_save = set()

            # fetch error content with its parents if only_error_content == True
            # else fetch all content exclude content with not to save errors and exclude error content if SAVE_ERROR_CONTENT disabled
            for content in self.context.content:
                if (
                    (content.original_exception is None and not only_error_content) or
                    (
                        content.original_exception is not None and
                        type(content.original_exception) not in self.not_to_save_content_exception_types and
                        settings.SAVE_ERROR_CONTENT
                    )
                ):
                    content_to_save.add(content.id)

                    if content.parent_id is not None and only_error_content:
                        content_to_save.add(content.parent_id)

            try:
                # shield content saving from canceling outside if connection is closing on transport level
                with CancelScope(shield=True) as scope:
                    for content in self.context.content:
                        # save all content if only_error_content == False
                        # save only content with id in content_to_save if only_error_content == True
                        if content.id in content_to_save:
                            await end_manager_bl.save_endeavor_content(
                                self.context.endeavor_id,
                                content
                            )

                    # commit only if there is something to save
                    if content_to_save:
                        orm_session.commit()
            except Exception:
                # may cause additional exception on connection close if transport is closing on that moment (very rare)
                orm_session.rollback()
                raise
        finally:
            orm_session.close()

    async def handle_cycle(self):
        try:
            while True:
                try:
                    message_type, message_body = await self.video_transport_adapter.recv_message()

                    if message_type == IncomingMessageType.clear_content:
                        self.logger.info("Clear content")

                        del self.context.content
                        self.context.content = []

                        await self.video_transport_adapter.send_message(
                            message="Clear successfully performed."
                        )
                        continue
                    elif message_type == IncomingMessageType.handle_content:
                        client_message_request = ContentHandleRequest.model_validate(message_body)
                        self.logger.info(
                            f"Handle content {client_message_request.type.name}-{str(client_message_request.id)[:5]}")

                        content_handler = ContentHandleFlowFactory.build(
                            video_transport_adapter=self.video_transport_adapter,
                            context=self.context,
                            request=client_message_request,
                            logger=self.logger
                        )

                        try:
                            content_info = await content_handler.handling_task()
                            if content_info is not None:
                                # append recorded video to list
                                self.context.content.extend(content_info)
                        except BaseExceptionGroup as exg:
                            # unwrap exception group because only one exception at time may occur in current realization
                            raise exg.exceptions[0]
                    elif message_type == IncomingMessageType.save_content:
                        self.logger.info(f"Save content")

                        await self.save_content()
                        saved_content_names = [content.type.name for content in self.context.content]

                        # clear saved video from current list
                        del self.context.content
                        self.context.content = []

                        await self.video_transport_adapter.send_message(
                            message=f"Save successfully performed. Saved content: {saved_content_names}",
                        )

                        continue
                    else:
                        raise UnexpectedMessageType(f"Unexpected message type: {message_type}")
                except (TimeoutError,
                        asyncio.TimeoutError,
                        get_cancelled_exc_class(),
                        WebSocketDisconnect,
                        ConnectionClosed,
                        RuntimeError) as ex:
                    self.logger.debug("Stop message handling cycle: %s-%s", type(ex).__name__, ex)
                    # raise errors to fastapi router level and abort connection
                    raise ex
                except Exception as ex:
                    if type(ex) == UnexpectedMessageType:
                        self.logger.warning(str(ex))
                    else:
                        self.logger.error(
                            "Error occurred on handling client messages: %s-%s",
                            type(ex).__name__,
                            ex,
                            exc_info=True
                        )

                    # try to inform client about error without aborting connection
                    await self.video_transport_adapter.send_exception(ex)
                    continue
        finally:
            if settings.SAVE_ERROR_CONTENT and not settings.DISABLE_DATA_PERSISTENCE:
                # save error content any way
                await self.save_content(only_error_content=True)
