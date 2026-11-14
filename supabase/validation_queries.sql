-- Wine Discovery: questions the MVP should answer.
-- Run these in the Supabase SQL editor (as the project owner; the app itself can only see each person's own rows).
-- Every query reads wd_events / wd_ratings, which hold no typed text: only counts, ids and fixed choices.

-- 1. Quiz funnel: how many people start, finish, or stop early?
select
  count(distinct user_id) filter (where name = 'quiz_started')       as started,
  count(distinct user_id) filter (where name = 'quiz_completed')     as finished,
  count(distinct user_id) filter (where name = 'quiz_stopped_early') as stopped_early
from public.wd_events;

-- 1b. Where do people stop early?
select (properties->>'at_step')::int as stopped_at_screen, count(*) as people
from public.wd_events
where name = 'quiz_stopped_early'
group by 1
order by 1;

-- 2. Which meals and occasions do people pick?
select properties->>'kind' as kind, properties->>'id' as choice, count(*) as times_picked,
       round(avg((properties->>'shelf_size')::int), 1) as avg_bottles_on_shelf
from public.wd_events
where name = 'meal_selected'
group by 1, 2
order by times_picked desc;

-- 3. Why do people say "not for me"?
select properties->>'reason' as reason, count(*) as times
from public.wd_events
where name = 'dislike_reason_selected'
group by 1
order by times desc;

-- 4. How do ratings split? (Do people like what we suggest?)
select verdict, count(*) as ratings, round(100.0 * count(*) / sum(count(*)) over (), 1) as percent
from public.wd_ratings
group by 1
order by ratings desc;

-- 4b. Ratings per bottle, to spot bottles that keep missing.
select b.name, r.verdict, count(*) as ratings
from public.wd_ratings r
join public.wd_bottles b on b.id = r.bottle_id
group by 1, 2
order by 1, 3 desc;

-- 5. Scanning: how often does the typed fallback get used, and does it find anything?
select
  count(*) filter (where name = 'scan_simulated')     as scans,
  count(*) filter (where name = 'scan_fallback_used') as typed_searches,
  count(*) filter (where name = 'scan_fallback_used' and (properties->>'results')::int = 0) as typed_searches_with_no_match
from public.wd_events;

-- 6. Which concept previews get attention? (Interest signal for what to build next.)
select properties->>'screen' as concept, count(*) as views, count(distinct user_id) as people
from public.wd_events
where name = 'concept_screen_viewed'
group by 1
order by people desc, views desc;

-- 7. Which wine cards are opened most?
select properties->>'bottle_id' as bottle, count(*) as views,
       count(*) filter (where (properties->>'on_shelf')::boolean) as opened_from_shelf
from public.wd_events
where name = 'wine_card_viewed'
group by 1
order by views desc;

-- 8. Do people come back to rate more than once? (Profile sharpening needs repeat ratings.)
select rating_count, count(*) as people
from public.wd_taste_profiles
group by 1
order by 1;
