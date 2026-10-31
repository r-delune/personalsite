# Prompt for Codex: listening room, player, signals and polish (phase L)

> Written by Claude for Brian, 2026-10-31. Paste everything below the line into Codex.

---

You're building the next layer of Brian's site: how it **feels to listen**. The planet scene and route
transitions are done. Now the player, the playing state, the home page and an immersive "storyboard"
mode need to come together into one experience. Brian's words: the player should be more compact; the
loading and playing signals are "a little dull and sudden"; the current song should be "more obvious,
subtly"; the home page is "poor"; and he wants to "click outside and revert to a previous view".

**The idea in one line: the sky is the way out.** Pages float over the planet. Clicking empty sky goes up
a level. On the home page the sky is the destination: home is a listening room, and while music plays it
can fade into a storyboard where only the planet and the music remain.

## Step 0: save first
The working tree has about 28 uncommitted files from earlier passes (stage, launch, PWA, transitions,
`mixes.json`, the `cv.css` import in `Shell.astro`). Before you change anything, commit them in sensible
groups with accurate messages, run `pnpm test` and `pnpm check`, and record the results. Don't start on a
dirty tree.

## Read first
- `claude-listening-room-plan.md`: **the main spec for this phase** (modes, click-the-sky, listening
  room, storyboard, now-playing signals).
- `claude-polish-plan.md` §1–§6: groundwork, the compact player ("capsule"), loading and playing
  signals, toasts, tactile touches and the responsive pass. §7 (CV) is done.
- `claude-visual-liveness-plan.md`: the play pulse, BPM breath and visible pause setting. Don't redo
  anything that's already shipped.
- `CODEX-TRANSITIONS-VERIFIED.md`: how routing and transitions work now (live DOM, no content snapshots,
  route-paired covers, generation cleanup). **Build on it; don't regress it.**
- `src/lib/player.ts` (phases: loading/buffering/playing/paused/error), `src/components/player/*`,
  `src/lib/stage-bridge.ts` + `stage-bridge.md`, `src/components/stage/coupling.ts` (poses),
  `src/lib/navigation.ts`, `src/lib/navigation-state.ts`, `src/pages/index.astro`.

## Ground rules
- Work in small steps (below), **one commit or more per step**, each with tests passing and a
  reduced-motion check. Record decisions as the next free D-numbers. Update SPEC where behaviour changes.
- One aesthetic: the existing palette and type, near-black and a single accent. Calm, soft, lit from one
  side. **No** custom cursor, UI sounds, scroll-jacking, parallax on text, bouncy springs or hue shifts.
- Every animation has a reduced-motion version (a fade or nothing). State is never conveyed by motion alone.
- Minimum font size: **11 px for text, 10 px for mono micro-labels**, everywhere you touch. Touch targets ≥ 44 px.
- Keep Astro in charge of routing and history. Use `navigate()` from `astro:transitions/client`; no second router.
- The stage reads the app **only through the bridge**. Add to the bridge minimally, in its own commit.
- Don't touch shader art direction. New poses go in `coupling.ts` `POSES`, tuned in `/lab`.

## Steps

### 1. Groundwork
- Consolidate all player styles into `src/components/player/player.css`. Today they're split across
  `global.css` and `phase2.css`, with the second overriding the first.
- Motion tokens in `tokens.css` (`--ease-out`, `--t-press 90ms`, `--t-quick 180ms`, `--t-move 320ms`,
  `--t-slow 600ms`), used instead of ad-hoc values.
- Expose the player phase as `data-phase` on `<html>`, on the player, and on the active item's elements
  (row, card, cover, home shelf). All signals below should be CSS on top of that.
- Add a `$ui` store and `<html data-ui="browse|listen|storyboard">`. The bridge passes it to the stage.

### 2. Now-playing signals (plan §5, polish §3)
- On the playing item: three "now playing" bars replace ▶, driven by bridge `energy`, with a BPM
  fallback; a 1 px accent edge on rows; an accent title; and on covers an accent ring with a slow glow
  that breathes with the music. When paused, the bars ease to rest over 400 ms and the glow stops.
- A breathing 4 px dot by the Music or Mixes rail item (wherever the playing item lives). Clicking that
  item while playing scrolls to and highlights the row.
- Tab title `▶ <track> — Brían Diolún`, and a dot on the favicon.
- A "Now playing ↓" chip when the playing item is on the current page but scrolled out of view.
- Press feedback: 0.94 scale and back; the play icon morphs to pause (SVG, 180 ms).
- Loading: only after 350 ms, a thin arc around the play button; after 4 s, a toast. Buffering: a shimmer
  at the playhead. Track change: titles slide and fade, and artwork crossfades. A mix chapter change
  rolls over like an odometer.

### 3. Click the sky (plan §2)
- A primary click on empty background moves up a level. Detail → list (`/music/:slug → /music` and so
  on, using `history.back()` when the previous entry *is* that parent, otherwise `navigate(parent)`).
  Section index → home. On home while playing, it toggles storyboard. **Escape** does the same.
- Overlays (now-playing sheet, volume, menu, toasts) close first, and that click doesn't also navigate.
- A click only counts as sky if it's outside `[data-stage-exclude]`, `[data-panel]`, `.player`,
  `dialog` and interactive elements; the pointer moved < 6 px; no text is selected; there's no
  modifier; it's the primary button. Put this logic in a pure function with unit tests (target
  classification and parent-route mapping).
- Affordance: after 400 ms hovering sky, the back link brightens, the cursor becomes a pointer, and a
  micro-label "← Music" drifts in near the cursor. Nothing dims the page.

### 4. Compact player and toasts (polish §2, §4)
- **Desktop/tablet:** a floating 52 px capsule, centred, max 560 px wide, 12 px above the bottom plus
  the safe area. It holds artwork, title over artist/chapter, play and elapsed time. Progress is a 2 px
  hairline on top that grows on hover, with a time-and-chapter tooltip and chapter ticks. Prev, next and
  volume slide out on hover or focus. It collapses to a 44 px progress-ring circle after 8 s untouched
  while you scroll a long page. Content gets a constant bottom reserve, so no more `--player-h` jumps.
- **Phone:** a 56 px mini bar that opens a now-playing sheet (drag to dismiss): large art, a scrubber,
  prev and next, and the tracklist for mixes with tap-to-jump.
- Keyboard: Space, ←/→ ±10 s, Shift+←/→ prev/next, M to mute. Add the Media Session API.
- **Toasts:** one host above the player; at most two visible; 4 s auto-dismiss, paused on hover; errors
  stay. They're `aria-live`. API: `toast(text, { action, tone, id })`. Uses: errors and slow loads
  (replacing `.player-message`), resuming long mixes ("Resume '24 at 38:12", saved locally), "Copy
  link at 41:20" (`?t=` deep links), animation paused, offline and back, auto-advance while collapsed,
  and a one-time keyboard hint.

### 5. Home as the listening room (plan §3)
- **Idle:** the planet stays the hero. Name and one-liner as now. A **listening card** (88 px featured
  artwork, title, year and length, round play button) replaces the bare text button. A **shelf** of
  56 px covers holds the three releases and the latest *titled* mix, with sleeve tilt and sheen on
  hover. Quiet text links: Work · About (and Writing only when there's a real post). **Remove** the
  LATEST table. Never show `TODO(copy)` items or sample posts in production.
- **Playing:** in place, without navigating, the card's artwork morphs to 160 px. Under it go the
  title, artist and odometer chapter; the waveform scrubber for mixes or a hairline for tracks; and up
  next. The shelf fades to 40% and stays usable. The planet takes a new `listen` pose. The capsule hides
  on home while the room shows the controls, and reappears on scroll or navigation.

### 6. Storyboard (plan §4)
- **Entry:** sky click on home, `F`, or a `⤢` Focus control in the capsule (from any page). **Auto-entry**
  after 10 s idle on home while playing is behind a single constant, `STORYBOARD_AUTO`, **default on**,
  so Brian can switch it off. Auto-entry needs the window focused, reduced motion off, no exit in the
  last 60 s, and focus not inside content.
- **Sequence:**
  - content fades out over 1.2 s with 4 px blur, and the rail, topbar and footer follow 200 ms later;
  - the planet glides to a new `storyboard` pose with behind-text calming lifted;
  - at 1.5 s a micro caption appears at the bottom left (`TITLE · ARTIST`, plus the chapter line for
    mixes), with a 1 px viewport-bottom progress line;
  - the cursor hides after 3 s still;
  - chapters roll the caption over;
  - pause shows "Paused", and the UI returns after 2 s;
  - at the end, everything settles and a toast offers what's next.
- **Exit:** pointer movement > 10 px, a key, a scroll, a touch or Escape. The UI returns in 300 ms.
- **Never:** in reduced motion (Focus still works, as fades only), with the sheet open, or on pages with
  form input.

### 7. Tactile touches and the responsive pass (polish §5, §6)
- Cover tilt ≤ 3° with a pointer-following sheen (pointer devices only). Mix-row waveforms draw in
  faintly on hover, with the played portion lit. Links get draw-in underlines, and the rail indicator
  slides. Focus rings are consistent.
- Responsive: the font floor, `auto-fill` grids, mix rows collapsing on phones, portrait poses for the
  stage, and the landscape-phone sheet.
- **Evidence:** Playwright screenshots of every page at 375, 393, 768, 1024, 1440 and 1920, idle and
  playing. Recordings of each mode change (browse → listen → storyboard → back, and sky-click back from
  a release and a mix) at 10% speed using CDP `Animation.setPlaybackRate`. Save them under
  `artifacts/listening-room/`.

## Acceptance
- `pnpm test` and `pnpm check` are clean, with new tests for sky-click classification, parent routes,
  toast queueing and the storyboard entry conditions.
- No double exposure, layout jump or orphaned state across any mode change or navigation (check the
  recordings frame by frame).
- Playback and the clock stay continuous through every mode change and sky-click navigation.
- Keyboard-only: everything reachable; focus is never on a hidden element; Escape always works.
- Reduced motion: no auto-storyboard, no tilt, fades only.
- On an M-series Mac, frame rate in storyboard is the same as in browse.

## Report back
A short `CODEX-LISTENING-ROOM.md`: what shipped, decisions, deviations from the plans and why, the
evidence paths, and anything Brian needs to decide or supply.
