from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings
from app.models import Base

_engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def build_engine(settings: Settings | None = None) -> Engine:
    settings = settings or get_settings()
    if settings.database_url:
        return create_engine(settings.database_url, pool_pre_ping=True, pool_size=5)
    if settings.instance_connection_name:
        from google.cloud.sql.connector import Connector, IPTypes

        connector = Connector()
        ip_type = IPTypes.PRIVATE if settings.db_ip_type.lower() == "private" else IPTypes.PUBLIC

        def getconn():
            return connector.connect(
                settings.instance_connection_name,
                "pg8000",
                user=settings.db_user,
                password=settings.db_password,
                db=settings.db_name,
                ip_type=ip_type,
            )

        return create_engine("postgresql+pg8000://", creator=getconn, pool_pre_ping=True, pool_size=5)
    return create_engine("sqlite+pysqlite:///:memory:", pool_pre_ping=True)


def init_engine() -> Engine:
    global _engine, SessionLocal
    if _engine is None:
        _engine = build_engine()
        SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
        if str(_engine.url).startswith("sqlite"):
            Base.metadata.create_all(_engine)
    return _engine


def get_db() -> Generator[Session, None, None]:
    init_engine()
    assert SessionLocal is not None
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
