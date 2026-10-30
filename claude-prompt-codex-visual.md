# Prompt for Codex: background visual (phase V)

> Written by Claude for Brian, 2026-10-30. Paste everything below the line into Codex.
> Consolidates `claude-prompt-visual-exploration.md` + `claude-addendum-visual.md`. **Ownership changes:** Codex now owns `src/components/stage/**` for this phase.

---

You're taking over the **background visual** of Brian's site: the persistent three.js scene behind every page. Phase 2 deliberately left it alone, so it's still the M1 placeholder. Make it **beautiful at rest and quietly, unmistakably musical while playing**, without breaking the site's restrained aesthetic. This phase is partly exploratory: build one strong default, then two variants Brian can compare, and keep everything switchable.

**The feeling:** a quiet world that *listens*. A visitor reading without music sees a calm, finished, beautiful scene. Press play, and within a few seconds the scene is *with* the music: colour blooms in, it breathes with the mix, gathers before a build and settles in a breakdown. Nothing flashes, strobes or competes with text.

## Current state (read the code before changing it)
`src/components/stage/runtime.ts` (~210 lines): a unit-sphere point cloud (19% "dust") under an orthographic camera, additive blending, one `ShaderMaterial`, a dev-only `uPose` framing toggle, motion pause, reduced motion, visibility pause and context loss handling. Posters: `public/poster/horizon.{avif,svg}` and `horizon-mobile.avif`. **It doesn't read the stage bridge at all.** Problems Brian has seen (`review/2026-10-30/*.png`):
1. It reads as a **ring, not a body**: the interior is as black as the sky.
2. It **collides with content**: row ends, buttons and CV lines run into the limb.
3. There's **no relationship to playback or music**.
4. Every route has the **same framing**.

## Read first
- `SPEC.md` §4, §8 (incl. the **locked caps §8.4**), §9, and the stage-bridge decisions D-042, D-043, D-047, D-048.
- `src/lib/stage-bridge.ts` + `stage-bridge.md`: **your only input from the app.** `getSnapshot()` (phase, phaseSince, positionSec, route, reducedMotion, userPausedAnimation, scoreAvailable…), `getFeatures()` (`energy/low/mid/high/playing`, score-driven, smoothed), `getScoreWindow()` (lookahead), `getItemMeta()` (boundaries, bpm…), `getExclusionRects()`, `subscribe()`.
- `inputs/mixes/roam-mix-2026/roam-mix-2026.score.json` + `visual-score.png`: a real 60-minute score (4 Hz, `energy/low/mid/high`, `boundaries`).
- `claude-music-response-takeaways.md`: why this is score-driven, and the lessons from Brian's productions app.

## Ground rules
- Branch `codex/visual`. Your files: `src/components/stage/**`, `src/pages/lab.astro` (**dev-only**), `src/lab/**`, poster/contact-sheet scripts, `public/poster/**`. Read the app **only through the bridge**. If you need more from it, add to it minimally, in a separate commit, with a decision entry.
- Record decisions as the next free D-numbers. Update SPEC §8 to match what ships.
- **Guardrails (every variant):** one scene and one palette (`--accent`, `--accent-2`, near-black, warm off-white); **no audio-driven hue shifts**; no strobing, flashes, camera shake or page-brightness changes. Text keeps AA contrast. The idle state looks finished. The §8.4 caps hold; if a variant needs more, say why and propose a revised cap rather than exceeding it silently.

## What to build

### 1. A body, not a ring
- A **dense particle surface** that thins inwards from the limb, a **terminator** (lit/unlit side from a fixed light direction), a thin **atmosphere rim** (view-angle scattering) in `--accent` blending to `--accent-2` deeper in, and sparse **dust in 2–3 parallax depths**.
- Generate stable typed buffers once. Motion comes from shader time and parameters, with no per-particle CPU work. Use **integrated phase** (`phase += dt * speed`, never `t * speed`) so speed changes never jump. Clamp `dt` after tab restore.
- **One lens:** `ACESFilmicToneMapping` + `SRGBColorSpace` set once. Blue-noise dither plus subtle grain and vignette in the final pass. No postprocessing library.
- **Determinism:** seed all variation from a hash of the active item id (a stable default seed when idle). `?seed=` override in the lab.

### 2. Behaviour follows playback state (from `getSnapshot().phase`)
| Phase / event | Feel (tune in the lab) |
|---|---|
| `idle` | Calm, slow drift. Near-monochrome lunar greys. Fully finished |
| `loading` | A slight inhale: dust slows, rim brightens a touch. Returns to idle after ~3 s if still loading |
| `playing` | **Colour blooms in over ~3 s** (accent rim + `--accent-2` depth), plus the musical coupling in §3 |
| `buffering` | Hold the coupling at its last values; keep idle drift |
| `paused` | Exhale over ~2.5 s into a held, slightly dimmer state; colour recedes over 4–6 s |
| `ended` | Slow settle to idle over 4–6 s |
| `interrupted` / `error` | Return quietly to idle (the app shows the message) |
| `seek` event | No snap. Anything mapped to position eases to its target over 1–1.5 s, plus at most one soft dust disturbance |
| `itemchange` | Gentle reset; new seed; read the new item's meta and score |
| `route` change | **Camera move** (see §4), ~900 ms, ease-in-out |
| `reducedMotion` | One still, well-framed frame per route. No coupling. Re-render on resize and context restore |
| `userPausedAnimation` | Freeze on the current frame. Audio and UI unaffected |

### 3. Musical coupling (score-driven, the same on every device)
- **Structure owns the arc.** Boundary priority: tracklist `at` → release `section_times` → score `boundaries`. Section transitions ease over `min(0.35 × section length, 6 s)`.
- **Breath:** smoothed `energy` (~1–3 s) drives dust drift speed and rim intensity, within the caps.
- **Macro arc:** the 60–120 s energy envelope from `getScoreWindow()` drives density near the limb and atmosphere thickness: sparse → build → peak → resolve over a long mix. **Look ahead 2–8 s** so builds are led, not lagged.
- **Structure ripple:** at each boundary, one slow ripple travels along the rim (2–4 s). This is the only "event" the visual ever shows.
- Bands (`low/mid/high`) are optional seasoning: e.g. `low` → rim thickness, `high` → dust twinkle amplitude. Never colour.
- With no score (releases for now): only the `playing` behaviour from §2, plus `boundaries`/`bpm` from item meta if present.

### 4. Composition: route poses + exclusion
- An explicit **pose per route** (`home`, `music`, `release`, `mixes`, `mix`, `work`, `writing`, `post`, `about`, `other`): home is the hero (largest, most present limb); mixes/mix are lower and calmer with the scrubber and tracklist clear; work, about, writing and post pull back for reading; music sits between. Desktop, tablet and mobile variants.
- **Exclusion zones:** read `getExclusionRects()` and apply a multi-factor soft falloff behind UI. At full overlap: alpha × 0.58, motion × 0.72, density × 0.68, contrast × 0.72, with a smoothstep over a ~120 px pad. Pass the rects as a small uniform array (cap ~12; merge extras into a bounding box), with no per-frame allocation. The world stays whole and calms behind text.
- Verify that no bright structure sits behind text at 1440×900, 1280×720 and 375×812 on every route.

### 5. Performance
- **Frame-rate tiers:** ~45–60 fps while playing or during a camera move, ~20 fps idle, a still frame for reduced motion. Pause when hidden or off-screen.
- **Asymmetric quality governor:** frame-time EMA 0.08, outliers clamped at 250 ms, drops fast (1.6/s) and recovers slowly (~10 s), floor 0.55, sampling only in the playing tier. It scales **frame-local** parameters (particle draw count, DPR) only, never persistent targets.
- DPR cap 2 on desktop, 1.5 on mobile. No long tasks over 50 ms. Warm up the shaders before the poster → canvas swap. Context loss restores the poster and leaves audio and UI untouched.

### 6. Posters
Regenerate the per-route poster stills **from the real scene through the same lens** (script, Playwright), desktop and mobile, so first paint and reduced motion match the live frame exactly.

### 7. Lab (`/lab`, dev-only, excluded from production)
- **Fake bridge** replaying `roam-mix-2026.score.json` with a transport (play/pause/seek/speed ×1–×20) and switches for phase, route, `scoreAvailable`, reduced motion and the animation pause. It can also follow the real bridge when real audio plays.
- Tweakpane for every parameter (dev-only import), a frame-time HUD, and a **timeline strip** under the canvas: score bands, boundaries, tracklist chapters, playhead.
- A switch between **variants**.

### 8. Variants (exploration)
Write a **Concept Pitch** for each before coding: two sentences, what the viewer sees at **t = 5 s** and at **the mix's peak**. It fails if it reduces to "particles moving" or "a glowing circle".
- **A, "Breathing limb"** (the default you ship): §1–§4 as written.
- **B, "Orbiting dust":** A, plus a slow ring of debris whose orbit phase follows playback progress (a partial turn per item), with ripples at boundaries.
- **C, "Atmosphere":** A, but the scattering layer is the main expressive surface (thickness and glow from the macro arc; `high` → rim sharpness).

B and C are **parameter and coupling sets of the same scene**, not separate scenes (one scene, D-014). A is the default on the real pages. B and C are selectable via `?visual=b|c` in dev.

## Out of scope
Multi-scene runtime, crossfading render targets, storyboards and immersive mode, live audio analysis, per-release tint, authored cues, WebGPU as a requirement. A **WebGPU/TSL compute** trial for B's debris is allowed in the lab only, kept if it measurably looks better at equal or better frame time.

## Acceptance
- [ ] `codex/visual` branch. Changes confined to the files above (plus any minimal, documented bridge additions). Decisions recorded and SPEC §8 updated.
- [ ] The planet reads as a lit **body with atmosphere**, not a ring, at rest.
- [ ] Idle is near-monochrome; colour blooms on play within ~3 s and recedes on pause/end. All phases transition smoothly; seeks never snap.
- [ ] Using roam-mix-2026 in the lab at ×10 speed, builds and breakdowns are visible as the world gathering and thinning; boundaries produce single slow ripples. **Muted-arc test:** scrubbing the lab timeline with sound off still shows the arc.
- [ ] The same visual on iOS (score-driven, no live analysis).
- [ ] Route poses glide on navigation and keep text areas clear at 1440×900, 1280×720 and 375×812; exclusion falloff visibly calms the world behind text without a visible rectangle.
- [ ] Caps respected; no hue shift from audio; no flashes. Reduced motion is still and well framed; the animation pause freezes without affecting audio.
- [ ] Desktop holds ~60 fps playing (M-series), the governor is stable (no oscillation), there are no long tasks over 50 ms from the scene, and memory stays flat over 15 minutes and across item changes.
- [ ] Posters regenerated through the lens; the poster → canvas swap is invisible.
- [ ] `/lab` and Tweakpane are absent from the production bundle.

## Report back
The three concept pitches. Short screen recordings (idle → play a quiet passage → a build → seek → pause → end) for A, B and C at 1440×900, plus 375-wide stills. Frame-time numbers. Which decisions you added. Your recommendation of A, B or C, with reasons.
