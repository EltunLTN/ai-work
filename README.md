<p align="center">
  <img src="./public/kairo-logo.svg" alt="Kairo Logo" width="520" />
</p>

<h1 align="center">Kairo</h1>
<p align="center">
  AI-powered Exam Coach for Mathematics, Physics, Biology, Geography and Chemistry, aligned with e-derslik topic structures.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-API-412991" />
</p>

## Overview

Kairo is a modern AI learning platform for Mathematics, Physics, Biology, Geography and Chemistry.
It provides:

- Diagnostic and adaptive quiz generation
- Skill-level detection and weakness analysis
- Mistake review with explanations
- Personalized 7-day AI plan
- Floating AI subject tutor with multi-turn conversation and student context
- Dashboard insights and progress tracking

The platform is designed for startup demo quality and practical daily use by students.

## Core Product Direction

- Subject scope: Mathematics, Physics, Biology, Geography and Chemistry
- Grade coverage: Mathematics 1–11; Physics, Biology and Geography 6–11; Chemistry 7–11
- Curriculum source: e-derslik references and topic structures
- Output language: Azerbaijani and English UI support
- Learning model: diagnostic first, adaptive next, plan-driven progression

## Key Features

### 1) AI Quiz Engine

- Generates topic-aware diagnostic question sets
- Generates adaptive questions based on weak topics and level
- Repairs malformed or inconsistent AI output
- Performs extra correctness checks for math patterns (including derivative-style checks)

### 2) Reliable Review Layer

- Stores user answers and served questions
- Shows where the student made mistakes
- Displays user answer, correct answer, and AI explanation together

### 3) Personalized Plan System

- Builds a 7-day AI study plan
- Interactive daily tasks with progress tracking
- Topic resource cards: material, mini quiz, video

### 4) Dashboard Analytics

- Predicted score and level
- Topic performance chart
- Recommended next action
- Learning stage snapshots

### 5) UX and Theming

- Dark and light theme modes
- Responsive mobile-first layout
- Framer Motion-powered interactive transitions

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- OpenAI API
- Reusable UI primitives

## Project Structure

- app: routes and API endpoints
- components: reusable UI and feature modules
- lib: AI client, analytics, storage, i18n, constants
- data: curriculum and topic references
- public: static assets and branding

## Main Routes

- / : Landing page
- /onboarding : Grade and textbook topic setup
- /quiz : Diagnostic plus adaptive quiz flow
- /results : Analysis plus detailed mistake review
- /plan : Interactive 7-day AI study plan
- /mini-quiz : Topic-focused quick quiz mode
- /dashboard : Persistent summary and progression view
- /account : Verified email login, password recovery, cloud save and restore
- /admin : Administrator-only student snapshot overview and homepage announcement editor

## AI Endpoints

- POST /api/ai/diagnostic
- POST /api/ai/adaptive
- POST /api/ai/feedback-summary
- POST /api/ai/study-plan
- POST /api/ai/chat

Compatibility endpoints:

- POST /api/ai/questions
- POST /api/ai/feedback
- POST /api/ai/plan

## Curriculum and Source Policy

Kairo uses e-derslik as a curriculum reference source, not as a raw content mirror.

- Source references are kept as metadata and topic guidance
- Full textbook content is not copied into the app
- Questions are generated as original outputs
- Science references include both parts where available, with direct e-Dərslik links and topic selections reviewed on 2026-10-14
- Grade choices follow the selected subject. Math answer-repair heuristics never modify science answers. Tutor history is separated by subject and grade.

Example source reference:

- https://www.e-derslik.edu.az/portal/book.php?id=817

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a .env.local file and set:

```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 3) Run the app

```bash
npm run dev
```

Open:

- http://localhost:3000

### 4) Quality checks

```bash
npm run lint
npm test
npm run build
```

## Production Notes

- Local storage is used for profile, question set, answers, result, feedback, and plan state.
- AI responses are validated and repaired before being served to the UI.
- Invalid questions are regenerated within the same grade and topic. Failed AI requests show errors; demo data and template plans are not substituted for AI output.
- Plans validate seven days, grade-specific topics, a checkpoint, and the selected daily time budget. Direct resource URLs come from a curated catalog, not model-generated links or search pages. External resources are labelled by provider and language.
- The tutor uses the existing server-side `OPENAI_API_KEY` and `gpt-6.1-sol` Responses API (configurable with `OPENAI_MODEL`). The existing server-side key is reused. Model access and billing depend on the OpenAI account; the admin panel includes a live connectivity test. Chat history is kept in session storage and the last 20 messages (within a size limit) are sent for follow-up context. OpenAI response storage is disabled for tutor requests.
- Score cards show observed practice accuracy on a 0–100 scale with a Wilson 95% uncertainty interval and sample size. These uncalibrated, topic-selected quizzes cannot support an official 700-point DİM prediction; no future score gains are invented.
- Activity, mini-quiz attempts, plan completion and XP are based on recorded actions. XP is granted once per result. Result reviews are saved with the completed attempt so a new quiz cannot overwrite an earlier review.
- Learning flows keep a browser-local working copy. Signed-in users automatically save their learning state and can also manually save or restore from `/account`. Learning changes automatically synchronize after a short debounce. On a new device, the account snapshot loads before learning pages render. Unsynced local work survives offline sessions and is retried on reconnection. Signing out clears the device's learning records.
- Supabase PostgreSQL stores account-owned snapshots. RLS limits students to their own data; verified administrators can read snapshots and edit the homepage announcement. Admin authorization uses a private allowlist and checks the current verified Auth user, rather than user-editable metadata.
- All AI endpoints verify the bearer token with Supabase Auth and consume an atomic database quota of 100 requests per account per UTC day. Quota failures deny the request before calling OpenAI.
- Wumpus links on desktop, mobile and the footer open the external Wumpus application. The previous HTML route redirects there too.

## Database and administrator setup

The deployed Kairo database is a separate Supabase project. For a new environment, apply `database/schema.sql` once using the Supabase SQL editor, then add the owner's lowercase email to `private.admin_emails`. No service-role key is needed in the application. Only the public project URL and publishable key go into `NEXT_PUBLIC_` variables.

The owner registers at `/account`, chooses a password and confirms their email before opening `/admin`. A browser cannot grant itself admin access. The label `KairoLTN1` is the panel name, not a shared password.

Set Supabase Auth's Site URL to your production `/account` URL. Password-reset links return there. For public registration, configure a custom SMTP provider: Supabase's default mail service is rate-limited and restricts recipients to organization members. Keep email confirmation enabled. Configure backups and monitoring appropriate to your traffic before a wider launch.

`database/verify-access.sql` tests student isolation, administrator access, unauthorized writes and the exact quota boundary in a rolled-back transaction. It leaves no test accounts or records behind.

## Security Recommendation

Do not commit real API keys to version control.

- Keep .env.local private
- Rotate any exposed keys immediately
- Use environment secrets in deployment platforms

## Roadmap Ideas

- Teacher dashboard and classroom mode
- Attempt history with trend lines
- Topic mastery heatmap per grade
- Parent view with weekly summary
- Question bank calibration and quality scoring

## License

For hackathon and educational demo use. Add a formal license file if you plan public distribution.


## Learning platform v2

Apply database files in this order for an existing v1 installation: `learning-platform-v2.sql`, `learning-analytics.sql`, `learning-platform-permissions.sql`. The permissions migration explicitly revokes Supabase default grants and exposes admin-only invoker wrappers around guarded functions in the private schema. Run `verify-platform-v2.sql` afterward; its transaction rolls back all test data.

- `practice_attempts` retains append-only quiz/mini-quiz results across devices, with an idempotent account/attempt key, per-topic correct/total counts and measured session duration when available. Historical duration stays unknown. These are self-reported practice records, not proctored assessments.
- `/dashboard` aggregates daily activity in Asia/Baku, totals, subject and topic weaknesses from PostgreSQL. Empty histories stay empty; no demo percentages or invented exam scores are substituted.
- Account profiles support first/last name, grade and private 256px WebP avatars. Uploads are decoded and re-encoded before storage. Only the owner and verified admins can read them.
- Admins search accounts, inspect each student's analytics, edit profile names/grade, suspend new AI requests, add notes and review an audit trail. Credential and admin-role editing is intentionally absent.
- AI uses explicit low/medium reasoning, bounded output budgets, no unsupported sampling parameters, no response storage and validated JSON contracts. Plans select topics only from the curated grade/subject curriculum; old plans regenerate with version 3.
- `ENABLE_RESOURCE_SEARCH=true` enables topic-specific web discovery restricted to educational publishers. A discovered URL must appear in the API's URL citations or retrieved source metadata and pass a provider/path allowlist. Generic courses, search results and unverified links are omitted. Existing hand-verified lesson mappings remain available without search. External supplements are labelled by language and do not claim alignment with the full local curriculum.
- The landing page has no subscription pricing or sample statistics. The optional first-visit scene uses an original AI-generated mentor, a red-pill White Rabbit passage and an evasive decorative blue pill. Keyboard users and reduced-motion preferences are supported.
- Public email registration still requires custom SMTP. The Supabase advisor also notes that leaked-password protection is disabled; enable it in Auth settings if supported by your plan before a broader launch.

## White Rabbit redesign

See [the design audit and implementation guide](docs/redesign.md) for the editorial design system, SVG character rig, scene state machine, accessibility controls and running instructions. All original learning/auth/data flows remain in place. `/playground` adds a local timing experiment alongside the existing external Wumpus game. Ctrl/Cmd+K, the companion menu and footer expose real navigation and intro replay.

## 3D guide and admin control center

The current release removes the Wumpus game and its external links. The blue pill is decorative and evades the pointer; red and Skip remain accessible entry controls. A lazy-loaded original Three.js rabbit crosses from the homepage illustration into the fixed guide. The renderer caps device pixel ratio, pauses drawing when hidden/offscreen, disposes GPU resources and retains an SVG fallback. No external video/model assets are used.

Apply `database/admin-control-center.sql` after the v2 migrations, then `database/admin-account-list-fix.sql` (explicit Auth email-to-text cast). It adds admin-only overview/detail/actions, bounded per-account AI limits (0–100), audited quota reset, profile-image moderation/restoration and learning-selection updates. Historical attempts remain unchanged. New avatar uploads are private, re-encoded WebP files; the admin upload policy requires the existing verified admin check. Run `database/verify-admin-control-center.sql` transactionally. The admin UI includes all application tools, per-user analytics, attempt/topic history, CSV export and audit details.

## Learning workspace release
See [dashboard, mixed exams and activity journal](docs/learning-workspace-release.md) for behavior, database rollout and verification. Apply `database/learning-workspace.sql` and `database/activity-journal.sql` after the existing admin migrations.
