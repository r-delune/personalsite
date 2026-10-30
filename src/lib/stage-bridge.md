# Stage bridge contract

Import `stageBridge` from `src/lib/stage-bridge.ts`. This is the only app interface the separately owned visual should read. No scene file was changed to adopt it; the existing scene works independently until its owner integrates it.

- `getSnapshot()` returns the same live object on every call. Read values; do not mutate or retain it as historical state. Position comes from the active audio clock. Unknown duration is null. Item IDs are stable Roam track IDs or `mix:<slug>`.
- `phaseSince` and `routeSince` are `performance.now()` timestamps, changed only when their respective enum changes. A new item can keep the same phase while still emitting `itemchange`.
- `getFeatures()` returns one reused object with time-based normalized energy and playing envelopes. It performs no allocation. No per-frame bridge values enter nanostores. A reader samples this each frame; it is independent of whether rendering is paused.
- `phase` reflects media events: selection → loading; confirmed `playing` → playing; waiting after playback → buffering; user pause → paused; natural completion → ended; failed resume/output → interrupted; media failure → error. A pending play promise is never evidence of playing.
- `seek` fires once when a seek requested on the active item commits after metadata is available. Previewing an inactive mix does not write the engine or emit seek. A later explicit Play may change the item then seek it.
- `itemchange` fires only when the engine selects a different item. Global player/keyboard/Media Session actions target this active item, never the page's staged item.
- Route updates on `astro:after-swap` and history traversal. Paths map to home/music/release/mixes/mix/work/writing/post/about/other; query/hash-only navigation does not change pose or timestamps.
- `motionprefs` reflects the OS media query plus persisted `scene-paused`. The existing scene owns its actual pause toggle; the bridge observes it without rewriting scene code. Analysis is false by default on iOS/iPadOS and when setup fails.
- `getItemMeta()` returns the same static metadata object until itemchange: mix peaks URL and confirmed tracklist times, or sanitized manual release section boundaries plus existing BPM/beat-start fields. Unknown data is null/empty; no detected mix boundaries are promoted to confirmed tracklist data. The bridge never fetches peaks or visual score files.
- `subscribe(event, callback)` returns an unsubscribe function. Subscribers receive the reused snapshot. Keep callback work small; exceptions should be handled by their owner.

App-side writers and the deterministic factory are exported for the engine/router and tests, not for visual code. `bindStageBridge()` installs browser listeners once.

Development only: load `/?bridge` to inspect phase, route, position and energy. Add `&noanalysis=1` to force native-output/no-analysis policy before first Play. The debug overlay is imported behind `import.meta.env.DEV`; it is absent from production and static preview bundles. To continue inspecting on another route, navigate to that route with `?bridge` or reload it there.
