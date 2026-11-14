# Wine Discovery

A friendly, jargon-free wine discovery app. For any bottle it says, in plain language, what it tastes like, whether *you* will probably like it, what to eat with it, and one thing to say about it. Every rating, liked or not, sharpens your taste profile.

**Status: the MVP is complete (milestones a to g).** Sign up with email and password, confirm you're 21+, take the 6-screen taste quiz (or stop after two screens), and see your taste profile. Add bottles to **My shelf** and open a **wine card** for any bottle. Pick a meal or occasion on Home to rank the bottles on your shelf, with a confidence label and a plain-language reason. Rate bottles (loved it / it was fine / not for me, with a "why not?" question) and your profile learns. **Scan** is simulated for now (one button picks a bottle and opens its wine card, with a typed search underneath), and six bannered **concept previews** sketch ideas we're testing. The collection is your 10 real bottles, with their photos. Reading a photo of a label is built but switched off (see "Photo scanning" below). **You** has "Delete my data". Not built: deleting the sign-in account from inside the app. See [DECISIONS.md](DECISIONS.md) for every choice, what's verified, and the honest gaps.

> Earlier work on a restaurant-journal app is saved in `_archive/restaurant-journal.tar.gz`. Its database tables are still in your Supabase project and are not touched by this app.

## Setup

Requires Node 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Copy `.env.example` to `.env.local` and fill in the two Supabase values. Without them the app runs in device-only demo mode (accounts live in the browser and passwords aren't checked).

**Database.** The tables (`wd_bottles`, `wd_shelf_items`, `wd_taste_profiles`, `wd_ratings`, `wd_events`), their row-level security and the 10 placeholder bottles are in `supabase/migrations/` (the two `2026110720…` files). They are already applied to the connected project. To set up a different Supabase project, run those files in order in its SQL editor, and turn off "Confirm email" under Authentication if you want sign-up to sign you straight in.

**Not set up on purpose:** hosting/deployment. `npm run build` makes the static site in `dist/`; any static host works (single-page app: send unknown paths to `index.html`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm test` | Vitest unit and component tests |
| `npm run test:e2e` | Playwright tests (demo mode, uses your installed Chrome): journeys, axe on every screen, 320/390/768/1280px widths, 200% text, keyboard-only, page structure, and the offline app shell (builds and serves the production site) |
| `npm run test:e2e:cloud` | Read-only checks against your real Supabase project. Add `LIVE_SIGNUP=1` to also create (and keep) a real test account. |
| `npm run bottles:check` | Validate `src/data/bottles.json` against the controlled vocabularies |
| `npm run bottles:sql` | Print an idempotent SQL upsert of the bottle catalog |
| `npm run icons` | Regenerate PWA icons |

## Photo scanning

**Status: built, deployed, switched off.** Scan is simulated until you turn this on. The app only uses it when `VITE_PHOTO_SCAN=1` is set (in `.env.local`), and the function does nothing until it has an Anthropic key.

When on, Scan sends a photo to a small Supabase Edge Function (`supabase/functions/scan-label/`), which asks Claude to read what's printed on the label (maker, wine name, year, type). The app then matches that against the collection (`src/lib/matchLabel.ts`) and opens the wine card. The photo is shrunk on the phone first, used for that one request, and not stored or logged. Each person can read 30 photos an hour.

**To switch it on** (you do these, because they need your own Anthropic key, which must never go in the app or in chat). The two database migrations and the function deploy are already done in your project (`arhuymvyhgvfbqoekcgh`); what's left is:

1. Check the draft taste details and prices in `src/data/bottles.json`.
2. Put your Anthropic API key in Supabase as a secret (it stays on the server):

```bash
supabase secrets set ANTHROPIC_API_KEY=your-key-here --project-ref arhuymvyhgvfbqoekcgh
```

3. Add `VITE_PHOTO_SCAN=1` to `.env.local` and restart `npm run dev` (for a deployed site, set it as a build variable).

4. Check it with your own photos (this reads all 20 front and back photos with Claude, and spends a few cents):

```bash
LIVE_SCAN=1 npm run test:e2e:cloud -- scan-photos
```

With the key missing, tapping "Take a photo" shows a kind "isn't switched on yet" message and the typed search still works. The function uses `claude-haiku-5-5`, the cheapest current model (`LABEL_MODEL` in `read-label.ts`): roughly a few hundredths of a cent per scan (an estimate, not measured), so a thousand scans cost well under a dollar. It's billed to your Anthropic API account, separately from any Claude subscription. To cap it, use prepaid credits or set a monthly spending limit in the Anthropic Console. The `scan-photos` check shows how well it reads your 20 photos; if it misses some, `claude-sonnet-5-5` is the next step up.

To try the screen with no Supabase and no Claude, run `VITE_FAKE_SCAN=1 npm run dev`: a development-only pretend reader "reads" the photo's file name (`story-syrah.jpg` opens that bottle; `not-a-label.jpg` and `broken.jpg` show the other outcomes). It is left out of the production build.

## Checking how it's going

`supabase/validation_queries.sql` has ready-to-run queries for the questions this MVP exists to answer: how many people finish the quiz or stop early (and where), which meals get picked, why people say "not for me", how ratings split, how often the typed fallback finds nothing, and which concept previews get attention. Paste them into the Supabase SQL editor. They read counts and fixed choices only; the app never records what anyone types.

## Checks a person still needs to do

The automated tests can't replace these. Please try them once on real hardware:

1. **A real phone** (iPhone Safari and an Android browser): sign up, do the quiz, rate a bottle.
2. **Add to Home Screen**, then open it from the icon: it should open full screen as "Wine", and still open with Wi-Fi off (you'll see the "You're offline" bar).
3. **A screen reader** (VoiceOver on iPhone or Mac): go through Home, a wine card and a rating. Tests check labels, headings and landmarks, but not how it sounds.
4. **Larger text**: set your phone's text size to the largest setting and look for anything cut off.
5. **Dark mode and bright sunlight**: the app is light only; check it's readable outdoors.

## Tuning the quiz and recommendations

All the rules live in `src/data/` as plain tables, separate from the logic in `src/lib/`:

| File | What you can tune |
|---|---|
| `quizRules.ts` | The quiz screens and wording, and how each answer becomes a taste target |
| `profileNames.ts` | The playful profile names and the rules that pick one (first match wins) |
| `dislikeRules.ts` | How each rating and each "not for me" reason moves your taste profile (step sizes) and the warm sentences we say back |
| `pairingRules.ts` | What each meal and occasion likes in a wine (ideal scales, wine types, easy-to-like, price) and the plain sentences that explain a match or a miss; also the 50/50 blend of pairing and taste |
| `scoringWeights.ts` | How much each dimension counts when scoring a bottle, and where "A good bet" / "Worth a try" / "A stretch" begin |
| `whyPhrases.ts` | The plain words used to explain a score |
| `pricing.ts` | The `$` / `$$` / `$$$` thresholds |
| `glossary.ts` | The tap-a-word meanings |
| `scales.ts`, `notes.ts` | The everyday analogies and plain-language note names |
| `vocab.ts` | The allowed values (must match the database; a test checks this) |

## The bottle data

All bottles live in **`src/data/bottles.json`**, one object per bottle. Every value for body, sweetness, acidity, tannin, fruit character, notes and occasions must come from the lists in `src/data/vocab.ts`; `npm run bottles:check` fails with a readable message on anything unknown.

Your 10 real bottles are in `src/data/bottles.json`, each with a front photo in `public/bottles/<id>.jpg` (about 90 KB each, shrunk from the originals in `bottle-photos/`). The taste details and prices there were filled in from the label photos as a first draft, so please review them. The automated tests use a separate set of 10 made-up bottles (`src/data/bottles.sample.json`, "Sample Red 1"…), so they don't change when you edit yours.

To add or change bottles:

1. Edit `src/data/bottles.json` (set `"is_placeholder": false` on real ones). For a photo, save a front picture as `public/bottles/<id>.jpg` (about 600×800) and set `"label_image_path": "/bottles/<id>.jpg"`.
2. Run `npm run bottles:check` (it also checks that every photo exists).
3. Run `npm run bottles:sql` and paste the output into the Supabase SQL editor. It's an upsert, so it's safe to run again.
4. Run `npm run bottles:check` again: it also warns if a serving tip or talking point uses wine jargon (like "tannin") that isn't explained.
5. Remove old placeholders you no longer want: `delete from public.wd_bottles where is_placeholder;` (this also removes shelf items and ratings that point at them).

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL. Unset = demo mode. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable key. Safe in the browser: row-level security protects the data. |

Never put a service-role key in the browser or in a `VITE_*` variable.
