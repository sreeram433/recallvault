# Test plan

Automated coverage lives in `src/lib/*.test.ts` (`npm test`). The cases below are the product QA matrix.

## Duplicates

- Save `https://www.instagram.com/reel/ABC/?igsh=1` then `https://instagram.com/reels/ABC/`.
- Expect a warning and a link to the existing item.
- “Save another copy anyway” creates a second row only when confirmed.

## Deleted / unavailable originals

- Mark an item unavailable.
- Notes, tags, and collections remain.
- Badge shows on cards and detail.
- Open original is disabled; notes remain searchable.

## Imports

- ReelVault JSON export round-trips fields.
- Instagram-style JSON `{ saved_saved_media: [{ string_list_data: [{ href }] }] }` imports only Instagram URLs.
- Non-Instagram hrefs are ignored.
- Duplicate hrefs are skipped and counted separately.

## Exports

- CSV escapes quotes and commas.
- JSON includes disclaimer.
- Markdown states media is not included.
- Export writes an audit row.

## Permissions and consent

- Preview fetch does nothing useful if the toggle is off, aside from a local message.
- AI route strips notes when `includeNote` is false.
- No Instagram password field exists anywhere (`rg` the repo).
- Extension has `activeTab` only.

## Data deletion

- Delete item removes joins and reminders.
- Delete library clears every IndexedDB store.
- Subsequent visit shows the landing page.

## Search

- “Python chatbot around January” hits the January chatbot note.
- “Hyderabad cafes with outdoor seating” hits the cafe item.
- “from a creator named editsbykira” filters creator.
- “never opened hackathon” returns the unopened checklist.

## Capture latency

- Local save path does not await preview or AI.
- Target: visible confirmation under 3 seconds on a warm device.
