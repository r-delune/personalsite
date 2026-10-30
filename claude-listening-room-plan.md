# The listening room — home, now-playing, storyboard and "click the sky"

31 Oct 2026. Follows Brian's feedback on the home page screenshot. Builds on `claude-polish-plan.md`
(player capsule, signals, toasts) and the stage work (`coupling.ts` poses, score coupling).

## The idea in one line

**The sky is the way out.** Pages float over the planet. Click empty sky to go back up a level. At the
top (home), the sky *is* the destination: the home page is a listening room, and while music plays it
can fade into the storyboard, where only the planet and the music remain.

## 1. Three UI modes

One store (`$ui`) and one attribute (`<html data-ui="browse|listen|storyboard">`). The stage bridge
reads it to choose poses, so the CSS and the planet always agree.

| Mode | Where | What you see | Planet |
|---|---|---|---|
| `browse` | every inner page | content panel over a calm planet (today's behaviour) | route pose, calmed behind text |
| `listen` | home | the listening room (§3) | large, centre-right, rim lit; blooms with play |
| `storyboard` | home while playing (optionally anywhere via the player) | planet, film grain and a one-line caption; nothing else | `storyboard` pose: centred, slightly closer, full score coupling with the behind-text calming switched off |

## 2. Click the sky: going back by clicking outside

**Rule:** a primary click on empty background (the stage, or page padding that isn't content) moves up
one level.

- **Detail → its list**: `/music/:slug → /music`, `/mixes/:slug → /mixes`, `/writing/:slug → /writing`,
  `/work/:slug → /work`. Use `history.back()` when the previous same-origin entry *is* that parent, so
  the scroll position comes back. Otherwise `navigate(parent)`. Keep a small history stack updated on
  `astro:after-swap` in `navigation-state.ts`.
- **List → home**: also allowed, but only from the four section indexes.
- **Home, playing**: toggles storyboard. **Home, idle**: nothing (or a gentle planet "breath" as a response).
- **Overlays** (now-playing sheet, volume popover, mobile menu, toasts): click outside closes the
  overlay *first*, and that click never also navigates.
- **Escape** does the same as clicking the sky. Backspace isn't used.

**A click only counts as sky** when all of these hold: it isn't inside `[data-stage-exclude]`,
`.player`, a `dialog`, a link, button, input or `[data-panel]`; the pointer moved less than 6 px;
no text is selected; there's no modifier key; it's the primary button.

**Affordance, subtle:** on pages where the sky leads somewhere, hovering empty space for 400 ms brightens
the existing `← MUSIC` back link, shows the cursor as `pointer`, and fades in a small micro-label near the
cursor ("← Music"), drifting 4 px towards the content. No overlay dims the page; the planet stays the
planet. Touch: tapping the sky does the same, with a 6 px slop and no hover hint.

**Content as panels:** detail pages get `data-panel` on their column (the release/mix block), so the
"outside" is unambiguous. On wide screens the panel keeps a faint edge: a 1 px hairline at 6% white
and a very soft shadow at most, so it reads as something sitting over the sky.

## 3. Home becomes the listening room

Today the home page is a title, a play button and a table ("LATEST") with a `TODO(copy)` mix and a
sample post. It reads like an index, not like the front of a music site.

### Idle (nothing playing)

- Composition: the planet is the hero (as now). Left column, vertically centred:
  - name at the current size, with the one-liner under it (unchanged);
  - a **listening card**: the featured release's artwork (88 px, rounded 4 px), title, year and length,
    and a round play button. This replaces the bare text button.
  - a **shelf**: one row of small covers (56 px): the three releases plus the latest *named* mix (its
    artwork is the waveform glyph). Hover tilts and lights each like a sleeve (polish plan §5), with
    title and kind on a micro label below. Click opens it; the play glyph on hover plays it.
  - quiet text links: `Work · About · Writing` (Writing only when there's a real post).
- **Remove** the LATEST table. Show a mix only when it has a real title. Today `roam-mix-2026` is
  still `TODO(copy)` in `src/content/mixes.json`, so it needs a name before it appears anywhere.
  Never show sample posts in production.

### Playing (listen mode)

Pressing play anywhere on home turns the room into **now playing**, in place, without navigating:

- The listening card's artwork moves up to 160 px (shared-element morph, 420 ms ease-out). Under it:
  title, artist, and for mixes the current chapter ("now: Loscil — Black Tusk"), which rolls over like an
  odometer on each change.
- Progress: for mixes, the scrubbable waveform (the peaks are already generated). For tracks, a hairline
  with time. Prev and next only appear when there's more than one track.
- **Up next**: the next track of the release, or "More mixes" at the end of a mix.
- The shelf and links fade to 40% opacity and stay usable.
- The planet takes the `listen` pose: it eases in about 8% and the colour blooms over 3 s (existing),
  with the 400 ms rim pulse on first sound (visual liveness plan).
- The bottom player capsule hides on home while the room shows the same controls, so they're never
  shown twice. It reappears when you scroll or navigate away.

## 4. Storyboard

**Entering:**
- automatically on home after **10 s with no input while playing**, but only if the window is focused,
  reduced motion is off, and the visitor hasn't left storyboard in the last 60 s;
- by clicking the sky on home, pressing `F`, or the `⤢` "Focus" control in the player (from any page).

**What happens (the storyboard):**

| t | Event |
|---|---|
| 0 | Content fades to 0 over 1.2 s with a slight blur (4 px), *not* a slide. The rail, topbar and footer follow 200 ms later. |
| 0–1.5 s | The planet glides from the `listen` pose to the `storyboard` pose (existing pose easing). The behind-text calming lifts, so the full score coupling shows. |
| 1.5 s | A caption fades in at the bottom left, in micro type: `ANNA DONI · ROAM`, and for mixes the chapter on a second line. It's the only text on screen. A 1 px progress line runs along the bottom edge of the viewport. |
| 3 s still | The cursor hides. |
| Chapter change | The caption rolls over, and the score's transition ripple (already in coupling) is the only other event. |
| Pause | The caption reads "Paused" and the colour fades (existing). After 2 s the UI returns: pause ends storyboard. |
| End of track/mix | The planet settles, the UI returns, and the toast offers what's next. |

**Leaving:** any pointer move of more than 10 px, a key, a scroll, a touch, or Escape. The UI fades back
over 300 ms; the content returns faster than it left, so it never feels as though it's hiding from you.
Keyboard focus is never left on a hidden element: if focus is inside content when storyboard starts,
storyboard doesn't start.

**Never:** in reduced motion (Focus still works as a manual toggle, with fades only); on pages with
form input; while the now-playing sheet is open.

## 5. Making what's playing obvious, subtly

Today the only signal is an `is-playing` class that tints a row. A few small signals that work together:

1. **On the item itself** (row, card, cover, home shelf):
   - three "now playing" bars replace the ▶ glyph, driven by the score's energy, with a BPM fallback;
   - a 1 px accent line on the row's left edge;
   - the title takes the accent colour;
   - covers get a 1 px accent ring and a slow glow that breathes with the music (opacity 0.15–0.35).
2. **In the rail**: a 4 px accent dot beside the section where the playing item lives (Music or Mixes),
   breathing slowly. Clicking that nav item while playing scrolls to and briefly highlights the playing row.
3. **In the browser tab**: the title becomes `▶ Anna Doni — Brían Diolún`, and the favicon gets a small
   accent dot.
4. **The page you're on**: if the playing item is on the page but scrolled off-screen, a small
   "Now playing ↓" chip appears at the bottom edge of the content. Tapping it scrolls there.

All of these go quiet when paused: bars ease to rest, the glow stops, and the dot turns hollow.

## 6. Build order

1. `$ui` store, `data-ui`, and the stage bridge reading it (adds the `storyboard` pose to `POSES`).
2. Click the sky + Escape + overlay precedence (§2), with tests for the sky-click rules and parent routes.
3. Playing signals (§5): small, and visible everywhere straight away.
4. The listening room on home: idle and playing (§3). Depends on the polish plan's capsule work
   for shared controls.
5. Storyboard (§4), timed against a real mix in `/lab`.
6. Recordings of each mode change at 10% speed and at phone width, checked into `artifacts/`.

## Open questions for Brian

- The 2026 mix needs a title and series (`TODO(copy)`) before the home page can feature it.
- Should storyboard start automatically after 10 s, or only when asked (sky click, `F`, Focus)?
