# Kairo platform expansion: audit and delivery plan

Baseline: main `be884a51ff8b3c8ed36330b7fc3e1dc6f28ee084`, source tree `f2ade9350e4dab30d8649644c7ae3f21f4a42aa1`. The local Git index matches that tree; local HEAD is older because Windows Git credential-helper authentication failed during previous work. Do not discard staged baseline files.

## Existing platform
Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, existing custom components and Manrope/Plus Jakarta Sans fonts. Supabase JS 2.118 provides authenticated browser sessions, private avatar storage and PostgreSQL. OpenAI Responses uses the existing server-only key/model configuration; keep that provider and existing endpoints. Vercel Git integration deploys main to eltun.dev.

Existing subject/grade curricula: five subjects, primary mathematics through grade 11, sciences from grades 6/7. Existing diagnostic AI generation validates curriculum, count and answer shape. There is no persistent reviewed question bank: mock-data.ts contains four demo items, never a sufficient source for competitive scoring. Existing practice_attempts are browser-reported learning results, not authoritative competitive grades. They must remain clearly distinct from server-graded exam/duel/arena records. Existing learning snapshots have compare-and-swap saves. Admin authorization checks confirmed auth.users email against private.admin_emails, not editable metadata.

All exposed existing tables have RLS. Private administrative lists and quota tables have no client privileges. The Supabase Realtime publication has no tables. New private answer keys, frozen session question/key snapshots, transaction locks and narrow participant-safe live state are required. Public competition profiles must be explicitly separate from private account names/emails.

Reuse Navbar/Footer, Button, workspace tokens, analytics curriculum, aiFetch, server AI access control, private.is_admin, avatar storage, existing audit journal and dashboard. Do not replace these services or invalidate existing accounts/results.

## Implementation sequence
1. Add a reviewed question bank with private answer keys, versioned exam templates, server-authoritative session/answer/result engine and shared typed renderer. Cover objective marking, written-review states, autosave, deadlines, resume and idempotency with transactional tests.
2. Extend the current tutor with persisted Socratic sessions, three hint levels, explicit reveal, stop/retry, structured context, deterministic supported math checks and assisted-learning outcomes separated from independent mastery.
3. Add sourced university/program catalog, validated admin CSV import, multiple goals, primary-goal selection, progress comparisons only on compatible score scales, missing-data states and real analytics priorities.
4. Add timestamp/heartbeat-based focus sessions, preferences, pause/resume, active-time accounting, history and return-to-task links.
5. Add real two-person duels with locked joins, hashed invitations, ready/countdown/round state, server-time speed scoring, safe Realtime state, reconnect and matchmaking without simulated people.
6. Add fixed-set asynchronous arena competitions, real rankings/tie-breakers, registration, scheduled recurrence, knockout seeding/byes/advancement/walkovers, achievements and protected administration.
7. Integrate the six routes/navigation/dashboard widgets and admin screens, verify RLS/concurrency/regressions, run responsive browser QA and release through the existing Git/Vercel project.

## Official-content boundary
DİM's announcement dated 2026-09-10 states that 2027 second-stage exams retain the 2026 model, including 22 closed, 5 coded-open and 3 written tasks per subject, with subject/group variations. Source: https://www.dim.gov.az/az/metbuat/xeberler/abituriyentlerin-nezerine-6 . The admission overview identifies subject groups, 90 second-stage tasks and 400 maximum second-stage points: https://dim.gov.az/az/fealiyyet/qebul-ve-imtahanlar/bakalavriat . Those facts alone are not a verified complete scoring rubric or a licensed full question set. Official-format templates stay unpublished until complete rules and appropriate reviewed content are configured. Functional Kairo custom mock templates are explicitly unofficial.

University programs require institution/DİM source URLs, publication date when known and verification timestamps. Historical cutoffs are left null unless an authorized, sourced import supplies them. Never rescale ordinary quiz percentages to 700 admission points or fabricate a cutoff. Different-scale and pending-written scores are visibly separated.

## Verification approach
Automated domain tests plus transaction-scoped SQL fixtures for authorization, answer-key isolation, join capacity, repeated submissions, scoring/deadlines, written review, focus activity, goals and bracket advancement. Use two separately authenticated sessions for multiplayer integration; record the actual result, never assume rendering proves it. Existing tests remain required. No destructive migrations or deletion of real data.
