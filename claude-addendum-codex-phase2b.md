# Addendum for Codex: phase 2b (send after or alongside phase 2)

> Written by Claude for Brian, 2026-10-30. Paste everything below the line into Codex.
> Background: `claude-music-response-takeaways.md` (P1, P3, M9). Brian approved these as "do now"; everything else from that review went to `ROADMAP.md`.

---

Four additions to your current phase. They **reduce** engine complexity, so do them before you finish the player/stage-bridge work. Same ground rules as phase 2: no changes under `src/components/stage/**`, never invent copy. Record each item as the **next free D-number** in `DECISIONS.md`, update `SPEC.md`, and reconcile the live-analysis items under "Audio & visuals" in `ROADMAP.md` (they become optional, used only if a visual direction proves it needs sub-250 ms immediacy).

## A. Tracklists for mixes (new decision)
Mixes show a tracklist whenever one exists. The schema already exists (SPEC §10.1); make it a first-class part of the page:
- **Mix page:** a numbered tracklist below the scrubber. Each row: time (mono, tabular, `mm:ss` or `h:mm:ss`) · artist — title · optional label (mono, dim). The **current track is highlighted** while this mix is the active item. Clicking a row follows D-026 (seek if this mix is active, otherwise stage and show **Play from mm:ss**). Rows are buttons with accessible names ("Play from 41:06, Artist — Title").
- **Waveform:** chapter ticks at each `at`, with a hover/focus tooltip showing artist — title.
- **Player bar:** for an active mix, the sub-line shows `now: Artist — Title`, updated at chapter changes (announce politely only on change, never per tick). **Media Session** metadata: `title` = current track, `artist` = track artist, `album` = mix title, so the lock screen shows what's playing in the mix.
- **Mixes list:** add a mono meta `N TRACKS` when a tracklist exists.
- **Source:** tracklist text files in the format SPEC §10.4 defines (`mm:ss Artist - Title [Label]`, `#` comments), parsed into front-matter by the ingest step. Validate: times ascending, below the duration, no duplicates. **Lines still containing `TODO` are dropped and never published.** First real file: `inputs/mixes/roam-mix-2026/tracklist.txt` (times detected, names pending from Brian).
- **No tracklist means no tracklist UI**: no empty headings, and detected boundaries are never shown as tracks.

## B. Visual score instead of live analysis (new decision; supersedes the analysis parts of D-015, D-016, D-022, D-032, D-034)
- **Remove the Web Audio graph** from the engine for v1. The `<audio>` element plays natively everywhere (no `MediaElementAudioSourceNode`, no `AudioContext`, no analyser, no context recovery or "Playback interrupted" state). Remove `crossorigin` as a playback requirement. CORS is now needed only for the JSON files (peaks and score). Keep everything else: transport, D-026 staging, stale-callback tokens, Media Session, resume.
- `StageItemMeta` gains `scoreUrl: string | null`. Score format: `inputs/mixes/roam-mix-2026/roam-mix-2026.score.json` (`version`, `rateHz` 4, `duration`, `bands: [energy, low, mid, high]`, `data` as 0–255 arrays, `boundaries`).
- `getFeatures()` becomes `{ energy, low, mid, high, playing }`: score values at `positionSec`, linearly interpolated, passed through the **existing time-based smoothing** (attack ~80 ms, release ~600 ms) and multiplied by nothing else. With no score (e.g. releases for now): `energy/low/mid/high = 0` and only `playing` moves. Add `getScoreWindow(fromSec, toSec)` so the visual can **look ahead** (zero-copy view or reused buffer, no allocation per call).
- The score loads on `itemchange` (fetch + parse once, cached by URL). It never blocks playback.
- `analysisAvailable` in `StageSnapshot` becomes `scoreAvailable`.
- Update SPEC §6.2, §7.1, §8.3, §10.3 and the bridge docs, plus the `?bridge` overlay: show the score bands as a mini timeline with boundaries and a playhead.

## C. Exclusion rects for the stage (new decision)
- Mark page titles, text blocks, lists, tracklists, the scrubber, the rail and the player with `data-stage-exclude`.
- Bridge: `getExclusionRects(): readonly DOMRectReadOnly[]` in CSS pixels, recomputed on route change, resize, scroll (rAF-throttled) and player show/hide. **Same array instance reused**, no per-frame allocation. Add `'exclusions'` to the `subscribe` events.
- You only provide the rects. How the visual responds to them is the visual task's job.

## D. Artwork preload (M9)
Preload artwork on pointer/focus intent for release tiles, mix rows and the next track in a queue (module cache keyed by URL, `decoding="async"`), so the cover → release morph and player artwork never show a blank frame.

## Acceptance (in addition to phase 2)
- [ ] roam-mix-2026 shows its tracklist once Brian fills names. With the current all-TODO file, no tracklist UI appears and the ingest/parser reports the TODO lines it dropped.
- [ ] Chapter rows and ticks follow D-026 in both the active and staged cases. The player sub-line and lock-screen metadata change at chapter boundaries.
- [ ] No `AudioContext` is created anywhere (verify in DevTools). Playback works with the mix served from a host **without** audio CORS headers.
- [ ] `?bridge` shows score-driven `energy/low/mid/high` moving with the music for roam-mix-2026, with zeros plus `playing` for a release.
- [ ] Exclusion rects are correct at 1440×900 and 375×812, and update on scroll and route change.
