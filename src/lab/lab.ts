// /lab (dev only): replays a mix's visual score through a real bridge
// instance, with transport, state switches, live parameters, a frame-time
// HUD and a timeline strip. Never imported by production pages.
import { createStageBridge, type PlaybackPhase, type RoutePose } from "../lib/stage-bridge";
import { initStage, type StageController, type StageStats } from "../components/stage/runtime";
import { macroEnvelope, routeGroup } from "../components/stage/coupling";
import { PARAM_RANGES, VARIANTS, variantFromString, type SceneParams, type VariantId } from "../components/stage/params";

const SCORE_URL = "/data/roam-mix-2026.score.json";
const AUDIO_URL = "/__local-media/ROAM_MIX_2026.mp3";
const ITEM_ID = "mix:roam-mix-2026";
const ROUTES: RoutePose[] = ["home", "music", "release", "mixes", "mix", "work", "writing", "post", "about", "other"];
const PHASES: (PlaybackPhase | "auto")[] = ["auto", "idle", "loading", "playing", "buffering", "paused", "ended", "error"];

const q = new URLSearchParams(location.search);
const posterMode = q.has("poster");
const writer = createStageBridge();
const state = {
  playing: false,
  pos: Number(q.get("t")) || 0,
  speed: Number(q.get("speed")) || 1,
  duration: 3626.74,
  phase: (q.get("phase") as PlaybackPhase | "auto") || "auto",
  scored: q.get("score") !== "0",
  realAudio: false,
  mock: !posterMode && q.get("mock") !== "0",
};
let controller: StageController | null = null;
let score: { rateHz: number; duration: number; data: Record<string, number[]>; boundaries: number[] } | null = null;
let macro: Float32Array | null = null;
const audio = new Audio();
audio.preload = "none";

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text = "") => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
};

function setItem() {
  writer.item(state.scored ? ITEM_ID : `${ITEM_ID}#unscored`, "mix", state.duration, {
    itemKind: "mix",
    itemId: ITEM_ID,
    durationSec: state.duration,
    peaksUrl: null,
    scoreUrl: state.scored ? SCORE_URL : null,
    boundariesSec: [],
    bpm: null,
    beatStartAtSec: null,
  });
}
function phaseNow(): PlaybackPhase {
  if (state.phase !== "auto") return state.phase;
  if (state.pos >= state.duration) return "ended";
  return state.playing ? "playing" : state.pos > 0 ? "paused" : "idle";
}
function seek(to: number) {
  state.pos = Math.min(state.duration, Math.max(0, to));
  if (state.realAudio) audio.currentTime = state.pos;
  writer.seek(state.pos);
}

// ---- mock page content, so exclusion falloff can be judged in the lab
const mock = el("div", { class: "lab-mock" });
function layoutMock(route: RoutePose) {
  mock.replaceChildren();
  if (!state.mock) return;
  const w = innerWidth,
    small = w < 768;
  const box = (x: number, y: number, bw: number, bh: number, label: string) => {
    const b = el("div", { class: "lab-mock-box", "data-stage-exclude": "" }, label);
    Object.assign(b.style, { left: `${x}px`, top: `${y}px`, width: `${bw}px`, height: `${bh}px` });
    mock.append(b);
  };
  const g = routeGroup(route);
  const left = small ? 16 : Math.max(180, w * 0.14);
  const col = small ? w - 32 : Math.min(760, w * 0.5);
  if (!small) box(32, 120, 120, 200, "rail");
  box(left, small ? 96 : 130, col, small ? 120 : 110, "title");
  if (g === "home") box(left, small ? 236 : 270, col * 0.8, small ? 160 : 150, "intro");
  if (g === "listen") box(left, small ? 236 : 270, small ? col : Math.min(1080, w * 0.62), small ? 380 : 300, "release grid");
  if (g === "mixes") {
    box(left, small ? 236 : 270, small ? col : Math.min(1120, w * 0.64), small ? 300 : 260, "rows + scrubber");
    box(left, small ? 560 : 560, small ? col : Math.min(1120, w * 0.64), small ? 160 : 150, "tracklist");
  }
  if (g === "read") box(left, small ? 236 : 270, col, small ? 480 : 420, "text column");
  box(small ? 8 : left, innerHeight - (small ? 72 : 76), small ? w - 16 : Math.min(1120, w - left - 40), small ? 60 : 56, "player");
  requestAnimationFrame(() => writer.exclusions(Array.from(mock.querySelectorAll("[data-stage-exclude]"))));
}

// ---- timeline strip
const strip = el("canvas", { class: "lab-strip", height: "72" }) as HTMLCanvasElement;
function drawStrip() {
  const ctx = strip.getContext("2d");
  if (!ctx) return;
  const w = (strip.width = strip.clientWidth * devicePixelRatio),
    h = (strip.height = 72 * devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(11,12,14,.85)";
  ctx.fillRect(0, 0, w, h);
  if (score) {
    const bands: [string, string][] = [["energy", "rgba(234,233,229,.7)"], ["low", "rgba(169,197,229,.35)"], ["mid", "rgba(160,128,181,.35)"], ["high", "rgba(234,233,229,.25)"]];
    for (const [band, colour] of bands) {
      const data = score.data[band];
      ctx.strokeStyle = colour;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const v = data[Math.floor((x / w) * (data.length - 1))] / 255;
        const y = h - 4 - v * (h - 8);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    if (macro) {
      ctx.strokeStyle = "#a9c5e5";
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const v = macro[Math.floor((x / w) * (macro.length - 1))];
        const y = h - 4 - v * (h - 8);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "rgba(160,128,181,.9)";
    for (const b of score.boundaries) ctx.fillRect((b / state.duration) * w, 0, devicePixelRatio, h);
  }
  ctx.fillStyle = "#eae9e5";
  ctx.fillRect((state.pos / state.duration) * w - devicePixelRatio, 0, 2 * devicePixelRatio, h);
}
let dragging = false;
const stripSeek = (e: PointerEvent) => seek((e.offsetX / strip.clientWidth) * state.duration);
strip.addEventListener("pointerdown", (e) => {
  dragging = true;
  strip.setPointerCapture(e.pointerId);
  stripSeek(e);
});
strip.addEventListener("pointermove", (e) => dragging && stripSeek(e));
strip.addEventListener("pointerup", () => (dragging = false));

// ---- panel
const hud = el("pre", { class: "lab-hud" });
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
let lastStats: StageStats | null = null;
function onStats(s: StageStats) {
  lastStats = s;
  hud.textContent =
    `${fmt(state.pos)} / ${fmt(state.duration)}  ×${state.speed}  ${phaseNow()}\n` +
    `${s.fps.toFixed(0)} fps  ${s.frameMs.toFixed(1)} ms  q ${s.quality.toFixed(2)}  dpr ${s.dpr}  ${s.tier}\n` +
    `colour ${s.colour.toFixed(2)}  coupling ${s.coupling.toFixed(2)}  breath ${s.breath.toFixed(2)}  arc ${s.arc.toFixed(2)}  rim ×${s.rim.toFixed(3)}`;
}

function select<T extends string>(label: string, options: readonly T[], value: T, on: (v: T) => void) {
  const wrap = el("label", {}, label);
  const s = el("select") as HTMLSelectElement;
  for (const o of options) s.append(el("option", { value: o }, o));
  s.value = value;
  s.addEventListener("change", () => on(s.value as T));
  wrap.append(s);
  return wrap;
}
function toggle(label: string, value: boolean, on: (v: boolean) => void) {
  const wrap = el("label", {}, label);
  const c = el("input", { type: "checkbox" }) as HTMLInputElement;
  c.checked = value;
  c.addEventListener("change", () => on(c.checked));
  wrap.prepend(c);
  return wrap;
}

function buildPanel(root: HTMLElement) {
  const panel = el("aside", { class: "lab-panel" });
  const play = el("button", {}, "Play");
  play.addEventListener("click", () => {
    state.playing = !state.playing;
    play.textContent = state.playing ? "Pause" : "Play";
    if (state.realAudio) state.playing ? void audio.play() : audio.pause();
  });
  const variant = variantFromString(q.get("visual"));
  let reduced = false,
    frozen = false;
  const sliders = el("div", { class: "lab-sliders" });
  const fillSliders = () => {
    sliders.replaceChildren();
    const p = controller?.params();
    if (!p) return;
    for (const key of Object.keys(PARAM_RANGES) as (keyof SceneParams)[]) {
      const [min, max, stepSize] = PARAM_RANGES[key];
      const row = el("label", {}, key);
      const input = el("input", { type: "range", min: String(min), max: String(max), step: String(stepSize) }) as HTMLInputElement;
      const out = el("output", {}, String(p[key]));
      input.value = String(p[key]);
      input.addEventListener("input", () => {
        controller?.setParam(key, Number(input.value));
        out.textContent = input.value;
      });
      row.append(input, out);
      sliders.append(row);
    }
  };
  const pitch = el("p", { class: "lab-pitch" }, VARIANTS[variant].pitch);
  panel.append(
    el("h1", {}, "Stage lab"),
    play,
    select("Speed", ["1", "2", "5", "10", "20"] as const, String(state.speed) as "1", (v) => {
      state.speed = Number(v);
      audio.playbackRate = Math.min(4, state.speed);
    }),
    select("Phase", PHASES, state.phase, (v) => (state.phase = v)),
    select("Route", ROUTES, "home", (v) => {
      writer.route(v);
      layoutMock(v);
    }),
    select("Variant", ["a", "b", "c"] as const, variant, (v: VariantId) => {
      controller?.setVariant(v);
      pitch.textContent = VARIANTS[v].pitch;
      fillSliders();
      const url = new URL(location.href);
      url.searchParams.set("visual", v);
      history.replaceState(null, "", url);
    }),
    pitch,
    toggle("Score available", state.scored, (v) => {
      state.scored = v;
      setItem();
    }),
    toggle("Reduced motion", false, (v) => writer.motion((reduced = v), frozen)),
    toggle("Pause animation", false, (v) => writer.motion(reduced, (frozen = v))),
    toggle("Mock page content", state.mock, (v) => {
      state.mock = v;
      layoutMock(writer.bridge.getSnapshot().route);
    }),
    toggle("Follow real audio (local mix)", false, (v) => {
      state.realAudio = v;
      if (v) {
        audio.src = AUDIO_URL;
        audio.currentTime = state.pos;
        if (state.playing) void audio.play();
      } else audio.pause();
    }),
    (() => {
      const wrap = el("label", {}, "Seed");
      const input = el("input", { type: "number", value: q.get("seed") || "", placeholder: "item hash" }) as HTMLInputElement;
      input.addEventListener("change", () => controller?.setSeed(input.value ? Number(input.value) : null));
      wrap.append(input);
      return wrap;
    })(),
    hud,
    el("h2", {}, "Parameters"),
    sliders,
  );
  root.append(panel, strip, mock);
  return fillSliders;
}

async function main() {
  const root = document.getElementById("lab")!;
  document.body.classList.toggle("is-poster", posterMode);
  writer.position(() => state.pos);
  writer.route((q.get("route") as RoutePose) || (posterMode ? (q.get("poster") as RoutePose) : "home"));
  const fill = posterMode ? () => {} : buildPanel(root);
  setItem();
  void fetch(SCORE_URL)
    .then((r) => r.json())
    .then((s) => {
      score = s;
      state.duration = s.duration;
      macro = macroEnvelope(s.data.energy, s.rateHz);
    })
    .catch(() => {});
  controller = await initStage({
    host: document.getElementById("stage")!,
    bridge: writer.bridge,
    timeScale: () => (state.playing ? state.speed : 1),
    variant: variantFromString(q.get("visual")),
    still: posterMode,
    onFrame: posterMode ? undefined : onStats,
  });
  fill();
  layoutMock(writer.bridge.getSnapshot().route);
  addEventListener("resize", () => layoutMock(writer.bridge.getSnapshot().route));
  if (q.has("play")) state.playing = true;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.realAudio && !audio.paused) state.pos = audio.currentTime;
    else if (state.playing) state.pos = Math.min(state.duration, state.pos + dt * state.speed);
    if (state.pos >= state.duration) state.playing = false;
    writer.transport(phaseNow(), state.pos, state.duration);
    if (!posterMode) drawStrip();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // Hooks for scripted recordings and posters.
  Object.assign(window, { __lab: { state, seek, writer, controller, stats: () => lastStats } });
}
void main();
