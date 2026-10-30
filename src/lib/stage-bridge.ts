import {
  validateScore,
  sampleScore,
  scoreBands,
  type VisualScore,
  type ScoreWindow,
} from "./visual-score.ts";
export type PlaybackPhase =
  "idle" | "loading" | "playing" | "buffering" | "paused" | "ended" | "error";
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
  "phase" | "route" | "seek" | "itemchange" | "motionprefs" | "exclusions";
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
  scoreAvailable: boolean;
}
export interface StageBridge {
  getSnapshot(): StageSnapshot;
  getFeatures(): {
    energy: number;
    low: number;
    mid: number;
    high: number;
    playing: number;
  };
  getScoreWindow(fromSec: number, toSec: number): ScoreWindow | null;
  getExclusionRects(): readonly DOMRectReadOnly[];
  getItemMeta(): StageItemMeta | null;
  subscribe(event: StageEvent, cb: (s: StageSnapshot) => void): () => void;
}
export interface StageItemMeta {
  itemKind: "track" | "mix";
  itemId: string;
  durationSec: number | null;
  peaksUrl: string | null;
  scoreUrl: string | null;
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
  loadScore: (url: string) => Promise<unknown> = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Score unavailable");
    return response.json();
  },
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
    scoreAvailable: false,
  };
  const features = { energy: 0, low: 0, mid: 0, high: 0, playing: 0 };
  const scores = new Map<string, Promise<VisualScore | null>>();
  let score: VisualScore | null = null,
    scoreRequest = 0;
  let window: ScoreWindow | null = null;
  const rects: DOMRectReadOnly[] = [];
  let itemMeta: StageItemMeta | null = null;
  const listeners = new Map<StageEvent, Set<(s: StageSnapshot) => void>>();
  let readPosition: () => number = () => snapshot.positionSec;
  let lastTime = started;
  const emit = (event: StageEvent) => {
    for (const cb of listeners.get(event) || []) cb(snapshot);
  };
  const bridge: StageBridge = {
    getExclusionRects() {
      return rects;
    },
    getScoreWindow(fromSec, toSec) {
      if (
        !score ||
        !window ||
        !Number.isFinite(fromSec) ||
        !Number.isFinite(toSec) ||
        toSec < fromSec
      )
        return null;
      const length = score.data.energy.length;
      window.startIndex = Math.min(
        length - 1,
        Math.max(0, Math.floor(fromSec * score.rateHz)),
      );
      window.endIndex = Math.max(
        window.startIndex + 1,
        Math.min(length, Math.ceil(Math.max(0, toSec) * score.rateHz) + 1),
      );
      return window;
    },
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
      const position = bridge.getSnapshot().positionSec;
      for (const band of scoreBands) {
        const value = score ? sampleScore(score, band, position) : 0;
        features[band] = score
          ? features[band] +
            (value - features[band]) *
              (1 - Math.exp(-dt / (value > features[band] ? 0.08 : 0.6)))
          : 0;
      }
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
        scoreUrl: null,
        boundariesSec: [],
        bpm: null,
        beatStartAtSec: null,
      };
      snapshot.itemId = id;
      snapshot.itemKind = kind;
      snapshot.positionSec = 0;
      snapshot.durationSec = duration;
      score = null;
      window = null;
      snapshot.scoreAvailable = false;
      for (const band of scoreBands) features[band] = 0;
      const request = ++scoreRequest,
        url = itemMeta.scoreUrl;
      if (url) {
        let pending = scores.get(url);
        if (!pending) {
          pending = Promise.resolve()
            .then(() => loadScore(url))
            .then(validateScore)
            .catch(() => null);
          scores.set(url, pending);
        }
        void pending.then((value) => {
          if (request !== scoreRequest) return;
          score = value;
          snapshot.scoreAvailable = !!score;
          window = score
            ? {
                rateHz: score.rateHz,
                duration: score.duration,
                startIndex: 0,
                endIndex: 0,
                data: score.data,
                boundaries: score.boundaries,
              }
            : null;
        });
      }
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
    exclusions(elements: readonly Element[]) {
      rects.length = 0;
      for (const element of elements) {
        const r = element.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rects.push(r);
      }
      emit("exclusions");
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
  let scheduled = false;
  const updateExclusions = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const elements = Array.from(
        document.querySelectorAll("[data-stage-exclude]"),
      );
      // Nested marked groups are covered by their outer group.
      stageWriter.exclusions(
        elements.filter(
          (el) => !el.parentElement?.closest("[data-stage-exclude]"),
        ),
      );
    });
  };
  const resize = new ResizeObserver(updateExclusions);
  const observePage = () => {
    mutations.disconnect();
    mutations.observe(document.body, { childList: true, subtree: true });
    resize.disconnect();
    resize.observe(document.body);
    document
      .querySelectorAll("[data-stage-exclude]")
      .forEach((el) => resize.observe(el));
    updateExclusions();
  };
  const mutations = new MutationObserver((records) => {
    if (
      records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches("[data-stage-exclude]") ||
              node.querySelector("[data-stage-exclude]")),
        ),
      )
    )
      observePage();
  });
  mutations.observe(document.body, { childList: true, subtree: true });
  addEventListener("resize", updateExclusions);
  const onLayoutMotionEnd = (event: Event) => {
    if ((event.target as Element).closest?.("[data-stage-exclude]"))
      updateExclusions();
  };
  document.addEventListener("animationend", onLayoutMotionEnd);
  document.addEventListener("transitionend", onLayoutMotionEnd);
  void document.fonts.ready.then(updateExclusions);
  addEventListener("scroll", updateExclusions, {
    passive: true,
    capture: true,
  });
  document.addEventListener("astro:page-load", observePage);
  document.addEventListener("astro:after-swap", observePage);
  observePage();
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
