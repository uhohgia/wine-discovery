-- Wine Discovery: new tables only. Every table is prefixed wd_. Nothing from the earlier
-- Restaurant Journal app (restaurants, visits, wines, producers, ..., profiles) is modified.
-- Vocabulary lists mirror src/data/vocab.ts (a unit test fails if they drift apart).
-- Each CHECK constraint is on ONE line so that test can read it.

-- ---------- catalog (read-only for the client) ----------

create table public.wd_bottles (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  producer text not null check (length(btrim(producer)) between 1 and 120),
  vintage integer check (vintage between 1900 and 2100),
  type text not null,
  price numeric not null check (price >= 0),
  body text not null,
  sweetness text not null,
  acidity text not null,
  tannin text not null,
  fruit_character text not null,
  fruit_notes text[] not null default '{}',
  flower_notes text[] not null default '{}',
  extras text[] not null default '{}',
  pairings text[] not null default '{}' check (cardinality(pairings) between 1 and 5),
  occasions text[] not null default '{}',
  serve_tip text not null check (length(serve_tip) <= 200),
  talking_point text not null check (length(talking_point) <= 240),
  easy_to_like boolean not null default false,
  usually_sold_at text[] not null default '{}' check (cardinality(usually_sold_at) <= 6),
  label_image_path text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  constraint wd_bottles_type_ok check (type in ('red', 'white', 'rosé', 'sparkling', 'orange', 'other')),
  constraint wd_bottles_body_ok check (body in ('light', 'medium', 'full')),
  constraint wd_bottles_sweetness_ok check (sweetness in ('dry', 'off-dry', 'sweet')),
  constraint wd_bottles_acidity_ok check (acidity in ('soft', 'medium', 'zippy')),
  constraint wd_bottles_tannin_ok check (tannin in ('low', 'medium', 'high')),
  constraint wd_bottles_fruit_character_ok check (fruit_character in ('fresh', 'dried', 'jammy')),
  constraint wd_bottles_fruit_notes_ok check (fruit_notes <@ array['red-berry', 'blue-fruit', 'dark-fruit', 'green', 'citrus', 'stone-fruit', 'tropical', 'apple-pear']::text[]),
  constraint wd_bottles_flower_notes_ok check (flower_notes <@ array['white-flowers', 'purple-flowers', 'roses']::text[]),
  constraint wd_bottles_extras_ok check (extras <@ array['baking-spice', 'vanilla', 'toast', 'smoke', 'earthy']::text[]),
  constraint wd_bottles_occasions_ok check (occasions <@ array['dinner-party', 'date-night', 'weeknight', 'gift']::text[])
);

-- ---------- per-user tables ----------

create table public.wd_shelf_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  bottle_id text not null references public.wd_bottles(id) on delete cascade,
  source text not null,
  added_on date not null default current_date,
  primary key (user_id, bottle_id),
  constraint wd_shelf_items_source_ok check (source in ('bought', 'gift'))
);
create index wd_shelf_items_bottle_idx on public.wd_shelf_items (bottle_id);

-- One row per user. age_confirmed_at is the one-time 21+ confirmation. prefs stays {} until the quiz is done.
create table public.wd_taste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) < 8192),
  rating_count integer not null default 0 check (rating_count >= 0),
  age_confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.wd_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bottle_id text not null references public.wd_bottles(id) on delete cascade,
  verdict text not null,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint wd_ratings_verdict_ok check (verdict in ('loved', 'fine', 'not-for-me')),
  constraint wd_ratings_reasons_ok check (reasons <@ array['too-dry', 'too-sharp', 'too-heavy', 'too-sweet', 'mouth-drying', 'too-light', 'flavor', 'not-sure']::text[])
);
create index wd_ratings_user_idx on public.wd_ratings (user_id, created_at desc);
create index wd_ratings_bottle_idx on public.wd_ratings (bottle_id);

create table public.wd_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object' and pg_column_size(properties) < 4096),
  created_at timestamptz not null default now(),
  constraint wd_events_name_ok check (name in ('quiz_started', 'quiz_completed', 'quiz_stopped_early', 'meal_selected', 'wine_card_viewed', 'rating_saved', 'dislike_reason_selected', 'scan_simulated', 'scan_fallback_used', 'concept_screen_viewed'))
);
create index wd_events_user_idx on public.wd_events (user_id, created_at desc);
create index wd_events_name_idx on public.wd_events (name, created_at);

-- ---------- row-level security ----------

alter table public.wd_bottles enable row level security;
alter table public.wd_shelf_items enable row level security;
alter table public.wd_taste_profiles enable row level security;
alter table public.wd_ratings enable row level security;
alter table public.wd_events enable row level security;

-- Defence in depth: signed-out visitors get nothing, and the catalog can't be written from the client.
revoke all on public.wd_bottles, public.wd_shelf_items, public.wd_taste_profiles, public.wd_ratings, public.wd_events from anon;
revoke insert, update, delete, truncate on public.wd_bottles from authenticated;

-- Catalog: any signed-in user can read; there are no write policies.
create policy "wd_bottles: signed-in read" on public.wd_bottles for select to authenticated using (true);

-- Shelf and taste profile: each user has full control of their own rows only.
create policy "wd_shelf_items: owner" on public.wd_shelf_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "wd_taste_profiles: owner" on public.wd_taste_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Ratings and events are a log: add, read and delete your own (delete powers "delete my data"), never edit.
create policy "wd_ratings: owner read" on public.wd_ratings for select to authenticated using (user_id = (select auth.uid()));
create policy "wd_ratings: owner add" on public.wd_ratings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wd_ratings: owner delete" on public.wd_ratings for delete to authenticated using (user_id = (select auth.uid()));
create policy "wd_events: owner read" on public.wd_events for select to authenticated using (user_id = (select auth.uid()));
create policy "wd_events: owner add" on public.wd_events for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wd_events: owner delete" on public.wd_events for delete to authenticated using (user_id = (select auth.uid()));
