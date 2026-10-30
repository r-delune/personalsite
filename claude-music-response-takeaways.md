# Responding to music: takeaways from rdelune-productions

> Author: Claude · 2026-10-30 · Status: **proposal, needs Brian's approval** before any of it enters `SPEC.md` / `DECISIONS.md`.
> Sources read: `rdelune-productions/CLAUDE.md`, `src/components/explorer/AGENT_GUIDE.md`, `exclusion.ts`, `continuum-coherence-pass.md`, `VISUAL_LEDGER.md` (Aesthetic Rubric).
> Evidence: `inputs/mixes/roam-mix-2026/roam-mix-2026.score.json` and `visual-score.png` (a prototype visual score for the real 60-minute mix).

---

## 1. What productions learned (the short version)
- **Song structure owns the arc; audio is an accent.** `section_times`, roles and authored events drive the big changes. Audio only modulates amplitudes, within bounds.
- **"Analyse conservatively, react generously."** No runtime tempo estimation, onset detection or synthetic beat clocks. Beat phase is used only when BPM is *authored* in the data.
- **One continuous world.** Nothing pops in. Sections ease parameters over a window scaled to section length (`min(0.35 × section, 6 s)`). Tests: *one-world*, *no-pop*, *muted arc* ("with audio muted, the visual still rises to the peak and releases").
- **Determinism.** One seed per track, so every replay makes identical choices.
- **One lens.** A shared ACES tonemap, grain, vignette and soft bloom, so everything looks shot on the same film.
- **Readable around UI.** A multi-factor *exclusion zone* calms alpha, motion, density and contrast near UI with a smooth falloff, instead of a flat dim (which read as a visible rectangle).
- **Intricate at rest; a world, not a demo.** It must look beautiful with no audio, and read as a *place* (weather, water, space), not a pattern.
- **Perf discipline.** The quality governor scales frame-local parameters only (never persistent lerp targets); no per-frame allocation; particle budgets halve on mobile.
- **Tooling.** A mood lab (`?lab=1`), a contact-sheet script, a visual-verify script.

Most of this fits our site directly. Its catalogue machinery (recipe rotation, many kernels, datamosh) does not, because we have one scene.

---

## 2. Proposals, ranked by value

### P1. Replace live audio analysis with a precomputed **visual score** ★ biggest win, and a simplification
**Idea:** at ingest, compute a per-item score file: `energy`, `low`, `mid` and `high` at 4 Hz (8-bit values), plus structure `boundaries`. The visual reads it at the bridge's `positionSec`. **No Web Audio graph at all in v1.** The `<audio>` element plays natively, as on any website.

**Prototype on ROAM_MIX_2026** (see `visual-score.png`):
- 14,506 frames, **227 KB raw / 70 KB gzipped** for an hour. Fetched once on item load, like the peaks.
- Detected **19 boundaries** by novelty (30 s windows on the band vector): 0:32, 5:40, 9:27, 12:01, 15:24, 17:39, 19:34, 22:36, 25:04, 27:42, 29:32, 31:20, 33:41, 41:06, 45:17, 49:21, 50:53, 55:16, 59:20. That's plausible transition spacing for a DJ mix (~2–5 min). **Unverified:** Brian can confirm or replace them with the real tracklist.

**What it removes from the spec (all real risks today):**
| Current spec item | Why it goes away |
|---|---|
| D-016 CORS-or-silence risk on the analyser | The audio isn't routed through Web Audio, so media needs no CORS for playback. JSON score and peaks still need simple CORS |
| D-032 iOS silent-switch / lock-screen risk | Native `<audio>` everywhere, and iOS gets **the same** visual as desktop |
| D-022 / §7.1 AudioContext suspension, recovery, Resume state | No AudioContext |
| §8.3 analyser maths, running max, envelopes | Replaced by reading and smoothing the score (time-based easing stays) |
| D-034's "resume the context synchronously in the gesture" | Not needed |

**What it adds:**
- **Lookahead:** the scene can start gathering 2–8 s *before* a build. Live analysis can only react afterwards.
- **Determinism:** same position, same visual. Seeks are exact. This is productions' *replay-identical* rule, and the backbone of the future storyboard (a storyboard *is* a score).
- **The muted-arc test passes by construction.**

**Costs and open points:**
- Ingest computes the score (adds ~1 min per hour of audio). That's in Claude's media-tooling lane.
- **Releases** need scores too. Short term: a script that generates scores for the feed's published MP3s, cached on R2 by track `id` + audio sha. Long term: **Roam Studio publishes a score** alongside each render (it already detects `section_times`). Until a release has a score, the visual uses only `playing` (+ authored `section_times` / `bpm`).
- Live analysis moves to the roadmap, used only if a chosen visual direction proves it needs sub-250 ms immediacy. That's unlikely given "subtle".

**Spec changes if approved:** §7.1 (native output, no Web Audio in v1), §8.3 (score-driven features), §10.4 (ingest emits `.score.json`, hashed like the peaks), §10.3 (CORS only for JSON), §6.2 and bridge (`getFeatures()` reads the score). Supersedes the analysis parts of D-015, D-016, D-022, D-032 and D-034.

### P2. Structure owns the arc
- **Boundary priority:** confirmed tracklist `at` → release `section_times` (manual) → **detected score boundaries** → none.
- **Mix-level arc:** a long mix also gets productions' *entrance arc* (sparse → build → peak → resolve), derived from the score's 60–120 s macro-envelope, not from the clock. A 2-hour mix breathes over its length.
- **Section easing** window = `min(0.35 × section length, 6 s)`, with one shared easing curve.
- **Authored cues later** (roadmap): optional `cues: [{ at, kind: 'swell' | 'hush' | 'drop' }]` in mix front-matter, the equivalent of productions' `visual_events`.

### P3. Exclusion zones in the bridge (fixes text collisions properly)
- Codex exposes `getExclusionRects()`: the client rects of elements marked `data-stage-exclude` (page title, text blocks, lists, the player), updated on route change, resize and scroll (throttled, no per-frame allocation).
- The scene applies productions' **multi-factor soft falloff** (starting values: alpha 0.58, motion 0.72, density 0.68, contrast 0.72, smoothstep pad). The world stays whole but calms behind text. This complements the route camera poses, works on mobile, and survives content changes.

### P4. One lens
Set `ACESFilmicToneMapping` + `SRGBColorSpace` once on the renderer. Grain, vignette and blue-noise dither go in the final pass (no postprocessing library). The **poster stills are rendered through the same lens**, so the poster-to-canvas swap is invisible.

### P5. Deterministic identity
Seed = hash(item id). Any variation (dust offsets, orbit phase, ripple direction) comes from the seed, so returning to a mix restores *its* sky. Add a `?seed=` override in the lab.

### P6. Optional, Brian's call: a per-release tint
Productions derives one OKLCH palette per track from the album's `base_color`. Our spec locks one palette. A middle ground: on `itemchange`, nudge `--accent-2` by at most ±15° hue at low chroma towards the album's `base_color`, eased over 4 s. It's identity, not audio. **Off by default.** Try it in the lab only.

### P7. Adopt the rubric (adapted)
Add to the visual acceptance criteria: **intricate at rest** · **a world, not a pattern** · **one-world / no-pop** · **muted arc** · **replay-identical** · **readable around UI** (exclusion rects) · **reduced-motion non-blank** · **perf** (governor scales frame-local params only, no per-frame allocation, mobile budget halves).

### P8. Tooling to copy
`/lab` (dev-only) with a fake bridge replaying a score; a **contact sheet** script (routes × phases × viewport into one image for quick review); a Playwright visual-verify script.

---

## 3. What not to take
Recipe rotation, many kernels, datamosh and artwork openers, beat-phase pulses as a default (only for authored BPM, and very low), full-screen immersive with no chrome. Our scene is a quiet backdrop to a reading and listening site, not a concert film.

---

## 4. Addenda for the two in-flight prompts (only if P1/P3 are approved)
**To Codex (phase 2):**
> Bridge v2: `getFeatures()` must read from a precomputed score (`StageItemMeta.scoreUrl`, 4 Hz, `energy`/`low`/`mid`/`high` bytes, `boundaries`) at `positionSec`, with linear interpolation and the existing time-based smoothing. Remove the Web Audio graph from the engine: native `<audio>` output, no `crossorigin` requirement for media. Add `getExclusionRects()` from `[data-stage-exclude]` elements, throttled and allocation-free. Mark page titles, text blocks, lists and the player with `data-stage-exclude`. Update SPEC §6.2, §7.1, §8.3, §10.3 and DECISIONS accordingly.

**To the visual exploration:**
> Drive all musical coupling from the score (lookahead allowed), not from live analysis. Use `boundaries` for structure ripples and the 60–120 s macro-envelope for the mix-level entrance arc. Apply multi-factor exclusion falloff from `getExclusionRects()`. Render through one lens (ACES + grain + vignette + dither) and generate posters through it. Seed all variation from the item id. Add the P7 rubric to acceptance.
