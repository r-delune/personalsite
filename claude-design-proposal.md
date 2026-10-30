# Design review & proposal: M1 prototype

> Author: Claude · Started 2026-10-30 · **Living document**: Brian keeps adding screenshots and this grows with them.
> Status: **proposal only.** No code or spec changes have been made from it. Items in §8 need Brian's approval before they go into `SPEC.md` / `DECISIONS.md`.
> Screens reviewed: `review/2026-10-30/` (01-mixes, 02-work, 03-about, 04-home), plus a read-only look at the source.

---

## 1. Brian's feedback (2026-10-30)
1. The copy is lame. It should be **more minimal**.
2. Unsure whether it looks and feels right yet.
3. **Too much scrolling** to get anywhere.
4. The **Writing / blog template is missing**.
5. **No section-change transition**, so it feels like old HTML.
6. Next phase: tasks may be **split between Claude and Codex by strengths** (see §7).

## 2. What's already right (keep)
- The overall restraint: dark space, Geist with mono micro-labels, thin dividers, the scattered dust "starfield".
- The `b/d Brían Diolún` mark and the `rdelune ↗` link at top right.
- The left rail as the main navigation (sticky, numbered).
- **The About intro line is the best copy on the site**, and the model for all of it: *"Music as Brían Diolún. Mixes as Roam. Professional work at rdelune."* Facts, no slogans.
- Persistent player with real playback; even-width digits for times.
- The plumbing for page transitions exists already (`ClientRouter`, named `stage`/`player`/`content` transitions, old snapshots suppressed per D-033).

---

## 3. Copy: from slogans to facts

**Problem.** Every page has a marketing-style headline and a supporting sentence ("Stay for a while.", "Ideas into working things.", "A few things I've put into the world.", "Sound, work, and everything between.", "Independent by nature.", "A little context", "Scroll to explore", "Sound / Space / Movement"). Together they read as template copy, add height (and so scrolling), and say nothing a visitor needs.

**Rules (proposed):**
1. **Facts, not slogans.** Say what something *is*: a name, a count, a date, a place it lives.
2. **The page title is the section name** ("Mixes"), or nothing. No taglines under it.
3. **At most one line of supporting text per screen**, and only if it carries information.
4. **The mono labels do the talking**: counts, years, durations, formats.
5. **Numbers come from data, never invented** (e.g. "10 mixes · 2014–2025" is computed).
6. Brian writes the bio. Claude and Codex never write claims about him.

**Proposed replacements:**

| Where | Now | Proposed |
|---|---|---|
| Home H1 + blurb | multi-line headline + "A home for my music, mixes, and things I'm working on. A few different pursuits. One ongoing exploration." | **Brían Diolún** · *Music as Brían Diolún. Mixes as Roam. Software at rdelune ↗* |
| Home CTA | `[▶ Play Anna Doni]` filled button + "My work at rdelune ↗" | `▶ Anna Doni` (text button, mono meta "2014 · 3:12") + `rdelune ↗` |
| Home extras | "On the record", "Scroll to explore ↓", "Sound / Space / Movement" | remove |
| Home section heads | "01 / Original music" + "A few things I've put into the world." | mono label `MUSIC` + `All →` |
| Mixes | "02 / Mixes & selections" · "Stay for a while." · "A collection of longer listens…" | **Mixes** · `10 MIXES · 2014–2025` |
| Music | (similar pattern) | **Music** · `N RELEASES` |
| Work | "Ideas into working things." · "My professional work lives at rdelune." · big button | **Work** · *Software consultancy: rdelune ↗* (see §6.4) |
| About | "04 / A little context" · "Sound, work, and everything between." · "This is a place to collect…" | **Brían Diolún.** + the three-fact line, then the bio (TODO, Brian) |
| Rail footer | "Independent by nature." | remove (or something factual Brian chooses) |
| Section-number labels | "02 / MIXES & SELECTIONS" | remove (the rail already numbers sections) |

---

## 4. Scrolling: get anywhere in one move

**Problem.** The home intro is a full screen, followed by large section headings and full-width 3-up photo tiles. The catalogue pages repeat homepage-scale headlines, and rows are about 130px tall. At 1080p, the mixes page shows 3 rows.

**Proposals:**
1. **One-screen home (omp-style)** *(changes D-011, needs approval).* Intro on the left (name, the fact line, `▶` featured, `rdelune ↗`), plus a compact **Latest** block of 3 mono rows: newest release, newest mix, newest post. Nothing below it except the footer. The catalogues live one click away in the rail. This is the biggest single cut to scrolling and closest to the reference.
2. **Compact page headers.** Page H1 at about `clamp(2rem, 3.5vw, 2.75rem)`, with the list starting in the top third of the viewport.
3. **Denser rows.** Mix and release rows 64–80px: `#`, title, series (mono), year, duration, `▶`, `→`.
4. **Smaller release artwork.** Square tiles of about 160–220px, 4–6 per row, with a mono caption, or list rows with 48px thumbnails. Large photos currently dominate and break the dark, minimal surface.
5. **Fewer destinations while content is thin** (§6.4): hide Work until there are case studies.

---

## 5. Transitions: make navigation feel like one place

**Diagnosis (read-only).** Transitions are implemented but nearly invisible: content fades out over 140ms (4px) and fades in over 200ms, while the background stays exactly still (`Framing: fixed`, route poses switched off). Little changes, so the eye reads a page reload.

**Proposed signature transition** (total ≤ 350ms of content motion, always interruptible, never blocks input, so it stays within Codex's earlier constraints):
1. **Background camera move per section (turn on the D-029 experiment).** The planet glides and rotates to a framing per route over about 900ms with `--ease-inout`: home has the large limb in the lower right, mixes is lower and quieter, reading pages are pulled further away, music sits between. This is what makes navigation feel alive and continuous, and it also fixes the content collisions (§6.1). Content stays readable throughout; only the background moves.
2. **Content handoff.** Outgoing content fades over 120ms. The incoming page title reveals from a line mask (clip-path + 8px rise, 280ms, `--ease-out`), body text follows at +60ms, and the first 6 rows stagger at 30ms. Content is never hidden for longer than 350ms.
3. **Rail indicator slides** to the new item (transform, 260ms) instead of jumping. The ↗ glyph on the active item is removed.
4. **Cover → release morph** (already an approved M1 experiment): the tile artwork becomes the release header.
5. **Reduced motion:** a plain 120ms crossfade, a static background, and no masks.

---

## 6. Visual & layout findings

### 6.1 The planet (most important visual issue)
- **It reads as a ring, not a body.** The inside is the same black as the sky. It needs a dense particle surface that thins inwards, plus the faint accent rim light from the spec (§8.2).
- **It collides with content** on mixes (cuts through rows 2–3, dates and buttons), work and about. Per-route poses (§5.1) plus a content max-width or a soft scrim fix this.
- On home it's only a sliver behind a label. Home should be the hero framing, the largest and most present.

### 6.2 Buttons
Filled pale-blue rectangles (`Play Anna Doni`, `Explore rdelune`) feel generic and heavy next to the hairline aesthetic. Proposal: text buttons with a `▶`/`↗` glyph, a hairline underline or 1px outline, and accent colour only on hover/focus.

### 6.3 Player
Heavy compared with the page: a large pale-blue circle, chunky slider thumbs, a full-size volume slider. Proposal: a 1–2px track with a hover-only thumb, a smaller outlined play button, and volume as an icon with a hover slider. Also decide the credit: release tracks show "roam", but the spec default is "Brían Diolún".

### 6.4 Work page = CV + case studies (Brian, 2026-10-30)
It's mostly empty now, with a big button and a large "LAYOUT PREVIEW" placeholder. **Brian wants a CV tied to Work**, so Work stays in the rail and becomes:
1. **Work** + a one-line fact with `rdelune ↗`.
2. **CV**: a compact timeline. Each role is one row: years (mono), title, organisation, one-line summary, and chips linking to case studies. Then skills (grouped, one line each) and education. `Print / save PDF` with an A4 print stylesheet. Anchor `#cv`.
3. **Case studies**: compact rows, shown only once at least one exists.
The CV moves **from About to Work**. About keeps the bio, running and profiles. All CV content comes from `cv.json`, supplied by Brian and never invented.

### 6.5 Rail
- Remove the ↗ next to the active item (it means "external link").
- Keep `INDEX`. Remove the "Independent by nature." footer.

### 6.6 Mixes list
- No ▶ on rows: the only action is `→`. Add `▶` (playing from the list is the main action).
- The listed seed mixes have no media yet. Fine in dev, but hidden in production until ingested (spec). **ROAM_MIX_2026, the one mix with real media, should appear.**

---

## 7. Writing template (missing)
Not built yet: there are no `/writing` routes. Proposal:
- Build `/writing` (list: date in mono, title, one-line description) and `/writing/[slug]` (62ch measure, mono meta line, code blocks, images, footnotes, previous/next).
- **Dev and preview show a clearly marked sample post** so the template can be judged. Production keeps the hide-when-empty rule, *unless Brian prefers Writing visible from day one* (§9 Q2).

---

## 8. Proposed division of work (next phase)

Ownership by **directory** avoids the file collisions we had today. Both work on branches and merge after review. *(First: commit the current state; the repo has no commits yet.)*

| Area | Owner | Why |
|---|---|---|
| Background scene: planet body, rim, poses, quality steps (`src/components/stage/**`) | **Claude** | Shader and visual work. Claude can render and screenshot headless WebGL in its own workspace and iterate on the look without your browser |
| Motion & transition system (`src/styles/motion.css`, transition hooks) | **Claude** | Proposed in §5 |
| Copy pass (site/content JSON, page headings) | **Claude drafts, Brian approves** | §3 rules |
| Design QA after each change (Chrome, phone width, keyboard, reduced motion) | **Claude** | Independent reviewer |
| Media tooling: ingest, peaks, loudness checks (`scripts/ingest-mix.*`) | **Claude** | Already done by hand on the first mix |
| App structure, routing, content collections, feed fixture, Writing routes | **Codex** | Local, fast build loop |
| Player engine, state, playback edge cases, accessibility plumbing | **Codex** | Already built. Spec §7 is detailed |
| Tests and build scripts | **Codex** | Runs locally |
| Spec / decision log | Whoever proposes. **Brian approves** | |

---

## 9. Decisions from Brian (2026-10-30)
1. **One-screen home: yes** (replaces the scrolling homepage in D-011).
2. **Writing:** hidden in production until the first post, with a sample post in dev/preview.
3. **Work:** stays, as CV + case studies (§6.4).
4. **Copy:** rules and replacement table in §3 approved.
5. **Release credit:** use the feed's `artist_name` as published.
6. **Split:** Codex does everything except the background visual (prompt: `claude-prompt-codex-phase2.md`). The visual gets a separate prompt and must roughly follow playback state through the stage contract in that file.

---

## 10. Review log
| Date | Screens | Notes |
|---|---|---|
| 2026-10-30 | 01-mixes, 02-work, 03-about, 04-home | First pass. Sections 2–9 created |
| 2026-10-30 | — | CV moved to Work (§6.4); Brian's decisions recorded (§9); Codex phase-2 prompt written |
