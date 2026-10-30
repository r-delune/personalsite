# UX / UI plan: smooth, impressive, never clunky

> Author: Claude · 2026-10-30 · Status: **proposal**
> Companion to `SPEC.md` v1.0. Where this plan changes or adds to the spec, §9 lists the change as a proposed `DECISIONS.md` entry for Brian to approve. Nothing here overrides a **[LOCKED]** item on its own.

---

## 1. What "smooth and impressive" means here

Visitors should feel the site is **one continuous place**, not a set of pages. Five principles get us there:

1. **Continuity over spectacle.** The background, the player and the music never reset. Pages *change within* one world instead of replacing each other. Continuity is what reads as "expensive".
2. **Everything responds within one frame.** Every press, hover and drag shows feedback in under 16ms. Slow things (network, audio buffering) show *progress-shaped* feedback, never a spinner.
3. **One motion language.** A handful of durations and easings used everywhere (§2). Clunkiness comes mostly from inconsistent timing.
4. **Motion means something.** Every animation explains where something came from or where it went: cover art flies into the player, and the scrubber reveals the shape of the mix. Nothing moves just to decorate.
5. **Restraint is the polish.** It's one accent colour and one scene. Fewer effects done perfectly beat many done adequately.

---

## 2. Motion system (tokens)

```css
/* durations */
--t-instant: 90ms;   /* press states, toggles */
--t-fast:    160ms;  /* hovers, small reveals */
--t-base:    260ms;  /* page content in/out, menus */
--t-slow:    520ms;  /* player sheet, shared-element morphs */
--t-scene:   1200ms; /* background composition shifts */

/* easings */
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);     /* default for things arriving */
--ease-in:     cubic-bezier(0.7, 0, 0.84, 0);     /* things leaving (shorter) */
--ease-inout:  cubic-bezier(0.65, 0, 0.35, 1);    /* things moving across the screen */
--ease-spring: linear(0, 0.38 9%, 0.81 20%, 1.03 31%, 1.08 37%, 1.04 47%, 0.99 60%, 1);  /* soft overshoot, CSS-only spring */
```
Rules:
- **Exits are faster than entrances** (≈60%). Things leave quickly, then settle in gently.
- **Only `transform`, `opacity`, `filter`, and `clip-path`** are animated. Never animate layout properties (width, height, top, margin).
- Stagger list items by 30ms, capped at 8 items (beyond that, everything arrives together).
- `prefers-reduced-motion` turns every movement into a crossfade at `--t-fast`. Nothing translates or scales.

---

## 3. Surfaces & interactions

### 3.1 First load
- The poster image of the horizon is painted with the HTML, so the first frame is already beautiful.
- **Headline reveal (first visit per session only):** the three lines rise out of a mask (`clip-path` inset + 12px translate) at 80ms intervals, then the blurb and CTAs fade in. Later navigations show the text immediately (tracked in sessionStorage).
- The WebGL canvas fades in over the poster across 800ms once its **second** frame renders. The first frame often hitches, so we hide it. The poster and the scene's start state match exactly, so the swap is invisible.

### 3.2 Navigation & page transitions
- **Astro ClientRouter + View Transitions API.** The shell (rail, player, background) is persistent and excluded from the transition. Only `<main>` animates: out = fade + 6px up at `--t-fast`/`--ease-in`, in = fade + 10px rise at `--t-base`/`--ease-out`, with a light stagger on the first 3 blocks.
- **The background responds to navigation** (proposed, D-P1). Each route sets a *composition pose* for the one `horizon` scene: home = large limb lower-right; mixes = limb lower with more dust (calm, listening); work/about = limb pulled further away with dimmer rim (reading); writing = minimal. The scene eases between poses over `--t-scene`. It's the same scene with different parameters, but each section gets its own light while it stays one place.
- **Shared-element morphs:** a release's cover art in the grid morphs into the cover on the release page (`transition:name="cover-<slug>"`). Mix row titles morph into the mix page H1. This is the single most "native app" feeling technique available.
- **Instant navigation:** Astro prefetch (`hover` on desktop, `viewport` on mobile) so pages are already loaded before the click.
- Scroll position resets on forward navigation and restores on back (ClientRouter default; verify).
- **Rail active indicator:** a 1px accent bar that *slides* between items (absolutely positioned, transformed), not one that jumps.

### 3.3 Hover & press details (desktop)
- Links get an underline that draws left→right on hover (`scale-x` from 0 at `--t-fast`) and retracts right→left on leave.
- Buttons press to 0.97 scale at `--t-instant` and release with `--ease-spring`.
- **Rail labels:** on hover the mono label "decodes" (a 200ms character scramble ending on the real word). This is the omp-style developer flavour, used **only** on the rail so it stays special.
- **Pointer parallax:** the dust layer of the background drifts up to ±1.5% opposite the cursor, lerped so it feels weighty. It is disabled on touch and with reduced motion.
- Mix and release rows: on hover, the ▶ fades in and the row background lifts to `--bg-raised` at `--t-fast`. **On touch and keyboard focus the ▶ is always visible** (spec §4.3).

### 3.4 Lists (mixes, releases, writing)
- Rows reveal on scroll with **CSS scroll-driven animations** (`animation-timeline: view()`), which run off the main thread, in browsers that support them. Unsupported browsers simply show the rows (progressive enhancement, no JS observer).
- The currently playing item is marked everywhere it appears: a small live **equaliser glyph** (3 bars, CSS animation, paused when audio is paused) replaces its index number.
- `content-visibility: auto` on long lists, so off-screen rows cost nothing.

### 3.5 Mix page & scrubber (the showpiece)
- **Draw-in:** on page arrival the waveform bars rise from the baseline left→right across 500ms (one shader-like pass on canvas, driven by a single `progress` value, not 600 DOM nodes).
- **Playhead:** a thin `--fg` line with a soft accent glow. Played bars brighten as the playhead passes them, with a 120ms fade per bar so it reads as light passing rather than flicking.
- **Hover:** a vertical guide plus a mono time tooltip. Bars within ±12px of the cursor lift 15% (a gentle "magnifier") so the hover position is obvious.
- **Drag:** the preview line follows the pointer immediately, the audio seeks on release, and the playhead *glides* to the new position (`--t-fast`) instead of teleporting.
- **Tracklist:** the active row has a highlight bar that slides between rows (FLIP), and the "now: Artist — Title" line in the player crossfades when the track changes. Clicking a tracklist row seeks, and the waveform marker for that row pulses once.
- **Buffering:** if a seek lands in unbuffered audio, the playhead pulses softly until data arrives. No spinner.
- **Copy link at time:** the button text swaps to "Copied 1:12:30" for 1.5s with a crossfade.

### 3.6 Player
**Desktop bar**
- It slides up from below (`--t-slow`, `--ease-out`) the first time anything plays. The cover art **flies from where you clicked** into the player thumbnail (View Transition on the thumbnail, or a FLIP clone when the click didn't trigger navigation).
- The play/pause icon morphs (two SVG paths interpolated over `--t-fast`) rather than swapping.
- The progress hairline sits along the top edge of the bar and is always visible, even when the bar is collapsed.

**Mobile: mini player → full "Now playing" sheet** (proposed, D-P2)
- The mini bar (cover, title, play/pause, progress hairline) expands with a tap into a full-height sheet: large cover, big scrubber/waveform, transport, tracklist for mixes, and a link to the item page.
- The sheet follows the finger; swipe down to dismiss, with velocity-aware snap (pointer events + a small spring). Behind it the background stays visible, darkened 30%, so the world is still there.
- This is the moment that makes the site feel like an app on a phone. It also previews the later *immersive mode* (the page content steps back while music and visuals take over), so it's groundwork for the storyboard rather than throwaway work.

**Both**
- Track changes crossfade the title and artwork. Audio uses a **150ms volume ramp** on pause/play/seek (GainNode) so there are no clicks or pops, which is a large part of feeling smooth.
- The Media Session API handles lock-screen and hardware keys.

### 3.7 About / CV / Work
- These are reading pages: calm, with no motion beyond the page transition and scroll reveals.
- CV roles: hovering a role lights up its linked case-study chips. Clicking a chip morphs into the case-study page header (shared element).
- The case-study meta strip (role / year / stack) uses the mono label style. Images use blur-up placeholders (§5).

### 3.8 Mobile menu
- A full-screen overlay. Links rise in sequence (30ms stagger) over a background that darkens and blurs slightly. Close rotates the icon into an ×. Focus is trapped while open, and Esc closes it.

---

## 4. Background visual: direction & technique

- **One `horizon` scene, three layers in one draw pass:** (a) the dense limb particles, (b) the rim light (a thin additive band computed in the fragment shader from distance-to-limb), (c) sparse dust above.
- **Motion is stateless in the shader.** Positions are computed in the vertex shader from the base position + `time` + curl/simplex noise. There is no CPU per-particle work and no FBO simulation, so it stays perfectly smooth and deterministic (and can be replayed later for a storyboard).
- **Audio coupling** stays exactly within SPEC §8.4: energy affects drift speed and rim brightness only.
- **Pose interpolation** (D-P1): uniforms `uLimbCenter`, `uLimbRadius`, `uDustDensity`, `uRimIntensity`, tweened on the CPU with `--ease-inout` timing over 1.2s.
- **Quality on dark gradients:** add blue-noise dithering in the fragment shader so near-black gradients never band, and do the film grain *in the shader* (one pass) rather than as a separate DOM overlay where that saves a layer.
- **Adaptive quality:** the runtime measures frame time over a rolling 2s window. If frames go over budget it steps down DPR, then particle count, and steps back up when headroom returns, with hysteresis so it never oscillates.
- **Rendering off the main thread** (proposed, D-P3): run the Stage in a **Web Worker via `OffscreenCanvas`**, so a busy main thread (hydration, navigation, list rendering) never stutters the background, and vice versa. Audio features go to the worker by `postMessage` at ~60Hz (tiny payload). It falls back to main-thread rendering where `OffscreenCanvas` + WebGL is unavailable. **Gate:** prototype both in M1 and keep the worker only if it measurably reduces dropped frames during navigation.

---

## 5. Technology & libraries

### Use
| Need | Choice | Why |
|---|---|---|
| Page transitions | **Astro ClientRouter + native View Transitions API** | Shared-element morphs with zero JS animation code; a persistent shell |
| JS-driven motion (springs, FLIP, sheet drag) | **Motion** (`motion`, vanilla `animate()` + `spring`) | Small, uses WAAPI under the hood, so most animations run on the compositor |
| CSS motion | `@starting-style`, `linear()` springs, scroll-driven animations (`animation-timeline: view()`) | Native, compositor-friendly, progressive |
| UI islands | **Preact** + `@nanostores/preact` | Per spec; tiny |
| WebGL | **three.js** (`ShaderMaterial`, `Points`), WebGL2 | Per spec. Plain three.js, no React wrapper |
| Icons | `lucide-static` (inline SVG at build) or `lucide-preact` in islands | No icon font, no runtime cost on static pages |
| Fonts | `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` + **fallback metric overrides** (`size-adjust`/`ascent-override`, via Astro's font tooling or `fontaine`) | No layout shift when fonts swap in |
| Images | `astro:assets` (AVIF/WebP, responsive `srcset`) + **blur-up placeholders** (tiny base64 LQIP generated at build) | Artwork appears instantly and sharpens in |
| Audio | Native `<audio>` + Web Audio (`AnalyserNode`, `GainNode` for click-free ramps) | Per spec |
| Dev tuning | **Tweakpane** (dev-only panel, `?tune`) for scene/pose/motion params; **stats-gl** HUD (`?debug`) | Lets Brian tune the look live; never shipped to production |
| Testing | **Playwright** (navigation persistence, screenshots, Chrome performance traces) | Automates the "no clunk" checks in §7 |

### Deliberately avoided
| Not using | Reason |
|---|---|
| Smooth-scroll libraries (Lenis, Locomotive) | They hijack native scroll, hurt accessibility and trackpad feel, and conflict with the spec's no-scroll-hijacking rule |
| GSAP | Excellent, but Motion + CSS covers our needs at a fraction of the size. Reconsider only if we need SplitText-style choreography at scale |
| React Three Fiber / drei | They bring React plus a reconciler into the render path. One stateless scene doesn't need it |
| three.js `postprocessing`/EffectComposer | Extra full-screen passes cost fill-rate on phones. Grain, dither and rim are done inside the one shader |
| Tailwind, UI kits | Per D-008 |
| Lottie/animated icons | Too heavy for what simple path morphs achieve |

---

## 6. Performance discipline (what keeps it smooth)

- **Main-thread budget during navigation: no task over 50ms.** Islands hydrate `client:idle` except the player (`client:load`, since it's persistent and small).
- **One rAF loop owns all per-frame work** (scene + scrubber playhead). UI stores update at ≤4Hz. Nothing animates via `setInterval`.
- **Compositor-only animation** (§2). Add `will-change` only during an animation, then remove it.
- **No layout shift:** reserved dimensions for artwork, font metric overrides, and the player's space reserved via `padding-bottom` with a transition.
- **Audio never blocks UI:** metadata preload only; waveform peaks fetched (~10 KB) on hover/prefetch of a mix link.
- **Battery:** the scene pauses when the tab is hidden or the canvas is off-screen, and runs at ~30fps while audio is paused and the page has been idle for 30s (the idle drift is slow enough that it's invisible).
- **Budgets** stay as SPEC §11.

---

## 7. How we prove "no clunk" (added to M1/M2 exit criteria)

Automated (Playwright, run in CI and locally):
- [ ] Navigate across all routes 20× while audio plays. Assert one `<audio>`, one WebGL context, no audio `pause` events, and `currentTime` always increasing.
- [ ] Chrome performance trace of a home → mixes → mix page → about navigation: **0 dropped frames in the background canvas** on desktop and ≤2 on a 4× CPU-throttled profile. No long task over 50ms.
- [ ] CLS = 0 on every route (fonts, artwork, player appearance).
- [ ] Screenshot set at 375 / 768 / 1440px, idle vs playing (the caps test from SPEC §8.4).

Manual (device matrix: MacBook Safari + Chrome, iPhone Safari, one mid-range Android Chrome):
- [ ] Scrub a 2.5h mix by dragging fast back and forth: no audio pops, no visual lag.
- [ ] Open and close the mobile sheet 10× quickly: it never sticks or snaps wrong.
- [ ] Reduced motion on: everything is a calm crossfade and nothing moves.
- [ ] 200% zoom and a short viewport: the intro and player still work.

---

## 8. Where this lands in the milestones

| Milestone | UX work |
|---|---|
| **M1 · Visual prototype** | Motion tokens; first-load reveal; poster→scene handoff; page transition; rail indicator and decode labels; route poses (D-P1); the worker vs main-thread render test (D-P3); Tweakpane tuning; the desktop player *layout* plus a static mobile sheet mock |
| **M2 · Listening path** | Player slide-in, cover fly-in, icon morph, gain ramps; scrubber draw-in, hover, drag-glide and buffering pulse; working mobile sheet with drag (D-P2); now-playing glyph; Playwright persistence and trace tests |
| **M3 · Catalogues & pages** | Shared-element morphs (cover → release, title → mix, chip → case study); scroll-driven reveals; tracklist FLIP highlight; CV ↔ chips hover; mobile menu |
| **M4 · Ship** | Device matrix pass; adaptive quality tuning; final reduced-motion audit |

---

## 9. Proposed decisions (need Brian's approval before going into `SPEC.md` / `DECISIONS.md`)

| ID | Proposal | Effect on spec |
|---|---|---|
| **D-P1** | **Route-aware composition poses** for the single `horizon` scene, eased over 1.2s on navigation | Adds to SPEC §8.2. Still one scene, so consistent with D-014 |
| **D-P2** | **Mobile mini player → full "Now playing" sheet** with drag-to-dismiss | Adds to SPEC §7.2. Lays groundwork for the roadmap's immersive mode |
| **D-P3** | **Render the Stage in a Web Worker (OffscreenCanvas)**, kept only if M1 measurement shows fewer dropped frames | Changes SPEC §6 architecture, with a main-thread fallback |
| **D-P4** | Adopt **Motion** (vanilla) as the only JS animation library; **Tweakpane + stats-gl** as dev-only tools | Adds to SPEC §5 stack table |
| **D-P5** | **Click-free audio**: 150ms gain ramps on play/pause/seek via a `GainNode` | Adds to SPEC §7.1 |
| **D-P6** | **Idle throttle**: the scene drops to ~30fps after 30s with no audio and no interaction | Adds to SPEC §8.2 |
| **D-P7** | Playwright persistence and frame-drop tests become exit criteria for M1/M2 | Adds to SPEC §12 |
