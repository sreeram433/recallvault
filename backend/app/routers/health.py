from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db

router = APIRouter()


@router.get("/health")
def health():
    return {
        "ok": True,
        "app": "recallvault-api",
        "instagramLogin": False,
        "scraping": False,
        "shareTargetPhase": 2,
    }


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ok": True}
