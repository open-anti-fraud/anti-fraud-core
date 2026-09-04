import datetime
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from base_types import ServiceSettings, ServiceSettingsUpdate
from integration.database import get_session_dependency
from integration.database.managers import ServiceSettingsManager, LastRetentionResultManager
from utils.authentification import internal_base_provider
from utils.correlation import get_logger
from utils.exceptions import PrimaryKeyAlreadyExist

router = APIRouter(
    prefix="/settings",
    tags=["service settings"],
    dependencies=[Depends(internal_base_provider.controller_dependency)]
)

logger = get_logger(__name__)

@router.put("")
def update(
    new_settings: ServiceSettingsUpdate,
    session: Session = Depends(get_session_dependency),
    aggregate_entity: Optional[uuid.UUID] = None
):
    settings_manager = ServiceSettingsManager(session)
    retention_manager = LastRetentionResultManager(session)
    try:
        last_retention_result = ServiceSettings.model_validate(
            settings_manager.get_setting(aggregate_entity).settings
        )

        # update last planned time for proper cron alignment.
        # For example reducing long cron to shorter cron case multiple retention procedure execution
        if (new_settings.retention_settings.execution_cron is not None and
            last_retention_result.retention_settings.execution_cron != new_settings.retention_settings.execution_cron):
            retention_manager.save_result(
                aggregate_entity,
                planned_retention_date = datetime.datetime.now(datetime.UTC)
            )

        settings_manager.update_settings(aggregate_entity, new_settings)
    except NoResultFound:
        raise HTTPException(detail="Service settings not found", status_code=404)

    session.commit()

@router.get("")
def get(
    session: Session = Depends(get_session_dependency),
    aggregate_entity: Optional[uuid.UUID] = None
) -> ServiceSettings:
    settings_manager = ServiceSettingsManager(session)

    try:
        service_settings = settings_manager.get_setting(aggregate_entity)
    except NoResultFound:
        raise HTTPException(detail="Service settings not found", status_code=404)

    return ServiceSettings.model_validate(service_settings.settings)


@router.post("")
def create(
    settings: ServiceSettings,
    session: Session = Depends(get_session_dependency),
    aggregate_entity: Optional[uuid.UUID] = None
):
    settings_manager = ServiceSettingsManager(session)

    try:
        settings_manager.create_settings(aggregate_entity, settings)
    except PrimaryKeyAlreadyExist as ex:
        raise HTTPException(detail=str(ex), status_code=400)

    session.commit()
