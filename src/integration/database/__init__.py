import json
from typing import Generator

from sqlalchemy import create_engine, QueuePool, URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

import settings
from integration.database.utils import DateUUIDEncoder
from utils.exceptions import DataSavingDisabled

DATABASE_URL = URL.create(
    drivername="postgresql",
    username=settings.POSTGRES_USER,
    password=settings.POSTGRES_PASSWORD,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    database=settings.POSTGRES_DB,
)


def dumps(d):
    return json.dumps(d, cls=DateUUIDEncoder)


engine = create_engine(DATABASE_URL,
                       future=True,
                       pool_pre_ping=True,
                       poolclass=QueuePool,
                       json_serializer=dumps,
                       pool_size=settings.SQLALCHEMY_POOL_SIZE,
                       max_overflow=settings.SQLALCHEMY_POOL_OVERFLOW)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_session() -> Session:
    if settings.DISABLE_DATA_PERSISTENCE:
        raise DataSavingDisabled()

    return SessionLocal()


def get_session_dependency() -> Generator[Session]:
    if settings.DISABLE_DATA_PERSISTENCE:
        raise DataSavingDisabled()

    session = SessionLocal()
    try:
        yield session
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()