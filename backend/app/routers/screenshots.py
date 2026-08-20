from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import SavedItem, User
from app.schemas import SignedUrlRequest
from app.security import current_user
from app.storage import create_screenshot_upload

router = APIRouter(prefix="/v1/screenshots", tags=["screenshots"])


@router.post("/signed-url")
def signed_url(body: SignedUrlRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(SavedItem, body.item_id)
    if not item or item.user_id != user.id:
        from fastapi import HTTPException, status

        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    result = create_screenshot_upload(user.id, body.item_id, body.content_type)
    item.screenshot_object = result["object"]
    return result
