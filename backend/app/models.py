from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80), default="You")
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    items: Mapped[list["SavedItem"]] = relationship(back_populates="user")


class SavedItem(Base):
    __tablename__ = "saved_items"
    __table_args__ = (UniqueConstraint("user_id", "identity_key", name="uq_user_identity"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    source_url: Mapped[str] = mapped_column(Text)
    canonical_url: Mapped[str] = mapped_column(Text)
    identity_key: Mapped[str] = mapped_column(String(512), index=True)
    source_type: Mapped[str] = mapped_column(String(40))
    content_type: Mapped[str] = mapped_column(String(20), default="unknown")
    source_platform: Mapped[str] = mapped_column(String(20), default="web")
    provenance: Mapped[str] = mapped_column(String(40), default="user_pasted")
    capture_source: Mapped[str | None] = mapped_column(String(40), nullable=True)
    creator_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    user_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_object: Mapped[str | None] = mapped_column(String(512), nullable=True)
    availability_status: Mapped[str] = mapped_column(String(32), default="saved")
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    upload_id: Mapped[str | None] = mapped_column(String(80), nullable=True, unique=True)
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    open_count: Mapped[int] = mapped_column(Integer, default=0)
    user: Mapped[User] = relationship(back_populates="items")


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("user_id", "key", name="uq_user_idempotency"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(80))
    body_hash: Mapped[str] = mapped_column(String(64))
    status_code: Mapped[int] = mapped_column(Integer)
    response_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(64))
    url_hash: Mapped[str | None] = mapped_column(String(16), nullable=True)
    item_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
