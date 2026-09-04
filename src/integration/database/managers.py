import datetime
import uuid
from typing import Union, Optional, List, Sequence, Tuple

from sqlalchemy import select, update, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload, Session
from sqlalchemy.orm.attributes import flag_modified

from base_types import ServiceSettings, RetentionData, ServiceSettingsUpdate, SortOrder
from integration.database.models import Endeavor, EndeavorContent, ServiceSettingsModel, LastRetentionResultModel
from utils import deep_update
from utils.exceptions import PrimaryKeyAlreadyExist, InvalidSortOrder


class EndeavorManager:
    def __init__(self, session: Session):
        self.session = session

    def save_endeavor(
            self,
            aggregate_entity_id: uuid.UUID,
            external_link: Optional[str] = None
    ) -> Endeavor:
        endeavor = Endeavor(external_link=external_link,
                            aggregate_entity_id=aggregate_entity_id)

        self.session.add(endeavor)
        # TODO probably get objects id without flush
        self.session.flush()

        return endeavor

    def add_endeavor_content(self,
                             content_id: Union[str, uuid.UUID],
                             endeavor_id: Union[str, uuid.UUID],
                             parent_id:  Optional[Union[str, uuid.UUID]],
                             content_type: int,
                             s3_links: List[str],
                             info: dict,
                             exception_info: dict):
        endeavor_content = EndeavorContent(
            id = content_id,
            endeavor_id = endeavor_id,
            parent_id = parent_id,
            type = content_type,
            s3_links = s3_links,
            info = info,
            exception_info = exception_info
        )
        self.session.add(endeavor_content)

    def update_endeavor_info(self,
                             endeavor_id: Union[str, uuid.UUID],
                             matching_info: Optional[dict] = None,
                             lightning_pattern: Optional[list] = None,
                             liveness_info: Optional[dict] = None,
                             lr_s3_link: Optional[str] = None,
                             lr_s3_ref_image_link: Optional[str] = None,
                             lr_s3_ref_template_bsm_link: Optional[str] = None,
                             action_pattern: Optional[list] = None,
                             action_info: Optional[list] = None,
                             la_s3_link: Optional[str] = None,
                             la_s3_ref_image_link: Optional[str] = None,
                             la_s3_ref_template_bsm_link: Optional[str] = None) -> None:
        kwargs = locals()
        update_kwargs = {}

        for arg_name, value in kwargs.items():
            if value is not None and arg_name not in {"endeavor_id", "self"}:
                update_kwargs[arg_name] = value

        expression = update(Endeavor).where(
            Endeavor.id == endeavor_id
        ).values(**update_kwargs)
        self.session.execute(expression)

    # def delete_endeavor(self, endeavor_id: Union[str, uuid.UUID]) -> None:
    #     obj = self.session.query(Endeavor).filter(Endeavor.id == endeavor_id).first()
    #     # for proper before_delete signal work
    #     self.session.delete(obj)

    def get_endeavor(self, endeavor_id: Union[str, uuid.UUID]) -> Endeavor:
        expression = select(Endeavor).filter_by(id=endeavor_id)
        return self.session.execute(expression).scalar_one()

    def get_endeavor_with_content(self, endeavor_id: Union[str, uuid.UUID]) -> Endeavor:
        expression = select(Endeavor).options(selectinload(Endeavor.content)).filter_by(id=endeavor_id)
        return self.session.execute(expression).scalar_one()

    def get_paginated_endeavor_with_content_by_external_id(
            self,
            sort_order: SortOrder,
            page: int,
            page_size: int,
            external_link: Optional[Union[str, uuid.UUID]] = None,
            start_date: Optional[datetime.datetime] = None,
            end_date: Optional[datetime.datetime] = None,
    ) -> Tuple[int, List[Endeavor]]:
        # align page
        page = page - 1

        if page < 0:
            raise Exception(f"Invalid page number: {page}")

        offset = page * page_size
        limit = page_size

        # separate count query may be faster than united with main query
        total_count_query = (
            select(func.count())
            .select_from(Endeavor)
            .filter_by(external_link=external_link)
        )

        paginated_items_query = select(Endeavor).filter_by(external_link=external_link)

        if sort_order == SortOrder.asc:
            paginated_items_query = paginated_items_query.order_by(Endeavor.creation_date)
        elif sort_order == SortOrder.desc:
            paginated_items_query = paginated_items_query.order_by(Endeavor.creation_date.desc())
        else:
            raise InvalidSortOrder()

        paginated_items_query = paginated_items_query.offset(offset).limit(limit)

        if start_date is not None:
            total_count_query = total_count_query.where(Endeavor.creation_date >= start_date)
            paginated_items_query = paginated_items_query.where(Endeavor.creation_date >= start_date)

        if end_date is not None:
            total_count_query = total_count_query.where(Endeavor.creation_date < end_date)
            paginated_items_query = paginated_items_query.where(Endeavor.creation_date < end_date)
        total_count = self.session.execute(total_count_query).scalar_one()
        return total_count, self.session.execute(paginated_items_query).scalars().all()


class ServiceSettingsManager:
    def __init__(self, session: Session):
        self.session = session

    def get_setting(self, setting_id: uuid.UUID) -> ServiceSettingsModel:
        expression = select(ServiceSettingsModel).filter_by(id=setting_id)
        return self.session.execute(expression).scalar_one()

    def get_all_settings(self) -> Sequence[ServiceSettingsModel]:
        expression = select(ServiceSettingsModel).order_by(ServiceSettingsModel.id)
        return self.session.execute(expression).scalars().all()

    def update_settings(self, settings_id: uuid.UUID, new_settings: ServiceSettingsUpdate) -> ServiceSettingsModel:
        expression = select(ServiceSettingsModel).filter_by(id=settings_id)
        settings_model = self.session.execute(expression).scalar_one()

        current_settings = settings_model.settings
        new_settings = new_settings.model_dump()
        deep_update(current_settings, new_settings, ignore_none=True)

        # mark that field in model changed for further update on commit
        # because if contents of dict changed sqlalchemy not track this changes
        flag_modified(settings_model, 'settings')

        return settings_model

    def create_settings(self, settings_id: uuid.UUID, settings: ServiceSettings) -> ServiceSettingsModel:
        settings = ServiceSettingsModel(
            id=settings_id,
            settings=settings.model_dump()
        )

        self.session.add(settings)

        try:
            self.session.flush()
        except IntegrityError as e:
            if 'duplicate key value violates unique constraint' in str(e.orig):
                raise PrimaryKeyAlreadyExist(f"ServiceSettings with id: {settings_id} already exists") from e
            else:
                raise

        return settings


class LastRetentionResultManager:
    def __init__(self, session: Session):
        self.session = session

    def save_result(
            self,
            settings_id: uuid.UUID,
            status: Optional[LastRetentionResultModel.Status] = None,
            result: Optional[RetentionData] = None,
            planned_retention_date: Optional[datetime.datetime] = None,
            actual_retention_date: Optional[datetime.datetime] = None
    ):
        if result is not None:
            dumped_result = result.model_dump()
        else:
            dumped_result = {}

        now = datetime.datetime.now(datetime.UTC)
        stmt = insert(LastRetentionResultModel).values(
            id=settings_id,
            result=dumped_result,
            planned_retention_date=planned_retention_date,
            actual_retention_date=actual_retention_date,
            last_modified=now
        )

        update_args = {'last_modified': now}

        if status is not None:
            update_args["status"] = status.value

        if result is not None:
            update_args["result"] = dumped_result

        if planned_retention_date is not None:
            update_args["planned_retention_date"] = planned_retention_date

        if actual_retention_date is not None:
            update_args["actual_retention_date"] = actual_retention_date

        stmt = stmt.on_conflict_do_update(
            index_elements=['id'],
            set_=update_args
        )
        self.session.execute(stmt)

    def get_results(self) -> Sequence[LastRetentionResultModel]:
        expression = select(LastRetentionResultModel)
        return self.session.execute(expression).scalars().all()

    def get_result(self, settings_id: uuid.UUID) -> LastRetentionResultModel:
        expression = select(LastRetentionResultModel).filter_by(id=settings_id)
        return self.session.execute(expression).scalar_one()
