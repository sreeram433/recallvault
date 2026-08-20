# Information architecture

## Primary navigation

1. Inbox — new and unsorted captures  
2. Search — retrieval surface  
3. Collections — topics, including system views  
4. Rediscover — digest, stale, reminders  
5. Settings — consent, export, erase  

Global: persistent search bar, Save action, theme toggle.

## Object model

User → SavedItems → (many) Collections, (many) Tags, (optional) Reminder  
ImportJob and AuditLog are user-visible operations, not social activity.

## Views

- Unsorted Inbox: inbox membership with no user collection  
- Needs Review: missing note/tag/collection  
- Watch Later: explicit short queue  
- Item detail: the editor for a single keep  

## States

| State | Treatment |
| --- | --- |
| Empty | Calm explanation + capture affordance |
| Duplicate | Warning + link |
| Processing | Only while preview/AI runs; item can already be saved |
| Unavailable | Badge; notes kept |
| Archived | Hidden from default grids, still searchable |
| Permission denied | Feature degrades locally |

## Desktop vs mobile

Desktop: left rail + sticky search + paginated grid/list.  
Mobile: bottom nav + same search + share target landing on `/share`.
