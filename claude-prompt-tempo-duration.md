# Prompt: tempo-shaped visuals + mix duration mismatch + player time wrap

Paste everything below the line into the coding agent.

---

You're working in `~/Desktop/Code/rdelune/personalsite` (Astro, branch `codex/visual`). Three tasks, in
this order. Read `SPEC.md` §8 (especially **§8.4 Caps [LOCKED]**), `DECISIONS.md` (D-053, D-059, D-064)
and `claude-tempo-plan.md` before writing code.

**Coordination first.** Another agent may have uncommitted work in progress (recently: `Player.tsx`,
`index.astro`, `catalogue.ts`, `mixes.json`). Run `git status` and check modification times. Never
overwrite or reformat someone else's uncommitted changes; if a file you need is mid-edit, wait or
ask Brian. Commit your own work in small commits with clear messages.

## 1. Mix duration mismatch (D-064)

Coupling is disabled for `roam-mix-2026` because the browser reports 4214.36 s while the score
(`public/data/roam-mix-2026.score.json`) and `mixes.json` say 3626.74 s. Find the real cause before
fixing anything:
- `LOCAL_MIX_FILE` in `.env.local` is the served file. Run `ffprobe -show_format -show_streams` on it,
  and get the decoded length with `ffmpeg -i <file> -f null - 2>&1 | tail -3`.
- Check for a Xing/Info or VBRI header (`ffprobe` "Xing"/"Info", or look at the first frame bytes).
  Earlier, Chrome reported 3626.7 s at `loadedmetadata` and only later revised to 4214 s, which points
  at a VBR MP3 without a seek index rather than a different master. Confirm or rule this out.
- **If it's a missing index / VBR estimate:** produce a derivative that seeks exactly, following D-036
  (lossy sources pass through: try `ffmpeg -i in.mp3 -c:a copy -write_xing 1 out.mp3`; if Chrome still
  drifts, a CBR or Apple-AAC 256k `.m4a` with `+faststart`). Never re-encode with ffmpeg's built-in
  `aac`. Point dev at the new file; keep the score.
- **If it really is a different, longer master:** regenerate the score, peaks and boundaries from the
  served file with the same format (4 Hz, `energy/low/mid/high` bytes, `boundaries`) and update
  `duration` in the mix data.
- Then: in Chrome, seek to ~31:00 and ~55:00 and confirm `audio.currentTime` matches the waveform and
  the duration stays put. Re-enable coupling (D-064's guard should pass on its own). Keep the guard.
- Record the finding as a new decision.

## 2. Tempo-shaped visuals (claude-tempo-plan.md, amended)

Every release in the feed has a BPM; none has a beat start, so **tempo may set character and time
scales, never beat-locked events** (no pulses, flashes or bar cues). Mixes have no BPM: use 120.

The plan predates D-059 and the locked caps. Apply it with these amendments:
- **Drop** everything section-hue or light-angle related (D-059: fixed accents, fixed sun azimuth).
  Drop `dissolveSec`.
- **Drop** `playDrift` as written (×1.8–3.2 breaks §8.4's +20% drift cap). Tempo may only decide how
  the existing caps are spent.
- Keep, all through `musicalGains` so the caps hold:
  - `tempoProfile(bpm)`: `felt` (BPM folded into 70–140), `drive = smoothstep(80,150,rawBpm)`,
    `barSec = 240/felt`, `breathSec = 2 bars`, `breathDepth = 0.55 − 0.2·drive`,
    `shimmer = 0.12 + 0.28·drive`, `twinkleRate = 1.1·(felt/105)·(0.85 + 0.45·drive)`,
    `rippleScale = clamp(barSec/2.4, 0.8, 1.25)`.
  - `tempoBreath(tempo, position)`: raised cosine over `breathSec`, read from playback position
    (deterministic, follows seeks). Feeds `breath` only when the item has **no** valid score.
  - Unscored `high` input = `shimmer` (sparkle stays ≤ +10%).
  - Twinkle *rate* eases from 1.1 to `twinkleRate` with coupling. This changes speed, not amount; if
    you read §8.4 as covering it, ask Brian rather than guess.
  - Ripple duration = `params.rippleSeconds × rippleScale` (update `uRipple.w` and the expiry check).
- Recompute the profile on `itemchange` from `bridge.getItemMeta()?.bpm`.
- Tests: profile folding and ranges for 40–260 and null; breath bounded and periodic; caps still hold
  for every variant with tempo inputs at their maxima; nothing tempo-driven changes hue or light.
- Record a decision (tempo sets time scales and how caps are spent; no beat-locked events).
- Verify in Chrome: play Lckdwnr (85), Said (121) and Banana Bread (175). The breath period should
  differ visibly (≈5.6 / 4.0 / 5.5 s) and shimmer should be stronger on the fast tracks. Capture
  idle vs mid-track screenshots and check §8.4's "same site" test.

## 3. Player time wraps

At hour-long durations the player bar shows "1:10:1" with "4" wrapping onto a second line. Make the
time labels `white-space: nowrap`, `font-variant-numeric: tabular-nums`, and reserve width for
`h:mm:ss` when the duration is ≥ 1 h (e.g. `min-width: 7ch`). Check at 1440 px and at phone width
with a 1-hour mix, and that short tracks don't gain extra spacing.

## Done means
All tests pass (`node scripts/test.mjs`), `pnpm check` is clean, each task has its own commit, and you
report: the duration root cause and fix, the decisions added, and the three-track tempo observations
with screenshots under `artifacts/`.
