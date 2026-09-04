import asyncio
import datetime
import os
import uuid
from asyncio import StreamWriter
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from base_types import ServiceSettings
from core.background_tasks.content_retention import RetentionWorker
from integration.database import get_session_dependency
from integration.database.managers import LastRetentionResultManager, ServiceSettingsManager
from settings import RETENTION_WORKERS_COUNT, RETENTION_SOCKET_FOLDER, RETENTION_WORKER_SOCKET_NAME
from utils.authentification import internal_base_provider
from utils.correlation import get_logger
from utils.exceptions import SocketAnswerError

router = APIRouter(
    prefix="/retention",
    tags=["retention"],
    dependencies=[Depends(internal_base_provider.controller_dependency)]
)

logger = get_logger(__name__)


@router.get('/metrics')
async def get_retention_metrics(
    session: Session = Depends(get_session_dependency)
):
    res_manager = LastRetentionResultManager(session)
    retention_results = res_manager.get_results()
    return {ret_result.id: {
        "result": ret_result.result,
        "status": ret_result.status,
        "planned_retention_date": ret_result.planned_retention_date,
        "actual_retention_date": ret_result.actual_retention_date,
        "last_modified": ret_result.last_modified
    } for ret_result in retention_results}


@router.get('/retention_time/{aggregate_entity}')
async def get_retention_time(
    aggregate_entity: uuid.UUID,
    session: Session = Depends(get_session_dependency)
):
    settings_manager = ServiceSettingsManager(session)
    last_retention_result_manager = LastRetentionResultManager(session)
    try:
        service_settings = settings_manager.get_setting(aggregate_entity)
    except NoResultFound:
        raise HTTPException(detail="Service settings not found", status_code=404)

    try:
        last_retention_result = last_retention_result_manager.get_result(aggregate_entity)

        if last_retention_result.planned_retention_date is None:
            raise NoResultFound

    except NoResultFound:
        raise HTTPException(detail="Last planned retention date not found", status_code=404)

    retention_settings = ServiceSettings.model_validate(service_settings.settings).retention_settings
    last_retention_date = last_retention_result.planned_retention_date

    return RetentionWorker.calculate_next_cron_time(
        retention_settings.execution_cron,
        last_retention_date
    )


@router.post('/priority_execution/{settings_id}')
async def execute_priority_order(
    settings_id: str,
    priority_date: datetime.datetime,
    execute_as_planned: bool
):
    # Some pydantic funny jokes. If pass only year or random number they convert it to 1970 year date.
    if priority_date is not None and priority_date.year == 1970:
        raise HTTPException(
            detail="Invalid date passed",
            status_code=400
        )

    for index in range(RETENTION_WORKERS_COUNT):
        socket_path = f"/{RETENTION_SOCKET_FOLDER}/{RETENTION_WORKER_SOCKET_NAME.format(index)}"
        if not os.path.exists(socket_path):
            logger.warning("Worker socket: %s don't exist", socket_path)

        writer: Optional[StreamWriter] = None

        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_unix_connection(socket_path),
                timeout=0.2
            )
            writer.write(f"{settings_id};{priority_date};{int(execute_as_planned)}".encode("UTF-8"))
            await asyncio.wait_for(writer.drain(), timeout=0.2)

            # Wait for answer from worker.
            # If answer occurred than worker accepted command else go to next.
            answer = await asyncio.wait_for(reader.read(), timeout=0.2)
            if answer == b'good':
                break
            else:
                # is socket fails read return b'' so raise proper error
                raise SocketAnswerError()

        except SocketAnswerError:
            logger.warning("Socket connection to retention worker failed in process")
        except (TimeoutError, ConnectionResetError, FileNotFoundError, OSError):
            # skip if worker not available
            continue
        finally:
            try:
                if writer is not None:
                    writer.close()
                    await asyncio.wait_for(writer.wait_closed(), timeout=0.5)
            except OSError:
                pass

    else:
        raise HTTPException(
            detail="All workers busy. Wait some time before execute new order",
            status_code=400
        )
