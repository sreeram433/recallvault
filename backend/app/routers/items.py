from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditEvent, SavedItem, User
from app.schemas import ItemOut, PasteItemBody
from app.security import current_user
from app.url_validation import ShareValidationError, validate_share_target_url

router = APIRouter(prefix="/v1/items", tags=["items"])


@router.post("", response_model=ItemOut, status_code=201)
def paste_item(body: PasteItemBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        validated = validate_share_target_url(body.source_url, provenance="user_pasted")
    except ShareValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.args[0]) from exc

    existing = db.scalar(
        select(SavedItem).where(SavedItem.user_id == user.id, SavedItem.identity_key == validated.identity_key)
    )
    if existing:
        return ItemOut(
            id=existing.id,
            status="duplicate",
            contentType=existing.content_type,
            sourcePlatform=existing.source_platform,
            provenance=existing.provenance,
            canonicalUrl=existing.canonical_url,
            duplicateOf=existing.id,
            savedAt=existing.saved_at,
        )

    item = SavedItem(
        user_id=user.id,
        source_url=validated.original_url,
        canonical_url=validated.canonical_url,
        identity_key=validated.identity_key,
        source_type=validated.source_type,
        content_type=validated.content_type,
        source_platform=validated.source_platform,
        provenance="user_pasted",
        capture_source=body.capture_source,
        creator_name=body.creator_name,
        title=body.title,
        user_note=body.user_note,
        is_favorite=body.favorite,
    )
    db.add(item)
    db.add(
        AuditEvent(
            user_id=user.id,
            action="paste_import",
            url_hash=sha256(validated.canonical_url.encode()).hexdigest()[:12],
            item_id=item.id,
        )
    )
    db.flush()
    return ItemOut(
        id=item.id,
        status="saved",
        contentType=item.content_type,
        sourcePlatform=item.source_platform,
        provenance=item.provenance,
        canonicalUrl=item.canonical_url,
        savedAt=item.saved_at,
    )


@router.get("")
def list_items(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(SavedItem).where(SavedItem.user_id == user.id).order_by(SavedItem.saved_at.desc())).all()
    return {
        "items": [
            {
                "id": row.id,
                "canonicalUrl": row.canonical_url,
                "title": row.title,
                "contentType": row.content_type,
                "provenance": row.provenance,
                "savedAt": row.saved_at.isoformat() if row.saved_at else None,
            }
            for row in rows
        ]
    }
