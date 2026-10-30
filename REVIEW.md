# Spec review and proposed first steps

Date: 30 October 2026.
Scope: the current `SPEC.md`, compared with the original Brian / rdelune spec, now restored from this chat as `SPEC-CODEX.md`. Both source versions are available side by side.

This is a review, not an implementation instruction or an amendment to the locked decisions in `SPEC.md`. No application code has been written.

## Recommendation

Use the new spec as the more concrete implementation reference, but revise its first milestone before building. Retain the original brief's emphasis on introduction, music, restraint, and proving playback early. Separate launch requirements from later enhancements. Do not turn every detailed suggestion into a prerequisite for a working site.

The central direction is sound: Astro content pages, one persistent audio engine, one shared Three.js background, and direct audio files. The main risk is spending the first build on infrastructure and secondary interactions before judging the actual homepage and listening experience.

## Comparison with the original brief

| Topic | Original | Current spec | Recommendation |
| --- | --- | --- | --- |
| Identity | Equal blend of Brian and rdelune; exact relationship unresolved | Personal site, consultancy linked externally; music aliases supplied | Use the newer distinctions as working context; verify display names and final copy before publishing |
| Homepage | Curated scrolling introduction, music, mixes, work, writing | Single-viewport introduction with a latest strip | Prototype a spacious opening screen with natural overflow; do not force all content into a fixed viewport |
| Navigation | Four main destinations, Writing when populated | Seven numbered destinations, including separate CV and Now | Keep the routes available, but compare a compact navigation against the full rail before locking its presentation |
| Music | Core experience with shared playback | Core experience with queue and richer metadata | Keep shared playback; add queue UI after transport and navigation are reliable |
| Mixes | Seeking required; waveform optional | Waveform, chapters, filters, time links, podcast feed | Keep seeking; prioritize chapters/time links ahead of filters and podcast publishing |
| Running | Small section in About | Small section in Now | Either works; avoid an empty Now page that adds maintenance without content |
| Visuals | Atmospheric particles/contours, subtle response | Specific lunar horizon, particle counts, beat pulse | Treat motif and counts as a visual prototype to assess; retain bounded influence |
| Future storyboard | Separate clock, graphics, and content; no implementation | Render-target crossfades, second scene, immersive CSS/store in v1 | Preserve separation and a minimal scene interface; defer crossfades and immersive behaviour |
| Media | Source/host unresolved | R2, AAC conversion, normalization, ingest automation | Preserve the newer hosting direction; prove one asset before building batch ingestion |
| Content | Hide empty public sections | All routes plus public writing empty state | Route templates are useful; only feature meaningful content in navigation |

## Issues to address before implementation

### 1. Future storyboard requirements have entered the initial scope

Sections 10 and 15 require two rendering targets, a crossfade implementation, a second scene, immersive stores, and content-fading CSS. That goes beyond reserving architecture for later storyboards and conflicts with the stated v1 non-goal.

Proposed change: one scene, one renderer, an independent audio clock, and a small update/dispose interface initially. Document how timed scenes could connect later. Implement and test crossfades when a second real scene is needed.

### 2. Audio processing should not silently change the music

Section 11 applies -14 LUFS normalization to every file. This was absent from the original brief and is a separate creative decision from streaming compression. FFmpeg's loudnorm can fall back from linear gain to dynamic processing under its documented conditions.

Proposed change: preserve masters, measure loudness, and generate streaming derivatives without automatic loudness alteration by default. Decide separately whether to normalize mixes or releases. Include processing settings and tool versions in the derivative fingerprint so a changed recipe causes regeneration.

Reference: https://ffmpeg.org/ffmpeg-filters.html#loudnorm

### 3. Media filenames and caching contradict each other

Section 11 uploads stable names such as `mixes/<slug>.m4a`; section 14 requires content-hashed names and immutable one-year caching. Replacing the content behind a stable immutable URL can leave visitors hearing an old version.

Proposed change: use content-hashed derivative filenames and write the resulting URLs into metadata. Keep the user-facing slug stable. Hash peaks and audio consistently, and write metadata only after uploads succeed.

### 4. CORS must be tested as a playback dependency

Section 9.3 says a bad CORS setup merely gives zero analyser features. A CORS-cross-origin source routed through a MediaElementAudioSourceNode must output silence; with anonymous cross-origin loading, a failed CORS fetch may prevent loading altogether. A three-second zero-energy warning also mistakes a silent intro for a configuration failure.

Proposed change: distinguish media loading errors, analysis readiness, and legitimate silence. Configure origin/method/header rules on the media host and verify seeking and audible playback with the actual URLs. `Range` is a request header; allowed request headers and exposed response headers serve different purposes. Verify `206`/`Content-Range` behaviour as well as cross-origin access.

References:
- https://www.w3.org/TR/webaudio/#MediaElementAudioSourceNode
- https://developers.cloudflare.com/r2/buckets/cors/

### 5. State and audio analysis are more elaborate than needed

Preact signals, nanostores, and a singleton audio engine overlap unless ownership is explicit. Publishing feature objects through a global UI store at 60 Hz risks unnecessary subscriber work. Frame-based decay also changes behaviour with rendering frame rate.

Proposed change: use one shared state system for UI state. Let the Stage read the latest analysis data directly, without UI rerenders on every frame. Throttle progress display/storage independently. Use elapsed time for smoothing and decay. Start with overall energy and playback state; defer spectral-flux onset detection until a visual test demonstrates its value.

### 6. Layout and controls need clearer responsive rules

Seven bottom tabs plus a player can become crowded on phones. A strict single-viewport homepage may clip at short heights, large font sizes, or browser zoom. Hover-only play controls are insufficient for touch and keyboard access.

Proposed change: test the complete mobile navigation/player stack before committing to it. Use minimum-height rather than fixed-height content. Make play actions available on touch and focus. Global Space/J/L/M shortcuts must ignore editable content and interactive controls; Space on a focused button must retain normal behaviour.

### 7. Some implementation details need correction or qualification

- Use the installed Astro version's content API. Current Content Layer configuration uses `src/content.config.ts`; the proposed tree uses the older `src/content/config.ts` location. Pin the selected version rather than leaving a reproducible build tied to “latest stable.” Reference: https://docs.astro.build/en/guides/content-collections/
- A `window.print()` button opens a print dialog. Label it “Print / save PDF,” rather than promising a direct PDF download.
- Select a single peaks JSON format. “Pairs or max values” is ambiguous; define the conversion from the waveform tool's output, scale, duration, and sample count.
- A 2,000-point waveform needs a documented aggregation rule when drawn into a narrower canvas; fixed bar widths cannot display all points at every viewport width.
- The supplied series dates and aliases should remain provisional until checked. Do not infer public release metadata from filenames or relative dates alone.
- Use `sameAs` for pages identifying Brian, not automatically for a consultancy website; represent work affiliations with appropriate properties once facts are confirmed.
- Performance figures are useful targets, but should specify test conditions. Lazy-loading Three.js does not remove its later CPU/GPU cost. Test the page after the animation starts too.
- Provide a manual animation pause option in addition to reduced-motion handling, as included in the original brief.

## Proposed first steps

### Step 1 — reconcile the documents

Compare `SPEC.md` and `SPEC-CODEX.md` before choosing the final combined requirements. Both source versions are now preserved under distinct filenames. Record accepted decisions and explicitly defer extras. Do not silently edit locked decisions.

Output: one agreed v1 scope and a short decision log.

### Step 2 — establish the minimum content and media fixtures

Choose a short working blurb, the rdelune destination, one release/track, one representative long mix, and their artwork. Confirm which names to display. Use authorized test audio if real assets are not ready, clearly labelled as test material.

Output: enough real or clearly labelled content to judge the core experience, without importing the full catalogue.

### Step 3 — build a small visual prototype

Create the homepage, navigation, one mix page, and player layout. Start with a static horizon/poster, then add one ambient scene. Test wide desktop, narrow phone, short viewport, keyboard focus, and reduced motion.

Output: a reviewable direction for composition, identity, colour, and the mobile navigation. No command palette, feeds, beat detector, or multi-scene engine yet.

### Step 4 — prove the complete listening path

Implement one persistent engine and player. Play the representative long mix, seek near its end, navigate between pages, use back/forward, pause/resume, and reload into an explicit resume prompt. Test the R2/custom-domain source if available; local media proves UI behaviour but does not prove production CORS or range handling.

Connect restrained energy/playback-state modulation only after audio works. Check at least Safari and a Chromium browser, including a mobile browser when available.

Output: verified continuous listening and subtle graphics response with a documented list of remaining host/browser limits.

### Step 5 — expand only after the core is accepted

Add release playback, chapters/time links, and content templates. Build the batch media pipeline once one asset's delivery and metadata contract are stable. Add writing/work/CV content as available. Revisit command search, filters, podcast RSS, and more complex visuals when the catalogue and usage justify them.

## First milestone exit criteria

- A convincing introduction with a clear relationship to rdelune.
- A coherent desktop and mobile composition with one visual environment.
- One real release track and one long mix can be played and sought reliably, or the missing-assets limitation is explicitly recorded.
- Internal navigation does not interrupt audio or duplicate the renderer.
- Playback gently changes the scene while reduced-motion/manual pause remain effective.
- No requirement to finish all seven sections or speculative future infrastructure before reviewing this milestone.
