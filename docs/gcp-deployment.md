# RecallVault on Google Cloud

Canonical diagram: [architecture-gcp.md](./architecture-gcp.md)

| Role | Product |
| --- | --- |
| Frontend | **Firebase App Hosting** |
| Backend | **Cloud Run** |
| Database | **Cloud SQL PostgreSQL + pgvector** |
| Storage | **Cloud Storage** |
| Secrets | **Secret Manager** |

CI/CD: GitHub `main` → Cloud Build → Artifact Registry → Cloud Run. Ops: Logging, Error Reporting, Monitoring, Billing Budget.

Android Share Target is **phase 2**. The hosted web app works now with **paste-link capture** (IndexedDB in the browser). Cloud Run is used when `NEXT_PUBLIC_API_URL` is set (email/password cloud library). Instagram passwords are never collected.

HTTPS is terminated by Firebase and Cloud Run. Do **not** enable `HTTPSRedirectMiddleware` inside the container (Cloud Run talks HTTP to the process).

Cloud Run is `--allow-unauthenticated` so the browser can call `/v1/auth` and `/v1/items`. Every mutating route still requires a RecallVault JWT. The runtime service account is least-privilege.

## Exact command sequence

Set:

```bash
export PROJECT_ID=your-gcp-project
export BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX
export REGION=us-central1
```

### 1. Bootstrap

```bash
cd /Users/sreeramreddysr/reelvault
chmod +x infra/gcloud/bootstrap.sh infra/gcloud/apply-schema.sh
PROJECT_ID="$PROJECT_ID" BILLING_ACCOUNT="$BILLING_ACCOUNT" ./infra/gcloud/bootstrap.sh
```

Then replace placeholder secret values:

```bash
printf '%s' "$(openssl rand -base64 48)" | gcloud secrets versions add JWT_SECRET --data-file=-
printf '%s' "THE_SQL_USER_PASSWORD" | gcloud secrets versions add DB_PASSWORD --data-file=-
```

### 2. Schema (private SQL via Auth Proxy)

From a machine that can reach the VPC (Cloud Shell with `--private-ip` or a bastion):

```bash
PROJECT_ID="$PROJECT_ID" DB_PASSWORD='…' ./infra/gcloud/apply-schema.sh
```

### 3. First Cloud Run deploy (or wait for Cloud Build)

```bash
gcloud artifacts repositories create recallvault --repository-format=docker --location="$REGION" || true
gcloud builds submit --config cloudbuild.yaml --substitutions=SHORT_SHA=$(git rev-parse --short HEAD)
```

Allow the Firebase App Hosting origin once you have it:

```bash
gcloud run services update recallvault-api --region="$REGION" \
  --update-env-vars="CORS_ALLOW_ORIGINS=https://YOUR-FIREBASE-HOST"
```

Grant `allUsers` `roles/run.invoker` only if the first deploy used `--no-allow-unauthenticated`. The checked-in `cloudbuild.yaml` already uses `--allow-unauthenticated`.

### 4. Firebase App Hosting (frontend)

```bash
firebase login
firebase use "$PROJECT_ID"
firebase experiments:enable webframeworks
# Connect GitHub main in Firebase console → App Hosting → Create backend
# Root directory: repo root. Live branch: main.
firebase apphosting:backends:create
```

Set `NEXT_PUBLIC_API_URL` in App Hosting env to the Cloud Run URL (`https://recallvault-api-….run.app`) after the API is live. Paste-link still works if this is empty.

### 5. Cloud Build GitHub trigger

In Cloud Build → Triggers → Connect GitHub repo → `cloudbuild.yaml` on `main`, included files `backend/**`.

Or GitHub Actions (`.github/workflows/backend-cloudbuild.yml`) with Workload Identity Federation secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_CLOUD_BUILD_SA`

### 6. Observability

```bash
gcloud monitoring uptime-check-configs create recallvault-api-health \
  --display-name="RecallVault API health" \
  --resource-type=uptime-url \
  --monitored-resource-labels=host=YOUR_RUN_HOST,project_id="$PROJECT_ID" \
  --http-check-path=/health \
  --http-check-port=443 \
  --http-check-use-ssl
```

Error Reporting is automatic for Cloud Run when `clouderrorreporting.googleapis.com` is enabled. Logs: Cloud Run → Logs (`/health` has no PII; share-target logs user id + item id only).

Budget (also in bootstrap):

```bash
gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT" \
  --display-name="RecallVault monthly cap" \
  --budget-amount=25 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --filter-projects="projects/${PROJECT_ID}"
```

## Deployment checklist

See `docs/gcp-checklist.md`.

## Local backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET=dev-only APP_ENV=development CORS_ALLOW_ORIGINS=http://localhost:3000
pytest
uvicorn app.main:app --reload --port 8080
```

SQLite in-memory is used when `DATABASE_URL` and `INSTANCE_CONNECTION_NAME` are unset (health tests).
