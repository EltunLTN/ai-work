# Kairo / Follow your curiosity

## Audit and compatibility

This is an Azerbaijani learning application, not a portfolio. Next.js 16.4.3 App Router, React 19, TypeScript, Tailwind 4, existing Framer Motion and Recharts. Routes: `/`, `/onboarding`, `/quiz`, `/mini-quiz`, `/results`, `/plan`, `/dashboard`, `/account`, `/admin`; legacy Wumpus URL redirects to the existing external game. Eight authenticated AI endpoints and an admin model check call OpenAI through existing quota/auth guards. Supabase Auth, snapshots, append-only attempts, analytics RPCs, profiles, private avatars and admin audit remain unchanged. No schema, provider, quota or secret changes in this redesign.

The old presentation was dark red/black, with repeated rounded cards, a static orbital hero and an evading blue pill. The original mentor WebP can be reused: it was generated specifically for this project and does not depict a film actor. Existing optimized Space Grotesk and Plus Jakarta Sans fonts are retained. No real portfolio/experience/contact data exists to justify inventing those sections.

## Implementation sequence

1. Establish warm ivory/charcoal tokens, editorial type, shared application controls and navigation.
2. Author one original SVG White Rabbit rig with pocket watch and monocle; no remote character assets or extra animation dependencies.
3. Replace the old intro with accessible red/blue choices and a 3.25-second, skippable passage; blue and reduced-motion paths enter directly.
4. Add global companion, persisted hiding, contextual minimizing, replay and native command dialog.
5. Redesign homepage with a typographic opening, illustrated guide, learning method, subject index, real progress, Playground and closing doorway. Restyle all existing application routes, forms, loading/empty/error states.
6. Verify existing application tests, lint/types, production build and browser flows at representative widths; record measured results separately.

## Architecture

`ExperienceProvider` owns the scene state machine and the companion state. One SVG drawing in `white-rabbit.tsx` is shared between scene, guide and illustrations. State animation is separated into the body, ears, eyes, head and watch, so transforms do not conflict. Scene timers and all global listeners are cleaned up. Sound is synthesized with Web Audio only following a user gesture and explicit opt-in, muted at each fresh page load. No audio files, movie assets, WebGL, video or new packages.

`MotionSystem` uses IntersectionObserver for one-time section reveals and pauses offscreen character art. A child-list MutationObserver enrolls content that arrives after cloud hydration. Scroll reactions are passive and distance-throttled (320 px); there is no scroll hijacking or per-frame React state loop. CSS `transform`/`opacity` supply motion. Document-hidden animation is paused globally. Reduced-motion removes movement, including all existing animation styles.

`experience.css` defines semantic surface, type, spacing and control styling for light/dark themes. Shared Button/Card and WorkspaceHeading establish application consistency. Auth, question generation, grading, plan state, cloud writes, profile/admin editing and resource validation retain their existing logic. The subject index passes a validated subject to onboarding.

`/playground` exposes the existing Wumpus game and a local ten-second timing experiment. Timing is not a scored assessment, writes no student records, stops after 30 seconds and resets if the document becomes hidden. The companion also offers a persisted reduced-motion option, while always respecting the operating system preference. The watch interaction is optional; no important destination requires an Easter egg.

## Controls and running

- Red pill: rabbit passage. Blue pill / Skip / Escape: immediate entry.
- Session key `kairo.entered` prevents repeated intros. Footer, mobile menu, companion and command palette can replay from any route.
- Ctrl/Cmd+K opens real destinations. Tab/Shift+Tab/Enter and Escape work with the native dialog.
- Companion menu: study, analytics, Playground, watch, replay, hide. Preference `kairo.rabbit.hidden` persists; the small eye button and footer restore it. Forms and examinations automatically minimize the guide.
- `npm ci`, `npm run dev`; local port 3000. Production: `npm run build`, `npm start`. Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`.

## Boundaries

No Core Web Vitals claims without real representative measurement. Existing authenticated content requires a real session to inspect; guest route checks do not demonstrate authenticated edits. Existing public signup/reset email delivery still needs custom Supabase SMTP. The local Windows sandbox has previously failed Next prerender directory creation with EPERM; remote Vercel builds are the deployment validation when this recurs.

## Verified before release

35 existing tests pass. ESLint and TypeScript pass. Vercel preview build completed successfully (24 seconds). Browser checks covered initial choice, red passage/reveal, functional blue entry, skip/Escape, replay, session persistence, hidden-rabbit persistence/restoration, companion focus, Ctrl+K/filter/keyboard navigation, reduced motion (animation computed as none; red entry skips sequence), native back navigation, subject query selection, grade selection, guest quiz rejection, mini-quiz, plan/results/dashboard empty states, account/register fields, denied admin state, Playground timing result and 404. Home width checks at 320/375/768/1024/1440 showed scroll width equal to content width after fixing the decorative orbit. Account and onboarding were additionally inspected at 320. Browser console error scan returned no entries.

Authenticated profile/admin mutations were not repeated for this visual release; their implementation is unchanged, and the existing integration/security tests pass. Live field Core Web Vitals and low-end device frame timing were not measured. The local build compiled and typechecked but failed during prerender mkdir with the known Windows EPERM; the remote production pipeline must be READY before release is called complete.
