# Polish plan — player, signals, notifications, tactility, responsive, CV

Written 30 Oct 2026 against `codex/visual` @ b309a2c. Read with `claude-visual-plan.md` (planet) and the
visualizer review from today (pulse on play, BPM breath, visible pause setting); this plan doesn't repeat those.

## 0. What's there now

- **Player** (`Player.tsx`, styled in *both* `global.css` §848–950 and `phase2.css` §620–760, the second
  overriding the first). It's a full-width, edge-to-edge 4-column bar about 60 px tall. On a 1377 px window
  roughly 70% of it is empty. Title 11 px, artist 8 px mono, times 8 px.
- **Play/pause** are text glyphs (`▶` / `Ⅱ`) that swap instantly. Nothing on the button shows loading.
- **Loading / error** is one plain box (`.player-message`) that pops in above the right edge, with no
  enter or exit motion. The player itself enters with a 200 ms fade.
- **"Playing" on the page** is only an `is-playing` class on the card / row button. Nothing moves.
- **Type**: 67 declarations at 6–9 px across the stylesheets. Fine as texture on a 27" screen, unreadable
  on a phone and the main thing stopping the site feeling responsive.
- **Mobile**: player goes two-column, volume hidden. No expanded "now playing" view, so mix tracklists and
  scrubbing on a phone are cramped.
- **CV**: `src/content/cv.json` is all `TODO(copy)`. `codex-public-cv.draft.json` exists but is out of
  date (e.g. "Fractional CTO", AudioRhoon dates missing). About-page bio and running copy are `TODO`.
  `src/content/projects/` is empty, so no case studies.

## 1. Groundwork (do first, small)

1. Move every player rule into one file, `src/components/player/player.css`, and delete the duplicates
   from `global.css` and `phase2.css`.
2. Motion tokens in `tokens.css`, used everywhere instead of ad-hoc values:
   `--ease-out: cubic-bezier(.16,1,.3,1)`, `--ease-spring: linear(...)` (a soft overshoot),
   `--t-press: 90ms`, `--t-quick: 180ms`, `--t-move: 320ms`, `--t-slow: 600ms`.
3. Type floor: 11 px for body-ish text, 10 px for mono micro-labels, everywhere. Keep the small-caps
   mono look via letter-spacing and colour, not size. Use `clamp()` for the page titles.
4. One `prefers-reduced-motion` rule set per feature below: every animation has a fade-only or
   no-motion version. Nothing in this plan depends on motion to convey state.

## 2. Compact player — "the capsule"

**Desktop / tablet (≥768 px)**: a floating capsule, not a bar.

- Centred at the bottom, `max-width: 560px`, 52 px tall, 12 px from the bottom edge (plus safe area),
  radius 26 px, the existing blurred dark glass, 1 px hairline border at 12% white.
- Contents, left to right: 40 px artwork (rounded 6 px) · title over artist/chapter · play button ·
  elapsed time. That's all that's always visible.
- **Progress** is a 2 px line along the capsule's top edge. On hover it thickens to 4 px with a
  24 px invisible hit area, shows a time tooltip at the pointer and, for mixes, the chapter under the
  pointer ("41:20 · Loscil — Black Tusk"). Chapter boundaries are tiny ticks on the line.
- **Prev / next and volume** slide out from behind the play button on hover or keyboard focus
  (width animates over `--t-move`). Volume stays a popover, restyled as a vertical capsule.
- **Collapse**: when the reader scrolls down a long page and hasn't touched the player for 8 s,
  the capsule shrinks to a 44 px circle (artwork + progress ring) in the bottom-right corner. Hover,
  focus or tap expands it back. This keeps it out of the text on writing and CV pages.
- Page padding stops changing with `--player-h`, so content no longer jumps when the player appears;
  the capsule floats and the page reserves a constant 80 px at the bottom.
- Keyboard: `Space` play/pause (when focus isn't in a field), `←/→` ±10 s, `Shift+←/→` prev/next,
  `M` mute. Shown once in a toast the first time someone uses the player.
- Media Session API: title, artist, artwork, chapter as the title for mixes, and seek handlers,
  so lock-screen and headphone controls work.

**Phone (<768 px)**: a full-width mini bar docked at the bottom (56 px + safe area): artwork,
title/chapter, play button, with the 2 px progress line on top. Tapping it opens a **now-playing
sheet** that slides up (spring, drag to dismiss):

- large artwork, a big scrubber with thumb always visible, prev/next, and for mixes the tracklist
  with the current chapter highlighted and tap-to-jump;
- the sheet's backdrop dims the page and lets the planet show through.

## 3. Loading, playing and transition signals

The state machine in `lib/player.ts` already has the phases (`loading`, `buffering`, `playing`,
`paused`, `error`). Each one gets one clear, calm visual. Make it a `data-phase` attribute on the
player and on the active card/row, so all of it is CSS.

| Moment | Now | Proposed |
|---|---|---|
| Press play | glyph swaps | Button dips to 0.94 scale and springs back (`--t-press`). Icon morphs triangle → two bars (SVG, 180 ms). Android: `navigator.vibrate(6)`. |
| Loading | text box | Only if it lasts >350 ms (no flash on fast loads): a thin arc circles the play button, 1.4 s per turn, icon dimmed to 50%. Past 4 s, a toast: "Loading '22 · 58 MB". |
| First sound | nothing | Artwork in the capsule settles from 0.96 to 1 with a soft accent glow that fades over 600 ms. This is the same moment as the planet pulse from the visualizer review. |
| Playing | static class | A three-bar "now playing" glyph beside the title and on the active card/row. Bars are driven by the track's visual score (energy), so they match the music; BPM fallback where there's no score. Active cover gets a 1 px accent ring. |
| Buffering mid-play | text box | A soft shimmer travels along the progress line at the playhead; elapsed time fades to 60%. No toast unless it lasts >3 s. |
| Pause | glyph swap | Bars ease down to rest over 400 ms rather than freezing. |
| Track change | instant text swap | Old title slides up 6 px and fades, new one rises in (`--t-move`); artwork crossfades. |
| Mix chapter change | text swap | The "now: artist — title" line rolls over like an odometer (each line slides up), 280 ms. |
| Start from a card | player appears | The cover art flies from the card into the capsule (View Transition shared element, 360 ms). This is the single "impressive" moment; everything else stays quiet. |
| Seek | jump | Playhead glides to the new spot over 150 ms; the tooltip shows the target time while dragging. |
| End of track / mix | stops | Progress line brightens once then resets; on a mix end, a toast offers "Play another mix". |
| Error | text box | Toast with Retry (below), button shakes 2 px once. |

Images: every artwork gets a blurred dominant-colour placeholder (computed at build time) and fades
in over 300 ms, so covers never pop in on a slow connection.

## 4. Notifications

One toast host, stacked above the player (or above the mini bar on phones), bottom-centre.

- Max two visible; newer pushes older up. Auto-dismiss after 4 s, paused while hovered or focused;
  errors stay until dismissed. Swipe to dismiss on touch. `aria-live="polite"`, errors `assertive`.
- Same visual language as the capsule: glass, hairline border, small icon, one line of text, optional
  one action. Enter: rise 8 px, fade and un-blur 4 px → 0 over 220 ms. Exit: fade 160 ms.
- A tiny API in `lib/toast.ts` (`toast(text, {action, tone, id})`, with `id` so repeats replace
  rather than stack).

Uses, in order of value:

1. Errors and slow loading (replaces `.player-message`).
2. **Resume**: positions in long mixes are saved locally; coming back shows "Resume '24 at 38:12".
   Worth it with 1–2.5 h mixes.
3. **Share a moment**: a "Copy link at 41:20" action in the mix page and the now-playing sheet,
   with a "Link copied" toast. Links like `/mixes/24?t=2480` start there.
4. "Animation paused · Resume" when someone plays music with the background paused (from the
   visualizer review).
5. Connection lost / back ("Offline. Playback will resume when you're back.").
6. Auto-advance while the capsule is collapsed: "Now playing: Banana Bread".
7. First-use keyboard hint.

## 5. Tactile touches across the site

Kept deliberately few, all in the same register as the planet: slow, soft, lit from one side.

- **Cover art**: on pointer devices, a tilt of at most 3° towards the pointer with a faint sheen
  that follows it, as if the planet's light is catching the sleeve. Press sinks it 2 px. Off on touch
  and reduced motion.
- **Mix rows**: the precomputed waveform draws in faintly behind the row on hover (it's already
  generated by `ingest-mix`). For a mix in progress, the played part of the waveform stays lit.
- **List → detail**: the cover/waveform is a shared element between the music or mixes index and the
  detail page, so it glides into place on navigation.
- **Links**: underline draws in from the left on hover; external `↗` nudges 1 px up-right.
- **Nav rail**: the active marker slides between items on navigation instead of jumping.
- **Focus rings**: one consistent accent ring with a 2 px offset, animated in.
- **No** custom cursor, no UI sounds, no scroll-jacking, no parallax on text.

## 6. Responsive pass

Breakpoints stay as they are (≤767, 768–1100, >1100, ≥1800), plus a check at ≤380.

- Type floor from §1, touch targets ≥44 px, `env(safe-area-inset-*)` on the player, sheet and toasts.
- Nav rail → on phones, a compact top bar with a menu sheet in the same style as the now-playing sheet.
- Music grid: 3 → 2 → 1 columns with `auto-fill, minmax(…)`; mix rows collapse to title, date,
  length and play, with tags moving under the title.
- CV page: years move above each role on phones; skills become wrapped chips.
- Planet: add portrait poses per page in the stage, so on phones it sits low and to the side rather
  than behind the text, and drop the dust count on small screens.
- Landscape phone: player stays a mini bar; the sheet becomes two columns (art | tracklist).
- **Acceptance**: Playwright screenshots of every page at 375, 393, 768, 1024, 1440 and 1920, with
  and without the player open, checked into `review/`. (I couldn't shrink your Chrome window from
  here, so the phone layout is assessed from the CSS for now.)

## 7. CV and about content from the two PDFs — DONE (draft, 31 Oct)

Decision (Brian, 30 Oct): include photo, email and LinkedIn, but keep the tone of a personal site rather
than a job application; full detail lives in the downloadable PDF.

- **Work page**: headline, two-paragraph first-person intro, then links to rdelune ↗ · Full CV (PDF) ↓ · Print.
  Experience: rdelune, CommPAL, MyUSE, UCC lectureship (CommPAL and MyUSE get 3 highlights each and
  link to their rdelune case studies). "Earlier": Techsquad, AudioRhoon, Rocudo, one line each.
  Then What I bring (3 plain groups), Speaking, Publications (5, linked), Education (with AIGP),
  and a Get in touch row (email, LinkedIn, GitHub).
- **About page**: 256 px portrait from the CV (soft greyscale, full colour on hover), a three-paragraph
  bio bridging music and software, a one-line running note linking to ITRA, and contact links.
- **Left out on purpose**: standards and acronym lists, the AWS service inventory, AWS Cloud Practitioner,
  training, memberships, and the programme name "ESHEILD" (spelling unconfirmed; described instead).
- `public/cv/brian-dillon-cv.pdf` is the Senior Engineer PDF. `codex-public-cv.draft.json` is superseded
  by `src/content/cv.json`.
- **To check**: every sentence (it's first-person copy written for you), the MyUSE "10,000+" figure,
  and that the rdelune case-study URLs resolve. A higher-resolution portrait would look sharper on
  retina screens.

## 8. Order of work

1. CV content and schema (§7). Independent of everything else; can start now.
2. Groundwork (§1) and the capsule / mini bar (§2).
3. Signals (§3) and toasts (§4) — these share the `data-phase` plumbing.
4. Tactile touches (§5).
5. Responsive pass and screenshot review (§6), then fix what it finds.

Each step lands as its own commit with tests passing and a reduced-motion check.
