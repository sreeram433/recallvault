# Optional Supabase sync

The web app does not require this. Apply `migrations/0001_init.sql` only if a user opts into cloud backup.

- Email or Google auth via Supabase Auth — never Instagram auth
- RLS isolates every table to `auth.uid()`
- `search_tsv` is the v1 retrieval index; add an embedding column later without rewriting the object model
