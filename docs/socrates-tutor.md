# Socrates tutor visual and plan encoding fix

The existing Kairo AI teacher has a Socrates-inspired visual identity. This is an AI assistant, not a historical quotation or a change of model. The floating portrait opens the same authenticated teacher workspace; the portrait also sits beside the conversation and identifies assistant messages. The page supports keyboard controls, small screens, and reduced motion. Existing tutoring, access, budget and exam-lock rules are unchanged.

Asset: `public/kairo/socrates-v1.webp` (512 × 512, alpha, about 60 KB), derived from the built-in image generation output. No application API key was used to generate the visual.

## Final generation prompt

Use case: stylized-concept. Create one premium 3D illustrated portrait bust of the ancient Greek philosopher Socrates as a warm, wise AI tutor mascot for the Kairo learning website. Recognizable bald domed head, broad nose, deep thoughtful kind eyes, curly grey-white beard, classical ivory draped tunic. Friendly subtle smile, elegant sculptural realism with soft tactile marble-like skin but living expressive eyes, comparable polish to a high quality storybook 3D white rabbit mascot. Front three-quarter head facing slightly to viewer's right toward a chat panel. Entire head and shoulders fully in frame with comfortable padding, centered square composition. Soft warm key light, subtle coral pink rim light matching #F17A83 and muted olive reflected light. Genuinely transparent background with alpha. No pedestal, no text, no symbols, no logos, no extra objects. High facial detail, refined silhouette, readable at small chat avatar sizes.

## Plan error

Postgres logs identified SQLSTATE 22P05 when a model task included an escaped NUL. JSON can represent NUL and lone UTF-16 surrogates, but PostgreSQL `jsonb` cannot. The shared study-plan validator removes NUL and replaces lone surrogates before validating and persisting prose. Valid surrogate pairs, Azerbaijani letters, math, tabs and newlines are preserved. Text that becomes empty still fails validation. Both exam plans and adaptive plans use this validator. No schema or permission change is needed.

Reference: https://www.postgresql.org/docs/current/datatype-json.html

Regression coverage sends a contaminated model response through the real plan generator and checks the exact cleaned result without an extra generation request.
