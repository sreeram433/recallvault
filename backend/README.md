# RecallVault API (FastAPI → Cloud Run)

Paste-link and email/password library API. Does not log into Instagram or fetch shared URLs.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET=dev-only APP_ENV=development
pytest
uvicorn app.main:app --reload --port 8080
```

Production: `../cloudbuild.yaml` builds this directory and deploys Cloud Run with min instances 0 and private Cloud SQL.
