# Kairo learning expansion — 4 November 2026

## Delivered behavior

- `/onboarding`: class-based, multi-subject practice and mixed-grade DİM preparation. The latter is explicitly a Kairo practice, not the complete official DİM exam format or score. RK and IV subject presets follow the [DİM subject groups](https://dim.gov.az/az/fealiyyet/qebul-ve-imtahanlar/bakalavriat). Each mixed run samples up to three eligible grades per subject, without excluding other grades from future runs.
- Supplied `data/curriculum.json`: 30 subject/grade chapter catalogues, five subjects, 5–11th grades as available. Earlier primary mathematics references remain available. Covered textbooks keep their saved IDs and use the new chapter titles.
- New practice questions are generated through the existing complimentary-budget wrapper. Generation has an attested, per-user request lease; completed sets become immutable server exam snapshots. Keys stay private during an exam. Individual question grades drive result aggregation, rather than assigning all mixed questions to grade 11.
- `/kairo/replay/:id`: server-accepted answer changes, foreground time and navigation events, interactive playback, per-question summary and mistake notes. Telemetry starts with this release; old sessions have no invented timing. Rapid changes between autosaves and unflushed/offline timing may not be present. Device timing is descriptive, not a grading or ranking input.
- `/kairo/mistakes`: exam history and self-reported mistake reasons. The interface does not diagnose the cause from a wrong answer alone. The teacher handoff includes the question and explicitly labels the student's stated difficulty; the teacher can explain and create practice under the same budget cap.
- `/kairo/lab`: adjustable quadratic graphs, draggable/keyboard-controlled triangle vertices, and an ideal constant-force motion model. No model calls.
- `/admin/overview?competitions=1`: all recent duels and Arena entries, per-player correct/wrong/score, tournament bracket and answer protocols. User dossiers include a competition tab. Reads are admin-gated and protocol inspections audited. Lists are bounded to 100 recent competitions; existing user and date history filters remain available.
- Stable `KR-…` public student identifiers appear in account and dashboard. They are random identifiers, not credentials, and reveal no email or private Auth ID. All existing accounts are backfilled; visiting the account creates the identifier for a new account.
- Math renderer normalizes provider `\\[...\\]` and `\\(...\\)` delimiters before Markdown, preserving literal code examples. Footer rabbit fits inside a larger doorway.

## Admission source provenance

`data/admissions-2026.json` retains the user-provided workbook SHA-256, all row sources, 54 institutions and 1,179 programme variants. There are 375 coded rows reported by secondary sources and 804 preliminary programme rows. The database additionally retains four existing programme rows. Separate admission codes are not collapsed when a source omits the distinguishing language. Empty cutoffs remain null. Aptitude pairs such as `6/60` are retained as text, never parsed as a fraction or a 700-point score.

These rows are published with `secondary/reported` or `preliminary/unknown` status, not official verification. The [official DİM announcement](https://dim.gov.az/az/metbuat/xeberler/ali-tehsil-muessiselerine-ixtisas-secimi-baslanib-3) establishes the admission year but does not verify individual cutoffs. Those require the relevant [Abituriyent journal](https://www.abiturient.az/). The catalogue and personal goals disclose this distinction. No prediction is presented as an official cutoff.

## Operational safeguards and checks

The existing model remains `gpt-5.4-mini-2026-03-17`. The global daily reservation cap remains **2,000,000**, below the user-reported 2.5 million complimentary allowance. Failed requests keep their reservations. No paid tool or model fallback was introduced. This application cannot observe other traffic in the same OpenAI organization or changes to its complimentary enrollment.

New tables are in `private`, with RLS and no raw client grants. Public wrappers are SECURITY INVOKER; ownership/admin and server-attestation checks run in the private functions. `database/verify-learning-expansion.sql` uses transaction-only fixtures and rolls back every account and event. It covers access denial, answer-key privacy, exact mixed-grade results, accepted answer-change recording, mistake persistence and admin review. No provider traffic is used by automated tests.

Browser checks must use the released preview/production origin: this desktop's in-app browser cannot reach the local `127.0.0.1` development server. Authenticated admin views also require a real login; database fixtures verify their authorization and data contracts without borrowing a user's session.

