export type PlaybackPhase =
  | "idle"
  | "loading"
  | "playing"
  | "buffering"
  | "paused"
  | "ended"
  | "interrupted"
  | "error";
export type RoutePose =
  | "home"
  | "music"
  | "release"
  | "mixes"
  | "mix"
  | "work"
  | "writing"
  | "post"
  | "about"
  | "other";
export type StageEvent =
  "phase" | "route" | "seek" | "itemchange" | "motionprefs";
export interface StageSnapshot {
  phase: PlaybackPhase;
  phaseSince: number;
  positionSec: number;
  durationSec: number | null;
  itemKind: "track" | "mix" | null;
  itemId: string | null;
  route: RoutePose;
  routeSince: number;
  reducedMotion: boolean;
  userPausedAnimation: boolean;
  analysisAvailable: boolean;
}
export interface StageBridge {
  getSnapshot(): StageSnapshot;
  getFeatures(): { energy: number; playing: number };
  getItemMeta(): StageItemMeta | null;
  subscribe(event: StageEvent, cb: (s: StageSnapshot) => void): () => void;
}
export interface StageItemMeta {
  itemKind: "track" | "mix";
  itemId: string;
  durationSec: number | null;
  peaksUrl: string | null;
  boundariesSec: number[];
  bpm: number | null;
  beatStartAtSec: number | null;
}
export function routePose(path: string): RoutePose {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "home";
  const root = parts[0];
  if (root === "music") return parts.length > 1 ? "release" : "music";
  if (root === "mixes") return parts.length > 1 ? "mix" : "mixes";
  if (root === "writing") return parts.length > 1 ? "post" : "writing";
  return root === "work" || root === "about" ? root : "other";
}
// Factory exists for deterministic lifecycle tests. The application exports one
// singleton below; consumers read it and never construct their own bridge.
export function createStageBridge(
  clock: () => number = () => performance.now(),
) {
  const started = clock();
  const snapshot: StageSnapshot = {
    phase: "idle",
    phaseSince: started,
    positionSec: 0,
    durationSec: null,
    itemKind: null,
    itemId: null,
    route: "home",
    routeSince: started,
    reducedMotion: false,
    userPausedAnimation: false,
    analysisAvailable: false,
  };
  const features = { energy: 0, playing: 0 };
  let itemMeta: StageItemMeta | null = null;
  const listeners = new Map<StageEvent, Set<(s: StageSnapshot) => void>>();
  let readPosition: () => number = () => snapshot.positionSec;
  let readEnergy: () => number = () => 0;
  let lastTime = started,
    runningMax = 0.0001;
  const emit = (event: StageEvent) => {
    for (const cb of listeners.get(event) || []) cb(snapshot);
  };
  const bridge: StageBridge = {
    getItemMeta() {
      return itemMeta;
    },
    getSnapshot() {
      const n = readPosition();
      if (Number.isFinite(n)) snapshot.positionSec = Math.max(0, n);
      return snapshot;
    },
    getFeatures() {
      const now = clock(),
        dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.25));
      lastTime = now;
      const target = snapshot.phase === "playing" ? 1 : 0;
      features.playing +=
        (target - features.playing) *
        (1 - Math.exp(-dt / (target ? 1.5 : 2.5)));
      let value = snapshot.analysisAvailable && target ? readEnergy() : 0;
      if (!Number.isFinite(value)) value = 0;
      runningMax = Math.max(
        0.0001,
        value,
        runningMax * Math.exp((-dt * Math.LN2) / 20),
      );
      value = Math.min(1, Math.max(0, value / runningMax));
      features.energy +=
        (value - features.energy) *
        (1 - Math.exp(-dt / (value > features.energy ? 0.08 : 0.6)));
      return features;
    },
    subscribe(event, cb) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb);
      return () => set!.delete(cb);
    },
  };
  return {
    bridge,
    transport(phase: PlaybackPhase, position: number, duration: number | null) {
      snapshot.positionSec = position;
      snapshot.durationSec = duration;
      if (snapshot.phase !== phase) {
        snapshot.phase = phase;
        snapshot.phaseSince = clock();
        emit("phase");
      }
    },
    item(
      id: string,
      kind: "track" | "mix",
      duration: number | null,
      meta?: StageItemMeta,
    ) {
      if (snapshot.itemId === id) return;
      itemMeta = meta || {
        itemKind: kind,
        itemId: id,
        durationSec: duration,
        peaksUrl: null,
        boundariesSec: [],
        bpm: null,
        beatStartAtSec: null,
      };
      snapshot.itemId = id;
      snapshot.itemKind = kind;
      snapshot.positionSec = 0;
      snapshot.durationSec = duration;
      emit("itemchange");
    },
    seek(position: number) {
      snapshot.positionSec = position;
      emit("seek");
    },
    route(route: RoutePose) {
      if (route === snapshot.route) return;
      snapshot.route = route;
      snapshot.routeSince = clock();
      emit("route");
    },
    motion(reduced: boolean, paused: boolean) {
      if (
        reduced === snapshot.reducedMotion &&
        paused === snapshot.userPausedAnimation
      )
        return;
      snapshot.reducedMotion = reduced;
      snapshot.userPausedAnimation = paused;
      emit("motionprefs");
    },
    analysis(available: boolean, reader: () => number) {
      snapshot.analysisAvailable = available;
      readEnergy = reader;
    },
    position(reader: () => number) {
      readPosition = reader;
    },
  };
}
export const stageWriter = createStageBridge();
export const stageBridge: StageBridge = stageWriter.bridge;
let bound = false;
export function bindStageBridge() {
  if (bound) return;
  bound = true;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const motion = () => {
    let paused = false;
    try {
      paused = localStorage.getItem("scene-paused") === "true";
    } catch {}
    stageWriter.motion(reduced.matches, paused);
  };
  const route = () => stageWriter.route(routePose(location.pathname));
  motion();
  route();
  document.addEventListener("astro:after-swap", () => {
    route();
    motion();
  });
  addEventListener("popstate", route);
  reduced.addEventListener("change", motion);
  addEventListener("storage", motion);
  document.addEventListener("click", (event) => {
    if ((event.target as Element).closest(".motion-toggle"))
      queueMicrotask(motion);
  });
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("bridge"))
    void import("./stage-bridge-debug").then((m) =>
      m.mountBridgeDebug(stageBridge),
    );
}
