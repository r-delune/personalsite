# Personal Site — Build Spec

> Owner: Brian Dillon (music alias **Roam** / **Brian Diolún**)
> Status: v0.1 spec, ready to build · 2026-10-30
> Consultancy (separate site, link out only): https://rdelune.dev
> Visual reference: https://omp.sh

This file is the single source of truth for the build. An agent implementing it should follow it literally, keep decisions marked **[LOCKED]** unchanged, and record any deviation in `DECISIONS.md` together with the reason.

---

## 1. Purpose

A personal site that is mainly **for Brian** (a home for his music, mixes, work and writing) and also builds his **visibility on the web**. In priority order:

1. **Blurb + music.** Who he is in two lines, plus releases and mixes you can play right away.
2. **Work.** What he does, a link to rdelune.dev, case studies and an online CV.
3. **Writing.** A blog that will grow over time.
4. **/now.** A small, occasionally updated page covering current projects and running.

**Less is more.** One hero, one background visual, generous negative space and a single accent colour.

### Non-goals (v1)
- No CMS. Content is Markdown/MDX plus JSON in the repo.
- No comments, accounts or newsletter backend.
- No storyboard / immersive mode yet. **The architecture must leave room for it, though (§10).**
- No dedicated running/ITRA section. Running appears as a small strip on /now only.

---

## 2. Decisions **[LOCKED]**

| Topic | Decision |
|---|---|
| Relationship to rdelune.dev | Separate personal site on its own domain, cross-linked to rdelune.dev |
| Navigation | Real pages with their own URLs inside a **persistent shell**: rail, player and background **never unmount** during navigation |
| Audio hosting | All audio on **Cloudflare R2**. **Releases** are not re-ingested: they come from the existing **Roam Studio showcase feed** (`https://audio.rdelune.dev/showcase.json`, the same source as productions.rdelune.dev; see §17). **Mixes** are self-hosted through this repo's ingest script (§11) |
| Mixcloud | Kept as a secondary "also on" link per mix and in the footer. It is **not** the playback source |
| Roam Archive (earlier project) | Inspiration only. No code reuse required |
| Music → visuals | Playback state **lightly** modulates the background, with influence capped (§9). The aesthetic stays uniform whether music is playing or not |

---

## 3. Design language (derived from omp.sh)

Observations from omp.sh: React + Vite SPA, Tailwind, oklch tokens, Geist + JetBrains Mono, near-black background with fine grain, a particle "planet horizon" drawn on canvas in the lower-right, a thin left icon rail numbered 01–08, uppercase tracked micro-labels in mono, one saturated accent with a cool rim light, and a single-viewport hero.

We adopt the **language**, not the layout verbatim.

### 3.1 Tokens (CSS custom properties, Tailwind v4 `@theme`)
```css
--bg:        oklch(0.13 0 0);      /* near-black, not pure #000 */
--bg-raised: oklch(0.17 0 0);
--line:      oklch(0.28 0 0);      /* hairlines, rail borders */
--fg:        oklch(0.97 0 0);
--fg-muted:  oklch(0.72 0 0);
--fg-dim:    oklch(0.52 0 0);
--accent:    oklch(0.80 0.10 250); /* PROVISIONAL: cool lunar blue, see §16 */
--accent-2:  oklch(0.72 0.17 330); /* PROVISIONAL: warm rim, used only in the visual */
--grain-opacity: 0.06;
```
- **Dark only in v1.** Set `color-scheme: dark`.
- The accent is used for at most **one highlighted phrase per screen**, plus active/focus states.

### 3.2 Type
- Sans: **Geist** (variable). Mono: **Geist Mono**. Self-host both via `@fontsource-variable` and preload the sans.
- Hero H1: `clamp(2.5rem, 6vw, 4.5rem)`, weight 500, tracking -0.02em, line-height 1.02. The second line uses `--fg-muted` and the key phrase uses `--accent` (the same pattern as omp's three-tone headline).
- Micro-labels: mono, 11px, uppercase, tracking 0.18em, `--fg-dim`. Use them for section indices (`01`), metadata, tab labels and timestamps.
- Body: 16–17px, max-width 62ch, line-height 1.6.

### 3.3 Surfaces
- Full-viewport **grain overlay**: an SVG `feTurbulence` noise as a fixed pseudo-element, with `pointer-events:none` and the opacity from the token.
- Panels: `--bg-raised` with a 1px `--line` border, radius 6px max. No drop shadows, no glassmorphism blur except on the player bar (`backdrop-filter: blur(12px)` over a 70% bg).
- Icons: Lucide, 16px, stroke 1.5.

### 3.4 Layout grid
- Desktop: a 56px fixed **left rail** plus a content column starting at ~18% of viewport width (as on omp). The background visual owns the lower-right quadrant and content never sits on top of the bright part of the visual.
- Mobile (<768px): the rail becomes a bottom tab bar sitting above the player bar. The visual is reduced to a band across the bottom third. 16px side gutters and no horizontal scroll.

---

## 4. Tech stack **[LOCKED unless noted]**

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Astro** (latest stable) | Static output (`output: 'static'`). Content collections. `<ClientRouter />` for view transitions + `transition:persist` |
| Islands | **Preact** + `@preact/signals` | Small, React-like. Only for the player, the mix scrubber and the command palette |
| Shared state | **nanostores** | Player and audio-feature state shared across islands and the Stage |
| Styling | **Tailwind CSS v4** | Tokens in `@theme` |
| Visual | **three.js** (points + custom GLSL) | Lazy-loaded after first paint. A static poster image renders first |
| Audio | `HTMLAudioElement` + Web Audio `AnalyserNode` | One element for the whole site |
| Waveforms | Pre-computed peaks JSON (BBC `audiowaveform` CLI at ingest) | Drawn on 2D canvas in the scrubber. No decoding of audio in the browser |
| Content | Astro content collections + zod schemas | MDX for posts and case studies |
| Hosting | **Cloudflare Pages** (site) + **R2** (media at `media.<domain>`) | |
| Analytics | Umami or Plausible (cookieless) | Optional, behind an env flag |
| Package manager | pnpm | |
| Lint/format | Biome or ESLint+Prettier (agent's choice) | |

---

## 5. Architecture

```
src/
  layouts/Shell.astro          ← <ClientRouter/>, rail, <Stage/>, <Player/>, grain, <slot/>
  components/
    Rail.astro
    stage/Stage.astro          ← <canvas transition:persist="stage">
    stage/stage.ts             ← Stage runtime (scene manager)
    stage/scenes/horizon.ts    ← scene 0 (default)
    player/Player.tsx          ← island, transition:persist="player"
    player/Scrubber.tsx        ← waveform + chapters
    CommandPalette.tsx
  lib/
    audio/engine.ts            ← singleton: <audio>, AudioContext, analyser, feature extraction
    audio/features.ts          ← band energies, envelope followers, onset detect
    stores.ts                  ← nanostores: $track, $queue, $playing, $time, $features, $uiMode
  content/
    config.ts                  ← zod schemas (§6)
    releases/*.md
    mixes/*.md
    projects/*.mdx
    posts/*.mdx
    cv.json
    now.md
  pages/ …                     ← §7
scripts/
  ingest-audio.ts              ← §11
public/
  poster/horizon.avif          ← static first-paint fallback for the Stage
```

### 5.1 Persistence rules (critical)
- `Stage` canvas and `Player` must use `transition:persist` so they **survive navigation**. Audio must never stop or glitch when a link is clicked. **This is an acceptance test.**
- The audio engine is a module-level singleton, created on the **first user gesture** (autoplay policy) and never recreated.
- All other islands may remount freely.

### 5.2 Data flow
```
AudioEngine ──(rAF, 60Hz)──▶ $features {energy,bass,mid,high,beat,playing}
     ▲                              │
Player UI ◀── $track/$time ──┐      ▼
     │                       │   Stage.update(features, t)
  user actions ──▶ engine.play/seek/load
```

---

## 6. Content model (zod)

```ts
// shared
const media = z.object({
  src: z.string().url(),            // R2 URL to .m4a (AAC, faststart)
  duration: z.number(),             // seconds
  bytes: z.number(),                // for RSS enclosure
  peaks: z.string(),                // URL/path to peaks JSON
});

releases: {
  title, slug, artist: z.string().default('Brian Diolún'),
  date: z.coerce.date(), type: z.enum(['album','ep','single']),
  cover: image(), blurb: z.string().max(280),
  tracks: z.array(z.object({ n: z.number(), title: z.string(), media })),
  links: z.object({ soundcloud, bandcamp, spotify, apple }).partial(),
  scene: z.string().optional(),     // §10 — future storyboard scene id
  featured: z.boolean().default(false),
}

mixes: {
  title, slug, date: z.coerce.date(), dateApprox: z.boolean().default(false),
  cover: image().optional(), description: z.string().optional(),
  tags: z.array(z.string()),
  media,
  tracklist: z.array(z.object({
    at: z.number(),                 // seconds from start
    artist: z.string(), title: z.string(), label: z.string().optional(),
  })).default([]),
  series: z.string().optional(),    // e.g. "AUTNOTE", "Year mixes", "Running"
  mixcloudUrl: z.string().url().optional(),
  scene: z.string().optional(),
  featured: z.boolean().default(false),
}

projects: {                          // case studies
  title, slug, client: z.string().optional(), year: z.number(),
  role: z.string(), summary: z.string().max(200),
  stack: z.array(z.string()), outcomes: z.array(z.string()),
  links: z.array(z.object({ label, href })).default([]),
  cover: image().optional(), order: z.number(),
  cvRefs: z.array(z.string()).default([]),   // ids of cv entries this backs up
}

posts: { title, slug, date, summary, tags, draft: z.boolean().default(false) }

cv (single JSON): {
  headline, location, links[],
  roles: [{ id, org, title, start, end?, summary, bullets[], caseStudies: slug[] }],
  skills: [{ group, items[] }],
  education: [...], talks: [...]
}

now (single md, frontmatter): { updated: date, running?: { recent: string, next: string, itraUrl?: string } }
```

---

## 7. Routes & page specs

| # | Route | Rail label |
|---|---|---|
| 01 | `/` | Home |
| 02 | `/work`, `/work/[slug]` | Work |
| 03 | `/cv` | CV |
| 04 | `/music`, `/music/[slug]` | Music |
| 05 | `/mixes`, `/mixes/[slug]` | Mixes |
| 06 | `/writing`, `/writing/[slug]` | Writing |
| 07 | `/now` | Now |
| — | `/rss.xml`, `/mixes/feed.xml` (podcast), `/404` | |

Each rail item shows a Lucide icon, a mono index (`01`–`07`), a hover tooltip and an active state with an accent hairline.

### 7.1 Home `/`
- Single viewport, like the omp hero.
- Eyebrow micro-label (e.g. `DEVELOPER · PRODUCER · CORK → ASIA`, placeholder text).
- Three-tone H1, for example: *"I build software, / make music, / and run long distances."* with the last phrase in the accent colour. Copy is a placeholder and Brian supplies the final text.
- 2-line blurb, then two CTAs: **▶ Play latest** (loads the featured release or mix into the player) and **Work with me ↗** (rdelune.dev).
- A small "Latest" strip in the same spot as omp's "compatible" logo strip: newest mix, release and post as three mono rows.

### 7.2 Work `/work`
- Intro paragraph (what he does), then a prominent link card to **rdelune.dev ↗**.
- Case study list: index number, title, year, role and a one-line summary. Each row links to the detail page.
- Detail: MDX with a hero meta strip (role / year / stack), then Problem → Approach → Outcome. A footer links back to the CV roles that cite it.

### 7.3 CV `/cv`
- A single page that **prints cleanly** (print stylesheet: white background, no rail/player/stage, A4 margins). Includes a "Download PDF" button that calls `window.print()`.
- Roles show the org, title, dates and bullets, plus chips linking to their case studies.

### 7.4 Music `/music`
- A grid of releases (cover, title, year, type). Hover reveals a ▶ button that queues the release and plays it.
- Detail: large cover, blurb, track list (click a row to play), and external links.

### 7.5 Mixes `/mixes`
- Mono table rows: `#`, title, series, year, duration, tags, ▶. Filter by tag or series using client-side chips. Sort by date, which is the default.
- Detail `/mixes/[slug]`:
  - A large **waveform scrubber** (§8.2) showing tracklist markers.
  - A tracklist where clicking a row seeks to that point, and the current track is highlighted while playing.
  - A "Copy link at current time" button that produces `?t=1h12m30s`. **Opening a URL with `?t=` loads the mix paused at that time and shows a ▶ prompt** (autoplay policy).
  - An "Also on Mixcloud ↗" link.

### 7.6 Writing `/writing`
- A list of title, date and summary. The post page uses MDX at 62ch with code blocks (Shiki, a dark theme matched to the tokens). An empty state must look intentional ("First post soon.").

### 7.7 Now `/now`
- Shows the "Updated <date>" line followed by short sections: Building, Listening, **Off the clock** (running). The running strip carries the most recent race (e.g. Sapa 100k), the next race, and an ITRA profile link if one is set.

### 7.8 Global
- **Command palette** (⌘K / Ctrl-K): jump to any page, post, release or mix, or play any track or mix.
- **Keyboard:** `Space` play/pause (unless focus is in an input), `J`/`L` ±15s, `Shift+J`/`Shift+L` previous/next track (or tracklist chapter in a mix), `M` mute.
- Footer, kept minimal in the bottom corners as on omp: `© Brian Dillon 2026` with links to rdelune.dev, Mixcloud, SoundCloud, GitHub, LinkedIn and RSS.

---

## 8. Player

### 8.1 Player bar (persistent)
- Fixed to the bottom, 56px tall, with blur behind it. It is **hidden until something is loaded** and then slides up.
- Contents: cover thumbnail · title / artist (mono sub-line) · prev / play / next · a thin progress line (full-width hairline at the top edge of the bar, accent colour) · elapsed / total in mono · volume · a "queue" popover.
- For mixes, the sub-line shows the **current tracklist entry** ("now: Artist — Title").
- Uses the Media Session API for title, artist, artwork and handlers, so OS media keys and the lock screen work.
- Remembers the last track and position in `localStorage` (wrapped in try/catch). On return it shows "Resume <title> at 42:10?" and does not autoplay.

### 8.2 Waveform scrubber
- Input: peaks JSON `{ "v":1, "length":N, "data":[-1..1 pairs or 0..1 max values] }`. Target ~2000 points per mix regardless of length.
- Rendered on a 2D canvas as mirrored bars, 2px bars with 1px gaps. The played portion is drawn in `--fg` and the unplayed portion in `--fg-dim`. Hover shows a vertical line plus a time tooltip.
- Tracklist markers are small ticks at the top with titles on hover.
- Drag to seek. Seeking is applied on pointerup, with a live preview line while dragging.
- Keyboard accessible: `role="slider"`, arrow keys move ±5s and PageUp/PageDown move ±60s.

---

## 9. Audio → visual mapping

### 9.1 Feature extraction (`features.ts`)
- `AnalyserNode` with `fftSize = 2048`, `smoothingTimeConstant = 0.6`.
- Bands: **bass** 30–150 Hz, **mid** 150–2000 Hz, **high** 2–10 kHz. Normalise each band against a slowly adapting running max (decay ~0.995 per frame) so quiet ambient mixes still move.
- Envelope follower per band: attack 60 ms, release 500 ms.
- `beat`: spectral-flux onset on the bass band with an adaptive threshold (mean + 1.5σ over the last 1s). It outputs an impulse that decays over 250 ms.
- `playing`: eased from 0 to 1 over 1.5s on play and back over 2.5s on pause.

### 9.2 Influence caps **[LOCKED]**
The scene must look **on-brand with all features at 0**. Audio only nudges it:

| Uniform | Drives | Max change vs. idle |
|---|---|---|
| `uEnergy` | particle drift speed | +20% |
| `uBass` | rim-light brightness / thickness | +15% |
| `uHigh` | sparkle (per-particle alpha jitter) | +10% |
| `uBeat` | a single soft radial pulse along the horizon | +8% brightness, 250ms |
| `uPlaying` | overall multiplier on all of the above | 0→1 |

No colour shifts and no camera shake. **Test:** a screenshot taken mid-track and one taken idle should read as the same site.

### 9.3 Cross-origin requirement
For the analyser to read R2 audio, the `<audio>` element needs `crossorigin="anonymous"` **and** the R2 bucket needs a CORS policy allowing GET/HEAD from the site origin with `Range` headers exposed. Without this the analyser returns zeros silently. **Add a dev-mode console warning when the features stay at 0 for more than 3 seconds of playback.**

---

## 10. Stage & future storyboard (design for it now)

### 10.1 Scene interface
```ts
export interface AudioFeatures { energy:number; bass:number; mid:number; high:number; beat:number; playing:number; }
export interface Scene {
  id: string;
  mount(ctx: { renderer: THREE.WebGLRenderer; size: {w:number;h:number}; reducedMotion:boolean }): Promise<void> | void;
  update(f: AudioFeatures, t: number, dt: number): void;
  resize(w:number, h:number): void;
  dispose(): void;
}
```
- The `Stage` owns the renderer and rAF loop, and holds `current` and `next` scenes so it can **crossfade** between them (opacity blend over 1.5s, rendering to two targets). v1 ships only `horizon`, but the crossfade path must exist and be tested with a trivial second scene (`void`, a plain fade to background).
- Scene registry: `scenes/index.ts` maps id → lazy `import()`.

### 10.2 Scene 0 — `horizon`
- ~60–120k points (desktop) / ~20k (mobile) forming a curved planet or moon limb rising from the lower-right. Particles are dense near the edge and scatter into dust above it. There is a thin **rim light** along the limb in `--accent`, blending into `--accent-2` deeper in.
- Idle motion: slow rotation of the limb plus drifting dust. It loops seamlessly.
- The first paint shows `public/poster/horizon.avif` (a pre-rendered still of the same scene), and the canvas fades in over it once ready.

### 10.3 Hooks reserved for immersive mode (not built in v1)
- `$uiMode: 'default' | 'immersive'` store, plus `data-ui-mode` on `<html>`. CSS fades every element marked `[data-chrome]` (rail, content, footer) to 0 while immersive. The player collapses to a minimal pill.
- Each content entry has `scene?: string`. When a track or mix with a `scene` starts, the Stage may crossfade to it (behind a feature flag `PUBLIC_STORYBOARD=false` in v1).
- Reserved per-entry timeline shape for later (do not implement): `scenes: [{ at: seconds, id: string, params?: object }]`.

---

## 11. Media pipeline (`scripts/ingest-audio.ts`)

**This pipeline covers mixes only.** Releases already exist as MP3s on R2 and are listed in the showcase feed (§17). For v1 layout work, use a small local fixture copied from `public/data/showcase.json` in the rdelune-productions repo.

Input: a local folder of mix masters (WAV/FLAC/MP3). For each file:
1. `ffmpeg` → **AAC 192 kbps `.m4a` with `-movflags +faststart`** (accurate seeking with range requests and small size). Loudness-normalise to -14 LUFS integrated (`loudnorm`, two-pass).
2. `audiowaveform` → peaks JSON, downsampled to ~2000 points (normalised).
3. Read duration and byte size.
4. Upload `.m4a` and `.json` to R2 (S3 API via `@aws-sdk/client-s3`, env `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`). Key: `mixes/<slug>.m4a`, `mixes/<slug>.peaks.json`, `releases/<release>/<nn>-<slug>.m4a`.
5. Write or merge the `media` block into the matching content file (create a stub `.md` if none exists).
6. The script is idempotent: skip a file if a content hash matches what is already in R2 metadata.

Also generate `public/poster/horizon.avif` via a Playwright script that renders the horizon scene headless (`scripts/render-poster.ts`).

Tracklists: support a plain-text import format (`00:00 Artist - Title`, `1:02:30 Artist - Title`) → `tracklist[]`.

---

## 12. SEO, feeds, sharing

- Per-page `<title>`, description and canonical URL. JSON-LD: `Person` (with `sameAs`: rdelune.dev, Mixcloud, SoundCloud, GitHub, LinkedIn) on `/`. `MusicAlbum`/`MusicRecording` on releases. `BlogPosting` on posts.
- **OG images** generated at build time with Satori (`astro-og-canvas` or similar) in the site style: black, grain, mono label, title, a small horizon crop.
- `/rss.xml`: posts.
- `/mixes/feed.xml`: a **podcast-compatible RSS** (iTunes namespace, `enclosure` with url/length/`audio/mp4`, `itunes:duration`, artwork ≥1400px) so mixes can be subscribed to in podcast apps.
- `sitemap.xml` via `@astrojs/sitemap`. `robots.txt`.

---

## 13. Performance & accessibility budgets

- Lighthouse (mobile) ≥ 95 Performance, 100 Accessibility, 100 SEO on `/`, `/mixes`, a post.
- LCP < 1.8s on 4G. JS on first load (excluding three.js, which is lazy) < 60 KB gz.
- three.js chunk loads after `requestIdleCallback` (or 1.5s at the latest). On WebGL failure the poster image stays up.
- `prefers-reduced-motion`: the Stage renders a single still frame, with no drift and no audio modulation.
- The Stage pauses its rAF loop when the tab is hidden or the canvas is off-screen. On mobile the pixel ratio is capped at 1.5 and at 2 on desktop.
- All interactive elements are keyboard reachable with visible focus (accent outline). Text contrast is AA or better against `--bg`. The player announces track changes via `aria-live="polite"`.

---

## 14. Deployment

- Cloudflare Pages: `pnpm build` → `dist/`. Preview deploys per branch.
- R2 bucket `site-media` with a custom domain `media.<domain>`, `Cache-Control: public, max-age=31536000, immutable` (filenames include a content hash), and a CORS policy (§9.3).
- Env: `PUBLIC_SITE_URL`, `PUBLIC_MEDIA_URL`, `PUBLIC_STORYBOARD`, `PUBLIC_ANALYTICS_ID?`, plus R2 credentials for scripts only (never shipped to the client).

---

## 15. Milestones & acceptance criteria

**M1: Shell & Stage**
- [ ] Astro + Tailwind tokens, fonts, grain, rail, all routes stubbed.
- [ ] Horizon scene renders and matches the omp-like composition, with the poster fallback and reduced-motion still.
- [ ] Stage crossfade works between `horizon` and `void` (dev-only toggle).

**M2: Audio core**
- [ ] One persistent player. **Navigating between all 7 sections while a mix plays produces zero audible interruption** and the Stage doesn't reinitialise.
- [ ] Features flow to the Stage, the caps from §9.2 hold, and the idle-vs-playing screenshot test passes.
- [ ] Media Session, keyboard shortcuts and resume prompt all work.

**M3: Mixes**
- [ ] Ingest script processes a folder and writes content stubs plus R2 uploads.
- [ ] `/mixes` list with filters; detail with waveform scrubber, tracklist seeking, current-track highlight and `?t=` deep links.
- [ ] Podcast feed validates (e.g. Podbase or Cast Feed Validator).

**M4: Music, Work, CV, Writing, Now**
- [ ] Releases grid and detail with queue play.
- [ ] Case studies (MDX) ↔ CV cross-links. CV prints to a clean A4 PDF.
- [ ] Blog with RSS. Empty state looks intentional.
- [ ] /now with the running strip.

**M5: Polish & ship**
- [ ] Command palette, OG images, JSON-LD, sitemap.
- [ ] Budgets in §13 met, then deploy to Pages and R2 with CORS verified in production (analyser non-zero).

---

## 16. Open questions (use the defaults until answered)

| Question | Default |
|---|---|
| Domain | `<placeholder>.com`, configured via `PUBLIC_SITE_URL` |
| Display identity on the site: "Brian Dillon" vs "Brian Diolún" vs "Roam" | Site owner "Brian Dillon"; music credited "Brian Diolún"; "Roam" used as the mix-series/DJ alias |
| Accent colour and hero visual motif | Cool lunar blue + moon-limb horizon (fits the rdelune name). Keep it swappable through tokens and scene params |
| Final hero copy and blurb | Placeholder text, marked `TODO(copy)` |
| Which releases go on the site first | Read from the masters folder at ingest |
| Analytics provider | None until set |

---

## 17. Roadmap after v1: shared music inventory with rdelune-productions

**Context.** `productions.rdelune.dev` (repo `rdelune-productions`: Next.js 15 + three.js, Cloudflare Pages + D1) is a prototype listening app that plays Brian's albums with section-aware, audio-reactive generative visuals. Its music is **not** stored in that repo. It comes from **Roam Studio** (Brian's private desktop app for Ableton projects), which publishes albums and MP3 renders to R2 and writes `https://audio.rdelune.dev/showcase.json`. The feed contract lives in `rdelune-productions/docs/showcase-feed-spec.md` with a JSON Schema alongside it.

**Implications for this site (design for them now, build them later):**
1. **One inventory, two consumers.** The Music section should read the same showcase feed at build time (validate against the schema, ignore unknown fields, accept snake_case and legacy camelCase). Do not create a parallel release catalogue. The `releases` collection in §6 becomes a thin **overlay** (slug, featured flag, extra blurb or links) keyed on the Roam Studio album name/slug and track `id`.
2. **Track identity = Roam Studio `id`.** Use it in URLs/data attributes so deep links and future cross-site links stay stable.
3. **Storyboard = productions' visual engine.** The future immersive mode (§10) is most likely the rdelune-productions "explorer" runtime (section times, recipes, transitions) running as a Stage scene, driven by the feed's `section_times`, `bpm`, `beat_start_at` and `visual_*` fields. Keep the `Scene` interface general enough for that, and keep three.js as the renderer to stay compatible.
4. **Mixes never go through Roam Studio [LOCKED].** This repo owns mixes (ingest script → R2 → `mixes` collection). The two inventories (showcase feed for releases, local collection for mixes) only meet at render time on this site.

**Not in v1.** v1 is layout plus shell plus player against local fixtures. Feed integration is milestone M6.

**M6 (later):** build-time fetch and validation of showcase.json, a releases overlay, track `id` deep links, then a prototype that mounts the productions visual runtime as a Stage scene behind `PUBLIC_STORYBOARD`.

---

## Appendix A: Seed mixes (from Mixcloud, 2026-10-30)

Dates are approximate (Mixcloud shows relative dates), so set `dateApprox: true`. Tags listed are only those visible on Mixcloud. Each `mixcloudUrl` is the profile URL plus the mix slug and must be filled in by hand.

| slug | title | ~year | duration | series | tags |
|---|---|---|---|---|---|
| long-distance-runaround | Long Distance Runaround // Running Tunes | 2025 | 2:25:06 | Running | techno, house, pacesetter |
| year-24 | '24 | 2025 | 1:00:00 | Year mixes | electronica, ambient, acoustic, jazz, chillout |
| year-23 | '23 | 2024 | 57:36 | Year mixes | space, ambient, sleep |
| year-22 | '22 | 2022 | 1:00:00 | Year mixes | chillout, ambient |
| holiday-fizzler | Holiday Fizzler (Ambient) | 2020 | 1:19:24 | — | ambient |
| autnote-6 | Skirmish Blog AUTNOTE series #6 (Jazz, Lo-fi, Eastern) | 2017 | 1:05:05 | AUTNOTE | jazz, world, 70s, 60s, lo-fi |
| roam-mix-1 | Roam mix 1 | 2017 | 1:30:35 | Roam | instrumental hip hop, downtempo, ambient |
| autnote-1 | Skirmish Blog AUTNOTE series #1 | 2015 | 1:00:32 | AUTNOTE | jazz, rock, 70s, 60s |
| bank-holiday-chillout | Bank Holiday Chillout | 2014 | 59:53 | — | 70s, 60s, chillout |
| dream-gathering-african-vibes | Dream Gathering DJ set (African Vibes) | 2014 | 1:23:39 | — | african, afrobeat, 70s |

Profiles for `sameAs` and the footer:
- Mixcloud: https://www.mixcloud.com/brian-diolun/
- SoundCloud: https://soundcloud.com/brian-d
- Consultancy: https://rdelune.dev
