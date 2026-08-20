#!/usr/bin/env bash
# RecallVault Google Cloud bootstrap. Fill the variables, then run section by section.
# This script is idempotent-ish; re-running create commands may error if resources exist.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
BILLING_ACCOUNT="${BILLING_ACCOUNT:?set BILLING_ACCOUNT}"
REGION="${REGION:-us-central1}"
SQL_INSTANCE="${SQL_INSTANCE:-recallvault-pg}"
SQL_TIER="${SQL_TIER:-db-custom-1-3840}"
AR_REPO="${AR_REPO:-recallvault}"
RUN_SERVICE="${RUN_SERVICE:-recallvault-api}"
RUN_SA="sa-recallvault-run@${PROJECT_ID}.iam.gserviceaccount.com"
BUILD_SA="sa-recallvault-build@${PROJECT_ID}.iam.gserviceaccount.com"
BUCKET="${PROJECT_ID}-recallvault-screenshots"
VPC_CONNECTOR="${VPC_CONNECTOR:-recallvault-vpc}"
BUDGET_AMOUNT="${BUDGET_AMOUNT:-25}"

echo "== project =="
gcloud config set project "${PROJECT_ID}"
gcloud billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT}"

echo "== APIs =="
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  firebaseapphosting.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  clouderrorreporting.googleapis.com \
  storage.googleapis.com \
  iamcredentials.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com \
  billingbudgets.googleapis.com

echo "== service accounts (least privilege) =="
gcloud iam service-accounts create sa-recallvault-run --display-name="RecallVault Cloud Run" || true
gcloud iam service-accounts create sa-recallvault-build --display-name="RecallVault Cloud Build" || true

gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${RUN_SA}" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${RUN_SA}" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${RUN_SA}" --role="roles/logging.logWriter"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${RUN_SA}" --role="roles/errorreporting.writer"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${RUN_SA}" --role="roles/monitoring.metricWriter"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${BUILD_SA}" --role="roles/run.admin"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${BUILD_SA}" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${BUILD_SA}" --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${BUILD_SA}" --role="roles/cloudbuild.builds.builder"
gcloud iam service-accounts add-iam-policy-binding "${RUN_SA}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

echo "== Artifact Registry =="
gcloud artifacts repositories create "${AR_REPO}" --repository-format=docker --location="${REGION}" --description="RecallVault images" || true

echo "== private service connection for Cloud SQL =="
gcloud compute addresses create google-managed-services-default \
  --global --purpose=VPC_PEERING --prefix-length=16 --network=default || true
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default || true

echo "== Serverless VPC Access (Cloud Run → private SQL) =="
gcloud compute networks vpc-access connectors create "${VPC_CONNECTOR}" \
  --region="${REGION}" \
  --network=default \
  --range=10.8.0.0/28 || true

echo "== Cloud SQL PostgreSQL (no public IP) =="
gcloud sql instances create "${SQL_INSTANCE}" \
  --database-version=POSTGRES_16 \
  --cpu=1 --memory=3840MB \
  --region="${REGION}" \
  --network=default \
  --no-assign-ip \
  --storage-size=10 \
  --storage-auto-increase \
  --backup-start-time=09:00 \
  --retained-backups-count=7 \
  --availability-type=zonal || true
gcloud sql databases create recallvault --instance="${SQL_INSTANCE}" || true
gcloud sql users create recallvault --instance="${SQL_INSTANCE}" --password="REPLACE_THEN_PUT_IN_SECRET_MANAGER"

echo "== private screenshots bucket =="
gcloud storage buckets create "gs://${BUCKET}" --location="${REGION}" --uniform-bucket-level-access
gcloud storage buckets update "gs://${BUCKET}" --public-access-prevention
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/storage.objectAdmin"

echo "== secrets (values are never stored in git) =="
printf '%s' "REPLACE_ME_JWT" | gcloud secrets create JWT_SECRET --data-file=- || true
printf '%s' "REPLACE_ME_DB" | gcloud secrets create DB_PASSWORD --data-file=- || true
gcloud secrets add-iam-policy-binding JWT_SECRET --member="serviceAccount:${RUN_SA}" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding DB_PASSWORD --member="serviceAccount:${RUN_SA}" --role="roles/secretmanager.secretAccessor"

echo "== Cloud Build GitHub trigger (after connecting the repo in console) =="
echo "gcloud builds triggers create github --name=recallvault-api --repo-owner=OWNER --repo-name=reelvault --branch-pattern='^main$' --build-config=cloudbuild.yaml --region=${REGION} --service-account=projects/${PROJECT_ID}/serviceAccounts/${BUILD_SA}"

echo "== monitoring + budget =="
gcloud billing budgets create \
  --billing-account="${BILLING_ACCOUNT}" \
  --display-name="RecallVault monthly cap" \
  --budget-amount="${BUDGET_AMOUNT}" \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --filter-projects="projects/${PROJECT_ID}" || true

echo "Bootstrap complete. Next: apply backend/sql/001_init.sql, set real secret values, Cloud Build deploy, Firebase App Hosting."
