# Personal Site — v1 Spec (merged)

> Owner: Brían Diolún · music: **Brían Diolún** (DJ alias **Roam**)
> Status: **v1.4 — phase-2 app implementation; visual implementation separately owned** · 2026-10-30
> Supersedes `SPEC.claude.md` and `SPEC-CODEX.md` (kept for history). Incorporates `REVIEW.md`.
> Resolves `REVIEW-CURRENT.md`; fixes approved by Brian (“ok fix it”). See D-020–D-025.
> Consolidates `claude-ux-plan.md`, `CODEX-UI-UX-PLAN.md` and `CODEX-UX-COMPARISON.md` into this single review reference. UX synthesis: D-026–D-031. Source proposals remain historical context, not additional build requirements.
> Related: `DECISIONS.md` (why things are the way they are) · `ROADMAP.md` (everything deferred)
> Visual reference: https://omp.sh · Consultancy (linked, not merged): https://rdelune.dev

**Rules for whoever builds this:**
1. Items marked **[LOCKED]** do not change without a new entry in `DECISIONS.md` that Brian has approved.
2. Anything not in this file goes to `ROADMAP.md`, not into the build.
3. Never invent biography, client work, achievements, release or mix metadata. Use visibly marked placeholders (`TODO(copy)`) that render only in dev.
4. Playback counts as verified only when tested with real media on the real host. A mock player is not verification.
5. **Review before implementation:** Brian requested this consolidated document for Claude to review first. Review the checklist in §14 and record unresolved findings before implementation starts. This editing task does not start scaffolding, installation or deployment.

---

## 1. Purpose

A **personal website** for Brian. It is primarily a home for **his introduction, music releases and DJ mixes**, with room for work, a CV, writing and personal interests. rdelune (his consultancy) is **linked in places**, not co-branded. The site is mainly for Brian and secondarily builds his visibility on the web.

Priority: **1. blurb + music → 2. mixes → 3. work/about → 4. writing.**
**Less is more.** That means one shared background, generous negative space, one accent colour, and no feature added to fill space.

### Non-goals for v1
No CMS, accounts, comments, newsletter, contact backend or analytics. No storyboard or immersive mode, multiple scenes, crossfades or beat detection. No command palette, podcast feed, mix filters or batch ingest. All of these are in `ROADMAP.md`.

---

## 2. Locked decisions **[LOCKED]**

| Topic | Decision |
|---|---|
| Identity | Personal site. rdelune.dev is linked from the intro, the Work page and the footer. No equal-blend branding |
| Navigation model | Real pages with URLs, inside a **persistent shell**. The background canvas and player **never unmount** on internal navigation |
| Releases source | The **Roam Studio showcase feed** (`https://audio.rdelune.dev/showcase.json`, MP3s on R2), the same source as productions.rdelune.dev. v1 uses a **local fixture in the feed's shape**. Live fetch is on the roadmap |
| Mixes source | Owned by **this repo**: derivative audio + peaks on R2, metadata in a `mixes` content collection. **Mixes never go through Roam Studio** |
| Mixcloud | An "Also on Mixcloud" link per mix and in the footer. Never the playback source |
| Audio → visuals | Playback **lightly** modulates the background, within the caps in §8. It looks the same site when idle |
| Storyboard | Not built. Only the separation described in §9 is required |
| Roam Archive / rdelune-productions | Inspiration and future integration only. No code dependency in v1 |

---

## 3. Information architecture

### 3.1 Navigation
Primary: **Music · Mixes · Work · About**, plus **Writing** when a real non-draft post exists; dev/explicit preview also exposes the marked writing sample (D-040).

| Route | Purpose |
|---|---|
| `/` | Introduction and curated entry points |
| `/music`, `/music/[slug]` | Releases, and a release with its tracklist |
| `/mixes`, `/mixes/[slug]` | Mix catalogue, and a mix with its scrubber and tracklist |
| `/work`, `/work/[slug]` | CV, selected case studies, and a link to rdelune.dev |
| `/about` | Bio, a short running section, profiles and contact; CV is on Work |
| `/writing`, `/writing/[slug]` | Blog (hidden from nav while empty) |
| `/404` | |

**Public builds hide sections that have no real content.** Templates may exist, but navigation and the homepage list only what has content.

### 3.2 Homepage (D-037; supersedes scrolling home D-011)
One desktop screen, footer excepted, at 1440×900 and 1280×720. At 375×667 it may scroll but stays under about 1.5 screens. Left content: **Brían Diolún**, “Music as Brían Diolún. Mixes as Roam. Software at rdelune ↗”, a featured text Play action with data-derived year/duration, and Latest rows for newest eligible release, newest playable mix and newest visible post. Each has separate Play (where available) and detail link. No home catalogue sections, large tiles, scroll cue, slogans or numbered section labels. Leave the desktop lower-right 40% × bottom 50% clear of app content.

### 3.3 Work and About (D-039)
Work: title, software-consultancy link to rdelune, CV anchored at #cv, then non-draft case studies when supplied. CV comes from zod-validated src/content/cv.json: roles (years, title, organisation, one-line summary, case-study chips), grouped skills, education. Validate every case-study reference. Seed unknown facts with TODO(copy), never invented experience. Print / save PDF opens the browser print dialog; use A4, dark text on white, hidden shell/player/canvas, and avoid breaks inside roles.

About: **Brían Diolún.**, the three-fact line, bio TODO(copy), running TODO(copy), an unfilled ITRA slot, and supplied profiles. The CV belongs to Work.

### 3.4 Density, copy and Writing (D-038, D-040)
Page H1 is the section name, approximately clamp(2rem,3.5vw,2.75rem). Supporting text is factual and at most one line per screen. Mono metadata uses computed counts/date ranges/durations. Remove all marketing headlines and rail footer taglines. Mix rows are 64–80px, with separate title, series, year, duration, Play, detail link and current-item marker; at least eight are visible on the 1440×900 catalogue. Unavailable seed mixes are dev/preview only. Include the real roam-mix-2026 metadata/peaks; its unconfirmed title/date remain TODO(copy). Configure actual audio externally using PUBLIC_MIX_MEDIA_BASE; never commit audio.

Release artwork is 160–220px, 4–6 grid slots on wide desktop, with mono caption and accessible separate Play control. Credit artist_name exactly as published (D-041); absent credit is omitted rather than guessed.

Writing: list rows show date, title and description. Posts use a 62ch reading measure, date/reading-time metadata, styled headings, links, images/captions, Shiki code, quotations, footnotes and previous/next. A clearly marked sample:true MDX post exercises the template only in dev or mode=preview/PREVIEW=1. Production filters it out of routes, navigation and home. RSS is emitted only for real non-draft posts. Real unfinished copy still fails the production approval guard.

---

## 4. Design language

We take omp.sh's restraint, three-tone headline, mono micro-labels, dark negative space and particle background. We do **not** copy its branding, palette or content.

### 4.1 Tokens (`src/styles/tokens.css`, CSS custom properties)
```css
--bg:        oklch(0.13 0 0);
--bg-raised: oklch(0.17 0 0);
--line:      oklch(0.28 0 0);
--fg:        oklch(0.96 0.005 80);  /* warm off-white */
--fg-muted:  oklch(0.72 0 0);
--fg-dim:    oklch(0.52 0 0);
--accent:    oklch(0.80 0.10 250);  /* PROVISIONAL lunar blue */
--accent-2:  oklch(0.72 0.17 330);  /* PROVISIONAL, used only inside the visual */
--grain-opacity: 0.06;
--player-h: 56px; /* initial desktop estimate; updated to measured outer height, including safe-area padding */
```
Dark only (`color-scheme: dark`). The accent appears in at most one highlighted phrase per screen, plus focus and active states. Text must keep AA contrast over every animated state of the background (add a scrim where needed).

### 4.2 Type
Geist (sans) and Geist Mono, self-hosted, with the sans preloaded.
- H1 `clamp(2.5rem, 6vw, 4.5rem)`, weight 500, tracking -0.02em. Line 2 in `--fg-muted`, the key phrase in `--accent`.
- Micro-labels: mono, 11px, uppercase, tracking 0.18em, `--fg-dim`.
- Body: 16–17px, max 62ch, line-height 1.6.

### 4.3 Surfaces & layout
- Grain: a fixed SVG-noise overlay with `pointer-events:none`.
- Editorial rows and thin `--line` dividers rather than card grids. Radius ≤ 6px. No shadows. The player bar alone gets `backdrop-filter: blur(12px)`.
- Icons: Lucide, 16px, stroke 1.5. Every icon-only control has an accessible name.
- **Desktop:** a quiet left rail with a recognizable home/name link, icons/optional mono indices and concise, persistently visible destination labels where width permits. Labels never scramble. On narrower screens adapt the rail/content offset before squeezing text; 18vw is a composition guide, not a universal inset. The visual owns the lower-right; active navigation uses `aria-current` and a non-colour-only cue.
- **Mobile (<768px):** a compact top bar (wordmark + menu button opening a full-screen nav). **No bottom tab bar**, so the bottom edge belongs to the player alone. Use 16px gutters and respect safe-area insets. Measure the player's actual outer height with `ResizeObserver`, including safe-area padding, into `--player-h`; use it for content bottom padding and scroll padding while visible. Reset the reserved height to zero when hidden. Content and focused controls must remain clear of the player at zoom and when metadata wraps.
- Play actions must work on touch and keyboard focus, not just hover.
- Catalogue rows have separate title/detail links and Play buttons; never nest a button inside a whole-row link. The current item has one consistent now-playing marker wherever it appears. A static marker is sufficient; decorative equalizer animation is optional and stops under reduced motion/manual animation pause.

### 4.4 Continuous browsing and motion

The player and background are one stable environment; page content changes inside it. The distinction should be visible in the prototype, not just true of the DOM.

| Interaction | Initial timing | Implementation |
|---|---|---|
| Hover/focus/press | Immediate acknowledgement; optional 100–160ms styling | CSS, visible focus, no animation that delays the action |
| Page content change | Outgoing 120ms; title 280ms; body +60ms; first six rows stagger 30ms with 140ms animation | Total ≤350ms, DOM content only, interruptible; D-038 supersedes earlier ≤220ms content limit |
| Player first appearance | 180–220ms | Transform/opacity after layout reservation; no cover fly-in |
| Mobile menu | 160–220ms | Simple, interruptible entrance/exit |
| Poster → live canvas | 300–450ms starting point | Matched composition; retain poster until a successful warmed frame |
| Audio response | 1.5s rise / 2.5s fall | Existing time-based envelopes and influence caps |

- Never fade, freeze or ghost the entire player/canvas as part of a route snapshot. Do not serialize an exit/entrance sequence that blocks new input. Cancel or retarget interrupted motion.
- **View Transition mechanics (D-033).** Give the Stage and Player their own `view-transition-name`s and suppress their *old* snapshots (`::view-transition-old(stage), ::view-transition-old(player) { display: none }`; `::view-transition-new(stage), ::view-transition-new(player) { animation: none }`). The old snapshot is a static image, while the new one renders live, so this keeps the canvas and progress live. Only `<main>` gets the content animation. While a transition runs, its pseudo-element overlay sits above the page, so verify in M1 that a player control pressed mid-transition still works (e.g. `:root::view-transition { pointer-events: none }`, verified per browser). Keep the outgoing snapshot fade at 120ms; the separate DOM title/body/row reveal completes within 350ms (D-038 supersedes the earlier 220ms content cap). Browsers without View Transitions get Astro's instant-swap fallback; persistence must never depend on View Transition support.
- Keep essential text visible on initial load. No staged CTA appearance, character-by-character reveals, repeated scroll reveals, label decoding, pointer-following controls or scroll interception. Incoming route titles may use the approved 8px line-mask reveal; initial page content is immediately visible.
- A single **cover-to-release artwork transition** is an M1 experiment, not a requirement for every list/title/chip. Only the source/destination pair has matching transition names. Repeated artwork, rapid navigation and back/forward must remain correct; use a plain content fade if not.
- Use CSS transitions/keyframes first and Web Animations API for animation that needs explicit cancellation. Default to transform/opacity for moving surfaces; profile filters/clip-path rather than assuming hardware acceleration.
- Reduced motion uses a 120ms crossfade only: no masks, displacement, shared-element morphs or stagger. Controls remain immediate.

### 4.5 Navigation, menu and focus

- Retain normal links and browser history. New-page navigation begins at its content entry point; back/forward restores scroll; hash navigation lands clear of fixed UI. Coordinate route focus and announcements with Astro rather than adding duplicate announcements.
- The mobile menu uses a labelled native modal `dialog` with a visible Close control, Escape support, focus containment and opener-focus restoration. Preserve the reading position and release scroll lock on close or route selection. The menu is above the player, which remains audible; do not leave the document inert after dismissal.
- Keep the old page visible while navigation loads; provide quiet feedback when needed. Prefetch likely internal HTML on intent using Astro, honour supported data-saving signals, and avoid speculative audio downloads.

### 4.6 Reading and layout stability

- About, work and writing use a comfortable text measure and quieter background/scrim. Active chapter changes do not automatically scroll the tracklist while a visitor is reading.
- Reserve artwork dimensions and use self-hosted fonts with metric-matched fallbacks; preload only critical assets. Use responsive artwork via Astro assets where applicable; small placeholders must not delay real images.
- Player appearance/resizing must preserve the reader's viewport/scroll anchor, especially near a page's end. Measuring its height alone is not proof of stability. Do not animate page padding; test visibility and position directly at 200% zoom and on mobile.

---

## 5. Tech stack **[LOCKED]**

| Layer | Choice |
|---|---|
| Framework | **Astro**, current major, **exact version pinned** at scaffold time and recorded in `DECISIONS.md`. `output: 'static'`. `<ClientRouter />` + `transition:persist` |
| Language | TypeScript (strict) |
| Styling | **Custom CSS**: global `tokens.css` + Astro scoped styles. No Tailwind |
| Islands | **Preact**, for the player UI and mix scrubber only |
| State | **nanostores** for UI state only (track, queue, playing, time at ~4Hz, buffered, error, interruption). **No per-frame data in stores**. `uiMode` is deferred with immersive mode |
| Visual | **three.js**, one canvas, one `ShaderMaterial` points scene, loaded lazily |
| Audio | One `HTMLAudioElement` + Web Audio `AnalyserNode` |
| Interface motion | CSS + native Web Animations API; Astro content transitions. No additional motion runtime required initially |
| Menu | Native modal `dialog`, with tested focus/scroll lifecycle |
| Content | Astro Content Layer: `src/content.config.ts`, zod schemas, MD/MDX |
| Hosting | Cloudflare Pages (site), R2 at `media.<domain>` (mixes) and `audio.rdelune.dev` (releases, existing) |
| Package manager | pnpm |

---

## 6. Architecture

```
src/
  content.config.ts
  layouts/Shell.astro            ← ClientRouter, Rail/TopBar, <Stage/>, <Player/>, grain, <slot/>
  components/
    nav/Rail.astro, nav/TopBar.astro
    stage/Stage.astro            ← <canvas transition:persist="stage"> + poster <img>
    stage/runtime.ts             ← renderer, rAF loop, visibility pause, scene host
    stage/scenes/horizon.ts      ← the only v1 scene
    player/Player.tsx            ← island, transition:persist="player"
    player/Scrubber.tsx
  lib/
    audio/engine.ts              ← singleton (§7)
    audio/score.ts               ← visual-owned score reader (§8)
    stores.ts                    ← nanostores (UI only)
    feed/showcase.ts             ← reads fixture now, live feed later; normalises
  content/
    mixes/*.md   projects/*.mdx   posts/*.mdx   about.md   cv.json   site.json
  fixtures/showcase.sample.json  ← curated, validated upstream-shaped album; see §10.2
  fixtures/README.md             ← source, capture date, field mapping and publication verification
public/poster/horizon.avif
scripts/ingest-mix.ts            ← single-mix ingest (§10)
```

### 6.1 Persistence (acceptance-critical)
- `Stage` and `Player` use `transition:persist`. Clicking internal links and using back/forward must cause **no audible gap, no second `<audio>`, no second WebGL context, and no duplicate listeners**. Guard every init with a module-level `if (initialized) return`.
- The engine is created lazily on the first user gesture and never recreated.

### 6.2 Data flow
- Engine → stores: track, playing, buffered, error, and `time` (throttled to ~4Hz for the UI). Set `playing` from confirmed transport state, not just a successful button click.
- Engine → Stage: the Stage calls `engine.getFeatures()` inside its own rAF loop. No store subscription and no UI rerender.
- UI → Engine: `load(item)`, `play()`, `pause()`, `seek(s)`, `next()`, `prev()`.
- Scene rendering, visible transport progress and pointer preview have independent scheduling gates. Pausing/hiding graphics must not freeze an active player's seek UI. A shared scheduler may dispatch them, but never stop all UI work with the scene's pause flag. Per-frame score sampling/preview stays outside UI stores; store time remains ~4Hz.


### 6.3 App → visual bridge (D-042)
`src/lib/stage-bridge.ts` is the only app interface the separate visual may read. Codex does not modify src/components/stage/**, shaders, posters or framing code. Existing visuals continue working until their owner integrates the bridge.

The module singleton exposes getSnapshot(), getFeatures(), getItemMeta(), and subscribe(event,callback) with unsubscribe. Snapshot includes phase/phaseSince, positionSec, durationSec|null, itemKind/itemId, route/routeSince, reducedMotion, userPausedAnimation and scoreAvailable. Phases: idle, loading, playing, buffering, paused, ended, error. Routes: home, music, release, mixes, mix, work, writing, post, about, other. Phase is confirmed transport state, not button intent. Position uses the active audio clock. Query/hash changes do not change route; use astro:after-swap and history navigation.

Events: phase, route, seek, itemchange, motionprefs, exclusions. One seek event per committed seek on the active item, never for page-only staging. Snapshot/features objects are reused and allocate nothing per read; no per-frame nanostore updates. Static item metadata changes only with item identity: itemKind, itemId, durationSec, peaksUrl|null, scoreUrl|null, boundariesSec[], bpm|null, beatStartAtSec|null. Pass only existing, sanitized confirmed/manual release sections or mix tracklist times. Do not invent timing data or promote detected boundaries. The bridge fetches score JSON once per URL on itemchange; it never fetches audio or waveform peaks.

Document semantics in src/lib/stage-bridge.md. A dev-only ?bridge overlay shows actual phase, route, time and energy; it must be absent from production bundles. Native output is used on every platform. scoreAvailable reflects validated score readiness; getFeatures() returns energy/low/mid/high/playing. The overlay draws a score timeline with detected boundaries and playhead. These controls implement no scene behaviour.

---

## 7. Audio engine & player

### 7.1 Engine (D-043)
- One engine-owned, JS-created `<audio preload="metadata">` outside page/island markup. Native output on every platform: no `crossOrigin`, `AudioContext`, source node, analyser or context recovery. Never fetch or decode whole audio files in the browser.
- Call `play()` synchronously in the user gesture before any await. Set `navigator.audioSession.type = 'playback'` where supported; failure of this optional hint must not block playback.
- Confirm playing from media events, never button intent. Loading/buffering are pending states; native/OS pause becomes paused and cancels pending play intent; natural completion becomes ended. A rejected play promise or load/decode failure shows an inline error with Retry. Silence is not an error. Preserve current item and position for retry.
- New selection intent supersedes old pending loads/seeks/play promises. Keep item-specific tokens/listeners so stale callbacks cannot change the current item. Animation pause/visibility never pauses audio or transport UI.
- Media Session API: title, artist, artwork, play/pause/seek/prev/next handlers. Global shortcuts, Media Session and player buttons always target the active item, never a staged mix (D-034).
- Native output removes the Web Audio dependency; silent-switch, background and lock-screen behavior still requires real-device M2 checks.

### 7.2 Player bar (persistent)
- Hidden until something has been loaded, then slides in. Controls use an outlined Play button and thin 1–2px seek track; thumb appears on hover/focus/drag and is always visible on touch. Desktop volume is an icon with an accessible focus/hover slider, hidden on mobile. Desktop target height is 56px before safe-area padding; it may grow with content or zoom. `--player-h` tracks the measured outer height (§4.3).
- Shows: artwork thumb · title + artist/series (mono) · prev/play/next · seek slider · elapsed/total (mono) · volume (desktop only, since it is often read-only on iOS) · link to the item's page.
- **Mobile layout:** two rows, with safe-area padding below. First row: linked title/artist and prev/play/next, with artwork only if space permits. Second row: elapsed time, seek slider, total time. Hide volume. Allow wrapping and increased height at large text sizes; do not squeeze all controls into a 56px row. Keep transport touch targets at least 44×44px and reserve space using the measured height.
- For mixes, it shows the current tracklist entry ("now: Artist — Title") when a tracklist exists.
- Shows loading and buffering states. Uses `aria-live="polite"` **only** for track changes and errors, never for time updates.
- **Resume (mixes only):** saves `{slug, position}` to `localStorage` at most every 5s and on pause, wrapped in try/catch. A later visit shows an inline, dismissible "Resume <title> at 42:10" choice and only plays when the visitor clicks. It never interrupts an active session or blocks the page.
- **Keyboard:** `Space` play/pause, `J`/`L` ±15s, `M` mute. **Ignored** when focus is in an input, textarea, contenteditable, select, or on a button, link or slider, so native behaviour is preserved there.

### 7.3 Mix scrubber
- **The waveform is in v1.** Mixes are a headline feature, scrubbing 2.5 hours needs orientation, and the peaks are cheap to precompute. It stays visually quiet.
- **Peaks format (single, fixed):**
  ```json
  { "version": 2, "duration": 3626.74, "length": 2000, "peak": [0.0, 0.91, ...], "rms": [0.0, 0.43, ...] }
  ```
  `peak[i]` is the **max absolute amplitude** and `rms[i]` the **RMS** of bucket *i* (equal-duration buckets). Each array is normalised so its own loudest bucket equals 1.0 and rounded to 3 decimals. **Draw `rms` as the waveform body** and `peak` as a faint outline at most. On loud, mastered mixes max-abs alone renders as a near-solid block (measured on the first real mix: median 0.88 vs 0.43 for RMS; see `inputs/mixes/roam-mix-2026/waveforms.png`) (D-035). When aggregating into fewer bars, take the max of `peak` and the max of `rms` per bar.
- **Drawing:** bars = `floor(canvasCssWidth / 3)` (2px bar + 1px gap). Each bar takes the **max** of the peaks in its range. The canvas is DPR-scaled and redrawn on resize. Played bars use `--fg` and unplayed bars use `--fg-dim`. A hover/drag line shows a time tooltip, and seeking is committed on pointerup.
- Pointer preview follows the next rendered frame using local staged position; transport updates must not pull the thumb away during dragging. On commit, place the marker at the requested time immediately and distinguish seeking from confirmed playback. Do not glide through skipped time. Avoid waveform draw-in or bar magnification initially; make the whole waveform height a comfortable hit target. Peaks/image failures do not block audio; retain a plain seek input if peaks fail.
- Tracklist markers are small ticks at the top. Chapter and waveform actions follow §7.4 rather than blindly seeking whichever item the global player holds.
- Accessible: pair the canvas (decorative, hidden from assistive technology) with a focusable native range input, a visible focus indicator, an accessible label and `aria-valuetext="42 minutes 10 seconds of 2 hours 25 minutes"`. Set min/max/value from the displayed mix and disable seeking until duration is known. Arrow keys move ±5s, PageUp/PageDown ±60s, Home/End go to the start/end. Support pointer capture for dragging; pointer cancellation restores the previous position without seeking. Preserve vertical touch scrolling outside an intentional scrub gesture.
- **Deep link:** `?t=1h12m30s` stages a requested time on the displayed mix page; route entry never replaces, pauses or seeks the active player. Show **“Play from 1:12:30”**. A "Copy link at current time" button uses that mix's active position when it is the current item, otherwise its staged page position; it must never copy another item's time. See §7.4.

### 7.4 Browsing versus playback
- Keep the displayed page's mix/track ID and staged position separate from the engine's active item. Navigation, including back/forward and time-linked URLs, leaves active playback untouched. On a fresh visit, stage the requested item/time without creating playback or autoplaying it.
- **Play from a staged time or chapter:** an explicit click/keyboard activation selects that mix, loads it if necessary, seeks once metadata is available, and plays it. This replaces another active item only because the visitor requested playback.
- **Waveform seek:** if the displayed mix is already active, seek it while preserving its current play/pause state. If it is not active, committing a scrub stages the position on that page only and shows **“Play from [time]”**; the engine's existing item and playback remain untouched until that explicit Play action. Use the same rule for keyboard and pointer scrubbing. Cancelling a gesture does not change the engine. This supersedes v1.1's load-another-mix-paused rule (D-023; see D-026).
- Starting a mix uses this precedence: explicit chapter/scrub time, then valid URL time, then a saved position only when the visitor selects Resume, otherwise zero. Merely browsing never restores a saved position into the engine.
- Accept non-negative integer seconds or ordered hour/minute/second strings such as `1h12m30s`. Invalid or non-finite values are ignored; clamp valid requested times to the real media duration after metadata loads. Make metadata listeners item-specific so a late event from an old selection cannot seek a new item. Browser history changes update staged page state only.

### 7.5 Feedback and direct control

- A Play request receives immediate selected/pending feedback, while playing indicators wait for confirmed transport. Keep Pause/Cancel available during pending work. Do not navigate or open a modal as a side effect of pressing Play.
- Use inline loading/buffering/error/interruption states, stable artwork/title, and Retry/Resume where appropriate. A small spinner or text label is acceptable after ~150ms if needed; do not pretend indeterminate loading has measurable progress. Controls respond before network audio starts.
- Time uses tabular numerals. Metadata changes must not push controls around. Use a linked, accessibly named truncated title when space is limited.
- Copy-time success confirms inline for about 1.5s without moving focus. If clipboard access fails, offer selectable link text.
- A mix ends with Replay and no unrelated automatic next item. Release next/previous follows eligible track order. The detail page is the expanded listening view; a second mobile player sheet is deferred.

---

## 8. Background & audio response

### 8.1 Scene interface (the only abstraction v1 needs)
```ts
interface AudioFeatures { energy: number; playing: number } // 0..1, smoothed
interface Scene {
  mount(ctx: { renderer: THREE.WebGLRenderer; width: number; height: number; reducedMotion: boolean }): void | Promise<void>;
  update(f: AudioFeatures, timeSec: number, dtSec: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
```
The runtime hosts exactly **one** scene in v1. There is no crossfade machinery, no second scene and no immersive mode (see `ROADMAP.md`).

### 8.2 Scene `horizon` (provisional motif, to be assessed in the M1 prototype)
- A particle field forming a curved moon/planet limb rising from the lower-right. It is dense at the edge and scatters into dust above. A thin rim light uses `--accent` and blends towards `--accent-2` deeper in. Slow idle drift.
- Particle counts are **tuned during the prototype** with targets of 60fps on an M-series laptop and ≥45fps on a mid-range phone. Start at around 60k desktop / 15k mobile and adjust.
- DPR is capped at 2 on desktop and 1.5 on mobile. The render loop pauses when `document.hidden` or when the canvas is off-screen.
- **First paint** shows `public/poster/horizon.avif`, and the canvas fades in once the first frame renders. If WebGL fails, the poster stays.
- Generate stable typed point buffers once; move particles through shader time/parameters rather than CPU per-particle updates. Tune silhouette, density, rim light and sparse dust before adding more points. Start without bloom or additional full-screen postprocessing passes. Profile point size/transparency overdraw as well as draw calls.
- Match poster and live framing at desktop and phone sizes. Warm/compile the scene where supported before replacing the poster; do not require an arbitrary frame count. Graphics failure/context loss restores the poster and does not disable audio/UI.
- Reset/clamp render delta after tab restoration and integrate audio-driven phase (`phase += dt * speed`) rather than multiplying total elapsed time by a changing speed. Smooth audio parameters alone cannot prevent that phase jump.
- Start with main-thread rendering and stable downward quality steps when measured frame times remain poor. No repeated quality oscillation. Respect motion settings before loading graphics where practical. Shader dithering is an optional remedy for observed gradient banding; sparse point fragments cannot replace grain across untouched background pixels.

### 8.3 Precomputed visual score (D-047 supersedes score ownership in D-043)
- Native audio provides the clock. `StageItemMeta.scoreUrl` is a URL or null. The bridge loads and validates score JSON once per URL, asynchronously on itemchange, and samples at the native audio clock. `getScoreWindow(fromSec, toSec)` provides a reused window descriptor over the cached arrays (startIndex inclusive, endIndex exclusive) for visual lookahead; never mutate these arrays. Missing/invalid scores fall back to playing plus authored section/BPM metadata and never block playback.
- Score v1: `version: 1`, `rateHz: 4`, `duration` in seconds, `bands: [energy, low, mid, high]`, `data` arrays of byte values 0–255, and detected `boundaries`. Initially use energy/boundaries only; spectral styling is deferred.
- Boundary priority: confirmed tracklist `at` → manual release `section_times` → detected score boundaries → none. Detected boundaries remain in the score, never promoted to confirmed tracklist metadata.
- Score sampling and seeded target motion are deterministic for item + position; transient easing after a seek may depend on the previous frame. Ease section changes over `min(0.35 × section length, 6s)`; hold/smooth visual envelopes across seek/item changes to avoid flashes. Use elapsed-time easing, not frame counts.
- Bridge `getFeatures()` linearly interpolates byte bands to 0–1 and smooths with attack tau 80ms/release tau 600ms. Bands are not multiplied by playing; missing/invalid scores return zero bands and scoreAvailable=false. Stale loads cannot replace the active item’s score. `playing` eases toward 1 with tau 1.5s while confirmed playing, toward 0 with tau 2.5s otherwise. Releases have `scoreUrl: null` until scores are available.
- D-048 supersedes D-044 deferral: mark titles, text/list groups, scrubber/tracklist, rail and player with `data-stage-exclude`. `getExclusionRects()` reuses its CSS-pixel array; recompute on route/resize/scroll/player visibility or layout changes in a single rAF-throttled pass, not every frame. Nested marks are covered by their outer marked group. Emit exclusions on recompute. Visual response belongs to the visual owner. D-059 removes the +20% exception: every variant uses ≤+15% atmosphere thickness; the locked drift/rim/sparkle caps remain unchanged.

### 8.4 Caps **[LOCKED]**
| Uniform | Drives | Max change vs. idle |
|---|---|---|
| `uEnergy × uPlaying` | drift speed | +20% |
| `uEnergy × uPlaying` | rim brightness | +15% |
| `uPlaying` | dust sparkle | +10% |

No audio- or section-driven hue shifts. Playback state alone blends near-monochrome into the same fixed accent palette over ~3 s and recedes over 4–6 s (D-059, explicitly requested in phase V). No strobing, camera shake, or audio-driven page-brightness change. **Test:** a screenshot taken idle and one taken mid-track should read as the same site.

### 8.5 Motion controls
- `prefers-reduced-motion: reduce` renders a single still frame with no audio modulation.
- A **manual "Pause animation" toggle** goes in the footer and the mobile menu, persisted in `localStorage` with try/catch. It freezes the scene on its current frame.
- Freeze decorative now-playing glyphs as well. UI state/progress, seeking and audio keep working. A route change while animation is paused must not move the scene; apply the current route's pose only when motion resumes, or retain the stable pose.

### 8.6 Bounded visual experiments in M1

- Compare a stable horizon with **restrained route-aware framing**: home retains the opening silhouette; mixes preserve waveform clearance; reading pages pull detail away and soften the rim. Use a few explicit poses, the same palette and one scene. Treat 600–1200ms as a prototype range, not a required wait. Query/time updates alone never change the pose. Audio influence caps remain relative to each pose's idle baseline.
- Brian chooses whether route poses and the single artwork handoff improve the experience at the end of M1. Stable framing and plain content fades are complete fallbacks, not unfinished states. Do not require these experiments to justify a second scene or render-target infrastructure.
- A small dev-only tuning panel may help compare framing/density/motion if config editing becomes a bottleneck. Exclude imports and UI from production; a query-string switch alone is insufficient. No production tuning dependency is required.
- Worker rendering, a mobile sheet, recurring scroll choreography and pointer parallax are not prerequisites for this prototype. Further enhancements belong in `ROADMAP.md` with evidence-based triggers.

### 8.7 Scene as shipped in phase V (D-051–D-056; supersedes §8.2's motif)
- **Scene:** a lit particle moon (surface 52k desktop / 16k phone, thinning inwards from the limb), a terminator from a fixed upper-right sun, an opaque body that occludes far dust, a thin atmosphere (view-angle glow inside the limb, short shell outside), dust in three parallax depths, and a debris ring used only by variant B. Rendered to a half-float target, then one composite pass: exposure, vignette, grain, ACES tone mapping, sRGB, dither. Code: `src/components/stage/{scene,runtime,coupling,params}.ts`.
- **Playback state** (`coupling.ts › PhaseEnvelopes`): idle near-monochrome; loading inhales for ≤3 s; playing blooms colour (τ 1 s) and coupling (τ 0.8 s); buffering holds; paused exhales to 0.93 brightness and recedes colour (τ 1.6 s); ended/idle/error settle. Seeks ease position-mapped values over ~1.3 s and add one soft dust disturbance; item changes reseed gently (hash of the item id).
- **Music:** §8.3 score only. If known media and score durations differ by more than 2 s, use playback-state behavior without musical coupling (D-064). Breath → drift +≤20%, rim +≤15% (shared with arc and `low`); `playing` and `high` → sparkle +≤10%; macro arc → limb density (≤12% of buffer) and atmosphere thickness (≤+15% in A, B and C; D-059). One ripple per boundary; ripple brightness never exceeds the rim cap.
- **Composition:** poses per route group and breakpoint (`poseFor`), glide 0.9 s; exclusion falloff per D-055, with a final 0.14 sRGB highlight ceiling at full overlap (D-063) to prevent additive layers washing out text. Posters `public/poster/{home,listen,mixes,read}{,-mobile}.avif`, made by `pnpm posters`.
- **Performance:** active tier caps rendering at 60 fps (playing, camera moves, settling, ripples); idle renders at 20 fps; reduced motion renders one still per route; the animation pause freezes. Governor: EMA 0.08, samples clamped at 250 ms, drops with τ ≈ 0.6 s, recovers over ~10 s once cadence is stable below 98% of budget (the old 80% threshold was unreachable at 60 Hz), floor 0.55; it scales draw count and DPR (0.25 steps) only.
- **Variants:** `?visual=b|c` in dev; the lab switches live. A is the default everywhere. Fixed palette and sun azimuth across sections; no HSL offsets. `/lab` uses Tweakpane for all parameters, score bands/boundaries/confirmed chapters on a cached timeline, and a transport that works without sound (D-059–D-061).
- **Extras (D-057, D-058):** the lit fraction follows the real lunar phase (eased in after the poster swap); a subtle pointer parallax on desktop. Neither affects posters, reduced motion or the animation pause.

---

## 9. Future storyboard: required separation only

Keep three layers independent: **(1) the audio engine**, which owns media, transport and **the playback clock, the future source of truth for timed visuals**; **(2) the visual runtime**, which hosts a `Scene`; and **(3) content/UI**. The ambient scene must not depend on scroll position or page lifecycle. The content schemas include an optional, unused `scene?: string` field. Everything else (timelines, multiple scenes, crossfades, immersive mode, and using the rdelune-productions visual runtime as a scene) is in `ROADMAP.md`.

---

## 10. Content & media

### 10.1 Schemas (`src/content.config.ts`)
```ts
site (json): { name, headline: string[3], blurb, rdeluneUrl, profiles: {label, href}[], contactEmail? }

mixes: {
  id: string, slug, title, date: date, dateApprox: boolean = false,
  series?: string, tags: string[] = [], description?: string,
  cover?: image, coverAlt?: string,
  media: { src: url, duration: number, bytes: number, peaks: url, lufs?: number, sha: string },
  tracklist: { at: number, artist: string, title: string, label?: string }[] = [],   // validated: ascending, < duration
  mixcloudUrl?: url, featured: boolean = false, scene?: string, draft: boolean = false,
}

releaseOverlays: {        // thin layer over the showcase feed; keyed by album slug
  albumSlug: string, featured: boolean = false, blurb?: string, credits?: string,
  links?: {label, href}[], hidden: boolean = false, scene?: string,
}

projects: { slug, title, year, role, summary, stack: string[], outcomes: string[],
            links: {label, href}[], cover?, coverAlt?, featured: boolean, order: number, draft: boolean }

posts:    { slug, title, date, description?, tags: string[], draft: boolean = false }

cv (json): { roles: { id, org, title, start, end?, summary, bullets: string[], caseStudies: string[] }[],
             skills: {group, items: string[]}[], education: [], talks: [] }
             // caseStudies[] must reference existing project slugs (validate at build)
```

### 10.2 Releases (`lib/feed/showcase.ts`)
- v1 reads `src/fixtures/showcase.sample.json`, which has the **upstream feed shape** (see `rdelune-productions/docs/showcase-feed-spec.md`). It normalises snake_case/legacy camelCase, ignores unknown fields, and **only exposes `is_published` tracks with an `r2_url`**. Track order comes from the feed's array order, never from filenames.
- **Fixture provenance:** curate one album from an upstream feed capture and validate against the upstream JSON Schema. Keep its real track IDs, URLs and metadata; record capture date/source in `src/fixtures/README.md`. `rdelune-productions/public/data/showcase.json` is already normalized (`src`, `source_url`, `duration`) and must not be copied directly as upstream input. If only that file is available, explicitly map it back to upstream fields, document each mapping, and verify publication flags rather than guessing. `showcase-template.json` is not a ready-to-use substitute: tracks without explicit publication flags cannot qualify under this site's publication rule. Do not widen the importer to silently accept the normalized contract.
- **Eligibility order:** normalize accepted legacy field names, then exclude albums explicitly marked `active: false` (missing `active` defaults to true per the upstream contract), apply local `hidden` overlays, and retain only tracks explicitly published with valid public MP3 URLs under the contract. Omit albums with no eligible tracks. Use this single eligibility result for pages, catalogue rows, featured selection and queues. Malformed records fail validation with a clear error; unpublished/inactive records are intentionally filtered.
- **Track identity is the Roam Studio track `id`.** Release URLs use a diacritic-stripped album slug (same rule as productions).
- Overlays are merged by `albumSlug`. `hidden: true` removes an album from the site.
- Cross-origin peaks/score JSON needs CORS for this site’s origin (§10.3). Native audio does not depend on analyser CORS. **Host playback is verified in M2.**

### 10.3 Media host requirements (R2)
- Cross-origin JSON (peaks/scores) requires CORS for the production origin and local preview origins (`http://localhost:4357`, `http://127.0.0.1:4357`, and port 4358 for static preview). Allow GET/HEAD and expose cache/length headers as needed. Native audio has no `crossOrigin` attribute and requires no analyser CORS.
- M1 uses a **local development preview**, where visibly marked placeholder copy is permitted. Hosted preview publication is not required. If a hosted preview is later used, declare its exact origin in the media CORS policy before claiming host verification; do not assume production-origin permissions cover it. Production build checks continue to reject `TODO(copy)` placeholders.
- Verify that a `Range` request returns **206** with a `Content-Range` header, that seeking near the end of a long mix is fast, and that native audio is **audible** on each target browser.
- **Mix derivative filenames are content-hashed:** `mixes/<slug>.<sha8>.<mp3|m4a>`, `mixes/<slug>.<sha8>.peaks.json`, `mixes/<slug>.<sha8>.score.json`. Served with `Cache-Control: public, max-age=31536000, immutable`. Slugs and page URLs stay stable.

### 10.4 `scripts/ingest-mix.ts` (one mix at a time in v1)
1. Input: a master file plus a slug.
2. **Derivative by source type (D-036). No loudness processing.** Measure integrated LUFS and true peak (`ebur128=peak=true`) and record them as `media.lufs` / `media.truePeak` for information only.
   - **Lossy source (MP3 ≥ 256 kbps CBR, or AAC):** **pass through unchanged** (byte copy). Do not transcode lossy to lossy. CBR MP3 seeks accurately with range requests in all target browsers.
   - **Lossless source (WAV/AIFF/FLAC):** encode on macOS with **Apple's AAC encoder** (`ffmpeg -c:a aac_at -b:a 256k -movflags +faststart`, or `afconvert -f m4af -d aac -b 256000`), *not* ffmpeg's built-in `aac`. Fallback where Apple AAC is unavailable: LAME MP3 320 kbps CBR.
   - **Post-encode check (all transcodes):** decode the derivative and count samples above 0 dBFS. If any are found, re-encode with a fixed gain trim (start at -1 dB, step -0.5 dB, max -3 dB) until clean, and record `media.gainDb`. Fail with a clear message if still not clean at -3 dB. Pass-through files skip this step.
   - Evidence: on the first real mix (a -10.6 LUFS, 320 kbps MP3), ffmpeg's built-in AAC produced decoded overs of up to +4.8 dBFS at 192–320 kbps, and still overshot after a -1.2 dB trim. The source MP3 peaks at +0.19 dBFS. See `inputs/mixes/roam-mix-2026/README.md`.
3. `audiowaveform` → raw peaks, converted to the §7.3 format. Generate score v1 (§8.3) aligned with the delivered audio; record generator/recipe version. Existing unscored items remain playable.
4. `sha` = hash of (master bytes + recipe string + ffmpeg version + audiowaveform version + score generator version). A changed recipe or tool produces a new derivative.
5. Upload audio, peaks and any generated score. **Write or update mix metadata only after every referenced upload succeeds.** A missing score uses null; never publish a guessed URL. Local development currently serves the supplied ROAM score from `/data/roam-mix-2026.score.json`; hashed R2 publication and the score generator are separate visual-owner work.
6. Tracklist ingest: `node scripts/ingest-tracklist.mjs <mix-slug> <tracklist.txt>` parses `mm:ss Artist - Title [Label]` or `h:mm:ss Artist - Title`. Comments are ignored; any TODO line is reported and dropped before publication. Reject duplicate/descending times and entries at/after duration. Build-time `prepare-mixes.mjs` refreshes the sanitized chapter projection from the configured source file; source text never enters client bundles.
7. Mix chapters (D-046): numbered rows and waveform ticks use D-026 (active mix seeks; inactive mix stages and shows Play from time). Highlight only the active chapter without auto-scrolling. Player sub-line announces now: Artist — Title only on chapter changes. Media Session title/artist/album reflect chapter title, artist and mix title. Catalogue shows N TRACKS only for nonempty named lists.
8. Artwork (D-049): release tiles and mix rows preload on pointer/focus intent; selecting a track preloads its artwork and the next track’s artwork. Cache image objects by URL with decoding=async; failed decodes do not block playback/navigation.

---

## 11. Accessibility, performance, SEO

- Semantic landmarks, a skip link, logical headings and visible focus (accent outline).
- Everything works with WebGL off, JS off (reading and navigation) and reduced motion on.
- **Performance targets** (Lighthouse mobile preset, simulated slow 4G, on `/`, `/mixes/[slug]`, `/about`): Performance ≥ 90, Accessibility 100, SEO 100. LCP < 2.0s. First-load JS excluding three.js < 60 KB gz. **Also measure 10s after the animation starts:** no long tasks over 50ms from the scene on a mid-range phone profile, and stable fps per §8.2. The three.js chunk loads on `requestIdleCallback`, with a 2s fallback.
- Artwork is lazy-loaded below the fold with explicit dimensions (no layout shift).
- Per-route title, description and canonical URL. One static default OG image (generated OG images are on the roadmap).
- JSON-LD `Person` on `/`, whose `sameAs` lists **only profiles that identify Brian** (Mixcloud, SoundCloud, GitHub, LinkedIn). rdelune is represented as `worksFor` → `Organization` only after Brian confirms the wording. `BlogPosting` on posts, once posts exist.
- `sitemap.xml`, `robots.txt`, and `/rss.xml` once writing exists.

### 11.1 Smoothness verification

- Target visible control acknowledgement within 100ms on named tested devices; pointer preview should follow the next rendered frame. Do not guarantee all input under 16ms or equate network playback latency with UI response.
- Inspect actual frame-time distributions and sustained bad frames during navigation, playback, dragging and resizing. Record device/browser/network conditions. Do not substitute a universal zero-dropped-frame assertion or CPU-throttled desktop for real mobile checks.
- Navigation persistence checks use a sufficiently long, playing fixture: record engine/audio/renderer initialization counts and object identities, unexpected pause/load events and media-time progression with tolerance for browser clock precision/buffering. One DOM canvas is not proof of one WebGL context, and advancing time alone is not proof of audible output. Listen manually too.
- Test static/reduced-motion/paused graphics with active seeking so rendering pause cannot disable transport UI. Test stale media callbacks, rapid selections, native/OS pauses and rejected play, menu focus and page/history scroll restoration.
- Check visible layout stability in addition to CLS telemetry, including player appearance at the bottom of a page. Recent-input shifts may be excluded from CLS. No padding animation is allowed to move the reading surface.
- A short repeat-use pass includes 15 minutes of listening while reading/browsing, repeated scrubbing, phone rotation and background/restore. Record available devices and remaining verification limits. Automate meaningful state/routing cases when tooling exists; no image-perfect assertion against an unconstrained animated frame.

---

## 12. Milestones & exit criteria

**M0 · Reconcile.** ✅ This document, `DECISIONS.md` and `ROADMAP.md`.

**M1 · Visual prototype** (homepage, nav, one mix page, player layout; real fonts and tokens; static poster first, then the `horizon` scene)
- [ ] Use a local development preview for placeholder copy. Prepare the curated upstream fixture and check one real release URL early; unavailable media is recorded, not represented as verified.
- [ ] Tested at wide desktop, 375px phone, a short viewport (~600px tall) and 200% zoom. The intro never clips.
- [ ] The two-row mobile player and dynamic safe-area reservation keep content, seek controls and focus visible at large text sizes.
- [ ] Keyboard-only pass, reduced motion, and the manual pause toggle all work.
- [ ] Named featured Play action, discoverable navigation, short interruptible content transition and stable player reservation are reviewable. Compare the bounded route-pose and artwork-transition experiments (§8.6); retain only what improves the composition and control.
- [ ] Brian reviews composition, motif and accent colour, **then locks or changes them** (logged in `DECISIONS.md`).

**M2 · Listening path proof** (fixtures: `Long Distance Runaround` 2:25:06 on R2, plus 1 album from the showcase fixture on `audio.rdelune.dev`)
- **Required inputs, not yet verified:** the actual long-mix master, single-mix derivative/peaks upload, validated release fixture, chosen media hostname, and ability to configure CORS on both hosts. Start local engine work independently, but leave host/browser checks incomplete until these inputs are available. Record browsers/devices unavailable for testing.
- [ ] Play, seek to 2:20:00, navigate through every route, use back/forward: **no gap and no duplicate audio or WebGL**.
- [ ] Reload → inline resume choice → resumes only on click. Fresh and internally navigated `?t=` links stage the correct mix/time; browsing or scrubbing a different mix leaves current playback untouched until explicit Play. Chapter playback and waveform staging/seek follow §7.4; URL time wins over saved resume time, invalid times are ignored and out-of-range times clamp safely.
- [ ] Media/play errors show Retry; native/OS pauses show paused and cancel pending playback. No automatic restart after user pause. Missing/invalid scores fall back without affecting audio; silence is not flagged.
- [ ] Fixture validation and eligibility checks cover the normalized-input mismatch, inactive albums, unpublished tracks, local hidden overlays, empty albums, featured selection and queues.
- [ ] JSON CORS, 206 responses and audible native playback are verified **on both media hosts** in Safari (macOS + iOS) and Chrome (desktop + Android if available).
- [ ] Only then: energy modulation switched on, the §8.4 caps verified, and the idle-vs-playing screenshot test passed.
- [ ] Complete §11.1 checks: truthful feedback, seek commit without playhead glide, animation pause without frozen controls, rapid-input race handling, and sustained listening. No mandatory mobile sheet, gain ramps, worker or animation library added to pass this milestone.

**M3 · Catalogues & pages**
- [ ] Music grid and release pages built from fixture + overlays, with prev/next in the release.
- [ ] Mix catalogue (all seed mixes listed; unplayable ones are hidden until ingested), tracklist chapters, copy-time link.
- [ ] Work + case study template, About with CV ↔ case-study links validated, print stylesheet.
- [ ] Writing templates (hidden from nav while empty).

**M4 · Content & ship**
- [ ] Real copy from Brian replaces every `TODO(copy)`. A dev check fails the production build if any remain.
- [ ] Domain, OG image, JSON-LD and sitemap in place. Deploy to Cloudflare Pages. §11 targets met.

---

## 13. Open questions (defaults apply until answered)

| Question | Default |
|---|---|
| Domain | `PUBLIC_SITE_URL` placeholder |
| Display names | Site: "Brían Diolún". Release credit: feed artist_name as published (D-041). DJ/series alias: "Roam" |
| Accent colour + hero motif | Lunar blue + moon-limb horizon. Decided at the end of M1 |
| Hero copy, bio, CV, projects, running results | `TODO(copy)` until supplied |
| Which album is featured | First eligible album in the fixture, after filtering and overlays |
| rdelune wording in JSON-LD and the intro | Plain link only until confirmed |
| ~~Mix derivatives over 0 dBFS~~ | **Resolved by D-036** (pass-through for lossy sources; Apple AAC + post-encode check for lossless) |

---

## 14. Claude review before implementation

Review this consolidated v1.2 document as the primary source. The two UX plans and `CODEX-UX-COMPARISON.md` explain the alternatives; do not treat every proposed effect or library in them as an accepted requirement. Record findings against this document before starting implementation. Completed 2026-10-30: see §15.

- [x] Check the synthesis for conflicts with locked identity, sources, publication rules and persistence.
- [x] Check that inactive-mix scrub staging (D-026) is consistent across URL, chapter, Resume and Play behaviours.
- [x] Confirm the two-row player, mobile modal navigation, focus/scroll lifecycle and measured safe-area layout are implementable without competing player surfaces.
- [x] Check that route poses and one artwork handoff are bounded prototype experiments; failures fall back cleanly, without expanding v1 scope.
- [x] Check scene/UI scheduling, source-node recovery, stale media events, seek completion and phase continuity.
- [x] Check native motion and renderer choices against the pinned versions when scaffolding eventually occurs; identify any specific dependency justified by an accepted interaction.
- [x] Check fixture provenance, upstream schema compatibility and eligibility against the existing local contract.
- [x] Flag missing real inputs and browser/device access explicitly. Do not mark media, performance or visual acceptance criteria complete based on documentation.

Expected review output: actionable findings with severity, file/section and a proposed correction; identify genuine blockers separately from optional polish. Do not implement the site during this review. Resolve review findings before moving into M1.

---

---

## 15. Claude review of v1.2 (2026-10-30)

**Verdict: ready for M1 once the three corrections below are applied (now done in this document).** The synthesis is consistent with the locked identity, sources, publication rules and persistence model. Codex's critique of `claude-ux-plan.md` is accepted. In particular: independent scheduling gates (my single-loop wording could freeze the scrubber), no playhead glide through skipped time, no blanket gain ramps, measured rather than absolute performance claims, and direct two-row mobile transport before any sheet. Route poses and one artwork handoff are correctly bounded as M1 experiments with complete fallbacks.

### Findings

| # | Severity | Section | Finding | Correction | Status |
|---|---|---|---|---|---|
| R1 | **P1 (blocker for mobile listening)** | §7.1 | Routing media through Web Audio on iOS/iPadOS risks silence under the hardware silent switch and interruption on screen lock/backgrounding, which is exactly how people listen to 2-hour mixes on a phone. Binding is irreversible, so §7.1's recovery path cannot fix this after the fact | Native output on iOS by default, `audioSession.type='playback'` where available, analysis re-enabled only after device proof | Applied (§7.1, D-032) |
| R2 | P2 | §4.4 | With Astro's ClientRouter the browser snapshots the page during a View Transition. Unless the Stage and Player are named and their old snapshots suppressed, the background and progress freeze for the transition, and the overlay can swallow a player click | Named transitions, old snapshot hidden, live new snapshot, pointer-events check, ≤220ms, VT-independent persistence | Applied (§4.4, D-033) |
| R3 | P2 | §7.1 / §7.4 | Unspecified: who owns the audio element, gesture-synchronous context resume, and whether global shortcuts/Media Session act on the active or the staged mix (D-026 makes these differ) | Engine-owned JS element; synchronous `resume()` in the gesture; global controls always target the active item | Applied (§7.1, D-034) |
| R4 | P3 | §8.5 | A reduced-motion still frame must re-render on resize and after context restoration, or the poster/scene framing drifts | Implementation note: "still" means no time advance, not no rendering | Note only |
| R5 | P3 | §10.4 | `audiowaveform` and `ffmpeg` are host tools. Pin and record their versions (they're part of the derivative `sha`) and check for them with a clear error | Add to the setup docs at scaffold time | Note only |

### §14 checklist results
- Locked identity, sources, publication rules and persistence: **consistent**.
- D-026 staging across URL / chapter / Resume / Play: **consistent**. R3 closes the remaining gap (global controls).
- Two-row player, modal mobile nav, focus/scroll lifecycle, measured safe-area reservation: **implementable** with one player surface.
- Route poses and artwork handoff: **bounded**, with clean fallbacks.
- Scene/UI scheduling, source-node recovery, stale events, seek completion, phase continuity: **covered**, plus R1 for iOS.
- Native motion and renderer: **no additional dependency justified yet**. Re-check when the Astro and three.js versions are pinned.
- Fixture provenance and eligibility vs the local contract: **correct** (D-020, D-021).

### Missing real inputs (not blockers for M1, blockers for M2)
1. The master file for *Long Distance Runaround* (or another long mix).
2. An R2 bucket and media hostname for mixes, plus the ability to set CORS on it **and on `audio.rdelune.dev`**.
3. An upstream `showcase.json` capture for the curated fixture.
4. Devices: Brian's Mac (Safari + Chrome) and iPhone; an Android phone if available. Record whatever is missing.
5. Real copy (hero, blurb, bio) for M4. Placeholders are fine for M1.

---

## Appendix A — Seed mixes (Mixcloud, read 2026-10-30)

All dates are approximate (Mixcloud shows relative dates only), so set `dateApprox: true`. Series names are **provisional** until Brian confirms them. Mixcloud URLs are to be filled in per mix.

| slug | title | ~year | duration | series (provisional) |
|---|---|---|---|---|
| long-distance-runaround | Long Distance Runaround // Running Tunes | 2025 | 2:25:06 | Running |
| year-24 | '24 | 2025 | 1:00:00 | Year mixes |
| year-23 | '23 | 2024 | 57:36 | Year mixes |
| year-22 | '22 | 2022 | 1:00:00 | Year mixes |
| holiday-fizzler | Holiday Fizzler (Ambient) | 2020 | 1:19:24 | — |
| autnote-6 | Skirmish Blog AUTNOTE series #6 (Jazz, Lo-fi, Eastern) | 2017 | 1:05:05 | AUTNOTE |
| roam-mix-1 | Roam mix 1 | 2017 | 1:30:35 | Roam |
| autnote-1 | Skirmish Blog AUTNOTE series #1 | 2015 | 1:00:32 | AUTNOTE |
| bank-holiday-chillout | Bank Holiday Chillout | 2014 | 59:53 | — |
| dream-gathering-african-vibes | Dream Gathering DJ set (African Vibes) | 2014 | 1:23:39 | — |

Profiles: Mixcloud https://www.mixcloud.com/brian-diolun/ · SoundCloud https://soundcloud.com/brian-d · rdelune https://rdelune.dev


### Mix artwork update (D-050 · 2026-10-30)
Every mix has `cover`, `coverSmall` and `coverAlt`. Published Mixcloud shows also retain `mixcloudUrl` and `coverSource`. Use local 300px catalogue and 600px detail/player originals from Mixcloud; catalogue images are decorative beside their named title, detail images have descriptive alt text and all reserve dimensions. The local ROAM_MIX_2026 item uses an explicitly approved neutral placeholder until its cover is supplied. Artwork propagates through the shared catalogue to intent preloads and Media Session; no live third-party image request is required.
