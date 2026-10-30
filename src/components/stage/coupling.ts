// Pure, deterministic logic for the background visual: playback-state
// envelopes, the score-driven musical coupling, structure, caps, poses and
// the quality governor. No three.js or DOM here, so it is unit-tested.
import { CAPS, type SceneParams } from "./params.ts";

export type Phase =
  | "idle"
  | "loading"
  | "playing"
  | "buffering"
  | "paused"
  | "ended"
  | "error";

/** Elapsed-time exponential approach (frame-rate independent). */
export function approach(current: number, target: number, dt: number, tau: number) {
  if (tau <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const easeInOut = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

// ---------------------------------------------------------------------------
// Playback-state envelopes (SPEC §8.7 table)

export interface Envelopes {
  /** Palette amount: idleColour at rest → 1 while playing. */
  colour: number;
  /** How much the music drives the scene (0..1). */
  coupling: number;
  /** Loading inhale (0..1): dust slows, rim brightens a touch. */
  inhale: number;
  /** Overall brightness multiplier: 1, ~0.93 while paused. */
  dim: number;
  /** Buffering: musical inputs hold their last values. */
  hold: boolean;
}

export class PhaseEnvelopes implements Envelopes {
  colour: number;
  coupling = 0;
  inhale = 0;
  dim = 1;
  hold = false;
  private idleColour: number;
  constructor(idleColour: number) {
    this.idleColour = idleColour;
    this.colour = idleColour;
  }
  setIdleColour(value: number) {
    this.idleColour = value;
  }
  /** Jump to the resting state (reduced motion, poster frames). */
  rest() {
    this.colour = this.idleColour;
    this.coupling = 0;
    this.inhale = 0;
    this.dim = 1;
    this.hold = false;
  }
  /** `age` is seconds since the phase began. */
  step(dt: number, phase: Phase, age: number) {
    const idle = this.idleColour;
    this.hold = phase === "buffering";
    switch (phase) {
      case "playing":
        // Blooms in over ~3 s.
        this.colour = approach(this.colour, 1, dt, 1);
        this.coupling = approach(this.coupling, 1, dt, 0.8);
        this.inhale = approach(this.inhale, 0, dt, 0.6);
        this.dim = approach(this.dim, 1, dt, 0.8);
        break;
      case "buffering":
        // Hold coupling and colour where they are; idle drift continues.
        break;
      case "loading": {
        const target = age < 3 ? 1 : 0;
        this.inhale = approach(this.inhale, target, dt, 0.6);
        this.dim = approach(this.dim, 1, dt, 0.8);
        break;
      }
      case "paused":
        // Exhale over ~2.5 s into a held, slightly dimmer state; colour
        // recedes over 4–6 s.
        this.coupling = approach(this.coupling, 0, dt, 0.8);
        this.colour = approach(this.colour, idle, dt, 1.6);
        this.inhale = approach(this.inhale, 0, dt, 0.6);
        this.dim = approach(this.dim, 0.93, dt, 0.8);
        break;
      default:
        // idle, ended, error: settle to idle over 4–6 s.
        this.coupling = approach(this.coupling, 0, dt, phase === "ended" ? 1.4 : 1);
        this.colour = approach(this.colour, idle, dt, 1.6);
        this.inhale = approach(this.inhale, 0, dt, 0.6);
        this.dim = approach(this.dim, 1, dt, 1.4);
    }
  }
  /** True while any envelope is still visibly moving. */
  settling(phase: Phase) {
    const colourTarget = phase === "playing" ? 1 : this.idleColour;
    return (
      Math.abs(this.colour - colourTarget) > 0.004 ||
      (phase !== "playing" && this.coupling > 0.004) ||
      this.inhale > 0.004 ||
      Math.abs(this.dim - (phase === "paused" ? 0.93 : 1)) > 0.002
    );
  }
}

// ---------------------------------------------------------------------------
// Macro arc: a 90 s energy envelope over the whole item, normalised per mix

/**
 * Builds a 1 Hz envelope from byte energy samples. Centred moving average
 * over `windowSec`, then normalised between the 10th and 90th percentile so
 * every mix uses the full sparse → peak range.
 */
export function macroEnvelope(
  energy: readonly number[],
  rateHz: number,
  windowSec = 90,
): Float32Array {
  const seconds = Math.max(1, Math.ceil(energy.length / rateHz));
  const perSecond = new Float64Array(seconds);
  const counts = new Float64Array(seconds);
  for (let i = 0; i < energy.length; i++) {
    const s = Math.min(seconds - 1, Math.floor(i / rateHz));
    perSecond[s] += energy[i];
    counts[s]++;
  }
  for (let s = 0; s < seconds; s++) perSecond[s] /= Math.max(1, counts[s]) * 255;
  const prefix = new Float64Array(seconds + 1);
  for (let s = 0; s < seconds; s++) prefix[s + 1] = prefix[s] + perSecond[s];
  const half = Math.floor(windowSec / 2);
  const out = new Float32Array(seconds);
  for (let s = 0; s < seconds; s++) {
    const a = Math.max(0, s - half),
      b = Math.min(seconds, s + half + 1);
    out[s] = (prefix[b] - prefix[a]) / (b - a);
  }
  const sorted = Array.from(out).sort((x, y) => x - y);
  const lo = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const hi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? 1;
  const span = Math.max(1e-6, hi - lo);
  for (let s = 0; s < seconds; s++)
    out[s] = Math.min(1, Math.max(0, (out[s] - lo) / span));
  return out;
}

/** Linear sample of a 1 Hz envelope (clamped at the ends). */
export function sampleEnvelope(env: Float32Array, sec: number) {
  if (!env.length) return 0;
  const x = Math.min(env.length - 1, Math.max(0, Number.isFinite(sec) ? sec : 0));
  const i = Math.floor(x),
    f = x - i;
  return env[i] + ((env[i + 1] ?? env[i]) - env[i]) * f;
}

/** Look ahead so builds are led, not lagged (2–8 s window; default 5 s). */
export const ARC_LOOKAHEAD_SEC = 5;

// ---------------------------------------------------------------------------
// Structure

/**
 * Boundary priority: tracklist `at` / release `section_times` (both arrive as
 * item meta boundariesSec) → detected score boundaries → none. Meta wins when
 * it has at least one boundary after the start.
 */
export function activeBoundaries(
  metaBoundaries: readonly number[] | null | undefined,
  scoreBoundaries: readonly number[] | null | undefined,
): number[] {
  const clean = (list: readonly number[] | null | undefined) =>
    (list || [])
      .filter((t) => Number.isFinite(t) && t > 0.5)
      .slice()
      .sort((a, b) => a - b);
  const meta = clean(metaBoundaries);
  return meta.length ? meta : clean(scoreBoundaries);
}

/**
 * The boundary crossed by forward playback between two positions, or null.
 * A jump larger than `maxStep` is a seek, which never fires a ripple.
 */
export function crossedBoundary(
  boundaries: readonly number[],
  previous: number,
  now: number,
  maxStep: number,
): number | null {
  if (!(now > previous) || now - previous > maxStep) return null;
  for (const b of boundaries) if (b > previous && b <= now) return b;
  return null;
}

export function sectionAt(boundaries: readonly number[], position: number, duration: number) {
  let index = 0,
    start = 0;
  for (const b of boundaries) {
    if (b <= position) {
      index++;
      start = b;
    } else break;
  }
  const end = boundaries[index] ?? duration ?? start + 240;
  return { index, start, end, length: Math.max(1, end - start) };
}

/** Section transitions ease over min(0.35 × section length, 6 s). */
export const sectionEaseSeconds = (sectionLength: number) =>
  Math.min(0.35 * Math.max(0, sectionLength), 6);

// ---------------------------------------------------------------------------
// Determinism

export function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable pseudo-random value in [0, 1) for (seed, n). */
export function seeded(seed: number, n: number) {
  let x = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export const DEFAULT_SEED = 19;

// ---------------------------------------------------------------------------
// Caps: every audio-driven change is bounded relative to the idle baseline

export interface Gains {
  drift: number;
  rim: number;
  sparkle: number;
  atmosphere: number;
  density: number;
  edge: number;
}

/**
 * breath/arc/high/low are already multiplied by the coupling envelope.
 * `playing` is the coupling envelope itself (0..1).
 */
export function musicalGains(
  p: SceneParams,
  input: { breath: number; arc: number; high: number; low: number; playing: number },
  atmosphereCap: number = CAPS.atmosphere,
): Gains {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const breath = c(input.breath),
    arc = c(input.arc),
    high = c(input.high),
    low = c(input.low),
    playing = c(input.playing);
  return {
    drift: 1 + Math.min(CAPS.drift, p.breathDrift * breath),
    rim: 1 + Math.min(CAPS.rim, p.breathRim * breath + p.arcRim * arc + p.lowRim * low),
    sparkle: 1 + Math.min(CAPS.sparkle, 0.06 * playing + p.highSparkle * high),
    atmosphere: 1 + Math.min(atmosphereCap, p.arcAtmo * arc),
    density: 1 + Math.min(CAPS.density, p.arcDensity * arc) - CAPS.density,
    edge: p.highEdge * high,
  };
}

/** Ripple brightness shares the rim budget: total never exceeds +15%. */
export const rippleBudget = (rimGain: number) =>
  Math.max(0, 1 + CAPS.rim - rimGain);

// ---------------------------------------------------------------------------
// Route poses

export type RouteGroup = "home" | "listen" | "mixes" | "read";
export interface Pose {
  /** Planet centre x in half-height units (screen half-width = aspect). */
  cx: number;
  cy: number;
  /** Radius in half-height units. */
  r: number;
  /** 1 = full presence; lower calms motion and brightness. */
  calm: number;
}

export function routeGroup(route: string): RouteGroup {
  if (route === "home") return "home";
  if (route === "music" || route === "release") return "listen";
  if (route === "mixes" || route === "mix") return "mixes";
  return "read";
}

type PoseSpec = { ax: number; bx: number; cy: number; r: number; calm: number };
const POSES: Record<"desktop" | "tablet" | "mobile", Record<RouteGroup, PoseSpec>> = {
  // Content sits in a left column (rail + ≤1120px main); the planet lives
  // bottom-right and pulls away for reading.
  desktop: {
    home: { ax: 0.8, bx: 0.06, cy: -1.0, r: 1.38, calm: 1 },
    listen: { ax: 0.92, bx: 0.04, cy: -1.24, r: 1.26, calm: 0.92 },
    mixes: { ax: 0.98, bx: 0.02, cy: -1.62, r: 1.22, calm: 0.85 },
    read: { ax: 1.04, bx: 0.02, cy: -1.36, r: 1.08, calm: 0.75 },
  },
  tablet: {
    home: { ax: 0.86, bx: 0.08, cy: -1.12, r: 1.15, calm: 1 },
    listen: { ax: 0.98, bx: 0.06, cy: -1.32, r: 1.06, calm: 0.92 },
    mixes: { ax: 1.0, bx: 0.04, cy: -1.55, r: 1.06, calm: 0.85 },
    read: { ax: 1.08, bx: 0.04, cy: -1.42, r: 0.92, calm: 0.75 },
  },
  mobile: {
    home: { ax: 0.92, bx: 0.04, cy: -1.28, r: 0.86, calm: 1 },
    listen: { ax: 1.08, bx: 0.02, cy: -1.48, r: 0.8, calm: 0.92 },
    mixes: { ax: 1.12, bx: 0, cy: -1.66, r: 0.82, calm: 0.85 },
    read: { ax: 1.2, bx: 0, cy: -1.62, r: 0.74, calm: 0.75 },
  },
};

export function breakpoint(aspect: number) {
  return aspect < 0.75 ? "mobile" : aspect < 1.25 ? "tablet" : "desktop";
}

export function poseFor(route: string, aspect: number, out?: Pose): Pose {
  const spec = POSES[breakpoint(aspect)][routeGroup(route)];
  const pose = out || { cx: 0, cy: 0, r: 1, calm: 1 };
  pose.cx = aspect * spec.ax + spec.bx;
  pose.cy = spec.cy;
  pose.r = spec.r;
  pose.calm = spec.calm;
  return pose;
}

export function mixPose(a: Pose, b: Pose, t: number, out: Pose) {
  out.cx = a.cx + (b.cx - a.cx) * t;
  out.cy = a.cy + (b.cy - a.cy) * t;
  out.r = a.r + (b.r - a.r) * t;
  out.calm = a.calm + (b.calm - a.calm) * t;
  return out;
}

export const POSE_MOVE_SECONDS = 0.9;

// ---------------------------------------------------------------------------
// Quality governor (frame-local only: draw count and DPR)

export class QualityGovernor {
  quality = 1;
  ema = 0;
  private budgetMs: number;
  private floor: number;
  constructor(budgetMs = 1000 / 55, floor = 0.55) {
    this.budgetMs = budgetMs;
    this.floor = floor;
  }
  reset() {
    this.ema = 0;
  }
  /** Feed one frame time while in the playing tier. */
  sample(frameMs: number, dt: number) {
    const ms = Math.min(250, Math.max(0, frameMs));
    this.ema = this.ema ? this.ema + (ms - this.ema) * 0.08 : ms;
    const over = this.ema / this.budgetMs;
    if (over > 1.08) {
      // Drop fast.
      const target = Math.max(this.floor, this.quality / over);
      this.quality = approach(this.quality, target, dt, 1 / 1.6);
    } else if (over < 0.8) {
      // Recover slowly (~10 s) and only with clear headroom: no oscillation.
      this.quality = approach(this.quality, 1, dt, 10);
    }
    this.quality = Math.min(1, Math.max(this.floor, this.quality));
    return this.quality;
  }
  /** DPR in 0.25 steps so resizes are rare. */
  dpr(baseDpr: number) {
    const scaled = baseDpr * (0.7 + 0.3 * ((this.quality - this.floor) / (1 - this.floor)));
    return Math.max(1, Math.round(scaled * 4) / 4);
  }
}

// ---------------------------------------------------------------------------
// Tonight's moon: the lit fraction follows the real lunar phase (D-057)

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** 0 = new, 0.5 = full, in [0, 1). */
export function lunarPhase(date: Date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  return (((days / SYNODIC_DAYS) % 1) + 1) % 1;
}

/** Default sun depth (posters, reduced motion before the phase eases in). */
export const DEFAULT_LIGHT_Z = 0.3;

/**
 * Sun depth for a phase: a thin backlit crescent at new moon to a broad
 * gibbous at full. The sun always stays upper right, so the side nearest the
 * content column is never the bright one.
 */
export function moonLightZ(phase: number) {
  return 0.15 + 0.4 * -Math.cos(phase * Math.PI * 2);
}
