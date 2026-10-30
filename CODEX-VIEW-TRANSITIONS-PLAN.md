# Astro transition polish

30 October 2026. Source review of the current working tree and installed Astro 7.4.4 router, checked against official documentation. This is a focused implementation handoff under the user's existing instruction that the other chat owns application changes. No application code changed here. This review does not establish frame-rate or browser acceptance.

## Intended experience

Navigation should feel immediate, with continuous audio and background state. Keep a short content handoff, a subtle active-navigation indicator, and a shared artwork transition between a release and its catalogue entry. No full-page sliding, large zooms, scroll hijacking or extra animation library.

## Already present

- `Shell.astro` uses `<ClientRouter fallback="swap" />`.
- Stage, player island and desktop rail have persistent identities.
- Main content has a named transition; old content fades over 120ms.
- Incoming titles, supporting copy and a limited row stagger have DOM animation rules.
- Release artwork has conditional shared-element matching.
- Rail links and artwork links opt into prefetch. Artwork is decoded on pointer/focus intent through `artwork.ts`, bound by the player module.
- Transition overlays have pointer events disabled, so the intended design allows immediate further navigation.
- Reduced-motion rules exist, and previous browser verification confirmed playing state and clock continuity through quick Work → Writing navigation.

This is already meaningful use of Astro's transition features. Smoothness now depends on consistent lifecycle handling and testing rather than enabling every effect.

## Implementation priorities

### 1. Consolidate motion ownership

`global.css`, `tokens.css` and `motion.css` all contain view-transition rules. There are also competing reduced-motion rules: the older stylesheet disables animation, while the later one explicitly restores a 120ms reduced fade. Consolidate the route, shared-artwork, shell and reduced-motion decisions into one clearly owned stylesheet, retaining necessary base layout elsewhere.

Use an explicit no-animation policy for persistent shell surfaces. Persistence preserves identity/state; visual animation should be specified separately. Verify that stage, player and rail do not flash, crossfade or temporarily appear frozen behind a transition snapshot. Do not alter shader or renderer code in this pass.

### 2. Make shared artwork matching route-scoped

Current `navigation.ts` sets the source artwork name only for clicks inside `a[data-cover-link]`. Clicking a release title does not take that path. Leaving a detail page assigns its cover name regardless of the destination.

Determine the artwork pair from the actual source and destination routes and the clicked source when relevant. Support cover clicks, title clicks, return links and browser history consistently. Only name a pair when the destination contains the corresponding artwork. Keep names unique within each document; unrelated routes should have a simple content transition.

The click handler currently runs for modified clicks too, which can leave an inline name on a page that was never navigated. Ignore new-tab/download/external/non-primary activations and clear transient matching state on cancellation. Do not intercept native link semantics to achieve an animation.

Keep persistence for the player/stage; use matching, not persistence, for cover images that genuinely change layout.

### 3. Remove timer-dependent cleanup

`navigation.ts` removes `route-enter` and artwork names after a fixed 350ms from `astro:after-swap`. That is not evidence that a browser transition or all custom animations finished. Background-tab throttling, cancellation and later timing changes can break that assumption.

Use the supported `viewTransition` on the typed `astro:before-swap` event for transition readiness/completion, and DOM animation completion where needed for title/list animations. Handle rejection/skipping and abort signals. Scope cleanup to a navigation generation so an earlier navigation cannot clear a newer one's state. Keep a defensive timeout only as a fallback, not as the source of truth. Do not patch Astro internals or introduce a second router.

Check the incoming reveal in a recording: the current DOM animations begin during swapping, while main content also participates in a browser snapshot transition. Confirm the reveal is actually visible, with no captured hidden title, delayed pop-in or double fade. Choose either a coordinated snapshot animation or a deliberately sequenced DOM reveal if necessary; do not simply add durations together. This is a test target, not a reproduced visual defect.

### 4. Finish input and lifecycle handling

Keep Astro in charge of history, ordinary navigation, route announcements and scroll restoration. Rebind page-local controls idempotently. `bindPage()` currently runs directly and on `astro:page-load`; audit duplicate `addEventListener` registrations on the initial page and any retained DOM.

Close the mobile dialog before capture so its overlay is not carried into the next view. Restore focus on a manual dismiss, but avoid sending focus to the outgoing trigger during a route navigation. Verify next-page keyboard context and Back restoration; do not unconditionally force every navigation to scroll to the top.

Keep persistent rail links synchronized with available routes. If the available navigation ever changes dynamically, persistence must not retain obsolete Writing links.

### 5. Apply targeted prefetch and stable layout

Existing hover/focus artwork decoding is useful; preserve it. Extend intent prefetch to relevant release titles, mix/detail links and return links where measurements show benefit. Fetch destination HTML and small artwork, not audio, waveforms or visual scores simply because a link was hovered. Avoid making navigation wait on all images or a long custom preload.

Reserve image dimensions and player height. Verify the player does not cause a content jump on first playback or navigation, and cold fonts/artwork do not shift transition targets. Check CPU pressure from the background during navigation; coordinate any renderer optimisation with its owner rather than changing its art direction.

## Motion budget

| Surface | Normal motion | Reduced motion |
| --- | --- | --- |
| Persistent player/stage | Continuous state; no route entrance animation | Same identity; background follows its separate reduced-motion policy |
| Content handoff | Old content fades in about 100–120ms; incoming content appears without an empty interval | Immediate swap preferred |
| Title | At most 8px travel, about 240–280ms | No translation, mask or stagger |
| First six list rows | Small stagger; last row settled within 350ms | Immediate display |
| Release cover pair | About 240–300ms, stable bounds and aspect ratio | No shared-element travel |
| Rail indicator | About 180–220ms | Immediate position change |

These are proposed budgets, not measured results. A very short opacity-only reduced fade is optional, but use one explicit policy; do not override the reduced-motion preference accidentally through CSS ordering. Never delay click acceptance until an animation ends.

## Verification before calling this complete

Use a stable preview build, separate from the actively edited dev server. Record actual transitions; still screenshots cannot prove smoothness.

- Music → release through cover and title; detail → Music; browser Back/Forward. Same cover pair, no duplicate-name errors, no aspect distortion.
- Rapid Music → Work → Mixes clicks, including during animation. Latest requested route wins; no swallowed click, stale class/name, empty screen or stuck indicator.
- Long list/article → detail → Back. Useful scroll restoration; hash and mix time-query navigation remain correct.
- Real mix playing while traversing all sections. Position advances, media is not reloaded and player controls remain responsive. Listen for gaps as well as reading bridge state.
- Mobile menu → route, Escape dismissal, keyboard-only navigation and visible focus. Route announcement and next-page context remain usable.
- OS reduced motion enabled; unsupported-API fallback; direct loads and new-tab/modified-click behaviour.
- Cold and warm navigation on desktop and mobile, with modest CPU/network throttling. No layout jumps, expensive layout loop, image flash or snapshot artifacts. Assess foreground animation separately from the background's intentional motion.

Run `pnpm check`, relevant tests and preview build after implementation. Production copy blockers remain independent of transition work. Add targeted lifecycle/cancellation tests if the controller gains nontrivial state; verify visual timing in a browser rather than tests that only assert configured duration constants.

## References

Official [Astro view transitions guide](https://docs.astro.build/en/guides/view-transitions/) and [router API](https://docs.astro.build/en/reference/modules/astro-transitions/) describe matching, persistence and lifecycle hooks. [Prefetch guidance](https://docs.astro.build/en/guides/prefetch/) covers intent strategies. Installed router/event source was also inspected to confirm `viewTransition`, abort/cancellation handling and the timing of swap/page-load events for this project version.
