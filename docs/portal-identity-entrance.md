# Portal identity and illustrated entrance

The selected open-circle rabbit concept is reconstructed as a sharp SVG in `RabbitMark`, `app/icon.svg` and `public/kairo/logo-portal.svg`. Navigation, footer, entrance branding and the multi-size favicon use this identity. The current theme supplies the mark's foreground colour; the coral accent stays consistent.

The entrance uses `public/kairo/mentor-illustrated-v1.webp` (1200 × 800, alpha). Its two empty palms receive the actual interactive red pill and evasive decorative blue pill. The visual was created with the built-in imagegen tool, using the existing Socrates portrait as the style reference. No application API key or model setting changed.

## Final image prompt

Use case: stylized-concept. Create a NEW high-quality stylized 3D storybook character illustration for the entrance to the Kairo education website. The attached Socrates portrait is a STYLE AND CHARACTER REFERENCE: preserve his warm wise bald head, curly grey-white beard, expressive kind eyes, but make the new render distinctly animated-film illustration, with simplified soft shapes and slightly exaggerated expressive proportions, NOT photorealistic, no lifelike skin pores. Show this philosopher as a friendly seated mentor wearing an elegant dark forest-green draped philosopher's cloak over an ivory tunic, subtle gold clasp. Front-facing symmetric composition, head centered near upper third. Both arms extend forward and outward with TWO OPEN EMPTY UPWARD-FACING PALMS, the viewer-left palm centered at 25% canvas width and 68% canvas height, viewer-right palm at 75% width and 68% height, separated and clearly readable. Hands fully in frame with correct five fingers, relaxed rounded expressive cartoon anatomy. Palms offer two choices; do NOT draw any pills, orbs or objects, website will overlay interactive controls. Portrait from head to seated knees, entire silhouette framed with padding. LANDSCAPE 3:2 composition. Rich tactile fabric, sculpted soft beard curls, polished premium animated-film lighting, warm soft light with subtle coral glow from left palm and subtle blue from right palm. Transparent background with genuine alpha, no environment, chair, floor, text, watermark, buttons, border or labels. Cohesive with a premium 3D white rabbit mascot. Friendly intelligent and welcoming, no sunglasses.

## Transition

The rabbit, black-hole core, particles and tunnel share responsive CSS centre coordinates. Arrival, approach and dive keyframes share their start/end transforms, removing the old position jump. The rabbit shrinks into the centre before the camera moves through the portal. The homepage then fades in. The scene is brief, remains skippable with the button or Escape, and preserves the reduced-motion direct entry. No WebGL dependency is introduced.

Verification: scoped TypeScript/lint checks, existing regression suite, Vercel preview build, desktop/mobile entry and skip/replay checks before production verification.
