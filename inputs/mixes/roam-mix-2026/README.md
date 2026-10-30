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
| True peak | **+0.2 dBFS** (served as is; see "Streaming file") |

## Files here
- `roam-mix-2026.peaks.json`: **peaks v2** (SPEC §7.3 as amended by D-035): 2000 equal-duration buckets, `peak` = max |sample|, `rms` = RMS, each normalised to its own max and rounded to 3 dp. Generated from a mono 8 kHz decode (ffmpeg 6.1.1 + numpy). Recipe: `ffmpeg -i SRC -ac 1 -ar 8000 -f f32le -`, then bucket.
- `waveforms.png`: comparison of max-abs, linear RMS and dB RMS for this mix. Max-abs is a near-solid block (median 0.88), while linear RMS shows the structure (median 0.43). This is the evidence for D-035.

## Streaming file (D-036)
This source is a 320 kbps CBR MP3, so it is **served as it is (pass-through)**. No transcode.
- Upload key: `mixes/roam-mix-2026.dab641af.mp3` (sha8 of the source file), alongside `mixes/roam-mix-2026.dab641af.peaks.json`.
- `media`: `src` = that URL · `duration` 3626.74 · `bytes` 145069452 · `lufs` -10.6 · `truePeak` +0.2 · no `gainDb`.

### Why not AAC (tested 2026-10-30, ffmpeg 6.1.1 built-in `aac`)
| File | Decoded samples > 0 dBFS | Max decoded peak |
|---|---|---|
| Source MP3 | 91 | +0.19 dBFS |
| AAC 192k | 247 | +2.85 dBFS |
| AAC 192k, -1.2 dB trim | 21 | +4.76 dBFS |
| 150 s dense section (20:00–22:30), AAC 192k / 256k / 320k | 28 / 36 / 30 | +1.71 / +3.04 / +4.42 dBFS |
| Same section, AAC 256k, -3 dB trim | 1 | +1.39 dBFS |

The overshoots are encoder artifacts in the dense section around 20:20–22:30, not a headroom problem, and lossy-to-lossy transcoding gains nothing. **Replacement:** when Brian supplies the better-quality (lossless) version, follow SPEC §10.4. Encode with Apple AAC 256k on the Mac, then run the post-encode check. Re-run the peaks and loudness steps, because the sha and filenames change.

## Visual score prototype (proposal P1, `claude-music-response-takeaways.md`)
- `roam-mix-2026.score.json`: 4 Hz, 14,506 frames. `energy` (RMS) plus `low` (30–150 Hz), `mid` (150–2000 Hz) and `high` (2–7.5 kHz) band levels, each in dB, normalised to the 2nd–99.5th percentile and stored as 0–255 integers. Includes `boundaries` (seconds) from novelty detection over 30 s windows, with a minimum spacing of 90 s. 227 KB raw, 70 KB gzipped. Generated from a 16 kHz mono decode with a 2048-point Hann FFT (numpy).
- `visual-score.png`: the bands and novelty curve, with detected boundaries marked.
- The boundaries are **detected, not confirmed**. Replace them with the real tracklist times when Brian supplies them.
