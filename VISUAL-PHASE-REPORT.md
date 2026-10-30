# Visual phase V — report

> Built by Claude on 2026-10-30 from `claude-prompt-codex-visual.md` (Codex was out of credits). Branch `codex/visual`.

## Concept pitches

**A · Breathing limb (ships).** At 5 s a pale, half-lit moon rests in the corner, its thin edge of light drawing a slow breath while dust idles past. At the mix's peak the limb is thicker and brighter, more dust has gathered close to the surface, and each transition sends one long ripple of light along the edge.

**B · Orbiting dust.** At 5 s a faint tilted ring of debris lies across the moon, barely turning. By the peak the ring has swung a third of the way round in step with the mix's progress, catching more light, and each transition shivers along it as a ripple.

**C · Atmosphere.** At 5 s the moon's sunlit edge carries a thin, cool haze, like dawn seen from orbit. At the peak the haze has swollen into a deep violet-to-blue band whose outer edge sharpens with the hats, while the surface itself stays almost still.

## What changed
- `src/components/stage/`: `scene.ts` (geometry, shaders, lens), `runtime.ts` (bridge, tiers, governor, poses, exclusions, motion settings, context loss, poster swap), `coupling.ts` (pure, tested logic), `params.ts` (variants, caps, slider ranges), `Stage.astro` (per-route poster).
- `src/lab/` + one line in `astro.config.mjs`: the dev-only `/lab`.
- `scripts/render-posters.mjs` (`pnpm posters`), `tests/visual.test.ts` (8 tests), `public/poster/*.avif` (8 posters from the real scene).
- `DECISIONS.md` D-051 to D-056; `SPEC.md` §8.7.

## How it was checked
Rendered headless in a cloud browser with a software GPU, against the lab with a stand-in score shaped like your mix (your real score is used on your machine):
- Body, terminator and atmosphere at rest; colour bloom at a peak; variant B ring; variant C halo.
- Ripple fires exactly when playback crosses a boundary (e.g. 41:06.5), runs 3.2 s, and doesn't fire on seeks.
- Mock page layouts at 1440×900, 1280×720 and 375×812 on home, mixes and reading routes: text areas stay clear and the limb calms behind UI without a visible rectangle.
- Unit tests: caps for every variant, envelope timings, buffering hold, loading inhale, macro envelope, boundary priority, seek-safe ripples, governor (drops fast, recovers slowly, no oscillation), pose clearance, seed stability.

**Not yet measured:** real frame rates (the software renderer runs at ~4 fps, so its numbers mean nothing), 15-minute memory, long tasks, iOS, and recordings. Open `/lab`, press Play at ×10: the HUD shows fps, frame time, quality and DPR.

## Extras (after the brief)
- **Tonight's moon (D-057):** the lit fraction follows the real lunar phase, from a thin backlit crescent at new moon to a broad gibbous at full. Today it's waning gibbous. It eases in after first paint, and the sun always stays on the right, away from the text. Preview any phase in the lab with `?moon=0.02` or `?moon=0.5`.
- **Pointer parallax (D-058):** on desktop the dust layers shift a few pixels with the pointer, nearer layers more, so the scene has depth. It's calmer on reading pages and off with reduced motion or the animation pause.

### Further ideas, not built
- **Listening view:** a button (or key) that fades the page and glides the moon to a centred hero pose while a mix plays. Needs a player-bar control, and the brief lists immersive mode as out of scope.
- **Artwork handoff:** on play, the cover's average colour tints the atmosphere for that item only. Needs the per-release tint rule, which is also out of scope.
- **Chapter-aware ripples:** start each ripple from the limb point nearest the tracklist row that just became active, linking UI and scene.
- **Arc preview on mix rows:** draw each mix's macro arc as a faint line under its row, so visitors can see its shape before pressing play.

## Deviations from the brief
- **No Tweakpane:** your machine's sandbox couldn't install packages, so the lab has its own slider panel (zero dependencies).
- **Posters are per route group** (home, listen, mixes, read), since routes in a group share a pose.
- **Ripple brightness** only uses what's left of the +15% rim cap, so at loud peaks a ripple is mostly a travelling bulge and local density rather than light.
- The old dev "Framing" button in the footer no longer does anything (poses are automatic); it can be removed from `Shell.astro`.

## Needs your decision
1. **D-052:** colour blooms on play. You asked for it, but §8.4 is locked and says "no colour shifts", so please confirm.
2. **D-054:** caps for density (12%) and atmosphere (+15%; C asks +20%).
3. **Pick A, B or C.**

## Recommendation: A
A is the calmest and reads as a place, with the music visible in the light rather than in a new object. B is the most striking (the ring makes progress through a mix legible), but it adds a strong "Saturn" motif that competes with artwork and costs 7k more particles. C is the most restrained and nearly identical to A at rest; its +20% atmosphere needs a cap change. If B appeals, try it in the lab at ×10 on your mix before deciding.
