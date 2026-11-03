# Learning workspace and configurable exams

## Product behavior
- Dashboard replaces local last-result widgets with a single database-backed view. All five subjects appear, including honest empty states. Filters apply across summary, daily graph, topic priorities and paginated history. Grade and subject remain visible on historical records. Dates use Asia/Baku boundaries. CSV exports only the displayed page and say so.
- Exam builder supports 1–5 supported subjects at exactly one grade, 1–20 questions per subject and grade-specific topics/textbooks. A subject unavailable at that grade is disabled, never silently moved to another grade. Question IDs are namespaced per session. Each subject is scored independently; visible practice time is attributed to that subject, not duplicated across all subjects. All questions must be answered before submission.
- Draft questions, answers, navigation and elapsed time survive reload within the same browser tab. A changed setup cannot reuse a stale draft. Successful generation batches are cached during retries. Multi-subject completion goes to the dashboard, where each subject has its own historical row.
- Cloud writes are serialized and compare the revision obtained during restore. A conflicting admin/device edit fails without replacing that data; the user's local copy remains available. Historical attempts remain immutable and are not pruned with the browser's working copy.
- Entrance uses Manrope and Plus Jakarta Sans with Latin Extended glyphs, larger utility controls, a longer five-stage 3D rabbit passage, depth rings, dust and light motion. Skip/Escape and reduced motion remain supported. Blue pill still evades the pointer and has no entry action.

## Operational journal
`private.activity_events` stores authenticated browser events, server-admitted AI request facts, and authoritative database mutation events. Browser events are best effort, can be suppressed by the device and do not constitute proof of completion; the source is explicitly shown. Database triggers independently record saved practice/profile/snapshot changes. Nothing predating this release is fabricated or backfilled as an observed event.

IP comes only from the Vercel-overwritten `x-vercel-forwarded-for` header, validated as an IP. The body cannot supply it. Local development records null. A private SHA-256 digest verifies a server-only secret before accepting events; direct authenticated RPC callers cannot forge an IP. User ID and timestamp are server controlled. No service-role key is used. Unknown event/metadata keys, query strings, raw form content, credentials and chat content are excluded. Browser metadata is untrusted and length bounded. Logging is limited to 300 events per account per minute.

Only the existing confirmed admin can read the journal via a guarded RPC. Cursor pagination (50), event/user/IP filters and page CSV are available. Each account also embeds the full learning dashboard and its own journal. Existing admin profile/name/grade/avatar/learning-selection/quota controls remain audited.

Retention: 90 days of operational events, daily authenticated Vercel cron at 03:15 UTC. `ACTIVITY_SERVER_SECRET` (production and preview) and `CRON_SECRET` (production) are Vercel secrets. The database contains only a digest of the former. Seed/rotate the digest through the authenticated database connection; never commit the secret value. Cron calls `/api/cron/activity-retention`. Public wrapper uses a private guarded implementation and explicit grants; raw tables have RLS and no client privileges. The intentional lack of policies on private journal tables means default deny, not missing protection.

## Database rollout
After existing database files: apply `database/learning-workspace.sql`, then `database/activity-journal.sql`. Provision the server-key digest before serving the event endpoint. These SQL files follow this repo's manual SQL rollout convention. The installed Supabase CLI could not write its global telemetry file on this Windows host, so the authenticated SQL connector was used for this rollout.

Validation: domain tests for mixed scoring, grade/count/topic validation, per-subject time, unique history IDs, reload recovery and event sanitization; transactional SQL in `database/verify-learning-workspace.sql` validates filtered aggregates at Bakı midnight, RLS boundaries, server attestation, metadata stripping, database triggers and snapshot conflicts. Fixtures roll back. Production build is also verified on Vercel because the Windows build host can fail with EPERM while creating Next output directories.

References: [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), [Vercel request headers](https://vercel.com/docs/headers/request-headers).
