# ReelVault PRD

**Status:** MVP starter  
**Date:** 2026-08-19  
**Owner:** Product + Engineering  
**Working name:** ReelVault

## Problem

Instagram’s Save button is a high-intent action that produces a low-retrieval archive. People save recipes, coding tips, travel places, workouts, and study resources, then cannot find the exact item later. The feed is mixed, folders are manual, search is weak, originals disappear, and desktop browsing loses place.

## Value proposition

Save a Reel once. Find it later in seconds.

## Goals

1. Capture a user-initiated link in under 3 seconds.
2. Retrieve a previously saved item in under 10 seconds using notes, tags, collections, creator, date, caption, transcript, or URL.
3. Organize without forcing a single folder.
4. Preserve user-owned metadata even if the original post dies.
5. Give users full export and deletion control.

## Non-goals

- Logging into Instagram or asking for an Instagram password.
- Unofficial APIs, scraping, or background collection.
- Automatic import of the Instagram Saved tab.
- Hosting, downloading, or redistributing Instagram media by default.
- An addictive discovery feed or autoplay.
- Engagement nudges disguised as reminders.

## Capture rules

Every item enters the library because the user:

- pasted a URL,
- used the mobile share sheet / PWA share target,
- clicked the browser extension Save button or shortcut,
- or uploaded a file they already exported from Instagram.

## Success metrics

| Metric | Target |
| --- | --- |
| Time to save | < 3 seconds for one-tap save |
| Time to retrieve | < 10 seconds for a remembered item |
| Enrichment in week 1 | ≥ 50% of items have a note, tag, or collection |
| Reopen older saves | Increase vs. Instagram Saved baseline (qualitative in MVP) |
| Safety | Zero Instagram password fields; zero background scrapers |

## MVP

Local-first web app + PWA share target + MV3 extension + export/delete + search/filters + rediscover/reminders + optional AI suggestions.

## Later

Encrypted Supabase sync, semantic/vector search, Expo native share target, richer Instagram export parsers, collaborative libraries (still private by default).
