from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException, status

from app.config import get_settings


def create_screenshot_upload(user_id: str, item_id: str, content_type: str) -> dict:
    settings = get_settings()
    if not settings.gcs_screenshots_bucket:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Screenshot storage is not configured")
    from google.cloud import storage

    object_name = f"{user_id}/{item_id}/{uuid4()}.bin"
    client = storage.Client()
    bucket = client.bucket(settings.gcs_screenshots_bucket)
    blob = bucket.blob(object_name)
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=settings.screenshot_signed_url_ttl_seconds),
        method="PUT",
        content_type=content_type,
    )
    return {"uploadUrl": url, "object": object_name, "expiresInSeconds": settings.screenshot_signed_url_ttl_seconds}
