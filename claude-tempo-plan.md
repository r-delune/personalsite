# Tempo-shaped visuals — design (ready to apply)

Every release in the feed has a BPM; none has a beat start. So tempo may set **character and time
scales**, never **beat-locked events** (productions' rule: a guessed grid = bar-cue spam). Nothing here
flashes "on the beat"; slow songs feel slow, driving songs feel brisk. Mixes (no BPM) use 120.

## Profile (pure function `tempoProfile(bpm)` in coupling.ts)

| Field | Formula | Effect |
|---|---|---|
| felt | BPM folded into 70–140 (175 → 87.5) | time scales: D&B breathes like half-time, as it's felt |
| drive | smoothstep(80, 150, raw BPM) | character: 175 still reads fast |
| barSec | 240 / felt | one felt bar (1.7–3.4 s) |
| breathSec | 2 bars (3.4–6.9 s) | unscored tracks breathe at a musical length |
| breathDepth | 0.55 − 0.2·drive | slow songs breathe deeper |
| dissolveSec | barSec·(2 − drive), 2.5–6 s, ≤ ⅓ section | section moods: 2 bars when slow, 1 when driving |
| playDrift | 1.8 + 1.4·drive | dust speed while playing (×1.8 slow … ×3.2 fast), eased in with the colour bloom |
| twinkleRate | 1.1·(felt/105)·(0.85 + 0.45·drive) | shimmer speed follows tempo |
| shimmer | 0.12 + 0.28·drive | stand-in `high` for unscored tracks (inside CAPS.sparkle) |
| rippleScale | barSec/2.4, 0.8–1.25 | section ripple lasts about a bar |

`tempoBreath(tempo, position)`: raised-cosine over breathSec, read from the playback position
(deterministic, follows seeks). Used only when there's no score; scored items keep real energy.

## Wiring (runtime.ts)
- itemchange: `tempo = tempoProfile(meta.bpm)`; ripple duration = params.rippleSeconds × rippleScale.
- breath: scored ? energy : tempoBreath; high: scored ? high : shimmer.
- drift × (1 + (playDrift − 1)·coupling); twinkle rate lerps 1.1 → twinkleRate by coupling.
- sectionMoodTau(…, tempo.bpm ? dissolveSec : undefined).
- All musical gains still pass through musicalGains (CAPS unchanged).

## Examples from the feed
| Track | BPM | felt | breath | dissolve | drift while playing |
|---|---|---|---|---|---|
| Lckdwnr | 85 | 85 | 5.6 s | 5.5 s | ×1.8 |
| Said | 121 | 121 | 4.0 s | 2.7 s | ×2.7 |
| Banana Bread | 175 | 87.5 | 5.5 s | 2.7 s | ×3.2 |

## Tests
- profile: folding, drive monotonic, all fields in range for 40–260 and null.
- tempoBreath: bounded by breathDepth, periodic in breathSec, 0 at position 0.
- dissolves ≥ 2.5 s and ≤ ⅓ of a section for every feed BPM.
