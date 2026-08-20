# High-fidelity screen specifications

## Design tokens

| Token | Light | Dark |
| --- | --- | --- |
| Paper | `#F3EEE4` | `#13110F` |
| Raised | `#FFFAF1` | `#1C1916` |
| Ink | `#1B1814` | `#F3EDE2` |
| Accent | `#1F5C4D` | `#86C2B0` |
| Gold | `#B0893A` | `#D4B06A` |
| Danger | `#8F3D32` | `#E08A7A` |

Display type: Newsreader. UI type: Geist Sans. Mono: Geist Mono for URLs.

Radius 18–28px. No autoplay. No infinite scroll. Cards, not a social feed.

## Landing `/`

Two columns: local library form and privacy promises. CTA: “Create my vault.” No Instagram OAuth.

## Inbox `/inbox`

Header + paste form + counts + paginated cards. Each card: placeholder/thumbnail, type badge, title/creator, note preview, tags, collections, dates, Open original, Open in vault.

## Search `/search`

Large query field, example chips, filter panel (source, creator, dates, favorites, never opened), sort, grid/list, match reasons.

## Collections `/collections`

System tiles + user tiles + create/rename/delete/merge. Detail page is a filtered library.

## Rediscover `/rediscover`

Five older items, stats, user-set reminders, stale list. Copy is archival, not addictive.

## Item `/item/[id]`

Editable metadata, multi-select collections, reminder datetime, mark unavailable, delete.

## Capture `/save` and `/share`

Same form, prefilled URL. Must feel instant.

## Settings `/settings`

Consent toggles, export JSON/CSV/Markdown, import ReelVault JSON, import user-provided Instagram export, audit list, erase.

## Breakpoints

- <768: single column, bottom nav, 44px targets  
- 768–1024: two-column grids  
- ≥1024: 240px rail  

## Accessibility

`focus-ring` on controls, contrast on paper/ink, no color-only status, `aria-pressed` on pins/favorites, keyboard: `⌘K` search, `⌘S` save.
