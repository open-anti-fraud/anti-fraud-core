import asyncio
import datetime
import logging
import os
import select
import signal
import sys
import time
import traceback
import uuid
from collections import defaultdict
from contextlib import contextmanager
from enum import Enum
from functools import partial
from socket import socket
from typing import Dict, List, Optional, Sequence, Tuple

from cron_converter import Cron
from miniopy_async import Minio
from miniopy_async.deleteobjects import DeleteObject
from sqlalchemy import text, create_engine, QueuePool
from sqlalchemy.exc import NoResultFound, DBAPIError
from sqlalchemy.orm import Session, sessionmaker

from base_types import ServiceSettings, RetentionData, RetentionExceptionInfo
from core.background_tasks.utils import RedisLockManager
from core.utils import BatchedList
from integration.database import DATABASE_URL, dumps
from integration.database.managers import ServiceSettingsManager, LastRetentionResultManager
from integration.database.models import LastRetentionResultModel
from integration.object_storage import MinioClient
from settings import (RETENTION_CHECK_FREQUENCY, RETENTION_BATCH_SIZE, RETENTION_DEBUG,
                      RETENTION_S3_BATCH_PAUSE, RETENTION_GLOBAL_BATCH_PAUSE)
from utils.correlation import BASE_LOGGING_FORMAT, get_logger, LOGGING_FORMAT, LOGGING_LEVEL

from utils.exceptions import SocketMessageParseError


class NoRetentionResultException(Exception):
    pass


class Operation(str, Enum):
    subdivision = "__sub__"
    addition = "__add__"


class RetentionWorker:
    def __init__(self, command_socket: socket):
        self.command_socket = command_socket
        self.logger = None
        self.engine = None
        self.session_local = None
        super().__init__()


    def _init_engine(self):
        self.engine = create_engine(
            DATABASE_URL,
            future=True,
            pool_pre_ping=True,
            poolclass=QueuePool,
            json_serializer=dumps,
            pool_size=2,
            max_overflow=8
        )
        self.session_local = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def _init_logging(self):
        logging.basicConfig(format=LOGGING_FORMAT, level=LOGGING_LEVEL)

        formatter = logging.Formatter(
            f'{BASE_LOGGING_FORMAT}|RP|PID: {os.getpid()}|%(message)s'
        )

        self.logger = get_logger(
            __name__,
            formatter
        )

    def _handle_signal(self, signum, frame):
        self.logger.info("Got %s, cleaning up...", signal.Signals(signum).name)
        self.engine.dispose()
        self.command_socket.close()
        # socket file remains, but it stored in EmptyDir volume so not critical
        sys.exit(0)

    @staticmethod
    def _parse_socket_command(data: bytes) -> Tuple[str, datetime.datetime, bool]:
        try:
            settings_id, ret_date, execute_as_planned = data.decode("UTF-8").split(";")
            ret_date = datetime.datetime.fromisoformat(ret_date)
            execute_as_planned = bool(int(execute_as_planned))

        except (UnicodeDecodeError, ValueError):
            raise SocketMessageParseError()

        return settings_id, ret_date, execute_as_planned

    def get_session(self) -> Session:
        return self.session_local()

    @contextmanager
    def session_context_manager(self):
        session = self.get_session()
        try:
            yield session
        finally:
            session.close()

    @staticmethod
    def get_client() -> Minio:
        return MinioClient().s3_client

    def run(self):
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGHUP, self._handle_signal)

        self._init_engine()
        self._init_logging()
        asyncio.run(self.content_retention_task())

    async def content_retention_task(self):
        self.logger.info(f"Start retention process. Check period - {RETENTION_CHECK_FREQUENCY} seconds.")
        # counter for not trash all logs if some error occurred with queue
        exception_out_count = 0

        while True:
            # try except hell

            # Outer try needed for infinity clearing cycle works.
            # Even if database is down process must continue trying to clear
            try:
                # sync execution time between retention processes because
                # it can start in different time and sql lock will not work
                # if some priority order arrive through queue waiting interrupted
                try:
                    # Wait connection from socket execute priority order is someone connected
                    # Timeout in synchronised_time seconds to execute planned retention
                    rlist, _, _ = select.select(
                        [self.command_socket], [], [],
                        self.synchronised_time(
                            datetime.datetime.now(datetime.UTC),
                            RETENTION_CHECK_FREQUENCY
                        )
                    )

                    # select.select can wake up even if no connection on socket available.
                    # check time for shield this behaviour
                    time_to_next_check = self.synchronised_time(
                        datetime.datetime.now(datetime.UTC),
                        RETENTION_CHECK_FREQUENCY
                    )

                    if rlist:
                        conn, _ = self.command_socket.accept()
                        try:
                            (priority_value,
                             priority_date,
                             execute_as_planned) = self._parse_socket_command(conn.recv(1024))
                            # send message back to server for notice him that command is acquired
                            conn.send(b'good')

                            priority_execution = True
                        except SocketMessageParseError:
                            self.logger.warning("Command parse error")
                            continue
                        except BrokenPipeError:
                            # if server connection closed that means command is outdated so skip it
                            self.logger.warning("Skip outdated server command")
                            continue
                        finally:
                            conn.close()
                    elif time_to_next_check == 0 or time_to_next_check >= RETENTION_CHECK_FREQUENCY - 3:
                        priority_value, priority_date, execute_as_planned = None, None, False
                        priority_execution = False
                    else:
                        self.logger.warning("False I|O readiness occurred, skip wake up.")
                        continue
                except Exception:
                    if exception_out_count >= 5:
                        time.sleep(120)
                        raise

                    exception_out_count += 1
                    raise

                self.logger.info(f"Retention wake up.")

                exception_out_count = 0
                now = datetime.datetime.now(datetime.UTC)
                settings = []

                # prepare data for retention algorithm
                with self.session_context_manager() as session:
                    try:
                        if not priority_execution or priority_value == 'all':
                            settings = ServiceSettingsManager(session).get_all_settings()
                        else:
                            try:
                                setting_id = uuid.UUID(priority_value)
                                settings = [
                                    ServiceSettingsManager(session).get_setting(setting_id)
                                ]
                            except (NoResultFound, ValueError):
                                self.logger.warning(f"Incorrect setting id used %s.", priority_value)
                                continue
                    except Exception as ex:
                        self.logger.error(
                            "Exception occurred while preparing to retention policy-%s", ex, exc_info=True
                        )
                        continue

                for setting in settings:
                    lock = RedisLockManager(str(setting.id))
                    self.logger.info(f"Start retention procedure for {setting.id}.")

                    start_time = time.time()

                    current_retention_result: Optional[RetentionData] = None
                    current_retention_status: Optional[LastRetentionResultModel.Status] = None
                    current_planned_retention_date: Optional[datetime.datetime] = None
                    current_retention_date: Optional[datetime.datetime] = None

                    try:
                        acquire_result = lock.acquire_lock()
                        if not acquire_result:
                            self.logger.info("Retention already performed by another process, skip")
                            continue

                        service_settings = ServiceSettings.model_validate(setting.settings).retention_settings

                        # calculate time borders
                        if priority_execution:
                            if execute_as_planned:
                                retention_execute_time = priority_date
                                retention_border = self.calculate_timedelta(
                                    priority_date,
                                    service_settings.content_retention_dimension,
                                    service_settings.content_retention
                                )
                            else:
                                retention_execute_time = None
                                retention_border = priority_date
                        else:
                            # handle last retention result only if execution is planned
                            with self.session_context_manager() as session:
                                try:
                                    last_retention_result = LastRetentionResultManager(session).get_result(setting.id)

                                    # If exception occurred on previous steps, or no retention result was in base
                                    # result wrote without planned_retention_date.
                                    # Fill planned_retention_date by NoResultFound error raise
                                    if last_retention_result.planned_retention_date is None:
                                        raise NoResultFound

                                except NoResultFound:
                                    self.logger.info("No last retention result found, set current date")

                                    # skip retention and set date to now for align cron execution if not previous result saved
                                    current_retention_result = RetentionData()
                                    current_planned_retention_date = now
                                    continue

                            last_planned_execution_date = last_retention_result.planned_retention_date

                            # skip only if not priority execution
                            if not service_settings.enable:
                                self.logger.info("Retention for %s disabled", setting.id)
                                continue

                            retention_execute_time = self.calculate_next_cron_time(
                                service_settings.execution_cron,
                                last_planned_execution_date
                            )
                            retention_border = self.calculate_timedelta(
                                    retention_execute_time,
                                    service_settings.content_retention_dimension,
                                    service_settings.content_retention
                            )

                        if RETENTION_DEBUG:
                            self.logger.info("Debug retention execution for %s.", setting.id)
                        elif priority_execution:
                            self.logger.info("Execute retention out of order for %s.", setting.id)
                        # Skip execution if current time before planned execution time.
                        elif (
                            now < retention_execute_time
                        ):
                            self.logger.info(
                                "Skip retention execution for %s. Estimated execution time is %s",
                                setting.id,
                                retention_execute_time
                            )
                            continue

                        # update last retention result to processing status
                        with self.session_context_manager() as session:
                            LastRetentionResultManager(session).save_result(
                                setting.id,
                                status=LastRetentionResultModel.Status.processing
                            )
                            session.commit()

                        skip_lock = await self.perform_retention(
                            lock,
                            setting.id,
                            retention_border
                        )

                        if not skip_lock:
                            self.logger.info(f"Clear endeavors linked to {setting.id} older than {retention_border}")
                            current_retention_result = RetentionData()
                            current_retention_date = retention_border
                            current_planned_retention_date = retention_execute_time
                            current_retention_status = LastRetentionResultModel.Status.success


                    except Exception as ex:
                        if isinstance(ex, DBAPIError) and ex.connection_invalidated:
                            self.logger.error("Connection to database invalidated-%s", ex, exc_info=True)
                        else:
                            # save result with previous retention date
                            current_retention_result = RetentionData(
                                exception=RetentionExceptionInfo(
                                    type=type(ex).__name__,
                                    message=str(ex),
                                    traceback='\n'.join(traceback.format_tb(ex.__traceback__)),
                                )
                            )
                            current_retention_status = LastRetentionResultModel.Status.error
                            self.logger.error(
                                "Exception occurred while performing retention policy-%s", ex, exc_info=True
                            )
                    finally:
                        self.logger.info(
                            f"Stop retention procedure for {setting.id}. Execution time: {time.time() - start_time}"
                        )

                        try:
                            # save retention result for setting
                            # save only final result or result with error.
                            # if current retention locked skip result saving
                            if current_retention_result is not None:
                                with self.session_context_manager() as session:
                                    res_manager = LastRetentionResultManager(session)
                                    res_manager.save_result(
                                        setting.id,
                                        current_retention_status,
                                        current_retention_result,
                                        current_planned_retention_date,
                                        current_retention_date
                                    )
                                    session.commit()
                        finally:
                            lock.release_lock()

            except Exception as ex:
                self.logger.error(
                    "Non handled execution occurred while performing retention policy-%s", ex, exc_info=True
                )
                continue


    async def perform_retention(
            self,
            lock: RedisLockManager,
            aggregate_entity_id: uuid.UUID,
            retention_date: datetime.datetime
    ) -> bool:
        while True:
            with self.session_context_manager() as session:
                # try to acquire lock if extend failed. For example if lock ttl exceeded or redis restarted.
                result = lock.check_and_extend_lock() or lock.acquire_lock()
                # if lock reacquired by another process skip current retention
                if not result:
                    self.logger.warning("Retention interrupted by another process")
                    return True

                # TODO probably use composite index CREATE INDEX idx_aggregate_creation ON endeavor (aggregate_entity_id, creation_date); for faster search
                stmt = text("""
                    SELECT
                        ende.id,
                        ende.aggregate_entity_id,
                        ende.creation_date,
                        ende.lr_s3_link,
                        ende.la_s3_link,
                        ende.lr_s3_ref_image_link,
                        ende.la_s3_ref_image_link,
                        ende.lr_s3_ref_template_bsm_link,
                        ende.la_s3_ref_template_bsm_link,
                        array_agg(cnt.id) AS content_links,
                        array_agg(s3_link) AS all_links
                    FROM (
                        SELECT id, aggregate_entity_id, creation_date,
                               lr_s3_link, la_s3_link,
                               lr_s3_ref_image_link, la_s3_ref_image_link,
                               lr_s3_ref_template_bsm_link, la_s3_ref_template_bsm_link
                        FROM endeavor
                        WHERE aggregate_entity_id = :agg_id AND creation_date < :retention_date
                        ORDER BY creation_date
                        LIMIT :batch_cnt
                    ) AS ende
                    LEFT JOIN endeavor_content AS cnt
                        ON cnt.endeavor_id = ende.id
                    LEFT JOIN LATERAL unnest(cnt.s3_links) AS s3_link ON TRUE
                    GROUP BY
                        ende.id,
                        ende.aggregate_entity_id,
                        ende.creation_date,
                        ende.lr_s3_link,
                        ende.la_s3_link,
                        ende.lr_s3_ref_image_link,
                        ende.la_s3_ref_image_link,
                        ende.lr_s3_ref_template_bsm_link,
                        ende.la_s3_ref_template_bsm_link;
                """)

                result = session.execute(
                    stmt,{
                        "agg_id": aggregate_entity_id,
                        "retention_date": retention_date,
                        "batch_cnt": RETENTION_BATCH_SIZE
                    }
                ).all()

                if len(result) == 0:
                    break

                s3_links_batch = defaultdict(
                    partial(BatchedList, 1000)
                )
                endeavor_ids_batch = []
                content_ids_batch = []

                for row in result:
                    links = [
                        row.lr_s3_link,
                        row.la_s3_link,
                        row.lr_s3_ref_image_link,
                        row.la_s3_ref_image_link,
                        row.lr_s3_ref_template_bsm_link,
                        row.la_s3_ref_template_bsm_link,
                        *row.all_links
                    ]

                    for link in links:
                        if link is None:
                            continue
                        else:
                            bucket, file = link.split(':')

                        s3_links_batch[bucket].append(
                            DeleteObject(file)
                        )

                    endeavor_ids_batch.append(row.id)
                    # endeavor can be without content, so filter links before extend
                    content_ids_batch.extend(filter(None, row.content_links))

                await self.process_batch(session, s3_links_batch, endeavor_ids_batch, content_ids_batch)

            # sleep some time to flatten load of deletion process if RETENTION_BATCH_PAUSE above zero
            time.sleep(RETENTION_GLOBAL_BATCH_PAUSE)

        return False


    async def process_batch(
            self,
            session: Session,
            s3_links: Dict[str, List[str]],
            endeavor_ids: list[uuid.UUID],
            content_ids: list[uuid.UUID],
    ):
        s3_client = self.get_client()
        for bucket, batched_list in s3_links.items():
            self.logger.info(f"Clear bucket: {bucket}")
            total_c = 0
            del_t = time.time()
            # some genius write this api so only 1000 objects maximum can be deleted at one time other will be ignored
            for links_batch in batched_list:
                total_c += len(links_batch)
                errors = await s3_client.remove_objects(bucket, links_batch)

                # sleap some time before process next batch to reduce I/O load
                time.sleep(RETENTION_S3_BATCH_PAUSE)

                if len(errors):
                    raise errors[0]

            self.logger.info(f"Clearing end: {time.time() - del_t}, entities deleted: {total_c}")

        if content_ids:
            self.logger.info(f"Clear content")
            content_time = time.time()

            # delete content entity separate because it's faster than using cascade
            # create session template table for content_ids for postgresql index using
            session.execute(
                text("""
                    CREATE TEMP TABLE IF NOT EXISTS tmp_cont_ids (
                        id UUID PRIMARY KEY
                    ) ON COMMIT DELETE ROWS;
                """)
            )

            session.execute(
                text("""
                    INSERT INTO tmp_cont_ids (id)
                    SELECT UNNEST(:ids)
                    ON CONFLICT (id) DO NOTHING
                """),
                {"ids": content_ids}
            )

            session.execute(
                text("""
                    DELETE FROM endeavor_content e
                    USING tmp_cont_ids t
                    WHERE e.id = t.id
                """)
            )
            self.logger.info(f"Content clear end: {time.time() - content_time}")
        else:
            self.logger.info("No content found in batch")

        self.logger.info(f"Clear endeavor")
        endeavor_time = time.time()

        # delete endeavor
        # create session template table for endeavor_ids for postgresql index using
        session.execute(
            text("""
                CREATE TEMP TABLE IF NOT EXISTS tmp_end_ids (
                    id UUID PRIMARY KEY
                ) ON COMMIT DELETE ROWS;
            """)
        )

        session.execute(
            text("""
                INSERT INTO tmp_end_ids (id)
                SELECT UNNEST(:ids)
                ON CONFLICT (id) DO NOTHING
            """),
            {"ids": endeavor_ids}
        )

        session.execute(
            text("""
                DELETE FROM endeavor e
                USING tmp_end_ids t
                WHERE e.id = t.id
            """)
        )
        self.logger.info(f"Endeavor clear end: {time.time() - endeavor_time}")

        session.commit()

    @staticmethod
    def calculate_next_cron_time(cron_string: str, last_retention_time: datetime.datetime) -> datetime.datetime:
        cron_instance = Cron(cron_string).schedule(last_retention_time)
        cron_instance.pristine = False
        return cron_instance.next()

    @staticmethod
    def synchronised_time(current_time: datetime.datetime, step: int) -> float:
        current_timestamp = current_time.timestamp()
        base_timestamp = current_time.replace(minute=0, second=0, microsecond=0).timestamp()

        elapsed = current_timestamp - base_timestamp
        remainder = elapsed % step
        wait_time = (step - remainder) if remainder else 0
        return wait_time

    @staticmethod
    def calculate_timedelta(
            retention_execute_time: datetime.datetime,
            dimension: str,
            retention_value: int,
            operation: Optional[Operation] = Operation.subdivision
    ):
        return getattr(retention_execute_time, operation.value)(
            datetime.timedelta(**{dimension: retention_value})
        )