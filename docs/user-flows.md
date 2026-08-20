# User flows and edge cases

## Happy path — capture

1. User sees a useful public Reel.
2. They Share → ReelVault, paste the URL, or click the extension.
3. Capture screen shows detected type, optional preview, note field, suggested tags.
4. User confirms. Item lands in Inbox (and any chosen collections).
5. Status is `saved`. Duplicate URLs warn first.

## Happy path — retrieve

1. User types “Hyderabad cafes with outdoor seating” or “beginner PyTorch last month.”
2. Search parses dates/types/creators and runs full-text over notes, tags, collections, captions, transcripts, URLs.
3. Cards highlight why they matched.
4. User opens the original in Instagram or edits their note.

## Edge cases

| Case | Behavior |
| --- | --- |
| Duplicate URL | Warn, link to existing item, allow a second copy only explicitly |
| Offline | Local save still succeeds; preview/AI queue until later |
| Preview blocked | Save URL anyway; user can type title/creator |
| Creator deletes post | User marks “original unavailable”; notes remain |
| Private / login-walled metadata | No fetch with cookies; no login |
| User denies AI | On-device suggestions only; notes never leave the device |
| User denies note-sharing | AI payload omits `userNote` even if the field is filled |
| Import file | Parse URLs only from a user-provided export; skip duplicates |
| Empty library | Explain how to save; optional sample data |
| Delete account | Clear IndexedDB after confirm; export is recommended first |
| Invalid URL | Inline error; nothing stored |
| Story link | Type = story; creator inferred when present in the path |
| Web link | Allowed; same library, labeled Web |

## Consent moments

- First-run local library creation
- Preview fetch button
- AI suggest button
- Include-my-note checkbox
- Export and delete confirmations
