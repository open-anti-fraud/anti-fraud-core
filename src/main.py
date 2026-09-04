import asyncio
import datetime
import multiprocessing
import os
import time
import traceback
import uuid
from asyncio import CancelledError
from contextlib import asynccontextmanager
from functools import partial
from typing import Optional

from anyio import create_task_group
from fastapi import FastAPI, Depends, Header, Query
from miniopy_async import S3Error
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse, FileResponse, Response, PlainTextResponse
from starlette.websockets import WebSocket, WebSocketDisconnect
from uvicorn.config import LOGGING_CONFIG
from uvicorn_worker import UvicornWorker
from websockets import ConnectionClosedOK, ConnectionClosed
from zipstream import AioZipStream

import settings
from base_types import (EndeavorCreate, EndeavorInfo, EndeavorCreationInfo, EndeavorContent, ContentFile,
                        EndeavorPaginatedInfo, MatchingInfo, SortOrder)
from core.business_logic.message_handler import MessageHandler
from core.business_logic.types import ContentType
from core.websocket_utils.connection_handler import WebSocketConnectionHandler
from core.websocket_utils.transport_adapter import WebSocketTransportAdapter
from core.websocket_utils.types import WebSocketContext
from integration.database import get_session, get_session_dependency, engine
from integration.database.managers import EndeavorManager
from integration.decoding.process_manager import DecodingProcessManager, DummyCPUCommands, CPUCommands
from integration.metrics import VrMetrics
from integration.metrics.manager import get_metrics_manager
from integration.object_storage import get_client
from integration.object_storage.models import get_raw_object_by_s3_link, S3Object, get_extension_from_s3_link
from routers import service_settings, retention_control
from utils import extension_to_mime, get_stream_func, setup_logging
from utils.authentification import external_base_provider, internal_base_provider, ws_base_provider
from utils.correlation import get_logger, DEBUG
from utils.exceptions import ExceptionWithCode, InvalidToken, ComponentTimeouts, InvalidSortOrder

setup_logging()
logger = get_logger(__name__)

ws_timeout = (int(os.environ['WEBSOCKET_TIMEOUT']) + 10) // 2

class CustomUvicornWorker(UvicornWorker):
    CONFIG_KWARGS = {
        "log_config": LOGGING_CONFIG,
        "limit_concurrency": int(os.environ['UVICORN_CONCURRENCY']),
        "ws_ping_interval": ws_timeout,
        "ws_ping_timeout": ws_timeout,
        "http": "httptools",
        # no proper work without configuration param below
        "loop": "asyncio"
    }

multiprocessing.set_start_method('spawn')

@asynccontextmanager
async def lifespan(app: FastAPI):
    # init s3 storage
    await get_client()

    if settings.DECODING_ENABLED:
        logger.info(f"Start {settings.DECODING_PROCESS_COUNT} decoding processes.")
        process_manager = DecodingProcessManager(settings.DECODING_PROCESS_COUNT)
        app.state.cpu_commands = CPUCommands(process_manager)
    else:
        logger.info(f"Decoding disabled.")
        app.state.cpu_commands = DummyCPUCommands()

    yield

    logger.info(f"Clearing up application.")

    try:
        # close all pool sessions before service stop
        engine.dispose()
    except Exception as ex:
        logger.warning(f"Error occurred while disposing postgresql engine: {type(ex).__name__}-{ex}")
        pass

    if settings.DECODING_ENABLED:
        # close process pool executor
        process_manager.stop_processes()

    # close WebRTC connections
    coroutines = [pc.close() for pc in peer_connection_set]

    try:
        await asyncio.gather(*coroutines)
    except CancelledError:
        logger.warning("Cancelled error when closing peer connection")
        pass

    peer_connection_set.clear()


app = FastAPI(
    title='video recoding service',
    version=settings.APP_VERSION,
    description='Save video and estimate liveness for it',
    root_path=settings.ROOT_PATH,
    lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(service_settings.router)
app.include_router(retention_control.router)

peer_connection_set = set()
metrics_manager = get_metrics_manager()

if DEBUG:
    import ctypes
    import gc
    import tracemalloc

    tracemalloc.start()

    ROOT = os.path.dirname(__file__)


    @app.get("/mem/trace")
    async def trace():
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')

        result = {"stats": list(map(str, top_stats[:50]))}
        return JSONResponse(
            status_code=200,
            content=result
        )


    @app.get("/mem/collect")
    async def collect():
        gc.collect()
        ctypes.CDLL("libc.so.6").malloc_trim(0)


if settings.ENABLE_MEMORY_TRACE:
    @app.get("/memory-report")
    async def memory_report(token: str = Depends(internal_base_provider.controller_dependency)):
        return FileResponse("dump.bin", filename="dump.bin")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={'detail': exc.detail},
    )


@app.exception_handler(Exception)
async def exception_handler(request: Request, exc: Exception):
    if DEBUG:
        return JSONResponse(status_code=500, content={'traceback': traceback.format_tb(exc.__traceback__)})
    else:
        raise HTTPException(status_code=500)


@app.post("/endeavor")
async def create_endeavor(
        token: str = Depends(external_base_provider.controller_dependency),
        aggregate_entity_id: Optional[uuid.UUID] = Header(default=settings.DEFAULT_AGGREGATE_ENTITY_TOKEN),
        session: Session = Depends(get_session_dependency),
        endeavor_info: Optional[EndeavorCreationInfo] = None
) -> EndeavorCreate:
    external_link = endeavor_info.external_link if endeavor_info else None

    end_manager = EndeavorManager(session=session)
    endeavor = end_manager.save_endeavor(aggregate_entity_id=aggregate_entity_id,
                                         external_link=external_link)
    session.commit()

    return EndeavorCreate(
        endeavor_id=endeavor.id,
        aggregate_entity_id=aggregate_entity_id,
        external_link=external_link
    )


@app.get("/endeavor/{endeavor_id}")
async def get_endeavor(
        endeavor_id: uuid.UUID,
        token: str = Depends(internal_base_provider.controller_dependency),
        session: Session = Depends(get_session_dependency)
) -> EndeavorInfo:
    end_manager = EndeavorManager(session=session)
    try:
        endeavor = end_manager.get_endeavor_with_content(endeavor_id)
    except NoResultFound:
        raise HTTPException(detail="Endeavor not found", status_code=400)

    endeavor_content = []
    for content in endeavor.content:
        files = []
        for s3_link in content.s3_links:
            files.append(ContentFile(
                s3_link=s3_link,
                raw_data_in_base64=None
            ))

        endeavor_content.append(
            EndeavorContent(
                id=content.id,
                files=files,
                type=content.type,
                parent_id=content.parent_id,
                info=content.info,
                exception_info=content.exception_info,
                creation_date=content.creation_date,
                last_modified=content.last_modified
            )
        )

    return EndeavorInfo(
        id=endeavor.id,
        content=endeavor_content,
        external_link=endeavor.external_link,
        creation_date=endeavor.creation_date,
        last_modified=endeavor.last_modified
    )


@app.get("/endeavor")
async def get_endeavors_by_external_link(
        sort_order: SortOrder,
        page: int = Query(ge=1),
        page_size: int = Query(ge=1, le=100),
        external_link: Optional[str] = None,
        start_date: Optional[datetime.datetime] = None,
        end_date: Optional[datetime.datetime] = None,
        token: str = Depends(internal_base_provider.controller_dependency),
        session: Session = Depends(get_session_dependency)
) -> EndeavorPaginatedInfo:
    end_manager = EndeavorManager(session=session)

    try:
        total_count, endeavor_list = end_manager.get_paginated_endeavor_with_content_by_external_id(
            sort_order,
            page,
            page_size,
            external_link,
            start_date,
            end_date,
        )
    except InvalidSortOrder:
        raise HTTPException(status_code=400, detail="Invalid sort order")

    result_list = []

    for endeavor in endeavor_list:
        endeavor_content = []
        for content in endeavor.content:
            files = []
            for s3_link in content.s3_links:
                files.append(ContentFile(
                    s3_link=s3_link,
                    raw_data_in_base64=None
                ))

            endeavor_content.append(
                EndeavorContent(
                    id=content.id,
                    files=files,
                    type=content.type,
                    parent_id=content.parent_id,
                    info=content.info,
                    exception_info=content.exception_info,
                    creation_date=content.creation_date,
                    last_modified=content.last_modified
                )
            )

        result_list.append(EndeavorInfo(
            id=endeavor.id,
            content=endeavor_content,
            external_link=endeavor.external_link,
            creation_date=endeavor.creation_date,
            last_modified=endeavor.last_modified
        ))

    return EndeavorPaginatedInfo(
        page=page,
        page_size=page_size,
        total_count=total_count,
        endeavor_list=result_list
    )

@app.post("/add_verification_frame_info/{endeavor_id}")
async def add_verification_frame_info(
    endeavor_id: uuid.UUID,
    matching_info: MatchingInfo,
    token: str = Depends(external_base_provider.controller_dependency),
    session: Session = Depends(get_session_dependency)
):
    end_manager = EndeavorManager(session=session)

    # check endeavor existence
    try:
        end_manager.get_endeavor_with_content(endeavor_id)
    except NoResultFound:
        raise HTTPException(detail="Endeavor not found", status_code=400)

    content_type = ContentType.verification_frame
    content_id = uuid.uuid4()

    end_manager.add_endeavor_content(
        content_id=content_id,
        endeavor_id=endeavor_id,
        parent_id=None,
        content_type=content_type.value,
        s3_links=[],
        info={"verification_info": matching_info.model_dump()},
        exception_info=None
    )
    session.commit()


@app.get("/endeavor_zip/{endeavor_id}")
async def get_endeavor_zip(
        endeavor_id: uuid.UUID,
        token: str = Depends(internal_base_provider.controller_dependency),
        session: Session = Depends(get_session_dependency)
) -> StreamingResponse:
    files_to_zip = []
    end_manager = EndeavorManager(session=session)
    try:
        endeavor = end_manager.get_endeavor_with_content(endeavor_id)
    except NoResultFound:
        raise HTTPException(detail="Endeavor not found", status_code=400)

    endeavor_content = []
    for content in endeavor.content:
        files = []
        for i, s3_link in enumerate(content.s3_links):
            try:
                content_data = await get_raw_object_by_s3_link(s3_link)
                files_to_zip.append(
                    {'stream': get_stream_func(content_data,  50_000)(), 'name': f'{content.id}-{i}.{get_extension_from_s3_link(s3_link)}'},
                )
            except Exception as ex:
                logger.warning("Error while downloading content with id: %s. Error: %s-%s", str(content.id), type(ex).__name__, str(ex))

            files.append(ContentFile(
                s3_link=s3_link,
                raw_data_in_base64=None
            ))

        endeavor_content.append(
            EndeavorContent(
                id=content.id,
                files=files,
                type=content.type,
                parent_id=content.parent_id,
                info=content.info,
                exception_info=content.exception_info,
                creation_date=content.creation_date,
                last_modified=content.last_modified
            )
        )

    endeavor_info = EndeavorInfo(
        id=endeavor.id,
        content=endeavor_content,
        external_link=endeavor.external_link,
        creation_date=endeavor.creation_date,
        last_modified=endeavor.last_modified
    )

    files_to_zip.append({'stream': get_stream_func(endeavor_info.model_dump_json().encode('utf-8'),  1_000)(), 'name': "endeavor.json"})

    z = AioZipStream(
        files_to_zip
    )

    return StreamingResponse(
        z.stream(),
        headers={'Content-Disposition': f'attachment; filename="content_{endeavor_id}.zip"'},
        media_type="application/zip"
    )


@app.get('/get_content/{s3_link}')
async def get_content(
        s3_link: str,
        token: str = Depends(internal_base_provider.controller_dependency)
) -> StreamingResponse:
    try:
        content = await S3Object.get(s3_link)
    except S3Error as ex:
        if ex.code == "NoSuchKey":
            raise HTTPException(detail=f"Content not found", status_code=400)
        else:
            raise ex
    except ExceptionWithCode as ex:
        raise ex.to_http_exception()

    file_extension = content.name.split('.')[-1]
    return StreamingResponse(
        content=content.data,
        media_type=f"{extension_to_mime.get(file_extension, "application")}/{file_extension}",
        headers={
            "Content-Length": str(content.data.getbuffer().nbytes),
            "Content-Disposition": f"attachment; filename = {content.name}"
        }
    )


async def websocket_endpoint(
        endeavor_id: uuid.UUID,
        websocket: WebSocket
):
    logger_prefix = f"{endeavor_id}|"
    # before accept preparations

    if endeavor_id != settings.NULL_UUID:
        # get db session
        session = get_session()
        try:
            # validate endeavor id
            try:
                aggregate_entity_id = EndeavorManager(session).get_endeavor(endeavor_id=endeavor_id).aggregate_entity_id
            except NoResultFound:
                session.close()
                logger.info(f"{logger_prefix} Endeavor not found")

                # return 400 if endeavor id is not found (https://www.starlette.io/websockets/#accepting-the-connection)
                await websocket.send_denial_response(Response(status_code=400))
                return
        except Exception:
            session.close()
            await websocket.send_denial_response(Response(status_code=500))
            raise
        finally:
            session.close()
    else:
        session = None
        aggregate_entity_id = settings.NULL_UUID

    connection_start_time = time.time()
    try:
        await websocket.accept()

        metrics_manager.update_gauge_metric(VrMetrics.WebsocketConnectionCount.value, 1)

        try:
            ws_base_provider.check_token(
                await asyncio.wait_for(websocket.receive_text(), timeout=10)
            )
        except asyncio.TimeoutError:
            logger.warning(f"{logger_prefix} Token receive timeout")
            await websocket.close(code=3008)
            return
        except InvalidToken:
            logger.info(f"{logger_prefix} Invalid token passed")
            await websocket.close(code=3003)
            return

        context = WebSocketContext(
            cpu_commands=websocket.app.state.cpu_commands,
            websocket=websocket,
            endeavor_id=endeavor_id
        )
        connection_handler = WebSocketConnectionHandler(
            context=context
        )
        transport_adapter = WebSocketTransportAdapter(
            websocket_connection=websocket,
            websocket_connection_handler=connection_handler
        )

        bl_message_handler = MessageHandler(
            video_transport_adapter=transport_adapter,
            endeavor_id=endeavor_id,
            aggregate_entity_id=aggregate_entity_id,
            cpu_commands=websocket.app.state.cpu_commands
        )

        # anyio task group for proper task ending and error handling
        async with create_task_group() as tg:
            connection_handler.add_transport_adapter(transport_adapter)
            # start bl async task for handling messages through transport adapter
            tg.start_soon(bl_message_handler.handle_cycle)
            await connection_handler.handle()

    except* ComponentTimeouts as ex:
        # unpack exception group
        exception = ex.exceptions[0]

        logger.warning(f"{logger_prefix}Client not send any data. Exception: {type(exception).__name__}")
        await websocket.close(code=3008)
    except* RuntimeError as ex:
        #unpack exception group
        exception = ex.exceptions[0]

        if isinstance(exception, RuntimeError) and str(exception).startswith("Unexpected ASGI message"):
            logger.warning(f"Unexpected socket state: {exception}")
        else:
            raise

    except* (ConnectionClosed, WebSocketDisconnect) as ex:
        #unpack exception group
        exception = ex.exceptions[0]

        # warning on unexpected connection close
        if not (
            (type(exception) is WebSocketDisconnect and (exception.code == 1000 or exception.code == 1001)) or
            type(exception) is ConnectionClosedOK
        ):
            logger.warning(f"Unexpected connection close: {exception}")
    except* Exception:
        await websocket.close(code=1011)
        raise
    finally:
        metrics_manager.update_average_metric(
            VrMetrics.WebsocketAverageConnectionDuration.value,
            time.time() - connection_start_time
        )
        metrics_manager.update_gauge_metric(VrMetrics.WebsocketConnectionCount.value, -1)
        if session is not None:
            session.close()


if settings.DISABLE_DATA_PERSISTENCE:
    app.websocket("/ws")(partial(websocket_endpoint, settings.NULL_UUID))
else:
    app.websocket("/ws/{endeavor_id}")(websocket_endpoint)


@app.get('/metrics', response_class=PlainTextResponse)
async def get_metrics():
    return metrics_manager.form_prometheus_format()


# @app.delete("/endeavor/{endeavor_id}")
# async def delete_endeavor(endeavor_id: uuid.UUID,
#                           token: str = Depends(validate_token),
#                           session: Session = Depends(get_session_dependency)):
#     end_manager = EndeavorManager(session=session)
#
#     try:
#         end_manager.delete_endeavor(endeavor_id)
#     except UnmappedInstanceError:
#         # TODO find more suitable exception
#         raise HTTPException(detail="Endeavor not found", status_code=400)
#
#     session.commit()
