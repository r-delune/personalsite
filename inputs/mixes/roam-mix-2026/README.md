# Input: ROAM_MIX_2026.mp3 (example mix from Brian, 2026-10-30)

Real media input for M1/M2 (SPEC.md §12). Title, date, series, tracklist and cover are **not confirmed**: use `TODO(copy)` and don't invent them. The slug `roam-mix-2026` is provisional.

## Source file
| Field | Value |
|---|---|
| Filename | `ROAM_MIX_2026.mp3` (uploaded to Claude chat; Brian keeps the original) |
| sha256 | `dab641af80dea8039d1076db544b00ee9d42900dc601fe7ed177571dae834826` |
| Format | MP3, 320 kbps CBR, 44.1 kHz stereo, no ID3 metadata |
| Duration | 3626.74 s (1:00:26.7) |
| Size | 145,069,452 bytes |
| Integrated loudness | **-10.6 LUFS** (LRA 8.9 LU) |
| True peak | **+0.2 dBFS** (see "Open decision") |

## Files here
- `roam-mix-2026.peaks.json`: **peaks v2** (SPEC §7.3 as amended by D-035): 2000 equal-duration buckets, `peak` = max |sample|, `rms` = RMS, each normalised to its own max and rounded to 3 dp. Generated from a mono 8 kHz decode (ffmpeg 6.1.1 + numpy). Recipe: `ffmpeg -i SRC -ac 1 -ar 8000 -f f32le -`, then bucket.
- `waveforms.png`: comparison of max-abs, linear RMS and dB RMS for this mix. Max-abs is a near-solid block (median 0.88), while linear RMS shows the structure (median 0.43). This is the evidence for D-035.

## Streaming derivative (not included: ~87 MB, which belongs on R2, not in the repo)
Create it locally per SPEC §10.4 (no loudness processing):
```sh
ffmpeg -i ROAM_MIX_2026.mp3 -map 0:a -c:a aac -b:a 192k -movflags +faststart roam-mix-2026.m4a
```
Then upload it to the mixes bucket as `mixes/roam-mix-2026.<sha8>.m4a`, together with the peaks file.

## Open decision (Brian)
The true peak of +0.2 dBFS means the AAC encode may clip inter-sample peaks slightly. Options: (a) encode as is (matches "no processing"); (b) apply a fixed -1 dB gain trim to the derivative only. That is a level change, not normalisation. Listen to both before deciding. Logged in SPEC §13.
