# Database and API

## Local (system of record)

IndexedDB database `reelvault` via `idb`. Stores: `users`, `items`, `collections`, `tags`, `itemCollections`, `itemTags`, `reminders`, `importJobs`, `auditLogs`, `settings`.

Duplicate key is `identityKey` (`ig:shortcode:{code}` so `/reel/X` and `/p/X` collapse). Canonical URL is stored for display. Items may belong to many collections and tags.

## Cloud (optional)

See `supabase/migrations/0001_init.sql`. Row Level Security: every row is `auth.uid()` scoped. Generated `tsvector` on title, note, creator, caption, transcript, URL. Ready for a later `embedding` column.

## HTTP API (this starter)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | none | Liveness; asserts no Instagram login |
| GET | `/api/preview` | none | Retired (`410`). Do not use. |
| POST | `/api/preview` | none | Instagram-host OG tags only. SSRF-blocked. No cookies. |
| POST | `/api/ai/suggest` | server `XAI_API_KEY` | Optional SpaceXAI tags; notes only if `includeNote` |
| POST | `/api/v1/auth/pairing` | none + IP rate limit | 6-character Android pairing code |
| POST | `/api/v1/auth/pairing/redeem` | none + IP rate limit | Exchanges the code for a Bearer token |
| POST | `/api/v1/imports/share-target` | Bearer + Idempotency-Key | User-shared URL import. Does not fetch the URL. |

Library CRUD is client-side against IndexedDB so a save works offline and stays under 3 seconds.

## Export shapes

CSV columns: title, url, canonicalUrl, creator, sourceType, notes, tags, collections, savedAt, lastOpenedAt, openCount, availabilityStatus, caption, transcript, favorite.

JSON wrapper includes `disclaimer` that media is not copied.

## Extension contract

Active tab URL after explicit Save or `Command/Ctrl+Shift+Y`. Opens `/save?url=`.

## Share target contract

PWA GET `/share?url=&text=&title=`.
