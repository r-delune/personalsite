# Roadmap

Everything deliberately left out of v1 (`SPEC.md`). Items move into the spec only through a `DECISIONS.md` entry. Each item has a **trigger**, the point at which it is worth doing.

## Now: v1 (see SPEC.md §12)
- [ ] **Phase 2 app:** D-037–D-042: one-screen home, factual copy, dense catalogues, Work/CV, Writing sample, DOM transitions, thin controls and app-side stage bridge. Background implementation remains separately owned.
- [x] **Before implementation:** Claude reviewed SPEC.md v1.2 (§15). Three findings applied as v1.3 (D-032–D-034). M1 implementation is now available for review.
- [ ] **M1** Local visual prototype (first build available at http://127.0.0.1:4357/; review/acceptance pending, see CODEX-M1-HANDOFF.md): homepage, nav, one mix page, responsive player with measured safe-area spacing, `horizon` scene; curate an upstream-shaped release fixture and check one real URL early
- [ ] **M2** Listening path proof: actual long mix + eligible album, persistence, browsing/time-link semantics, context interruption/recovery, CORS/206 on both hosts. Requires real media, host access and recorded browser/device coverage (SPEC.md §12)
- [ ] **M3** Catalogues & pages: music, mixes, work, about/CV, writing templates
- [ ] **M4** Real content & ship

M1 includes bounded comparisons of route-aware framing and a single artwork handoff. These are approved prototype experiments, not final visual commitments or requirements for additional scenes. Brian chooses what to keep after seeing them.

## Conditional enhancements (not v1 prerequisites)

- [ ] **Mobile now-playing sheet.** Compare with the direct two-row player only if mobile listening tasks expose a need. Must support non-gesture dismissal, modal focus, scrolling and safe-area behaviour. Does not implement storyboards. *Trigger:* observed mobile usability need.
- [ ] **OffscreenCanvas worker renderer.** Trial only after traces identify main-thread contention that simpler initialization/quality changes do not resolve. Include resize, context loss, messaging and fallback maintenance in the decision. *Trigger:* measured renderer contention.
- [ ] **Additional motion library (e.g. Motion).** Add only when a specific accepted gesture/layout interaction becomes materially simpler than native CSS/WAAPI. *Trigger:* proven implementation benefit within the dependency budget.
- [ ] **Gain-envelope click mitigation.** First listen for actual discontinuities. If needed, define the shortest effective ramp plus seek/buffer sequencing, cancellation and mute/volume preservation. *Trigger:* reproducible audible clicks.
- [ ] **Idle frame-rate throttle.** Measure battery/quality benefit and keep transport updates independent. Explicitly distinguish intentional idle quality from active-rendering FPS targets. *Trigger:* measured idle rendering cost.

Repeated scroll reveals, navigation-label scrambling, cover fly-ins and waveform arrival choreography are not part of the v1 plan. Phase 2 adds only the approved incoming DOM title/body/first-six-row handoff (≤350ms), independently of the background.

## Next: after v1 ships

### Shared music inventory with rdelune-productions
**Context:** productions.rdelune.dev (repo `rdelune-productions`, Next.js 15 + three.js) plays Brian's albums with section-aware visuals. Its music comes from **Roam Studio** (a private desktop app) → R2 → `https://audio.rdelune.dev/showcase.json`. The contract is in `rdelune-productions/docs/showcase-feed-spec.md`, with a JSON Schema alongside it. Mixes stay out of this inventory (D-006).
- [ ] **Live feed at build time.** Fetch and validate showcase.json against its schema, with readable build errors, falling back to the last good cached copy. *Trigger:* v1 shipped.
- [ ] **Handle `schema_version`** in step with productions' roadmap item. *Trigger:* productions adds the field.
- [ ] **Rebuild on publish.** A Cloudflare Pages deploy hook fires when Roam Studio publishes. *Trigger:* the live feed works.
- [ ] **Cross-links** between a release here and the same album/track on productions (by track `id`). *Trigger:* both sites live.

### Storyboard / immersive mode
- [ ] **Multi-scene runtime.** Two render targets, a crossfade, and a scene registry with lazy imports. *Trigger:* a second real scene exists.
- [ ] **Immersive mode.** `uiMode`, fading all `[data-chrome]` content, a minimal player pill, an obvious exit. *Trigger:* a multi-scene runtime exists.
- [ ] **Timelines.** Per-item `scenes: [{at, id, params}]` driven by the engine's playback clock, correct after seeks. *Trigger:* immersive mode exists.
- [ ] **Productions visual runtime as a scene.** Mount the rdelune-productions explorer (section times, recipes, `bpm`/`beat_start_at`) inside the Stage. *Trigger:* timelines + live feed.

### Audio & visuals
- [ ] **Visual scores for releases.** Generate `.score.json` for published feed MP3s, cached on R2 by track `id` + audio sha. Long term, Roam Studio publishes scores alongside renders. *Trigger:* score pipeline stable for mixes (Claude).
- [ ] **Authored cues for mixes.** Optional `cues: [{ at, kind: 'veil' | 'swell' | 'hush', intensity }]` in front-matter, a tiny version of productions' `visual_events`. *Trigger:* scores + tracklists live and Brian wants to mark a moment.
- [ ] **Per-release tint (lab experiment).** Nudge `--accent-2` ≤ ±15° hue towards the album `base_color` on item change. Off by default. *Trigger:* visual direction chosen.
- [ ] **Visual ledger.** `claude-visual-ledger.md`: one tuning dimension per round with a before/after log (productions' `VISUAL_LEDGER.md` pattern). *Trigger:* visual direction chosen.
- [ ] **Optional live analysis.** v1 uses native audio plus precomputed scores (D-047). Revisit Web Audio only if a chosen direction demonstrates a need for sub-250ms immediacy, with real-device silent-switch, screen-lock and background proof before any binding.
- [ ] **Richer score features:** spectral-flux beat impulse or denser scores. Low/mid/high already ship at 4 Hz. *Trigger:* a chosen visual direction demonstrates that the current score resolution is insufficient.
- [ ] **Per-scene beat pulse** within the caps. *Trigger:* richer analysis.

### Mixes
- [ ] **Tracklist template from the score.** The ingest step writes `tracklist.txt` pre-filled with detected boundary times for Brian to name (done by hand for roam-mix-2026). *Trigger:* ingest script.
- [ ] **Import older tracklists** from Mixcloud pages or Brian's notes for the seed mixes. *Trigger:* those mixes ingested.
- [ ] **Batch ingest:** a folder of masters → derivatives, peaks, front-matter; idempotent. *Trigger:* single-mix ingest stable through M2.
- [ ] **Podcast-style RSS for mixes** (iTunes namespace, enclosures). *Trigger:* ≥5 mixes ingested.
- [ ] **Mix filters/sort** by series, tag and year. *Trigger:* the catalogue becomes hard to scan (≈15+ mixes).
- [ ] **Loudness policy:** decide whether to normalise mixes and/or releases. *Trigger:* listening feedback on level jumps.

### Site
- [ ] **Privacy-light play analytics on our own stack.** Cloudflare Pages Functions + D1 (productions' pattern): plays and listening time per mix and release, with no user agent, no referrer, and daily rollups. Preferred over third-party analytics. *Trigger:* Brian wants listening numbers.
- [ ] **Contact sheet + visual verify scripts** (productions' `contact-sheet.mts` / `verify-visual.mjs` pattern): routes × playback phases × viewports in one image, saved to timestamped review folders (Claude). *Trigger:* first Codex QA round.
- [ ] **Command palette** (⌘K) to jump and play. *Trigger:* ≥20 playable items or many posts.
- [ ] **Generated OG images** per page (Satori). *Trigger:* writing or mixes are being shared.
- [ ] **/now page.** *Trigger:* Brian wants to update it regularly.
- [ ] **Running detail** (more results, ITRA). *Trigger:* Brian supplies content.
- [ ] **Cookieless analytics** (Umami/Plausible). *Trigger:* Brian wants visitor numbers.
- [ ] **Offline/PWA listening.** *Trigger:* repeat listeners.
- [ ] **CMS.** *Trigger:* file-based editing becomes a chore.

## Done
- [x] **Spec v1.2 consolidation:** selected UX decisions merged from Claude/Codex plans and comparison; D-026–D-031 added (2026-10-30). Claude review and implementation remain pending.
- [x] **Spec v1.1:** addressed REVIEW-CURRENT.md contract and interaction gaps; logged Brian-approved fixes as D-020–D-025 (2026-10-30). Documentation complete; media and runtime checks remain pending.
- [x] **M0** Reconciled SPEC.claude.md + SPEC-CODEX.md + REVIEW.md → SPEC.md v1.0, DECISIONS.md, ROADMAP.md (2026-10-30)
