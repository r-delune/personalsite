# Addendum for the visual exploration (send with `claude-prompt-visual-exploration.md`)

> Written by Claude for Brian, 2026-10-30. Paste everything below the line after the main visual prompt.
> Source: `claude-music-response-takeaways.md`, the ideas Brian kept as "do now". The rest is in `ROADMAP.md`.

---

These amend the visual exploration prompt. Where they conflict with it, this file wins.

1. **Music comes from the precomputed score, not live analysis.** `getFeatures()` now returns `{ energy, low, mid, high, playing }` read from a 4 Hz score at the playback position, and `getScoreWindow()` lets you **look ahead**. There is no live audio analysis on any device, so desktop and iOS get the same visual. For the lab, use `inputs/mixes/roam-mix-2026/roam-mix-2026.score.json` directly.
2. **Structure owns the arc** (productions' rule). Boundary priority: tracklist `at` → release `section_times` → score `boundaries`. A long mix gets an entrance arc (sparse → build → peak → resolve) from the score's 60–120 s macro-envelope. Section changes ease over `min(0.35 × section length, 6 s)` with one shared curve. Audio values only modulate amplitudes within those bounds.
3. **Colour only while playing:** try this first in every direction. At rest the scene is near-monochrome (lunar greys). On `playing`, the accent rim and `--accent-2` depth bloom in over ~3 s, and fade back over 4–6 s on pause or end. This is driven by playback state, not audio, so it fits the "no audio-driven colour shifts" rule.
4. **Exclusion zones.** Read `getExclusionRects()` and apply productions' multi-factor soft falloff behind UI. Starting values: alpha × 0.58, motion × 0.72, density × 0.68, contrast × 0.72 at full overlap, smoothstep over a ~120 px pad. Combine it with the route camera poses. The world stays whole and calms behind text.
5. **One lens.** `ACESFilmicToneMapping` + `SRGBColorSpace` set once on the renderer. Grain, vignette and blue-noise dither in the final pass. Render poster stills through the same lens.
6. **Determinism.** Seed all variation from a hash of the item id, with a `?seed=` override in the lab.
7. **Frame-rate tiers and governor** (copy productions' tuned values): ~45–60 fps while playing or during a camera move, ~20 fps idle, a still frame for reduced motion. Asymmetric quality governor: frame-time EMA 0.08, outliers clamped at 250 ms, drop fast (1.6/s) and recover slowly (~10 s), floor 0.55, sampling only in the playing tier. Scale frame-local parameters only, never persistent lerp targets.
8. **Concept Pitch Test before coding each direction:** two sentences, what the viewer sees at **t = 5 s** and at **the mix's peak**. It fails if it reduces to "particles moving" or "a glowing circle". Include the pitches in `claude-visual-directions.md`.
9. **Rubric added to acceptance:** intricate at rest · a world, not a pattern · one world, no pops · **muted arc** (with sound off, scrubbing the timeline still shows the mix's arc) · replay-identical · readable around UI · reduced motion non-blank · perf per item 7.
10. **Lab timeline:** show score bands, boundaries, tracklist chapters and the playhead under the canvas, so tuning happens against the music's structure.
