# 5 November 2026 - reliable learning flows and laboratories

## Reported failures

- `/quiz` still loaded browser-only legacy setup after curriculum chapters changed. It now redirects to the server practice builder. Old local topic selections are reconciled against current textbook topics instead of passing obsolete selections into generation. The new builder reads URL subject/grade changes through Search Params and a Suspense boundary.
- Tutor deep links from AI exam/duel reviews carried snapshot question UUIDs absent from the reviewed bank. The private resolver now accepts only the caller's completed, revealed exam or ended duel snapshots. It does not expose active Arena questions or another student's content, and it does not promote an AI answer key to verified grading. Editing the new-lesson form clears the linked question. Starting a lesson initiates its first reply rather than leaving an empty chat.
- The footer `/results` route now presents database-backed exams, practice and duel history; legacy device-only review is separately available at `/results/device`.
- `/plan` lists all subject/grade selections with stored evidence/plans, plus saved exam plans. Empty-state trial links include the selected subject and grade. Saved plans remain readable even if historical chapter labels no longer match the latest catalogue.

## AI latency and budget

The model stays `gpt-5.4-mini-2026-03-17`. Guided teaching and validated question generation use low reasoning effort. Question output limits scale with remaining count; recent-stem context is bounded to 60. Practice generation runs at most three batches concurrently and settles the batch before releasing a failed job. Mathematical/shape/grade/topic validation, bounded retries and all complimentary reservations remain enabled. No paid fallback, external search tool or organization-wide free-usage guarantee was added. These are latency reductions in the request path, not a promise of fixed provider response time.

## Twenty browser-local laboratories

Math: quadratic function, draggable triangle/circle/quadrilateral, empirical coin/die probability, unit-circle trig.

Physics: series/parallel circuit with battery, resistors, fixed-resistance lamps and switch; forward motion with friction; thin-lens/concave-mirror and reflection/refraction; small-angle pendulum.

Chemistry: explicit H/C/N/O atom/bond builder with valence checks; five balanced stoichiometric reactions and limiting reagent; first 20 elements with shell counts and Cordero covalent radii; strong acid/base pH with water autoionization at 25°C.

Biology: rotatable 3D-coordinate projected schematic of major organs; Mendelian monohybrid Punnett model; plant/animal organelles with ER-Golgi-membrane transport animation.

Geography: projected 3D globe and geographic coordinates; explicitly synthetic climate graph with altitude/season/precipitation controls; simplified convergent/divergent/transform plate motion and illustrative wave animation.

Informatics: bubble/selection/insertion sorts, linear/binary search with step control; acyclic AND/OR/NOT/XOR/NAND/NOR network builder with live truth table.

All models declare their assumptions in the interface and use no API tokens. They are original local teaching models, not embedded PhET/HeartX products, clinical anatomy, real weather forecasts or earthquake prediction. Element coverage is explicitly the first 20; molecular stability, orbital quantum physics, complex inheritance and real circuit thermal behavior are outside these introductory models.

## Validation

72 deterministic tests cover existing AI budget/security contracts plus lab catalogue, formulas, sort/search, truth-table graph, molecular valence, limiting reactants, dilute pH and exact genetic outcomes. `database/verify-nov5-flows.sql` exercises snapshot ownership and plan-library isolation in a fully rolled-back transaction. TypeScript/lint and preview/Linux build are release gates. Actual authenticated provider response and observed latency must be stated separately from unit/rollback verification.

References consulted: OpenAI model and latency documentation, Supabase function guidance, OpenStax pendulum model, NHGRI dominant allele description, and Cordero et al., DOI 10.1039/B801115J. UI links identify the relevant educational sources. Do not substitute an unrelated resource if a topic has no reviewed link.

## Live verification

Production account UI returned a complete teacher reply and an explicit full solution to 75 × 4 / 100 = 3, with rendered math. A one-question grade-2 practice opened with the selected curriculum. QA left it through the new personal-practice exit; database status is abandoned with zero exam-result records, so no fabricated correct/wrong knowledge evidence was added. Results UI displayed real historical subject/grade rows and the ungraded stopped practice.

All 20 laboratory views rendered in the browser. Mobile 375px checks found and fixed filter-grid overflow and contained the logic truth table in a scroll wrapper. Quadratic coefficient keyboard control updated the graph; AA × aa showed 100% Aa.

The global complimentary policy remains enabled at 2,000,000 reserved tokens per UTC day. The app cannot observe complimentary organization enrollment or tokens consumed by unrelated applications.

