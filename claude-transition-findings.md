# Route transition findings — for the transitions pass (31 Oct 2026)

Recorded Work → About at 2% playback speed (Playwright + CDP `Animation.setPlaybackRate`) against the
working tree as of 23:38, while the transitions pass was mid-way. Recheck these against the finished pass.

1. **Double exposure.** The old content snapshot fades out while the new page's title and body
   reveal in the same place at the same time. For ~140 ms both titles are visible ("Work" over
   "Brían Diolún."), and the old paragraphs ghost over the new ones. Fix: sequence it, don't overlap.
   Old content exits first (~100–120 ms, fade plus ≤4 px rise); the new content snapshot is held at
   opacity 0 for that time (e.g. `animation: hold 110ms step-end both`); the DOM reveals
   (`title-reveal`, `body-reveal`, row stagger) start with that same offset.
2. **Footer jumps.** `.site-footer` isn't in a named group, so it belongs to `root`, which snaps.
   Between pages of different heights it jumps while the content is still fading. Give it its own name
   and treat it like content: fade out, hold, fade in, with `group` duration 0.
3. **Cleanup timing.** With the offset in (1), the row stagger finishes after ~450 ms, so a fixed
   350 ms removal of `route-enter` would cut the reveals off. Cleanup should wait for
   `viewTransition.finished` plus the reveal animations (the generation approach in
   `navigation-state.ts` covers this).
4. **Shared cover.** Give the morph its own timing (about 380–420 ms, ease-out) using
   `view-transition-class: cover`, so it isn't the default 250 ms ease. When only the old page has
   the cover, it should leave with the content exit rather than linger on its own.

The reproduction script is `rec.mjs` in Claude's workspace. Ask if you'd like it added under `scripts/`.
