# Visual liveness plan — lessons from rdelune-productions

Problem: songs play and the background planet looks still. Causes (verified in Chrome, 2026-10-30):
1. `scene-paused=true` was persisted in localStorage; the scene stops and only a footer link says so.
2. Release tracks carry no music data: `scoreUrl: null`, energy 0, and 18 of 19 have zero boundaries.
   While playing, only the ~3 s colour bloom and +6 % sparkle change; base spin is ~17 min/turn.
3. The one scored item (2026 mix) fails in dev: `PUBLIC_MIX_MEDIA_BASE=http://127.0.0.1:4357/...`
   fails from a `localhost:4357` page (MEDIA_ERR 4); `/__local-media/...` loads.

## What productions teaches

| Productions | Evidence | Meaning for the personal site |
|---|---|---|
| Also has **no real audio analysis**. AudioContext removed because it distorted audio in other tabs; "energy" while playing is a sine fallback | `ShowcasePlayer.tsx` ~L300, L720 (commit 3235c7e) | Native audio + precomputed data is still right. Productions feels alive for other reasons, not because it hears the music |
| **Song structure owns the timing**: `section_times` drive scene, hue and transition changes; audio is accent only | `CLAUDE.md` design decision; `ExplorerCanvas.tsx` section flash/hue | Our planet already has section hooks (ripple, light angle). They never fire because we have no sections |
| **Trusts detected section times** (`TRUST_DETECTED_SECTION_TIMES=1`) | commit d4997fc, `fetch-tracks.mjs` L268 | We keep `manual` only. Upstream, 17/19 of our tracks have detected sections (2–13 each); 1 manual; 1 fallback |
| **Authored BPM only**; no bar cues without an authored beat start (a wrong grid = "bar-cue spam") | `plans.ts` `buildBarCueEvents` | All 19 tracks have BPM, none have `beat_start_at`. A smooth tempo-rate breath is safe; downbeat hits are not |
| **"Intricate at rest, alive under music"**; idle activity floor ≥0.6 | `AGENT_GUIDE.md` §1, `createLivingAudioSignal` | Our rest state is effectively frozen. Keep it calmer than productions (people read here), but visibly alive |
| **Continuum pass**: switching scenes every section felt like channel-flipping; fix = one world, long dissolves (2.6–7.5 s), role-aware section easing, one film stock | `CONTINUUM_HANDOFF.md`, `runtime/section-easing.ts` | Validates our one-planet design. Sections should change light/colour temperature/currents, never the scene |
| Debug HUD shows section n/N, section source (manual/detected/fallback), BPM source | `ExplorerCanvas.tsx` L2939 | Add the same to `?bridge`/lab so "why is it still?" is answerable in one glance |
| `verify-visual` / contact-sheet scripts | `scripts/` | Add a liveness check, so a dead scene fails a test instead of being found by eye |

Do **not** borrow: the kernel/storyboard director, q5, or the synthetic sine "energy" (motion unrelated to the music).

## Plan (in order; each step is small and testable)

**0. Dev unblockers** (minutes)
- `.env`: `PUBLIC_MIX_MEDIA_BASE=/__local-media` (or `http://localhost:4357/__local-media`); remove the duplicate line.
- Pause preference: show state next to the player when playing while paused ("Animation paused · Resume"); expire the stored preference or make it session-scoped.

**1. Trust detected section times** (one function)
- `scripts/prepare-fixture.mjs` `boundaries()`: accept `manual` and `detected`; ignore `fallback`. Keep the 8 s edge trim and 0.75 s de-dup; add a minimum section length (~6 s).
- Carry `boundariesSource` into the media item and bridge meta (for the HUD and for tuning detected sections more gently).
- Result: 17 tracks get ripples and per-section light shifts with no other changes.

**2. Sections that read as sections** (coupling.ts / runtime.ts)
- Per-section colour temperature (seeded, small hue/warmth offset) alongside the existing light angle; widen the light swing (±0.15 → ~±0.35 rad).
- Role-aware easing like productions' `section-easing.ts`: first section slow, middle sections quicker, last section settles.
- Long dissolves (≥2.5 s); never a hard cut.

**3. Alive while playing, calm at rest**
- Base dust drift ×~3 while `coupling` → 1 (eased with the colour bloom); rest speed unchanged.
- Press-play acknowledgment: one ~400 ms rim lift inside the existing +15 % cap.

**4. Tempo breath for unscored tracks**
- When `scoreAvailable=false` and BPM is authored: a smooth sine breath on rim/atmosphere at 2-bar period, inside the breath caps. No pulses or bar cues (no beat start). Replaced by real energy once a score exists.

**5. Release scores** (the real fix; plan §5 step 6, brought forward)
- `scripts/score-tracks.mjs`: decode each published MP3 with ffmpeg on the Mac → 4 Hz `energy/low/mid/high` + boundaries, same format as the mix score; cache by track id + audio hash; write `public/data/tracks/<id>.score.json`; set `scoreUrl` in the fixture.
- Use the feed's section times as `boundaries` when present (one source of truth with productions).

**6. Guardrails**
- HUD: section n/N, boundary source, BPM, scoreAvailable, coupling, fps.
- Test: in Playwright, play a track for 5 s and compare frame differences playing vs paused; fail below a threshold. Run it on a no-score track and the mix.

## Decision needed
- Accept detected section times for releases (as productions does), or only after a listen-through? Productions has shipped them across 168 tracks.
