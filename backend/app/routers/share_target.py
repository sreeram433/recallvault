import hashlib
import json
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditEvent, IdempotencyKey, SavedItem, User
from app.schemas import ItemOut, ShareTargetBody
from app.security import current_user
from app.url_validation import ShareValidationError, parse_shared_text

router = APIRouter(prefix="/v1/imports", tags=["share-target"])
log = logging.getLogger("recallvault.share")


@router.post("/share-target", response_model=ItemOut)
def import_share_target(
    body: ShareTargetBody,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    if not idempotency_key or len(idempotency_key) < 16:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Idempotency-Key header is required")

    body_hash = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True).encode()).hexdigest()
    prior = db.scalar(
        select(IdempotencyKey).where(IdempotencyKey.user_id == user.id, IdempotencyKey.key == idempotency_key)
    )
    if prior:
        if prior.body_hash != body_hash:
            raise HTTPException(status.HTTP_409_CONFLICT, "Idempotency key reused with a different body")
        return prior.response_json

    try:
        validated = parse_shared_text(body.sourceUrl, provenance="user_shared")
    except ShareValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.args[0]) from exc

    existing = db.scalar(
        select(SavedItem).where(SavedItem.user_id == user.id, SavedItem.identity_key == validated.identity_key)
    )
    if existing:
        payload = ItemOut(
            id=existing.id,
            status="duplicate",
            contentType=existing.content_type,
            sourcePlatform=existing.source_platform,
            provenance=existing.provenance,
            canonicalUrl=existing.canonical_url,
            duplicateOf=existing.id,
        ).model_dump(mode="json")
        db.add(
            IdempotencyKey(
                user_id=user.id,
                key=idempotency_key,
                body_hash=body_hash,
                status_code=200,
                response_json=payload,
            )
        )
        return payload

    item = SavedItem(
        user_id=user.id,
        source_url=validated.original_url,
        canonical_url=validated.canonical_url,
        identity_key=validated.identity_key,
        source_type=validated.source_type,
        content_type=validated.content_type,
        source_platform=validated.source_platform,
        provenance="user_shared",
        capture_source=body.captureSource,
        creator_name=body.creatorName,
        title=body.title,
        user_note=body.userNote,
        is_favorite=body.favorite,
        upload_id=body.uploadId,
    )
    db.add(item)
    db.flush()
    db.add(
        AuditEvent(
            user_id=user.id,
            action="share_target_import",
            url_hash=hashlib.sha256(validated.canonical_url.encode()).hexdigest()[:12],
            item_id=item.id,
        )
    )
    log.info("share_target_import user=%s item=%s", user.id, item.id)
    payload = ItemOut(
        id=item.id,
        status="saved",
        contentType=item.content_type,
        sourcePlatform=item.source_platform,
        provenance=item.provenance,
        canonicalUrl=item.canonical_url,
        savedAt=item.saved_at,
    ).model_dump(mode="json")
    db.add(
        IdempotencyKey(
            user_id=user.id,
            key=idempotency_key,
            body_hash=body_hash,
            status_code=201,
            response_json=payload,
        )
    )
    return payload
