-- Wine Discovery: photo scanning. New table + one new event name. Nothing from earlier tables is modified.

-- A tally of label reads, so the "scan-label" Edge Function can limit each person to 30 an hour.
-- It holds no photos and no text: only who asked and when. RLS is on with NO policies and no grants,
-- so the app (and anyone using the publishable key) can't read or write it. Only the Edge Function can,
-- using the service key that lives on the server. It disappears with the account.
create table public.wd_scan_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index wd_scan_calls_user_idx on public.wd_scan_calls (user_id, created_at desc);
alter table public.wd_scan_calls enable row level security;
revoke all on public.wd_scan_calls from anon, authenticated;

-- One more thing worth counting: a photo scan (properties: matched, outcome; never the photo or the words read).
alter table public.wd_events drop constraint wd_events_name_ok;
alter table public.wd_events add constraint wd_events_name_ok check (name in ('quiz_started', 'quiz_completed', 'quiz_stopped_early', 'meal_selected', 'wine_card_viewed', 'rating_saved', 'dislike_reason_selected', 'scan_simulated', 'scan_fallback_used', 'concept_screen_viewed', 'scan_photo'));
