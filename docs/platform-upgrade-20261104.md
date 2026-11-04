# Kairo platform upgrade — 4 November 2026

- AI activation delay removed at the owner's request; the shared 2,000,000 reservation cap, eligible GPT-5.4 Mini snapshot, no tools/no fallback policy and rollover protection stay enabled. This is an application cap, not organization-wide billing enforcement.
- `/admin/overview`: administrator-only RPC authorization, searchable/paginated users, global totals and duel ranking. Selecting a user opens their actual dashboard, exam and duel protocol, practice topic results, saved plans, focus history, account editing and activity journal. Private AI chat content remains private.
- Admin accounts can edit name/surname/grade, suspend AI, manage avatar and request limits through existing audited operations. Arena creation is directly linked to `/admin/kairo?section=arena` and uses the existing validated tournament form.
- `/plan`: seven-day interactive timeline, subject/grade/time selection, dated calendar export, lesson/teacher → guided practice → mini-test → focus actions, persisted per-day task state and separate measured knowledge accuracy.
- Plans are generated from the latest ten independent persisted results. A new evidence fingerprint triggers one update; polling does not repeatedly generate the same plan. Server generation leases prevent duplicate parallel jobs; failed updates retain the old plan. Exam results already use the shared practice evidence table and are not added twice.
- New duel/create/find/rematch flows call the guarded AI generator. Grade, curriculum, requested difficulty, count, answer shape and recent host question stems are validated. Both players receive the same frozen set; answer keys remain server-side until reveal. Failed generation leases are released. AI-authored content is labelled and does not count as independent mastery evidence.
- Duel results generate an immutable per-match/player rating ledger: initial 1000, win +25, loss −10, draw +3. Repeated completion cannot add points again. First/five/ten win badges and W/L/draw totals are persisted. Abandonment with a winner counts; mutual absence does not award draw points.
- Dashboard integrates module results, duel outcomes, ranking, badges, tutor counts, focus activity and weak-topic plan links with the existing subject analytics.
- Entrance uses one persistent 3D rabbit renderer through the intro, hero and dock; no SVG/3D loading swap. Added softer crown/head animation and an accretion-ring black-hole passage. Intro/footer text is Azerbaijani, with reduced-motion support preserved.

Validation: TypeScript, ESLint and 58 Node tests pass. `database/verify-platform-upgrade.sql` verifies admin denial, AI matching/idempotency/answer privacy, ratings/badges and plan leases/day-specific task state in a rollback-only transaction. No persistent QA accounts are created. Live model correctness and the organization's free-token status cannot be established by these tests.

SQL migrations are additive and private tables have RLS with client grants revoked. Migration versions have been reconciled to the CLI-generated local files. Previous local Git index state was preserved; releases use the connected GitHub API against the current remote main tree.

Final regressions: duplicate requests cannot release another generation lease; new evidence arriving during plan generation is queued for the next update; the choice screen is hidden during portal reveal to prevent a flash.

Account-transition regression: module views clear on sign-out/sign-in; in-flight responses from the previous identity are discarded, and denied identities never retain cached administrator data.
