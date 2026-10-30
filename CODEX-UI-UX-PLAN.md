# Codex — UI / UX and motion plan

Date: 30 October 2026.
Status: proposal for the first prototype, based on `SPEC.md` v1.1. This file does not amend locked decisions or authorize implementation/deployment. Proposed refinements that differ from the spec are identified in §12.

## 1. Intended experience

The site should feel like entering a quiet listening space that also happens to be Brian's personal home. The opening view establishes identity, sound and atmosphere immediately. Music is easy to start. Browsing feels immediate, and listening continues while the content changes.

The impressive element is a single carefully composed particle landscape with depth, subtle light and convincing motion. Typography, artwork, spacing and controls give it a precise frame. Visual detail is concentrated where it contributes; the interface stays calm enough to use for an entire mix.

Three promises guide decisions:

1. **Immediate understanding:** who Brian is, what is available to hear, and where work/rdelune lives.
2. **Continuous listening:** the player and visual environment remain stable while pages change.
3. **Direct control:** actions respond promptly, positions do not jump, and playback never changes merely because a visitor browsed elsewhere.

## 2. Composition and navigation

### Opening view

- Use an asymmetric composition: introduction at the left, a sculpted particle horizon occupying the lower-right, with clear negative space around the headline.
- Keep the name and opening copy visible at first paint. Never make someone wait for a shader, loader or text-reveal sequence to understand the page.
- Give the listening action a concrete destination, for example **“Play [featured title]”**, with a smaller “Browse music” link. Avoid an ambiguous Listen button whose effect must be discovered.
- Consider a small featured-item line within the introduction so visitors see the title, type and duration before committing. This is a proposed detail within the hero, not another large section.
- Keep rdelune visibly linked, secondary to the listening action, with an external-link indicator.
- The opening composition can have near-viewport presence, but the continuation must remain apparent. Use natural scrolling and never hide content to manufacture a perfect screenshot.

### Navigation

- Desktop: quiet rail with a recognizable home/name link. Proposed refinement: show concise destination labels persistently where width permits; reserve numbers and icons as secondary cues. Visitors should not have to hover every icon to learn the site.
- Medium widths: reduce rail/content offsets before squeezing text or causing giant empty margins. Treat 18vw as a composition guide, not a universal left inset.
- Mobile: wordmark and Menu button at the top. The menu is a simple full-screen navigation surface with large text links, a Close button, and the animation control. Avoid nested menus.
- Opening the menu preserves page scroll and audio. Closing restores scroll and focus to the opener. Selecting a route closes it, releases scroll lock and focuses the new content appropriately. The modal menu sits above the player; the player remains audible and is reachable again when the menu closes.
- Use normal links with open-in-new-tab and browser-history behaviour. The active destination is apparent without relying on colour alone.

### Page progression

| Page | Primary job | Visual treatment |
| --- | --- | --- |
| Home | Introduce Brian and offer something specific to hear | Strong opening composition; compact curated sections below |
| Music | Choose a release | Artwork-led grid with visible title/year and a separate Play control |
| Release | Read context and choose a track | Artwork, concise credits, readable track rows |
| Mixes | Find a recording | Editorial list; title first, duration/date secondary |
| Mix detail | Listen, navigate time, explore tracklist | Title and main Play action, waveform, then chapters |
| Work | Understand relevant work and find rdelune | Short summaries with clear roles and case-study links |
| About / CV | Understand the person and experience | Comfortable reading measure; clear dates and case-study references |
| Writing | Read without distraction | Narrow text column, stable background with a stronger readability scrim |

Avoid whole-row links containing buttons. Each row has distinct title navigation and playback controls, with generous hit areas. If artwork opens a detail page, its adjacent Play button always starts playback rather than navigating.

## 3. Listening journeys

### First play

1. Visitor selects a release track or mix.
2. The clicked control immediately acknowledges the request. It shows a pending state, not a false playing state.
3. The persistent bar appears once, with reserved bottom space. The page does not jump and focus stays on the initiating control.
4. Audio transport confirms playback; all controls for that same media ID update consistently.
5. The background response eases in using the existing influence caps. No flash, palette change or camera movement announces the event.

Do not open a modal player or navigate away as a side effect of pressing Play. Do not insert an artificial loading delay to complete an animation.

### During a long mix

- Playback status is visible in the persistent bar, the catalogue row and the detail page when present, all derived from the same engine state.
- Time labels use tabular numerals so changing digits do not shift nearby controls.
- The current chapter is highlighted, but the tracklist never automatically scrolls while someone is reading it.
- Keep a clear route from the bar back to the current recording. The detail page is the expanded listening surface; v1 does not need another drawer or full-screen player.
- Returning to a catalogue restores a sensible scroll position rather than losing the visitor's place.
- Resume is an inline, dismissible choice with title and time, not a blocking prompt. It never replaces an active session.

### Scrubbing

- The waveform responds to pointer movement on the next rendered frame. While dragging, use a local preview position and timestamp; freeze the thumb's automatic transport updates so it cannot fight the pointer.
- Commit one seek on release, then show the requested position while waiting for seek confirmation. Handle seek failure visibly rather than snapping silently to a misleading time.
- Use pointer capture and define cancellation. Preserve vertical touch scrolling outside an intentional waveform interaction.
- The whole waveform height is an easy touch target even if its bars are visually fine. Keyboard users receive the same position and meaning through a native range input.
- Add a thin buffered-region indication only if it remains clear and quiet. Loaded audio and played audio must not be confused.
- Proposed refinement for an unselected mix: scrubbing stages its position locally and leaves the existing track playing; **“Play from 1:12:30”** is the explicit switch. This would replace SPEC §7.4's rule that scrubbing another mix loads it paused. See §12 before adopting.
- At v1's single overview scale, do not promise second-level accuracy from a finger across a 2.5-hour waveform. Chapters and keyboard controls provide precision. Zoomable waveforms are a future feature only if actual use requires them.

### Time links and rapid input

- URL time belongs to the displayed page until an explicit play action. Navigation never pauses, replaces or seeks active audio.
- “Copy time link” confirms success inline near the button and keeps focus in place. Clipboard failure offers selectable link text.
- A newer playback selection supersedes older pending work. Late metadata or play promises must not change the newly selected item.
- Repeated taps do not create multiple loads, queues, spinners or competing transition sequences. Keep Pause/Cancel responsive while a start request is pending.

## 4. Player layout and feedback

Desktop: metadata at left, transport and seek/time through the middle, volume and item link at right. Keep width allocation stable when titles differ. Use truncation with an accessible full name rather than moving controls.

Mobile: first row carries linked title/artist and transport; second row carries time and seek. Omit artwork before sacrificing controls. Hide volume. Allow growth with large text rather than forcing a fixed height. Derive reserved page space from the measured outer height including the safe area.

| State | What the visitor sees | Behaviour |
| --- | --- | --- |
| Nothing selected | Page-level listening actions | Persistent player hidden |
| Starting | Selected title and a quiet loading indicator | Acknowledge request immediately; allow cancellation |
| Playing | Pause action, progressing time, current-item marker | Background responds gently |
| Paused | Play action, stable position | Scene eases back to idle |
| Seeking | Requested timestamp and seeking feedback | Preserve play/pause intent |
| Buffering | Stable controls and a small buffering label | Do not clear the title, time or artwork |
| Interrupted | “Playback interrupted — Resume” | Recover as specified; no false playing indicator |
| Failed | Brief message and Retry | Keep selected item and requested position |
| Ended | Replay, or next eligible release track | A mix ends without automatically starting an unrelated item |

Use inline status for audio errors rather than generic toasts or blocking dialogs. Show a spinner only after roughly 150ms if feedback would otherwise flicker; the selected/pending state itself updates immediately. Do not announce progress ticks to screen readers.

## 5. Motion language

Use one coherent set of durations and easing curves. Values below are starting points to assess in the prototype, not reasons to delay actions.

| Interaction | Initial timing | Technique |
| --- | --- | --- |
| Hover/focus styling | 100–140ms | CSS colour/border/opacity transition |
| Button acknowledgement | Immediate | State change; optional subtle press transform |
| Page content change | 160–220ms | Short fade; at most 6–8px content movement |
| First player appearance | 180–220ms | Transform/opacity with layout reservation established first |
| Mobile menu | 160–220ms | Simple opacity/translation, interruptible |
| Poster to first rendered scene | 300–450ms | Matched image/canvas opacity; never a black frame |
| Audio influence | Spec's 1.5s rise / 2.5s fall | Time-based parameter interpolation |

- The background and player do not fade out on each route change. Animate the route's content region, not a full-page snapshot that visually freezes or ghosts the player.
- Prototype a single artwork transition from catalogue to release only if it stays reliable with browser history and scrolling. Give shared transition names only to the source/destination pair; repeated artwork elsewhere must not collide. A plain fade is the fallback.
- New input may interrupt motion. Cancel or retarget existing animations; never queue decorative sequences ahead of user intent.
- Avoid character-by-character headlines, bouncing transport controls, repeated scroll reveals and large page slides. Reading content is visible even if animation initialization fails.
- Do not add smooth-scroll interception, scroll snapping, a replacement cursor, magnetic buttons or pointer-following controls.
- Reduced motion removes displacement and animated handoffs. Manual scene pause freezes graphics independently of audio. Menu, focus and transport remain usable without motion.

## 6. Visual rendering techniques

Build the horizon as one art-directed Three.js Points scene with typed buffer attributes and a custom GLSL material. Generate stable geometry once; animate with time and smoothed uniforms rather than reallocating point arrays every frame.

- Use density near the rim, sparse dust, controlled depth and restrained colour variation to create detail. A deliberate silhouette matters more than increasing particle count.
- Use small shader points and restrained transparency. Fill-rate and overdraw can dominate even when point counts appear modest. Begin without bloom or a postprocessing stack.
- Pre-render a poster with the same camera, framing and palette. Supply responsive crops so the mobile poster matches the live scene. Do not stretch desktop framing onto a phone.
- Initialize graphics after essential content is painted, but schedule heavy initialization so it does not collide with the first Play gesture. Precompile/warm the chosen scene where supported before replacing the poster; let the poster remain until a successful frame exists.
- Cap DPR and choose quality from measured frame time. If performance stays poor, step down resolution/point count smoothly and avoid repeatedly changing quality. Keep lower quality stable for the session; use the poster if needed.
- A hidden document stops graphics work, while active audio remains independent. On return, reset/clamp rendering delta time so the scene does not jump forward.
- Losing a graphics context restores the poster and leaves the controls/audio available. Respect reduced motion and pause choices before loading the graphics module where possible.
- Keep grain static and cheap. If SVG noise or player blur proves costly on target phones, replace it with a small tiled texture or opaque player surface after visual comparison.

The aesthetic must remain convincing with animation disabled. The shader is an enhancement to composition, not a substitute for it.

## 7. Technology and library choices

| Need | Recommended tool | Use |
| --- | --- | --- |
| Content and routes | Astro + TypeScript | Static semantic pages with a persistent client-routed listening shell |
| Route continuity | Astro ClientRouter + `transition:persist` | Keep audio/player/canvas stable; control content transitions and lifecycle cleanup |
| Control UI | Preact | Player and scrubber islands only; hydrate listening controls early enough to avoid inert Play buttons |
| Shared UI state | nanostores + its Preact binding | Narrow subscriptions for selected media, transport, time, errors; one state ownership model |
| Layout and styling | Custom CSS Grid/Flexbox, custom properties | Responsive composition, motion tokens, safe-area spacing and readable typography |
| Interface motion | CSS transitions/keyframes first; Web Animations API when cancellation/control is needed | Avoid an additional motion runtime for the current interaction set |
| Scene | Three.js WebGLRenderer, BufferGeometry, Points, ShaderMaterial | One GPU-rendered ambient environment; WebGL2 capability detection and poster fallback |
| Audio | HTMLAudioElement, AudioContext, AnalyserNode, Media Session | Stream media; direct transport; analysis with documented recovery |
| Waveform | Precomputed peaks + Canvas 2D + native range input | Draw once on resize; update played overlay/position without decoding full recordings |
| Mobile menu | Native `<dialog>` with a labelled nav | Modal semantics, focus containment and Escape support; explicitly test opener focus and scroll restoration |
| Icons and fonts | Individually imported Lucide icons; self-hosted Geist/Geist Mono | Consistent detail without shipping an entire icon catalogue or extra font weights |
| Near-future route load | Astro selective prefetch | Prefetch likely internal page HTML on intent; keep audio out of automatic prefetch |

Native view transitions by themselves do not preserve an audio DOM instance across full-document navigations. Retain the spec's client router for listening continuity, and feature-detect the visual transition enhancement. Avoid layering another router on top.

No GSAP, Motion, Lenis, React Three Fiber, WaveSurfer, Howler or component suite is required for this first version. This is a scope judgment: the existing scene, direct audio engine and modest interface motion already cover the requirements. Reassess a specific library only when a demonstrated interaction is materially simpler and reliable with it. Do not install alternatives speculatively.

## 8. Responsiveness and accessibility as part of the design

- Compose for 375px phones and short landscape screens before polishing wide desktop. Expand to 320px to catch overflow, then 200% zoom and large system text.
- Use real links/buttons, visible focus, readable metadata and separate Play/detail actions. Numbered labels and tiny icons cannot be the only way to understand a control.
- Maintain at least 44px transport/menu hit areas; use padding around a small icon rather than making every icon visually large.
- Focus styling is immediate. Set `aria-current` on active navigation. Preserve focus in the persistent player when it initiated no route change.
- On ordinary route navigation, coordinate Astro's route announcement and focus behaviour; move focus into the destination content without restoring the old scroll position accidentally. Back/forward restores scroll. Hash links land clear of fixed UI.
- Test mobile menu modality with the fixed player, keyboard and screen reader. Closing it must not leave the document inert or scroll-locked.
- Check text contrast against the actual backdrop, not only the background token. Dim metadata and placeholder colours may need raising to meet AA.
- Match artwork dimensions/aspect ratios and font metrics to reserve space. Use `font-display` and a metric-matched fallback; preload only critical fonts and opening imagery.

## 9. Responsiveness under load

- Give control feedback priority over scene work. No per-frame UI store writes, waveform array rebuilding or storage writes during dragging.
- Keep transport state truthful. Thumbnail and peaks fetch failures should not block audio. Cache small peaks data for the current session; do not eagerly fetch every mix's assets.
- Page prefetch is selective. Honour supported data-saving signals, avoid speculative audio downloads and preconnect only where likely media requests justify it.
- Keep event listeners scoped and cleaned up on Astro swaps. The persistent player/engine subscribes once; page-specific controls attach/detach with the page.
- Use stale-result guards for fetches and metadata. Keep the current page visible during a slower navigation and show quiet feedback if needed; never blank the screen while waiting.
- Do not apply `will-change` everywhere. Use it only around active transitions after profiling, and release it afterwards.

## 10. Prototype sequence and evaluation

1. **Static composition:** real fonts, opening copy placeholders, representative artwork, poster, desktop and mobile navigation, and both player layouts. Judge whether it already feels distinctive with no animation.
2. **One complete listening journey:** playable mix, player reveal, seek, next-page navigation, back, pause and resume. Fix timing, focus and continuity before adding flourishes.
3. **One scene:** match poster/live composition, tune density/light and device quality. Add energy response only after reliable transport. Compare idle, playing, paused and reduced motion.
4. **Transition polish:** short content handoff, menu, current-item states, time-link sharing and failures. Keep only effects that improve the experience in repeated use.
5. **Repeat-use check:** listen while reading for 15 minutes, browse quickly, scrub repeatedly, rotate a phone, background/restore the tab, interrupt/recover audio. A beautiful first screenshot is insufficient evidence of a smooth site.

Use browser developer performance traces, Lighthouse and manual keyboard/touch checks. For meaningful automated checks, focus on media-state transitions, cross-page persistence, stale metadata races and timestamp parsing; avoid screenshot tests that merely freeze a nondeterministic particle frame. Browser automation, if added later, is verification tooling rather than a product dependency.

## 11. Definition of smooth

| Check | Prototype target |
| --- | --- |
| Control feedback | Visible within 100ms of handled input on the tested device, independent of network playback delay |
| Navigation | No white/black flash, background reset, player ghost, dropped playback or unnecessary scroll-to-top on history traversal |
| Scrubbing | Preview follows the pointer on the next rendered frame; transport updates cannot pull it away |
| Scene | Spec frame-rate targets under measured load; reduce quality before controls suffer |
| Layout | No page-content jump from artwork, fonts, buffering labels or player appearance |
| Recovery | Each loading/interruption/error state has an obvious next action without losing the selected item |
| Reduced motion | Complete, attractive and functional experience with static graphics and immediate interface changes |

Measure with real network/media and record device/browser conditions. These are acceptance targets, not claims of achieved performance.

## 12. Proposed refinements requiring adoption into the spec

These are recommendations for discussion/prototyping, not silent overrides:

1. **Stage another mix's scrub position without replacing the active item.** SPEC §7.4 currently loads the other mix paused after a scrub, which stops the current listening session. I recommend keeping the preview local until Play. This is the most useful UX refinement to settle before implementation.
2. **Visible desktop navigation labels where space allows.** SPEC §4.3 currently relies on hover/focus labels. Persistent concise text is easier to discover and remains elegant with restrained type.
3. **A named featured listening action in the opening view.** Replace generic Listen wording with the selected item's title and a small preview line where the composition allows.

Keep the existing spec authoritative until these are accepted and logged. The plan adds no storyboard mode, player drawer, command palette, filters or additional scene requirements.

## 13. Primary technical references

Checked 30 October 2026; verify APIs against the exact pinned versions when implementing.

- [Astro routing, persistence and transition lifecycle](https://docs.astro.build/en/guides/view-transitions/) — persistent shell and content handoffs.
- [Astro prefetch](https://docs.astro.build/en/guides/prefetch/) — selective page loading on intent.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) — WebGL2 renderer, capability handling and renderer API.
- [nanostores](https://github.com/nanostores/nanostores) — small shared stores and framework bindings.
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) — controlled, cancellable browser animations.
- [Native dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) — modal behaviour and accessibility responsibilities.

The timings, composition and dependency choices above are design recommendations, not guarantees provided by these tools.
