-- Restaurant Journal: schema, row-level security, storage.
-- Mirrors src/schemas.ts. Ids are text so sample data keeps readable ids; new rows get UUIDs.

-- ---------- tables ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  home_city text,
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(btrim(name)) between 1 and 120),
  address text,
  city text,
  neighborhood text,
  lat double precision,
  lng double precision,
  external_id text,
  source text not null check (source in ('seed', 'osm', 'user')),
  -- Free-text ('user') restaurants are visible only to their creator until a public visit exists there.
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index restaurants_external_id_key on public.restaurants (external_id) where external_id is not null;
create index restaurants_created_by_idx on public.restaurants (created_by);

create table public.producers (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(btrim(name)) between 1 and 120),
  -- case/diacritics-folded name (computed by the app) so duplicates collapse
  name_normalized text not null unique,
  region text,
  country text,
  created_at timestamptz not null default now()
);

create table public.wines (
  id text primary key default gen_random_uuid()::text,
  producer_id text not null references public.producers(id) on delete cascade,
  name text not null check (length(name) <= 160),
  name_normalized text not null,
  vintage integer check (vintage between 1800 and 2100),
  region text,
  grape text,
  style text check (style in ('red', 'white', 'rosé', 'sparkling', 'orange', 'dessert', 'fortified', 'other')),
  created_at timestamptz not null default now()
);
create unique index wines_identity_key on public.wines (producer_id, name_normalized, coalesce(vintage, 0));

create table public.visits (
  id text primary key default gen_random_uuid()::text,
  -- null only for sample "community" visits seeded by migration; real visits always have an owner
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id text not null references public.restaurants(id),
  visited_on date not null,
  rating integer check (rating between 1 and 5),
  note text not null default '' check (length(note) <= 500),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index visits_user_idx on public.visits (user_id, visited_on desc);
create index visits_restaurant_idx on public.visits (restaurant_id);
create index visits_public_idx on public.visits (restaurant_id) where is_public;

create table public.visit_wines (
  visit_id text not null references public.visits(id) on delete cascade,
  wine_id text not null references public.wines(id),
  price numeric check (price >= 0),
  serving text check (serving in ('glass', 'bottle')),
  user_drank boolean not null default false,
  primary key (visit_id, wine_id)
);
create index visit_wines_wine_idx on public.visit_wines (wine_id);

create table public.visit_images (
  id text primary key default gen_random_uuid()::text,
  visit_id text not null references public.visits(id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('list', 'label'))
);
create index visit_images_visit_idx on public.visit_images (visit_id);

create table public.lists (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 80),
  slug text not null unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index lists_user_idx on public.lists (user_id);

create table public.list_restaurants (
  list_id text not null references public.lists(id) on delete cascade,
  restaurant_id text not null references public.restaurants(id),
  position integer not null default 0,
  primary key (list_id, restaurant_id)
);
create index list_restaurants_restaurant_idx on public.list_restaurants (restaurant_id);

create table public.events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (name in (
    'signup', 'capture_started', 'capture_completed', 'extraction_edited', 'visit_saved',
    'visit_made_public', 'list_created', 'list_shared', 'shared_list_viewed', 'search_performed'
  )),
  properties jsonb not null default '{}'::jsonb check (pg_column_size(properties) < 4096),
  created_at timestamptz not null default now()
);
create index events_name_created_idx on public.events (name, created_at);
create index events_user_idx on public.events (user_id);

-- Emails allowed to read events / metrics. RLS is on with no policies: only the dashboard/service role can edit it.
create table public.admin_emails (email text primary key);

-- ---------- functions ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_emails a
    where lower(a.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function public.restaurant_has_public_visit(rid text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.visits v where v.restaurant_id = rid and v.is_public)
$$;
grant execute on function public.restaurant_has_public_visit(text) to anon, authenticated;

-- Every new auth user gets a profile and a `signup` event (server-side, so it can't be faked or skipped).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), split_part(coalesce(new.email, ''), '@', 1));
  insert into public.events (user_id, name) values (new.id, 'signup');
  return new;
end
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row-level security ----------

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.producers enable row level security;
alter table public.wines enable row level security;
alter table public.visits enable row level security;
alter table public.visit_wines enable row level security;
alter table public.visit_images enable row level security;
alter table public.lists enable row level security;
alter table public.list_restaurants enable row level security;
alter table public.events enable row level security;
alter table public.admin_emails enable row level security;

-- profiles: your own row only
create policy "own profile: read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- restaurants: catalog places are public; free-text places only to their creator, or once a public visit exists
create policy "restaurants: read" on public.restaurants for select to anon, authenticated
  using (source <> 'user' or created_by = (select auth.uid()) or public.restaurant_has_public_visit(id));
create policy "restaurants: add" on public.restaurants for insert to authenticated
  with check (created_by = (select auth.uid()) and source in ('osm', 'user'));

-- producers & wines: a shared catalog (no personal data). Anyone signed in may add; nobody edits.
create policy "producers: read" on public.producers for select to anon, authenticated using (true);
create policy "producers: add" on public.producers for insert to authenticated with check ((select auth.uid()) is not null);
create policy "wines: read" on public.wines for select to anon, authenticated using (true);
create policy "wines: add" on public.wines for insert to authenticated with check ((select auth.uid()) is not null);

-- visits and everything hanging off them: owner only. Public reads go through public_visit_pours below.
create policy "visits: owner" on public.visits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "visit_wines: owner" on public.visit_wines for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid())))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid())));
create policy "visit_images: owner" on public.visit_images for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid())))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid())));

-- lists: owner only (sharing is by self-contained link for now)
create policy "lists: owner" on public.lists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "list_restaurants: owner" on public.list_restaurants for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- events: anyone (even signed out, e.g. someone viewing a shared list) can add their own; only admins read
create policy "events: add" on public.events for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "events: admins read" on public.events for select to authenticated using (public.is_admin());

-- ---------- public "who pours what" ----------
-- Intentionally NOT security_invoker: it exposes ONLY restaurant, wine, producer and visit date for
-- public visits. No user id, note, rating or price, ever.
create view public.public_visit_pours as
select
  v.id as visit_id,
  v.visited_on,
  r.id as restaurant_id,
  r.name as restaurant_name,
  r.address as restaurant_address,
  r.city as restaurant_city,
  r.neighborhood as restaurant_neighborhood,
  r.lat as restaurant_lat,
  r.lng as restaurant_lng,
  r.external_id as restaurant_external_id,
  r.source as restaurant_source,
  w.id as wine_id,
  w.name as wine_name,
  w.vintage as wine_vintage,
  w.region as wine_region,
  w.grape as wine_grape,
  w.style as wine_style,
  p.id as producer_id,
  p.name as producer_name,
  p.name_normalized as producer_name_normalized,
  p.region as producer_region,
  p.country as producer_country
from public.visits v
join public.restaurants r on r.id = v.restaurant_id
left join public.visit_wines vw on vw.visit_id = v.id
left join public.wines w on w.id = vw.wine_id
left join public.producers p on p.id = w.producer_id
where v.is_public;
revoke all on public.public_visit_pours from public, anon, authenticated;
grant select on public.public_visit_pours to anon, authenticated;

-- ---------- storage: private bucket for list / label photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-images', 'visit-images', false, 2097152, array['image/jpeg']);

-- Files live under "<user id>/…" and only that user can touch them.
create policy "visit images: read own" on storage.objects for select to authenticated
  using (bucket_id = 'visit-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "visit images: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "visit images: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'visit-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
