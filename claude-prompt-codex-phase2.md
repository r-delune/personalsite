# Prompt for Codex: personal site, phase 2 (everything except the background visual)

> Written by Claude for Brian, 2026-10-30. Paste everything below the line into Codex.

---

You're continuing the build of Brian's personal site in this repo (Astro 7, Preact, nanostores, three.js, custom CSS). Brian has reviewed the M1 prototype. This phase is about **copy, layout density, the one-screen home, Work as CV, Writing, transitions on the DOM side, and a clean contract for the background visual**. **You do not work on the background visual itself**: a separate prompt covers that.

## Read first
1. `SPEC.md`: the build reference (v1.3, including D-032 to D-036).
2. `DECISIONS.md` and `ROADMAP.md`.
3. `claude-design-proposal.md`: Brian's review and the approved changes. **§3 (copy table), §4, §5, §6, §7 and §9 are your brief.**
4. `review/2026-10-30/*.png`: the screenshots Brian reviewed.

## Ground rules
- **Do not modify anything in `src/components/stage/**`**, scene shaders, particle code, poster generation or framing logic. The only stage-related work you do is the bridge contract in Task 10. If a task seems to need a stage change, write it down in your report instead.
- **First commit the current state** (the repo has no commits), then work on a branch `codex/phase2` with small, descriptive commits.
- Never overwrite files you didn't create without reading them first. `claude-*.md` files and `inputs/**` belong to Claude; don't edit them.
- **Never invent copy, biography, CV entries, dates or claims.** Use `TODO(copy)` where Brian must supply text. Counts and years computed from data are fine.
- Record each decision below in `DECISIONS.md` (D-037 onward) and update the affected `SPEC.md` sections in the same commit. Keep `ROADMAP.md` consistent.
- Respect everything already locked in the spec: persistence, D-026 staging, D-032 iOS policy, D-033 view-transition mechanics, D-034 active-item controls, D-035 peaks v2, D-036 media.

## Decisions Brian approved today (record them)
- **D-037 One-screen home** (replaces D-011's scrolling homepage).
- **D-038 Copy rules: "facts, not slogans"** plus the replacement table in `claude-design-proposal.md` §3.
- **D-039 Work = CV + case studies.** The CV moves from About to Work. About keeps bio, running and profiles.
- **D-040 Writing:** hidden from production navigation until the first non-draft post. In dev and preview builds, show it with one clearly marked sample post.
- **D-041 Release credit** = the feed's `artist_name` as published (supersedes the "Brían Diolún" default in SPEC §13).
- **D-042 Background visual is out of Codex's scope.** It's built separately against the stage bridge contract (Task 10).

## Tasks

### 1. Copy pass (D-038)
Apply the §3 table everywhere. Remove taglines, section-number labels ("02 / MIXES & SELECTIONS"), "Scroll to explore", "On the record", "Sound / Space / Movement", and the rail footer "Independent by nature.". The page title is the section name. Mono meta labels carry data-derived facts (`10 MIXES · 2014–2025`, `N RELEASES`). Home uses the About-style fact line: *Music as Brían Diolún. Mixes as Roam. Software at rdelune ↗*.

### 2. One-screen home (D-037)
At 1440×900 and 1280×720, everything fits without scrolling (footer excepted). At 375×667 it may scroll, but should stay under about 1.5 screens.
- Left: **Brían Diolún** (H1), the fact line, a featured `▶ <title>` text button with mono meta (year · duration), and `rdelune ↗`.
- Below or beside it: **Latest**, three mono rows (newest eligible release, newest playable mix, newest post if one exists), each with `▶` where playable and `→` to its page.
- Remove all homepage catalogue sections, large tiles and the `#music` anchor section.
- Leave the lower-right of the viewport clear for the background (no content in roughly the right 40% × bottom 50% at desktop widths).

### 3. Density on catalogue pages
- Page H1 about `clamp(2rem, 3.5vw, 2.75rem)`. The list starts within the top third of the viewport at 1440×900.
- **Mix rows 64–80px:** index · title (link) · series (mono) · year · duration · `▶` button · `→`. Separate title link and Play button, never nested. Show the now-playing marker from the spec.
- **Releases:** square artwork tiles of 160–220px, 4–6 per row on desktop, with a mono caption (title · year) beneath and a `▶` on focus/hover that is always visible on touch. Lazy images with reserved size.
- Mixes: include **roam-mix-2026** using `inputs/mixes/roam-mix-2026/` (peaks v2 JSON, metadata in its README). In dev, read the audio URL from an env var such as `PUBLIC_MIX_MEDIA_BASE` (Brian points it at a local or R2 copy). Never commit audio. Title and date stay `TODO(copy)`. In production, mixes without media stay hidden (spec).

### 4. Work = CV + case studies (D-039)
- **Work** H1 + one fact line with `rdelune ↗` (TODO(copy) if wording isn't supplied).
- **CV** (`id="cv"`): role rows: years (mono, tabular) · title · organisation · one-line summary · case-study chips. Then skills (grouped, one line per group) and education. Data comes from `src/content/cv.json` with a zod schema. Validate that `caseStudies[]` reference existing projects. Seed it with **`TODO(copy)` placeholders only**.
- **Print / save PDF** button (`window.print()`) plus an A4 print stylesheet that hides the shell, rail, player and canvas, uses dark text on white, and avoids page breaks inside roles.
- **Case studies:** compact rows, rendered only when at least one non-draft project exists.
- Remove the CV from About and update SPEC §3.3. Remove the large "Explore rdelune" filled button.

### 5. Writing (D-040)
- `/writing` list rows: date (mono) · title · one-line description. `/writing/[slug]`: 62ch measure, mono meta line (date · reading time), headings, links, images with captions, code blocks (Shiki, theme matched to the tokens), blockquotes, footnotes, previous/next.
- `src/content/posts/_sample.mdx` marked `sample: true` exercises every element. It's visible only when `import.meta.env.DEV` or a `PREVIEW` flag is set. The production build excludes it and hides Writing from the nav and home until a real non-draft post exists.
- RSS (`/rss.xml`) is emitted only when real posts exist.

### 6. Controls & chrome
- **Buttons:** replace the filled pale-blue rectangles with text buttons: glyph (`▶`/`↗`/`→`), label, a hairline underline or 1px outline, and accent only on hover/focus. Keep 44px touch targets.
- **Player:** 1–2px track with the thumb shown on hover/focus/drag (always visible on touch); a smaller outlined play button; volume as an icon with a hover/focus slider on desktop, hidden on mobile (spec). Credit from the feed's `artist_name` (D-041).
- **Rail:** remove the ↗ glyph on the active item. The active indicator **slides** between items (transform, ~260ms, `--ease-out`), with no jump. Keep `INDEX`.

### 7. Page transitions, DOM side only (proposal §5.2–5.4)
The current content fade is too subtle (140ms out, 200ms in, 4px). Implement:
- **Outgoing** content: fade over 120ms.
- **Incoming:** the page title reveals from a line mask (`clip-path` inset + 8px rise, 280ms, `cubic-bezier(0.16,1,0.3,1)`). Body follows at +60ms, and the first 6 rows stagger 30ms each (cap 6). **Total content motion ≤350ms.** It must never block input and must be interruptible by a new navigation.
- **Cover → release morph:** a matching `transition:name` only on the clicked tile and the release header. Must stay correct for back/forward, rapid clicks and missing artwork, falling back to the plain handoff.
- **Reduced motion:** a 120ms crossfade only, no masks, no movement.
- Keep the D-033 rules: the stage and player are never part of the content animation.

### 8. About
About = **Brían Diolún.** + the three-fact line + bio (`TODO(copy)`) + running (`TODO(copy)`, ITRA link slot) + profiles. No slogan headings.

### 9. Header & footer
Keep `b/d Brían Diolún` and `rdelune ↗` at the top. Footer: © line, Mixcloud, SoundCloud, rdelune, the Pause-animation toggle, and RSS when posts exist. No taglines.

### 10. Stage bridge contract (D-042): app side only
Create `src/lib/stage-bridge.ts` as **the only interface the background visual may read**. Wire it from the player engine and router. Do not implement any visual behaviour.

```ts
export type PlaybackPhase =
  | 'idle'        // nothing loaded yet
  | 'loading'     // selection made, media not yet playing
  | 'playing'     // confirmed playback (not just a button press)
  | 'buffering'   // was playing, now stalled waiting for data
  | 'paused'      // user paused; item still loaded
  | 'ended'       // item finished
  | 'interrupted' // context/output interrupted (D-022); awaiting Resume
  | 'error';      // media error

export type RoutePose = 'home' | 'music' | 'release' | 'mixes' | 'mix' | 'work' | 'writing' | 'post' | 'about' | 'other';

export interface StageSnapshot {
  phase: PlaybackPhase;
  phaseSince: number;        // performance.now() when phase last changed
  positionSec: number;       // active item position (engine clock, D-022 source of truth)
  durationSec: number | null;
  itemKind: 'track' | 'mix' | null;
  itemId: string | null;     // Roam Studio track id or mix id
  route: RoutePose;
  routeSince: number;
  reducedMotion: boolean;    // prefers-reduced-motion
  userPausedAnimation: boolean; // footer toggle (D-007)
  analysisAvailable: boolean;   // false on iOS by D-032 or on analysis failure
}

export interface StageItemMeta {
  itemKind: 'track' | 'mix';
  itemId: string;
  durationSec: number | null;
  peaksUrl: string | null;     // peaks v2 (D-035) for mixes; null for releases until release peaks exist
  boundariesSec: number[];     // mix tracklist `at` values, or release `section_times` (sanitised per productions' rules)
  bpm: number | null;          // release feed metadata only; null for mixes
  beatStartAtSec: number | null;
}

export interface StageBridge {
  getSnapshot(): StageSnapshot;                       // cheap, call every frame
  getFeatures(): { energy: number; playing: number }; // existing time-based envelopes (SPEC §8.3)
  getItemMeta(): StageItemMeta | null;                // active item's static metadata; changes only on itemchange
  subscribe(event: 'phase' | 'route' | 'seek' | 'itemchange' | 'motionprefs',
            cb: (s: StageSnapshot) => void): () => void; // unsubscribe
}
```
Requirements:
- **The phase reflects confirmed transport state** (SPEC §6.2/§7.1), not button presses. Rapid input and stale callbacks can't produce a wrong phase (use item tokens, D-034).
- `seek` fires once per committed seek on the **active** item, never for D-026 page-only staging. `itemchange` fires when the active item changes.
- `route` updates on Astro navigation (`astro:after-swap`), including back/forward. Query or hash changes alone do not change it.
- No per-frame data in nanostores. `getSnapshot()`/`getFeatures()` allocate nothing per call (reuse objects).
- `getItemMeta()` carries only data that already exists: mix peaks URL and tracklist times, and feed `section_times`/`bpm`/`beat_start_at` for releases. Pass the release fields through the fixture normaliser if they're currently dropped. Don't fetch or parse peaks for the visual; it loads `peaksUrl` itself.
- Expose it as a module singleton. The existing stage keeps working: if it currently reads engine features directly, add the bridge alongside without changing stage files.
- Add `src/lib/stage-bridge.md` documenting the semantics above, plus a **dev-only overlay** (`?bridge`, excluded from the production bundle) showing phase, route, position and energy live, so the visual can be tuned against it later.

## Out of scope
The background scene, planet shape, rim light, route poses or camera moves, particle counts, shaders, the poster image. Also: the storyboard, a mobile sheet, worker rendering, new motion libraries, and deployment.

## Acceptance
- [ ] Baseline commit exists; work is on `codex/phase2`; D-037–D-042 recorded; SPEC updated to match.
- [ ] No diff under `src/components/stage/**`.
- [ ] Home fits one screen at 1440×900 and 1280×720; the lower-right stays clear.
- [ ] No slogans remain; every remaining sentence is a fact or `TODO(copy)`; meta counts are computed.
- [ ] Mixes page shows ≥8 rows at 1440×900; rows have separate Play and link; roam-mix-2026 is listed and playable in dev with the env var set.
- [ ] Work shows CV (placeholders) and a print preview producing a clean A4 page; About no longer has the CV.
- [ ] Writing list and sample post render in dev; a production build hides Writing and excludes the sample.
- [ ] Transitions: the incoming title mask and stagger are visible, total ≤350ms, interruptible by rapid navigation; reduced motion gives a crossfade only; audio and player are uninterrupted across all routes and back/forward.
- [ ] Stage bridge: the overlay shows correct phases through play → pause → seek → buffer (throttle the network) → end → error (bad URL) → iOS-style no-analysis (force the flag); route updates on every navigation.
- [ ] `astro check` and a production build pass (production fails only on real `TODO(copy)` if present; document the preview build command for review).

## Report back
A short summary; screenshots at 1440×900 and 375×812 for home, mixes, a mix, music, a release, work (plus print preview), writing (dev), and about; the decisions added; anything you couldn't do or that needs a stage change; and the commands to run dev and preview.
