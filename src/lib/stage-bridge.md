# Stage bridge contract

Import `stageBridge` from `src/lib/stage-bridge.ts`. This is the only app interface the separately owned visual should read. No scene file was changed to adopt it; the existing scene works independently until its owner integrates it.

- `getSnapshot()` returns the same live object on every call. Read values; do not mutate or retain it as historical state. Position comes from the active audio clock. Unknown duration is null. Item IDs are stable Roam track IDs or `mix:<slug>`.
- `phaseSince` and `routeSince` are `performance.now()` timestamps, changed only when their respective enum changes. A new item can keep the same phase while still emitting `itemchange`.
- `getFeatures()` returns one reused object with time-based `energy`, `low`, `mid`, `high` and `playing` envelopes. It performs no allocation. No per-frame bridge values enter nanostores. A reader samples this each frame; it is independent of whether rendering is paused.
- `phase` reflects media events: selection → loading; confirmed `playing` → playing; waiting after playback → buffering; user or native/OS pause → paused; natural completion → ended; rejected play or media failure → error. A pending play promise is never evidence of playing.
- `seek` fires once when a seek requested on the active item commits after metadata is available. Previewing an inactive mix does not write the engine or emit seek. A later explicit Play may change the item then seek it.
- `itemchange` fires only when the engine selects a different item. Global player/keyboard/Media Session actions target this active item, never the page's staged item.
- Route updates on `astro:after-swap` and history traversal. Paths map to home/music/release/mixes/mix/work/writing/post/about/other; query/hash-only navigation does not change pose or timestamps.
- `motionprefs` reflects the OS media query plus persisted `scene-paused`. The existing scene owns its actual pause toggle; the bridge observes it without rewriting scene code. `scoreAvailable` reflects validated score readiness; no Web Audio graph is created on any platform.
- `getItemMeta()` returns the same static metadata object until itemchange: mix peaks URL, `scoreUrl: string | null`, and confirmed tracklist times, or sanitized manual release section boundaries plus existing BPM/beat-start fields. Unknown data is null/empty; no detected mix boundaries are promoted to confirmed tracklist data. The bridge never fetches peaks or audio. It loads/validates scores on itemchange, caches by URL, ignores stale loads and falls back to zero bands plus playing when missing/invalid. Bands are linearly interpolated at the active clock, normalized from bytes and smoothed with attack tau 80ms/release tau 600ms; they are not multiplied by playing. Boundary priority: confirmed tracklist times → manual release sections → detected score boundaries → none.
- `subscribe(event, callback)` returns an unsubscribe function. Subscribers receive the reused snapshot. Keep callback work small; exceptions should be handled by their owner.

App-side writers and the deterministic factory are exported for the engine/router and tests, not for visual code. `bindStageBridge()` installs browser listeners once.

Development only: load `/?bridge` to inspect phase, route, position and energy. Native output is used on every platform. The debug overlay is imported behind `import.meta.env.DEV`; it is absent from production and static preview bundles. To continue inspecting on another route, navigate to that route with `?bridge` or reload it there.

- `getScoreWindow(fromSec, toSec)` returns null without a valid score, otherwise a reused descriptor: rateHz, duration, startIndex (inclusive), endIndex (exclusive), data (all four original arrays), boundaries (detected seconds). Indices bound the requested interval plus interpolation neighbour. Consume immediately; never mutate or retain it as history. No per-call array copies or allocations.
- `getExclusionRects()` returns the same readonly array of CSS-pixel rectangles. Event `exclusions` fires after a throttled layout recomputation on route/scroll/resize/player changes. Nested marked content is represented by its outer group. Rect objects are refreshed on layout events, never by a getter or the scene loop. The visual owns its falloff response.

UI mode: snapshot.ui is browse, listen or storyboard. The app writer emits ui only on a change; route poses remain the sole stage camera input. Listen uses the existing responsive listening pose, storyboard uses the authored storyboard poses.
