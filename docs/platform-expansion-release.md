# Kairo platform expansion

This release extends the existing Next.js/Supabase/OpenAI/Vercel application. Existing accounts, mixed-subject practice, dashboard analytics, profile management, operational journal and original rabbit experience are retained.

## Delivered application routes

| Route | Persistent behavior |
| --- | --- |
| `/kairo` | Six-tool hub with the user's actual last exam, teacher session, primary goal, focus time, active duel and next event |
| `/kairo/exam` | Published, versioned templates and dated exam history |
| `/kairo/exam/session/[id]` | Eight answer formats, frozen question set, server deadline, answer revisions, autosave/reconnect, answer sheet, submission, provisional/manual review, final scores, per-subject/topic analysis and saved personalized study plan |
| `/kairo/tutor` | Persistent Socratic/explanation/practice lessons, sequential hints, attempts, explicit solution reveal, stop/retry, Markdown/LaTeX and consent-based response reports |
| `/kairo/university-goals` | Sourced specialization catalog, search/filters, multiple goals, primary/archive actions, compatible-score comparison and real weak-topic recommendations |
| `/kairo/focus` | Presets/custom Pomodoro, pause/resume, heartbeat-based valid time, midnight-safe daily ledger, preferences and history |
| `/kairo/duel` | Public nickname consent, private invitations, real matchmaking, cancellation/private conversion, history and earned achievements |
| `/kairo/duel/join/[token]` | Expiring two-seat invitation with safe login return |
| `/kairo/duel/match/[id]` | Participant-only Realtime notifications, polling fallback, ready/countdown/round/reveal/result states, server score, disconnect rules, review and rematch |
| `/kairo/arena` and `/kairo/arena/[id]` | Scheduled weekly fixed-set challenges, one attempt per participant, real stored rankings, registration limits, real-player knockout brackets, byes, new round questions and walkovers |
| `/admin/kairo` | Question review/editing, versioned templates, written rubrics, validated source CSV preview/import, events/weekly schedules, cancellations/disqualifications, duel monitoring, teacher controls and explicitly shared reports |

AI routes: `POST /api/ai/teacher`, `POST /api/ai/exam-plan`. Both reuse the existing provider, persistent quota and server access guard. All existing AI routes also reject assistance during active locked exams/duels. The floating teacher and full page share the same component and database sessions.

## Database and security

The ordered SQL is in `database/kairo/01-*.sql` through `11-*.sql`; deployable copies are in `supabase/migrations/`. Migration versions match the connected database's migration history. These are additive migrations for the existing Kairo schema, not a replacement for the older account/analytics migrations.

All question keys, learning records and helper functions are private. Private tables have RLS enabled with raw client grants revoked. Public RPC wrappers use invoker rights; guarded private functions check confirmed identity, current session and suspension, plus ownership/participant/admin authorization. Admin mutations are audited. Teacher finalization and plan saving require server attestation. No service-role credential is used in the browser.

`public.kairo_live_matches` exposes only match ID/revision with participant SELECT policy. No answer key, email or auth UUID is broadcast. Public competition profiles use random public IDs and separate consent. Invitation secrets are removed from application activity paths. The UI remounts private module state when the account changes.

Academic exam results enter `practice_attempts` once with `source='exam'`; browser practice inserts can only use `source='practice'`. Duel/Arena points and AI-assisted outcomes do not inflate independent academic mastery. Whole-exam elapsed time is stored on the exam session; it is not invented or proportionally assigned to subjects. Focus seconds are credited only for measured heartbeat intervals (max 30 seconds; gaps over 40 seconds earn zero and pause).

The existing authenticated daily `/api/cron/activity-retention` additionally calls `kairo_maintenance` to finalize deadlines, advance competitions, generate weekly events and pause stale focus sessions. Reads also advance the relevant state, so an event does not depend solely on the daily job.

## Content and official-data gates

- 307 original Kairo exercises cover five subjects at grade 11; seven items demonstrate the additional response formats. Numerical keys/options are checked deterministically. These are original practice materials, not copied or licensed DİM questions, and not a full official curriculum question bank.
- Six custom practice templates are published. The 2027 DİM I-RK profile is a **draft**, not advertised as a verified official simulator. Publishing requires official source, publication date, scoring reference, verified rules, permitted content and sufficient reviewed questions. Full DİM rubrics, time/material rules and an authorized, pedagogically reviewed content bank remain editorial dependencies.
- The sourced starter catalog contains Computer Science at three universities, including separate BDU language entries. No historical cutoff is invented; unknown cutoffs/group/language/format fields are labeled. The admin can import verified additional rows with source dates. A custom 100-point quiz is never converted into a 700-point admission score. A compatible verified full-scale result is required for that comparison.
- Mathematical verification deliberately supports a narrow linear-equation grammar and validated numeric/short bank answers. Unsupported symbolic proofs are not labeled verified; written exam responses use human review. Model confidence cannot set a verified grade.

Primary references checked for this release:

- [DİM announcement: continuation of the 2026 model for 2027](https://www.dim.gov.az/az/metbuat/xeberler/abituriyentlerin-nezerine-6)
- [DİM undergraduate admission information](https://dim.gov.az/az/fealiyyet/qebul-ve-imtahanlar/bakalavriat)
- [BDU specialization list](https://bdu.info.az/tehsil/bakalavriat-seviyyesi-uzre-ixtisaslarin-siyahisi)
- [ADA undergraduate admission](https://www.ada.edu.az/en/admission/undergraduate)
- [BHOS curriculum](https://www.bhos.edu.az/page/289/kurrikulum-strukturu)
- [KaTeX maintenance and security fixes](https://github.com/KaTeX/KaTeX/blob/main/CHANGELOG.md)

## Configuration and local execution

Required public variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Server only: `OPENAI_API_KEY`, existing `OPENAI_MODEL`, `ACTIVITY_SERVER_SECRET` (matching the database's stored digest), and production `CRON_SECRET`. Keep the current provider/model and secret values; no new AI account is required. Preview must receive AI and attestation variables as well as public connection variables. Never commit `.env.local` or QA credentials.

1. Run `npm ci` using Node 24.
2. Configure `.env.local` with development credentials. Missing AI/attestation values produce an explicit service error; synthetic responses are not substituted.
3. For an existing Kairo database, apply missing migration versions in order. For a fresh database, establish the older account, profile, analytics and activity-journal schema first; do not blindly run this expansion against an empty project.
4. Run `npm run dev`, then open `/kairo` with a confirmed account.
5. Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

Do not apply migrations twice. Native Supabase migration versions are reconciled with the local migration filenames. Deploy a Git preview, confirm the correct Vercel team/project/ref and a READY build, verify real account/API/data paths, then release the tested source to `main`. Existing user authorization covers this release.

## Verification evidence

- 46 Node tests pass, including deterministic math, sourced CSV validation, compatible admission scoring, teacher request policy and global exam AI lock, plus the existing regression suite.
- `database/verify-kairo-expansion.sql` tests authoritative scoring, eight formats, manual review, privacy/RLS, idempotency, goals, focus, teacher attestation, matching, scoring/timeouts, real rankings, byes, new-round question exclusion and walkovers. `database/verify-focus-precision.sql` checks fractional heartbeat carry and deadline completion; `database/verify-exam-plans.sql` adds server-attested plan persistence and cross-user denial. Run them **inside BEGIN/ROLLBACK** after loading the relevant schema; fixture identities are synthetic.
- An actual HTTP/WebSocket smoke test signed in two separate QA identities, completed five duel rounds, received 21 Realtime revisions, verified duplicate-answer protection, server scoring, exam resume/idempotency, AI lock, cross-user denial, goals, focus and teacher persistence. `scripts/verify-kairo-live.cjs` is opt-in and reads disposable QA credentials from an external path; it does not contain credentials or delete user data.
- Browser verification confirmed login return, actual hub data, autosaved/marked exam answers after reload and server-calculated results. The Vercel Linux preview build reached READY. Browser verification also confirmed a real Socratic hint, deterministic equation verification and a persisted seven-day exam study plan with a verified OpenStax topic source. A live browser focus round also completed at exactly 60 credited seconds after correcting subsecond heartbeat drift. Final desktop/mobile evidence is recorded in the delivery report.
- Production dependency audit: **0 vulnerabilities**. KaTeX is pinned to 0.19.1 through an override for the math adapters; raw HTML and trusted TeX commands remain disabled. Existing development-only audit findings are not represented as production vulnerabilities.
- Local Windows export workers encountered an EPERM while creating generated Next.js segment directories. Compilation and TypeScript passed; the Vercel Linux build is the release build gate.
- Supabase security advisor has no newly exposed raw private table. Informational RLS/no-policy findings are intentional default-deny private tables. The pre-existing leaked-password-protection warning and custom SMTP setup remain external Auth configuration dependencies.

## Main implementation files

`components/kairo/` contains the shared UI and module workspaces; `lib/kairo/` contains contracts, RPC hooks, math checking, goal comparison and CSV validation. `app/kairo/` contains the routes; `app/kairo-modules.css` integrates the established design tokens and responsive layouts. Existing AI access/client, dashboard, navigation, account return handling, activity redaction, privacy page and maintenance route were extended. Original authored content is in `data/kairo-authored-questions.json` and `public/kairo/parabola.svg`.
