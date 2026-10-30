# M1 layout/background — handoff for Claude and Brian

Date: 30 October 2026.
Preview: **http://127.0.0.1:4357/**
Status: first implementation ready for visual review; M1 acceptance is not signed off. The dev server is left running as Brian requested. M2 is not complete.

## Implemented

- Pinned Astro 7.4.4, Preact 11.1.0, Three.js 0.187.0 and TypeScript 6.0.3 with a pnpm lockfile. Compatible local Node launcher and stable preview port.
- Original dark editorial composition with self-hosted Geist/Geist Mono, blue accent, visible desktop navigation and a native modal phone menu.
- Shared Three.js particle horizon, separate graphics lifecycle, responsive phone framing, desktop/mobile AVIF fallbacks, reduced-motion still rendering and persisted manual animation pause.
- Homepage, release grid/detail, mix list/detail, Work/About reading templates and 404. Writing stays out of navigation while empty.
- Bounded experiments: fixed/adaptive route framing via a dev-only footer control; named artwork handoff between release grid and detail. No scene crossfades or immersive mode.
- Three real upstream albums and local artwork. Browser media inventory contains only 19 eligible tracks' minimal display/playback fields; raw notes/unpublished tracks stay out of client data.
- Small native-output release player to make the first layout testable, with two phone rows, measured height, loading/error feedback and native seeking. It owns a JS-created audio element and persists across route changes. No Web Audio binding at this stage.

## Checks performed

- `pnpm check`: zero errors, warnings or hints after the current source changes.
- `pnpm run build:preview`: 12 static routes generated successfully. Build reports a >500kB warning for the lazy Three.js chunk (~515kB uncompressed); it is separate from essential player/content code. This is not a full performance-budget signoff.
- `pnpm build`: intentionally blocked by the `TODO(copy)` content-approval check. Local review output is not approved for publishing.
- Chrome: observed live WebGL rendering, no browser error logs during the tested journeys, and no horizontal overflow at the tested 1496×851 desktop and 375×812 phone viewports.
- Short screen: at 1280×600 the hero grows to fit (~777px), rather than clipping its content. No horizontal overflow.
- Native mobile-menu opening by Enter and dismissal by Escape; focus returned to Menu and scroll lock was released. Route selection closes the menu.
- Manual scene pause: frame counter stopped; resizing produced one new frame without restarting time. This checks the still-render/resize path; it is not an actual OS reduced-motion emulation test.
- Played the real Ehten MP3 from Anna Doni. UI time advanced from Home through Mixes to the long-mix detail page; the player remained present and the scene counter continued rather than reinitializing. Stopped test audio afterwards. This is limited browser-state evidence, not an audible continuity or full M2 claim.
- Host spot check: the actual Ehten URL returned HTTP 206, bytes 0–1023, Content-Range/Accept-Ranges and an allowed-origin response for `http://127.0.0.1:4357`. The mix media host has not been configured or tested.

## Review checklist

1. Open Home on desktop. Judge headline scale/line breaks, left-rail balance, particle density/brightness, negative space and how much colour the scene needs. All copy is provisional.
2. Check 375px phone and a short desktop screen. The phone horizon is intentionally below the blurb/actions. Confirm enough visual presence remains without competing with the text.
3. Scroll through artwork and mix rows. Titles navigate; separate Play controls play the release. Mix audio is unavailable and links explain that rather than presenting fake transport.
4. Compare a release card to its detail page and back, including rapid clicks. Inspect the artwork handoff and content fade; plain fade remains the fallback.
5. Compare footer **Framing: fixed / adaptive**, then navigate Work/About. Use Pause animation and resize while frozen. Decide whether adaptive framing earns its place.
6. Start a release and inspect the player at desktop and phone widths. Test the menu while it plays and navigate back/forward. User gesture, visual continuity, focus and layout stability deserve scrutiny.
7. Log review findings with a reproducible trigger and file/section. Keep the review at M1 scope; do not treat the small sample player as completed M2.

## Outstanding / limitations

- Brian's visual approval, final accent/motif and real copy remain pending. No claim of final accessibility, frame-rate or Lighthouse acceptance.
- OS-level reduced-motion, actual 200% browser zoom, Safari/iOS, touch-device gestures, context-loss recovery and real phone performance still need reviewer/device verification. The implementation includes relevant paths but source presence is not test evidence.
- Mix audio is not yet present locally or hosted for this preview. Claude has supplied real peaks v2 and measurement notes for the separate one-hour ROAM_MIX_2026 recording in `inputs/mixes/roam-mix-2026/`; these are not yet wired to a page. The historical seed mix pages still show explicitly illustrative layout data. No fake play/scrub claims. Preserve Claude’s concurrent D-035/D-036 audio decisions for M2; scaffold notes use D-CODEX-001/002 to avoid ID collisions.
- The release sample player is deliberately native-only in M1. Audio analysis/reactivity, Media Session, mix chapters/time links/resume, stale-event hardening and the complete M2 recovery/queue contract are still to be implemented after layout review.
- Work/About placeholders and seed mix dates/series need editorial confirmation. Empty-page/public-content rules must be finished before launch; the public build is guarded meanwhile.
- Fixture preparation checks the prototype's required field contract; full upstream schema validation and release overlays are not complete.
- SVG path icons are local code-generated placeholders for the eventual Lucide imports; the current monogram is provisional, not a supplied brand asset.
- Poster geometry/framing is generated deterministically to approximate the shader's initial view. Review the handoff visually; it is not a captured pixel-identical shader still.

No publication, global Node upgrade, automatic media reprocessing, or external messages were performed.
