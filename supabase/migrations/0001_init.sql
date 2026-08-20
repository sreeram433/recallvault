-- ReelVault optional cloud sync schema.
-- Local IndexedDB remains the default system of record.
-- Enable only after a user opts into encrypted cloud sync.
-- Never store Instagram credentials.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'You',
  created_at timestamptz not null default now()
);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_url text not null,
  canonical_url text not null,
  source_type text not null,
  creator_name text,
  title text,
  thumbnail_url text,
  saved_at timestamptz not null default now(),
  last_opened_at timestamptz,
  open_count integer not null default 0,
  availability_status text not null default 'saved',
  user_note text,
  caption_text text,
  transcript_text text,
  metadata_json jsonb,
  provenance text not null default 'user_pasted',
  capture_source text,
  identity_key text,
  is_favorite boolean not null default false,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  needs_review boolean not null default false,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(user_note, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(creator_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(caption_text, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(transcript_text, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(canonical_url, '')), 'D')
  ) stored,
  unique (user_id, canonical_url)
);

create index if not exists saved_items_user_saved_at on public.saved_items (user_id, saved_at desc);
create index if not exists saved_items_search on public.saved_items using gin (search_tsv);
create index if not exists saved_items_note_trgm on public.saved_items using gin (user_note gin_trgm_ops);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text not null default '#1F5C4D',
  is_system boolean not null default false,
  system_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.saved_item_collections (
  item_id uuid not null references public.saved_items (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (item_id, collection_id)
);

create table if not exists public.saved_item_tags (
  item_id uuid not null references public.saved_items (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  added_at timestamptz not null default now(),
  source text not null default 'user',
  primary key (item_id, tag_id)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.saved_items (id) on delete cascade,
  remind_at timestamptz not null,
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  status text not null,
  file_name text not null,
  item_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error text
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saved_items enable row level security;
alter table public.collections enable row level security;
alter table public.tags enable row level security;
alter table public.saved_item_collections enable row level security;
alter table public.saved_item_tags enable row level security;
alter table public.reminders enable row level security;
alter table public.import_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own items" on public.saved_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own collections" on public.collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tags" on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own item collections" on public.saved_item_collections
  for all using (
    exists (select 1 from public.saved_items i where i.id = item_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.saved_items i where i.id = item_id and i.user_id = auth.uid())
  );

create policy "own item tags" on public.saved_item_tags
  for all using (
    exists (select 1 from public.saved_items i where i.id = item_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.saved_items i where i.id = item_id and i.user_id = auth.uid())
  );

create policy "own reminders" on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own import jobs" on public.import_jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own audit logs" on public.audit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Future semantic search: add embedding vector column, do not store raw notes in logs.
-- alter table public.saved_items add column embedding vector(1536);
