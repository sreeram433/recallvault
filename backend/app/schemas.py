from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=200)
    display_name: str = Field(default="You", max_length=80)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user_id: str
    display_name: str


class PasteItemBody(BaseModel):
    source_url: str = Field(min_length=1, max_length=2048)
    title: str | None = Field(default=None, max_length=200)
    user_note: str | None = Field(default=None, max_length=2000)
    creator_name: str | None = Field(default=None, max_length=120)
    favorite: bool = False
    capture_source: str = "web_paste"


class ShareTargetBody(BaseModel):
    sourceUrl: str = Field(min_length=1, max_length=2048)
    title: str | None = Field(default=None, max_length=200)
    userNote: str | None = Field(default=None, max_length=2000)
    creatorName: str | None = Field(default=None, max_length=120)
    tags: list[str] = Field(default_factory=list, max_length=12)
    collection: str | None = Field(default=None, max_length=80)
    favorite: bool = False
    uploadId: str
    captureSource: str = "android_share_target"


class ItemOut(BaseModel):
    id: str
    status: str
    contentType: str
    sourcePlatform: str
    provenance: str
    canonicalUrl: str
    duplicateOf: str | None = None
    savedAt: datetime | None = None


class SignedUrlRequest(BaseModel):
    content_type: str = Field(pattern=r"^image/(jpeg|png|webp)$")
    item_id: str
