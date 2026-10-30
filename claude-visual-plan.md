# Background visual: pragmatic plan

> Author: Claude · 2026-10-30 · Status: **for Brian's review.** Nothing in `SPEC.md` / `DECISIONS.md` changes until you approve.
> Merges `claude-prompt-visual-exploration.md` (the visual task) with `claude-music-response-takeaways.md` (P1–P8). Where they disagree, this file says which way to go and why.

---

## 0. Decide today (before Codex finishes Task 10)

Three answers from you unblock everything else. My recommendation is in bold.

| # | Decision | Recommendation | Why now |
|---|---|---|---|
| **D1** | Precomputed visual score instead of live Web Audio analysis (P1) | **Yes, in its simplest form** (§1) | Codex is wiring the engine and bridge right now. `player.ts` still builds an `AudioContext` and analyser; removing it later costs more than not finishing it |
| **D2** | Who reads the score: the bridge (`getFeatures()`) or the visual? | **The visual**, like the peaks | The visual needs to look 2–8 s *ahead*; `getFeatures()` only answers "now". Less work for Codex too |
| **D3** | Exclusion zones behind text (P3) | **Markers now, rects only if needed** (§3) | Adding a `data-stage-exclude` attribute costs Codex minutes today; the full rect API may never be needed if route poses pass the contrast check |

Everything else can wait for the direction review.

---

## 1. The audio approach (D1 + D2)

**Do:**
- Native `<audio>` only. Codex removes the `AudioContext`, analyser and `crossOrigin` from `player.ts`, plus the context-resume/"interrupted" machinery that exists only because of Web Audio. Media keeps working on iOS lock screen and silent switch; iOS gets the same visual as desktop.
- Each mix ships a `.score.json` next to its peaks (the format already prototyped: 4 Hz, `energy`/`low`/`mid`/`high` as bytes, `boundaries`). ~70 KB gzipped per hour.
- Bridge change, minimal: `StageItemMeta` gains `scoreUrl: string | null`. `getFeatures()` keeps `playing` only; `energy` is dropped (or returns 0) and `analysisAvailable` becomes always `false`, then is removed in a later cleanup.
- The visual loads the score itself, reads it at `positionSec`, and smooths it with the time-based easing it already uses.

**Don't (yet):**
- Don't use `low`/`mid`/`high` for colour or anything flashy. Bands are kept in the file because they're nearly free; the first version uses `energy` and `boundaries` only. Bands get tried in the lab for rim *sharpness* (the old "spectral centroid" idea, now without live analysis).
- Don't block releases on scores. A release without a score gets `playing` plus authored `section_times`/`bpm`, which is already a finished-looking behaviour. Release scores come later (§5, step 5).

**Boundary priority (P2):** confirmed tracklist `at` → release `section_times` → score's detected `boundaries` → none. The 19 detected boundaries for ROAM_MIX_2026 are a placeholder until you confirm the tracklist.

**What this replaces in the spec:** §7.1 (native output), §8.3 (score instead of analyser maths), §10.3 (CORS only for JSON), §10.4 (ingest emits the score). Supersedes the analysis parts of D-015, D-016, D-022, D-032 and D-034. Codex makes these edits with the bridge change; I supply the paragraph text.

---

## 2. The visual itself: what I'm building, and what I'm not

**Building (the exploration task, unchanged in substance):**
- One planet scene, fixed into a body: dense stippled surface, a soft terminator, rim atmosphere, dust in three depths. Already drafted (envelope reader, conductor/state machine, caps in one file, route poses, shaders); not yet in your repo.
- Three directions that differ only in *how they listen*: **A Breathing limb**, **B Orbiting dust** (orbit = mix progress, ripples along a debris belt at boundaries), **C Atmosphere** (the glow's height follows the macro arc, ripples travel through it).
- Dev-only `/lab`: a fake bridge replaying the real ROAM_MIX_2026 score with play/pause/seek/×1–×20, phase and route switches, A/B/C switch, live cap meters and a frame-time HUD.
- Per direction: a deterministic recording (idle → quiet passage → build → seek → pause → end) at 1440×900, a 375-wide still, frame times, and an automated contrast check of every route at 1440×900, 1280×720 and 375×812.

**Simplified on purpose:**
| From the brief / takeaways | Pragmatic call | Reason |
|---|---|---|
| WebGPU + TSL GPU-compute particles | **WebGL2 baseline only; no compute sim** | A stateful simulation can't be *replay-identical* after a seek, which the score approach (P1/P5) depends on. Stateless shader motion driven by integrated phases is deterministic, cheaper, and works everywhere. Revisit only if a chosen direction visibly needs it |
| Tweakpane + stats-gl | A small built-in panel and HUD | Avoids touching `package.json` (Codex's file). Same function |
| ACES tonemap + post pass (P4) | **No tonemap; keep the existing CSS grain; dither in-shader** | ACES shifts the locked palette, and a post pass costs a full-screen render. Posters are rendered from the same scene, so the swap still matches |
| Per-release tint (P6) | **Not in v1** | Conflicts with the locked one-palette guardrail. Roadmap |
| OffscreenCanvas worker | Not unless profiling demands it | ROADMAP condition unchanged |

**Taken from the takeaways because they're cheap and right:**
- P2 section easing: changes ease over `min(0.35 × section length, 6 s)`.
- P5 seed per item: `hash(itemId)` sets dust offsets, orbit phase and ripple direction, so a mix always returns to *its* sky.
- P7 rubric added to acceptance (§6).
- P8 contact sheet: one image of routes × phases × viewports per direction, for quick review.

**Caps.** The locked §8.4 caps hold in every direction (drift +20%, rim +15%, sparkle +10%). One new cap is proposed for your decision: **atmosphere height / limb density +20%** (the macro arc changes the glow's *extent*, not its brightness). If you'd rather not, A and C fall back to rim-only and get noticeably quieter.

---

## 3. Text collisions (D3)

Two layers, cheapest first:
1. **Route poses** (already planned): home is the hero; mixes sits lower and calmer; work/about/writing pull back. Checked automatically for AA contrast of `--fg`, `--fg-muted` and `--fg-dim` text over the scene at all three viewports.
2. **Only if (1) fails anywhere**, typically on phones where text scrolls over the planet: Codex adds `getExclusionRects()` reading `[data-stage-exclude]` elements (≤4 rects, throttled, no per-frame allocation), and the scene calms alpha/motion/density with a soft falloff behind them (P3's starting values).

So Codex's only work today is putting `data-stage-exclude` on page titles, text blocks, lists and the player. The API is added later if the check says so.

---

## 4. Who does what

| Work | Owner | Files |
|---|---|---|
| Remove Web Audio; add `scoreUrl` to item meta; `data-stage-exclude` markers; spec/decision edits for D1–D3 | **Codex** (one add-on to phase 2, text in §7) | `player.ts`, `stage-bridge.ts`, pages, `SPEC.md`, `DECISIONS.md` |
| Score generator for mixes (ingest step) | **Claude** | `scripts/score-*.mjs` (new; needs your OK since `scripts/` is shared) |
| Lab, three directions, recordings, measurements, posters | **Claude** | `src/components/stage/**`, `src/lab/**`, lab page, `scripts/render-poster.*`, `claude-visual-*.md` |
| Pick a direction; confirm tracklist times; approve caps | **Brian** | — |
| Production integration of the chosen direction | **Claude**, after your pick | `src/components/stage/**` |

---

## 5. Sequence

| Step | What | Done when |
|---|---|---|
| 1 | You answer D1–D3 | This file approved or marked up |
| 2 | Codex add-on (§7) ships with Task 10; I finish the score generator and freeze the format | Bridge exposes `scoreUrl`; ROAM_MIX_2026 score served in dev |
| 3 | Lab + three directions + recordings + contrast report → `claude-visual-directions.md` | You can compare A/B/C side by side |
| 4 | You pick a direction (and the atmo cap) | Decision recorded |
| 5 | Integrate into the real stage: route glides, quality steps, posters, reduced motion, context loss | Acceptance §6 passes on your Mac and one phone |
| 6 | Release scores: a batch script over the feed's MP3s, cached by track id + audio hash. Later, Roam Studio publishes them | Releases react like mixes |

Steps 2 and 3 run in parallel: the lab runs on the existing score file, so it doesn't wait on Codex.

---

## 6. Acceptance for the visual (brief + P7 rubric)

- Beautiful with nothing playing; reads as **a world, not a pattern**.
- Reacts within ~2 s of play; nothing flashes, pops in or snaps on seek; every phase returns smoothly.
- **Muted arc:** with the volume at zero, it still gathers before builds and settles after.
- **Replay-identical:** the same position in the same mix always looks the same.
- Text keeps AA contrast over every state at 1440×900, 1280×720 and 375×812.
- Caps respected (or the proposed atmo cap approved).
- 60 fps on an M-series Mac at DPR 2; ≥45 fps on a mid-range phone; no long tasks over 50 ms; context loss shows the poster.
- Reduced motion: one still per route, never blank. Pause-animation freezes the frame.
- `/lab` and its code are absent from the production build.

---

## 7. Add-on text for Codex (paste if you approve D1–D3)

> **Phase 2 add-on (D-043 visual score, D-044 exclusion markers).** Remove the Web Audio graph from `player.ts`: no `AudioContext`, no analyser, no `crossOrigin` on the media element; native `<audio>` output on every platform. Remove the context-resume and `interrupted` logic that existed only for Web Audio (keep `error`). In the stage bridge: add `scoreUrl: string | null` to `StageItemMeta` (mixes: `/data/<slug>.score.json` in dev, hashed on R2 later; releases: `null` for now) and implement `getItemMeta()`; `getFeatures()` keeps `playing`, returns `energy: 0`, and `analysisAvailable` is always `false`. Add `data-stage-exclude` to page titles, main text blocks, list containers and the player bar (no API yet). Update SPEC §7.1, §8.3, §10.3, §10.4 and record D-043/D-044, superseding the analysis parts of D-015, D-016, D-022, D-032 and D-034. Don't touch `src/components/stage/**`.

---

## 8. Risks I'm watching

- **Detected boundaries are wrong** for some transitions. Mitigated by the priority order and by ripples being the only "event", so a bad one is a soft, harmless ripple.
- **Too subtle to notice** within the locked caps. The recordings will show it honestly; if so, the atmo cap (§2) is the lever, not brightness.
- **Mobile collisions.** That's what step 2 of §3 is for.
- **My frame-time numbers come from a software renderer** in my workspace, so they're only relative. Real numbers come from the lab HUD on your Mac and a phone.


## Codex review and implementation · 2026-10-30

Brian requested “review it and do it step by step.” D1–D3 are applied as the Codex phase-2 add-on (D-043/D-044); this is not approval of a visual direction or the atmosphere cap.

Review adjustments:
- Keep detected boundaries in the score; confirmed tracklist/manual sections retain priority. No detected events are copied into bridge `boundariesSec`.
- Replay identity means identical seeded target state at a given item/position. Smoothing immediately after a seek depends on the previous frame; recordings need a defined starting state/time step to compare exactly.
- Stateless shader motion can support deterministic replay. WebGL2 alone does not establish a universal device baseline, and hardware frame-time/long-task targets remain measurements, not guarantees.
- Native audio removes the Web Audio dependency; background, silent-switch and lock-screen behavior still need real-device checks.
- Missing scores use null; expose only existing assets, not guessed per-slug URLs. The supplied ROAM score is copied to public/data, with release scores null. Production R2 hashing/upload belongs to ingest work.
- Existing scene files remain untouched under D-042; they will not react to scores until the visual owner connects the reader.

Completed in order: native audio and bridge compatibility; ROAM score metadata/asset; text exclusion markers; SPEC/DECISIONS/bridge contract updates. Rectangle API, score generator, lab/A–B–C directions, contrast/recordings and production visual integration remain the separate visual-owner steps in §§4–5. Existing caps are unchanged.


Verification: `npm test` passes 8 tests; `npm run check` reports zero errors/warnings (one existing unused-parameter hint); `npm run build:preview` builds 22 routes. The first concurrent check/build attempt collided on Astro’s shared cache; the sequential build passed. Preview JS excludes the dev bridge overlay. The copied score matches its input byte-for-byte and has 14,506 valid byte samples per band (70,124 bytes gzipped).

Chrome local QA confirmed playing, seek/buffering, ended without auto-advance, explicit pause and media-error Retry, with energy zero and analysis false. This does not establish audible output or real-phone lock-screen behavior. A separate existing MixScrubber issue was observed: Play at the exact endpoint re-seeks to that endpoint and ends again; staging an earlier position works. Follow up separately from this add-on.
