# GCP deployment checklist

Print and tick. Never put secrets in git.

## Before you start

- [x] GCP project created (`dulcet-doodad-506019-v3`)
- [x] Billing account linked (`0114E5-F42783-23365F`, open)
- [ ] GitHub repo `main` is the deploy branch
- [x] You will **not** collect Instagram passwords

## Foundation

- [x] `gcloud services enable` APIs (see `infra/gcloud/bootstrap.sh`)
- [x] `sa-recallvault-run` and `sa-recallvault-build` created
- [x] IAM bindings: Cloud SQL client, Secret Manager accessor, log/error/metric writer on run SA
- [x] Artifact Registry `recallvault` in `us-central1`

## Network and data

- [x] VPC peering for Service Networking
- [ ] Serverless VPC Access connector `recallvault-vpc` (last state ERROR — retry or use Direct VPC)
- [ ] Cloud SQL Postgres 16 **without public IP** (not created; use `--edition=ENTERPRISE --tier=db-g1-small`)
- [ ] Database `recallvault`, user `recallvault`
- [ ] `backend/sql/001_init.sql` applied (pgvector, tables)
- [x] GCS bucket `$PROJECT_ID-recallvault-screenshots` with public access prevention
- [x] Run SA has `objectAdmin` on that bucket only

## Secrets

- [x] `JWT_SECRET` in Secret Manager (random 48+ bytes)
- [x] `DB_PASSWORD` in Secret Manager (SQL user not created yet — password must match when instance is created)
- [ ] No `.env` committed; `.env.example` is placeholders only

## Backend (Cloud Run)

- [x] Image in Artifact Registry
- [x] Service `recallvault-api`, **min instances 0**, max 10
- [x] `--add-cloudsql-instances` set
- [x] Direct VPC (`default` / `default`) + `private-ranges-only` (no VPC connector)
- [x] Runtime SA is `sa-recallvault-run`
- [ ] `CORS_ALLOW_ORIGINS` is the Firebase host only (currently localhost + pending Firebase URL)
- [x] `GET /health` → `{ ok: true, instagramLogin: false, scraping: false }`
- [ ] `POST /v1/items` with a JWT saves a pasted URL without fetching Instagram

## Frontend (Firebase App Hosting)

- [ ] App Hosting backend connected to GitHub `main`
- [ ] `apphosting.yaml` present
- [ ] Paste-link on `/inbox` works in the browser (IndexedDB) even if API URL is empty
- [ ] HTTPS only, CSP headers present
- [ ] Optional `NEXT_PUBLIC_API_URL` points at Cloud Run

## CI/CD

- [ ] Cloud Build trigger on `main` for `backend/**`
- [ ] Or GitHub Actions WIF → `gcloud builds submit`
- [ ] Failed builds notify you (email on trigger or GitHub)

## Ops

- [ ] Uptime check on `/health`
- [ ] Billing budget + 50/90/100% thresholds
- [ ] Log-based metric or alert on 5xx
- [ ] Confirm logs do not contain raw shared URLs, notes, or tokens

## Phase 2 (later)

- [ ] Android Share Target pointed at production API
- [ ] Pairing / JWT on device Keystore
- [ ] iOS Share Extension
