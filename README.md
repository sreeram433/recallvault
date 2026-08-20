# ReelVault

**Save a Reel once. Find it later in seconds.**

A privacy-first library for Instagram Reels, posts, and other links you actually want to find again. It is not Instagram, it does not ask for an Instagram password, and it does not scrape your Saved tab.

## What this starter includes

- Local-first Next.js app (IndexedDB) with Inbox, Search, Collections, Rediscover, and Settings
- Capture via paste, Android **Save to RecallVault** share target, `/capture` and `/save?url=`, PWA share target, and a Manifest V3 extension
- Notes, multi-collection filing, tags, favorites, pins, archive, reminders
- Natural-language search over notes, tags, creators, dates, captions, transcripts, and URLs
- CSV / JSON / Markdown export and one-click library erase
- Optional public preview fetch and optional SpaceXAI tag suggestions (off until you opt in)
- Product docs in `docs/` and a Supabase RLS schema for later cloud sync

## Quick start

```bash
cd reelvault
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a local vault. Leave “sample library” on if you want to try queries such as:

- `Python chatbot around January`
- `Hyderabad cafes with outdoor seating`
- `video editing hooks from a creator named editsbykira`

```bash
npm test
npm run build
```

## Optional AI

Copy `.env.example` to `.env.local` and set `XAI_API_KEY`. In Settings, enable AI suggestions. Notes are sent only if you check **Include my note**.

## Browser extension

See `extension/README.md`. Load the `extension/` folder as an unpacked Chrome/Edge add-on. It captures the active tab URL only after you click Save.

## Android share sheet (RecallVault)

Open `android/` in Android Studio. The app registers as **Save to RecallVault** for `ACTION_SEND` `text/plain`. It never fetches Instagram. Unpaired or offline saves go to an encrypted local queue.

Pairing: Settings on the web app → Create pairing code → enter it in the Android app.

Deep link fallback: `recallvault://capture?url=` and the web page `/capture`.

iOS Share Extension is specified in `docs/ios-share-extension.md` (implement later).

## Mobile / PWA

Install the site as an app. If the native Android app is not installed, the PWA share target still lands on `/share`.

## Google Cloud production

| Role | Product |
| --- | --- |
| Frontend | **Firebase App Hosting** (Next.js, GitHub `main`) |
| Backend | **Cloud Run** (FastAPI container, min instances 0) |
| Database | **Cloud SQL PostgreSQL** + **pgvector** (private IP) |
| Storage | **Cloud Storage** (private screenshot bucket) |
| Secrets | **Secret Manager** (`JWT_SECRET`, `DB_PASSWORD`) |

Paste-link capture works on the hosted web app immediately (browser IndexedDB). Android Share Target is phase 2.

See `docs/architecture-gcp.md`, `docs/gcp-deployment.md`, and `docs/gcp-checklist.md`.

```bash
export PROJECT_ID=retrive-46519 BILLING_ACCOUNT=…
./infra/gcloud/bootstrap.sh
gcloud builds submit --config cloudbuild.yaml
```

## Privacy commitments

- No Instagram credentials
- No unofficial Instagram APIs
- No background scraping
- Original media stays on Instagram and may disappear
- Your notes are yours: export them or delete them

Read `docs/privacy-policy-outline.md` and `/privacy`.
