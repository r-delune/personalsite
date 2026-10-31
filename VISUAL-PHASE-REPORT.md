# Visual phase V — review and completion

31 October 2026. Branch `codex/visual`. A remains the default. This pass continues the existing planet implementation rather than replacing it; phase 2b was already preserved in its own commits.

## The three pitches

**A · Breathing limb.** At 5 seconds a pale, half-lit moon sits beyond the page, with fine ground visible inside its edge and dust passing at three depths. At the mix’s peak the ground gathers near the limb and a slow transition wave travels along it, while the unlit body stays quiet.

**B · Orbiting dust.** At 5 seconds a sparse, tilted debris belt crosses the half-lit world, giving it the scale of an orbital view. At the peak its angle reflects progress through the mix, and a transition wave travels through the belt without changing the world’s palette.

**C · Atmosphere.** At 5 seconds a thin haze separates the lunar ground from the dark sky. At the peak that haze widens and its outer edge becomes more defined, making the musical arc visible as a change in the air around the body.

## Compare

[Comparison sheet](artifacts/visual-verification/comparison.png)

| Variant | Recording: idle → quiet → build → seek → pause → end | Phone still |
|---|---|---|
| A | [Breathing limb](artifacts/visual-verification/variant-a.webm) | [375 px](artifacts/visual-verification/variant-a-mobile.png) |
| B | [Orbiting dust](artifacts/visual-verification/variant-b.webm) | [375 px](artifacts/visual-verification/variant-b-mobile.png) |
| C | [Atmosphere](artifacts/visual-verification/variant-c.webm) | [375 px](artifacts/visual-verification/variant-c-mobile.png) |

**Recommendation: A.** It gives the music a visible arc while leaving the planet and page typography in balance. B makes progress more explicit but adds a strong competing shape; C is quieter and its extra subtlety is less useful behind reading pages. All three use the same scene and the same ≤15% atmosphere cap.

## What was corrected

- Removed section-driven HSL changes and light-angle changes. The two accent hues remain fixed; only playback state controls the monochrome-to-colour bloom.
- Buffering holds the ripple and musical values. Manual animation pause preserves pixels across seeks, route changes and exclusion updates; reduced motion remains still after resize and context recovery.
- Loading releases a previous item’s playing envelope. The lab now honors the real idle tier instead of forcing 60 fps through its HUD callback.
- Shader warmup is asynchronous. The governor can recover at normal 60 Hz cadence; its previous recovery threshold was unreachable at that cadence.
- Exclusion factors protect the body, dust and atmosphere. A final soft highlight ceiling also bounds their accumulated light behind text; the footer now participates in the existing rectangle bridge.
- Removed the second CSS grain overlay. Eight route-group posters were exported from the actual scene with real page exclusions and the shared lens.
- Added dev-only Tweakpane, a cached score timeline, confirmed chapters when available, real app-bridge playback mode, recordings and repeatable verification scripts.

The footer bridge change is isolated in commit `db82543`. Decisions D-059–D-064 and SPEC §8 document the visual changes.

## Verification

The replay uses the supplied 3626.74-second score unchanged. Its public copy has the same SHA-256 as the source under `inputs/mixes/roam-mix-2026`.

[Final browser assertions](artifacts/visual-verification/final-checks/results.json) passed: muted arc, eased seeking, fixed palette uniforms, buffering hold, frozen pixels, reduced-motion resize, context loss/recovery, and combined highlight protection. The quiet passage at 12:30 and peak at 21:22 produce an arc of approximately 0 and 0.95 without sound. Full text overlap limited the actual rendered RGB channels to 36/255.

[Thirty final route captures](artifacts/visual-verification/final-routes/routes.json) cover ten route types at 1440×900, 1280×720 and 375×812; none has horizontal overflow. Their screenshots are beside the JSON. Routes intentionally share four framing groups; this is also how the eight posters are organized. The supplied mix has no confirmed named chapters, so the timeline identifies its detected boundaries without inventing track names.

`npm test`: 36 passed. `npm run check`: zero errors; four existing schema deprecation hints. The isolated final visual snapshot passed `npm run build`, rendered-copy checks and site checks. Its production output has neither `/lab` nor Tweakpane. Concurrent launch/PWA work in the shared checkout was left outside this visual verification snapshot.

## Performance and limits

Final short measurements: Chrome 156.0.8078.76, Apple M1, 1440×900 at DPR 2, with mock text exclusions active. Frame times are presented-frame cadence, not GPU execution time.

| Variant | FPS | Frame time | Ending quality | Long tasks in sample |
|---|---:|---:|---:|---:|
| A | 60.00 | 16.67 ms | 1.00 | 0 |
| B | 60.00 | 16.67 ms | 1.00 | 0 |
| C | 60.00 | 16.67 ms | 0.94 | 0 |

[Final measurements](artifacts/visual-verification/final-performance.json).

The [15-minute profile](artifacts/visual-verification/profile-15min.json) ran for 902.0 seconds with 180 samples and changing item identities. Active playback averaged 59.98 fps / 16.67 ms; idle averaged about 20.5 fps. Heap stayed between 10.87 and 13.14 MB, with the late low-water mark slightly below the early one. GPU allocation counts stayed at three geometries and one texture; quality ranged from 0.80 to 1.00 and DPR from 1.75 to 2. The sustained run preceded the final contrast ceiling and duration guard; final builds and short measurements include both.

Two main-thread tasks of 52 and 55 ms were observed during the sustained run. Their source was not captured, so the “no scene tasks over 50 ms” acceptance remains unverified. Physical iPhone testing also remains unverified.

The configured local MP3 is a different 4214.36-second master from the 3626.74-second score. As requested, this phase retains the supplied score. [Native bridge verification](artifacts/visual-verification/real-audio.json) confirms that audio still plays and blooms colour, while musical coupling is disabled with a lab notice when durations disagree. The real-score replay is the musical reference for these recordings; this pass does not claim synchronized playback against that different local master.

## Reproduce

Run `pnpm dev`, then use `/lab` for silent score replay or the real-bridge switch for configured native audio. `?visual=b` / `?visual=c` select alternatives in dev; A ships on public pages.

```sh
pnpm posters
node scripts/verify-visual.mjs
node scripts/measure-visual.mjs
node scripts/capture-visual-routes.mjs
node scripts/profile-visual.mjs
```

Set `LAB_URL` if the dev server uses another origin. `CHECKS_ONLY=1` skips recording in the verification script. `PROFILE_SECONDS` defaults to 900. Chrome is used when installed on this Mac; other machines can install Chromium through Playwright or set `CHROME_PATH`.
