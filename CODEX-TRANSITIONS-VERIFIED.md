# Transition implementation and verification

31 October 2026. Implemented following the user's “LETS DO IT” instruction, which supersedes this chat's earlier verification-only scope for transition work.

## Final behaviour

- Astro's ClientRouter retains routing/history, announcements and the persistent player/stage/rail.
- The selected release cover morphs between Music and its detail page in either direction, based on routes rather than which link was clicked. Title links, cover links and history use the same pairing. Unrelated routes do not receive an artwork morph.
- Cover names are assigned through Astro's preparation loader after destination loading and before the outgoing capture. The after-preparation notification has no payload, and before-swap is too late for naming outgoing artwork.
- Main content and the persistent shell remain live during transitions, with their snapshot names disabled in `motion.css`. Titles reveal over 280ms, supporting copy over 200ms with a 60ms delay, and the first six top-level rows settle within 350ms. Only cover artwork uses native snapshot animation. Root/content snapshots were found to swallow immediate interactions during testing, so they are deliberately not used.
- Temporary artwork names, row markers and route classes are removed after both the native transition and actual DOM animations settle. Aborted/superseded transitions cannot clear newer state. No fixed 350ms cleanup timer remains.
- Fresh pointer/keyboard input can skip an active decorative artwork transition. Controls are not gated by animation completion.
- Print/menu handlers are delegated once. Route navigation closes the menu before capture; manual dismissal restores trigger focus. Route dismissal does not focus the outgoing trigger.
- Motion styles are consolidated. Reduced motion disables page reveals, stagger and shared-cover travel. Existing non-route animation preferences remain separate.
- Release title links, mix links and return links have targeted HTML prefetch. Existing small-artwork intent decoding remains; no audio prefetch was added.

## Verification

Isolated preview build: `/tmp/personalsite-transition-preview`, served at http://127.0.0.1:4360. The normal development server was left running on port 4357. For QA only, the build used `PUBLIC_MIX_MEDIA_BASE=http://127.0.0.1:4357/__local-media` so actual mix audio could be streamed from the dev-only route. The environment file and original audio were not modified.

- `pnpm test`: **29 passed, 0 failed**, including two new navigation tests for route pairing and superseded cleanup.
- `pnpm check`: **0 errors, 0 warnings**; four deprecation hints in the concurrently updated content schema.
- Preview compilation: **22 pages built successfully**. This is a preview compilation check, not a production-launch approval.
- `git diff --check`: passed.
- Browser: release title click, cover click, return navigation and Back/Forward reached the expected pages.
- Browser: rapid Work → Mixes navigation reached the latest requested route.
- Browser: immediate mobile menu reopening and Play after a route swap worked after the live-DOM change.
- Mobile menu: Escape returned focus to `.menu-trigger`; navigation cleared modal/scroll-lock state.
- Real mix: persisted through Music → release navigation, with the playback clock advancing from 8 to 27 seconds and Pause still available. Playback was paused after testing. This verifies player state/clock continuity, not an acoustic gap measurement.
- Back restored mix-list scroll position exactly in the checked case: **419.5px → 419.5px**.
- After settling: **0 temporary artwork names, 0 temporary row markers, no `route-enter` class**.
- No new console errors in the final checked navigation sequence. Early lifecycle errors and missing-media errors were corrected during implementation and are not accepted final results.

Evidence: `artifacts/transitions/checks.json`, desktop screenshots and a mobile release capture. Screenshots demonstrate layout/state; no frame-rate benchmark or video capture is claimed. OS reduced-motion, unsupported-browser fallback and Safari/iOS hardware behaviour remain manual platform checks; the reduced-motion CSS and swap fallback are present.

## Changed scope

Implementation files owned by this pass: `src/lib/navigation.ts`, new `src/lib/navigation-state.ts`, `src/styles/motion.css`, route-motion removal from `global.css` and `tokens.css`, prefetch attributes in ReleaseCard/MixRow and release/mix return links, new `tests/navigation.test.ts`, and its entry in `scripts/test.mjs`.

Other chats continued editing the shared working tree, including stage/visual, launch and content work. Those edits were not reverted, staged or committed here. The screenshot background includes that concurrent visual work; it is not part of this transition implementation.
