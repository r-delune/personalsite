# Brian's personal site — M1 preview

The first layout/background pass is ready for Brian and Claude to review. The authoritative build brief is `SPEC.md`. This is a local visual prototype, not a launch-ready site.

## Local preview

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:4357/** in Chrome. Port 4357 avoids an unrelated site already using 4321. Astro 7 runs its dev server as a detached local process, so the server can stay up between commands and hot reload source changes.

```sh
node scripts/astro.mjs dev status
node scripts/astro.mjs dev logs
node scripts/astro.mjs dev stop
```

Use Node >=22.23.4. The launcher first checks your current Node, then `PERSONALSITE_NODE`, then the compatible Codex runtime already installed on this Mac. It does not install Node or modify shell/global settings. On this Mac it uses Node 24.22.1; the default Node 22.22.1 is too old for the pinned Astro release.

## Commands

- `pnpm check` — prepare the minimal client fixture and type-check Astro/TypeScript.
- `pnpm run build:preview` — generate local static review output in `dist/`. This intentionally permits preview copy; do not publish this output.
- `pnpm build` — content approval guard, then production build. Currently expected to fail because the About page contains `TODO(copy)`.
- `pnpm posters` — regenerate desktop/mobile AVIF scene fallbacks from deterministic code-generated point geometry. Uses Astro's installed Sharp dependency; no browser automation required.
- `node scripts/prepare-fixture.mjs` — validate the fields needed by this prototype and project eligible upstream tracks into minimal client data. Full upstream JSON Schema validation remains for the content-integration stage.

## Review surfaces

- `/` — introduction, release artwork, editorial mix rows, rdelune link.
- `/music` and `/music/anna-doni` — release grid and artwork handoff experiment.
- `/mixes` and `/mixes/long-distance-runaround` — mix-list and detail-layout study. Waveform bars are explicitly illustrative; mix audio is not imported.
- `/work` and `/about` — reading-page layout with draft copy.

The footer contains **Pause animation** and, in development only, **Framing: fixed / adaptive**. Adaptive framing makes Work/About quieter using the same scene; switching routes while paused leaves the visual frozen. Small/large screen framing is responsive in both modes.

Release Play actions use real published MP3 URLs from the curated feed. This small native-output player makes the layout reviewable and supports navigation without deliberately resetting playback. It is not the completed M2 audio engine: Web Audio analysis, Media Session, mix import/resume, full queue rules and interruption recovery remain outstanding.

See `CODEX-M1-HANDOFF.md` for evidence, limitations and review checkpoints. No site has been published.
