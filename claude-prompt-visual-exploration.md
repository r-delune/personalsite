# Prompt: background visual, exploration phase

> Written by Claude for Brian, 2026-10-30. Paste everything below the line into the agent doing the visual work (planned: Claude).
> Companion to `claude-prompt-codex-phase2.md`. Codex owns the app; this task owns only the background.

---

You're exploring the **background visual** for Brian's personal site: a persistent three.js scene behind every page, currently a particle "planet limb" in the lower right. The aim of this phase is **exploration, not production**: find the most enjoyable, musical version of this visual that keeps the site's restrained aesthetic, then show Brian 2–3 directions to choose from.

**The feeling we want:** a quiet, living world that **listens**. Someone who reads the page without playing anything sees a calm, beautiful scene. Someone who presses play senses, within a few seconds and without being told, that the scene is *with* the music: it breathes with the mix, gathers before a build and settles in a breakdown. Nothing flashes, nothing strobes, and nothing competes with the text. **Subtle, but unmistakable once noticed.**

## Read first
1. `SPEC.md` §4 (design language), §8 (background and audio response, including the **locked caps** in §8.4), §9 (storyboard separation), and D-014, D-029, D-032, D-033, D-035.
2. `claude-design-proposal.md` §5.1 and §6.1 (the planet reads as a ring and collides with content; route camera moves).
3. `claude-prompt-codex-phase2.md` Task 10: **the stage bridge contract**, your only input from the app.
4. `review/2026-10-30/*.png`, the current state.
5. `inputs/mixes/roam-mix-2026/`: real peaks v2 (`peak` and `rms`, 2000 buckets) for a real 60-minute mix.
6. Context only, no code dependency: `../rdelune-productions`, Brian's album player with section-aware visuals (its `docs/showcase-feed-spec.md` describes `section_times`, `bpm` and `beat_start_at`).

## Ground rules
- **Your files:** `src/components/stage/**`, `src/pages/lab.astro` (dev-only), `src/lab/**`, `scripts/render-poster.*`, and `claude-visual-*.md`. Touch nothing else. If you need data the bridge doesn't provide, write the request into your report. Don't edit Codex's files.
- Read the app **only through `stage-bridge.ts`** (`getSnapshot()`, `getFeatures()`, `getItemMeta()`, `subscribe()`). Never import player internals or stores.
- Work on branch `claude/visual-lab`. Nothing reaches the production pages until Brian picks a direction. The current scene stays as it is until then.
- **Aesthetic guardrails (non-negotiable in every direction):** one scene, one palette (`--accent`, `--accent-2`, near-black, warm off-white); no hue shifts driven by audio; no strobing, flashes or camera shake; no page-brightness change. Text keeps AA contrast over every state. The idle state must look finished.
- **The §8.4 caps are the starting point.** If a direction can't work within them, explain why and propose a revised cap as a decision for Brian. Don't silently exceed them.

## Technology at hand: use it well
- **three.js r187.** Try **`WebGPURenderer` + TSL (three's shading language)** with its automatic WebGL2 fallback. That gives **GPU compute** for particle simulation (curl-noise advection, gentle flow fields, particles relaxing back to the planet surface) instead of CPU or stateless-only motion. Keep a plain `ShaderMaterial` / WebGL2 path as the baseline to compare against. Choose on **look and measured frame time**, not novelty.
- **Particles** as instanced points or sprites with soft falloff; blue-noise dithering for dark gradients; grain in-shader where it saves a pass. A cheap **atmosphere** (rim scattering from view angle and a light direction) and a **terminator** (lit/unlit side) are what turn the ring into a body.
- **Audio, three sources, best first:**
  1. **Precomputed envelope** (peaks v2 `rms`, keyed to `positionSec`). This works **everywhere, including iOS where live analysis is off (D-032)**, and it lets the scene *anticipate*: look 2–8 s ahead to start gathering before a build.
  2. **Live `getFeatures()`** (energy, playing) where `analysisAvailable` is true, for immediacy.
  3. **Structure metadata:** mix chapter times (tracklist `at`), release `section_times`, `bpm` and `beat_start_at` from the Roam Studio feed. *Metadata, not beat detection* (detection stays deferred).
- **Playback clock** from the bridge (`positionSec`), so visuals stay deterministic and correct after seeks. This is also the backbone of the future storyboard (§9), so design for it.
- **OffscreenCanvas worker** only if profiling shows main-thread contention (ROADMAP condition).

## Behaviour: roughly follow the playback state
Use `phase`, `phaseSince` and events. Smooth every transition with time-based easing and integrated phase (`phase += dt * speed`, never `t * speed`).

| Bridge state / event | Intended feel (starting point; refine in the lab) |
|---|---|
| `idle` | Calm, slow drift. The scene as a visitor first sees it. Fully finished |
| `loading` | A very slight inhale: dust slows, rim brightens a touch. Returns to idle if loading takes more than about 3 s, so it never "hangs" |
| `playing` | The scene is with the music: breath from the envelope, macro arc from the precomputed RMS, structure cues at boundaries |
| `buffering` | Hold. Freeze the musical coupling at its last value and keep idle drift. No spinner-like motion |
| `paused` | Exhale over about 2.5 s into a held, slightly dimmer state. It should feel *paused*, not *off* |
| `ended` | A slow settle back to idle over 4–6 s. A satisfying "end of record" |
| `interrupted` / `error` | Return to idle quietly. The app shows the message, not the visual |
| `seek` | No snapping. If anything is mapped to position (e.g. rotation), ease to the new target over 1–1.5 s, plus at most one soft dust disturbance |
| `itemchange` | A gentle reset of the musical state; reload the item's envelope and meta |
| `route` | The **camera move** (D-029): each route has a framing that keeps content clear. Glide over about 900 ms with `--ease-inout` |
| `reducedMotion` | One still, beautifully framed frame per route. No audio coupling. Re-render on resize |
| `userPausedAnimation` | Freeze on the current frame. Audio and UI keep working |

## Musical coupling ideas to try (rank them, don't ship them all)
1. **Breath:** a short envelope (~1–3 s) drives dust drift speed and rim intensity, within the caps.
2. **Macro arc:** RMS smoothed over 20–40 s drives *density near the limb* and atmosphere thickness. Builds feel like the world gathering; breakdowns thin it out. Look ahead a few seconds so it leads rather than lags.
3. **Structure ripples:** at each chapter or section boundary, one slow ripple travels along the rim (2–4 s). This is the only "event" the visual ever shows.
4. **Rotation as progress:** the planet turns slowly over the length of a mix (one partial turn per item). It's deterministic, so returning to a mix restores its "place" in the world.
5. **Tempo shimmer** (releases with `bpm` only): dust twinkle softly phase-locked to the bar, not the beat, at very low amplitude. Drop it if it's ever noticeable as a pulse.
6. **Stereo/brightness** (live analysis only): spectral centroid affects rim *sharpness* only, never colour.

## Composition
- **Fix the ring:** a dense surface that thins inwards, a terminator, a rim atmosphere, and sparse dust in 2–3 parallax depths.
- **Route framings** with explicit content-safe zones: home is the hero (largest, most present); mixes is lower and calmer with the waveform area clear; work, about and writing pull back for reading; music sits between. Verify that no bright structure sits behind text at 1440×900, 1280×720 and 375×812.
- Poster stills per route framing (for first paint and reduced motion) generated by script from the same scene.

## Lab (dev-only `/lab`)
- **Fake bridge** that replays the real `roam-mix-2026` envelope with a transport (play/pause/seek/scrub speed ×1–×20), plus switches for phase, route, `analysisAvailable` and reduced motion. Optionally plays real audio from `PUBLIC_MIX_MEDIA_BASE`.
- **Tweakpane** for every parameter (dev-only import, excluded from production) and a **stats-gl** frame-time HUD.
- An A/B switch between directions and between WebGPU/TSL and WebGL2.

## Deliverables
1. **2–3 directions**, all within the same aesthetic, differing in *how* they listen. For example: **A "Breathing limb"** (ideas 1+2), **B "Orbiting dust"** (1+3+4, with a slow ring of debris whose orbit relates to progress), **C "Atmosphere"** (2+3+6, with the scattering layer as the main expressive surface).
2. For each direction: a **short screen recording** through idle → play (a quiet passage, then a build) → seek → pause → end, at 1440×900 plus a 375-wide still; measured frame times (desktop and a 4× CPU-throttle proxy, then real devices when Brian can); notes on what reads and what doesn't.
3. `claude-visual-directions.md`: the comparison, a recommendation, the proposed parameter defaults, and the **decisions for Brian** (direction, any cap changes, WebGPU vs WebGL2, any bridge extension).
4. No production integration until Brian chooses.

## Budgets
- 60 fps on an M-series laptop at DPR 2; ≥45 fps target on a mid-range phone at DPR ≤1.5, with quality steps and hysteresis (SPEC §8.2). Note any intentional idle throttle separately.
- No long tasks over 50 ms from the scene. The shader/pipeline warm-up happens before the poster→canvas swap.
- Context loss restores the poster; audio and UI are unaffected.

## Acceptance for this phase
- [ ] `/lab` runs in dev only, and the production build contains none of it.
- [ ] Every direction respects the guardrails (or explicitly proposes a cap change with its reason).
- [ ] Every direction looks finished when idle, reacts within ~2 s of play, never flashes, and returns smoothly from every phase.
- [ ] It works with `analysisAvailable: false` (iOS) using the precomputed envelope alone.
- [ ] Route framings keep content-safe zones clear at all three viewport sizes.
- [ ] Recordings, measurements and `claude-visual-directions.md` are delivered; Brian chooses before anything ships.
