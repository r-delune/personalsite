// Hosts the one background scene. Reads the app only through the stage
// bridge (D-042). Owns frame tiers, the quality governor, route poses,
// exclusion zones, motion settings, context loss and the poster swap.
import type { StageBridge, StageSnapshot } from "../../lib/stage-bridge";
import {
  ARC_LOOKAHEAD_SEC,
  DEFAULT_SEED,
  PhaseEnvelopes,
  POSE_MOVE_SECONDS,
  QualityGovernor,
  activeBoundaries,
  approach,
  crossedBoundary,
  easeInOut,
  hashString,
  lunarPhase,
  moonLightZ,
  DEFAULT_LIGHT_Z,
  macroEnvelope,
  mixPose,
  musicalGains,
  poseFor,
  rippleBudget,
  sampleEnvelope,
  sectionAt,
  sectionEaseSeconds,
  seeded,
  type Phase,
  type Pose,
} from "./coupling.ts";
import { VARIANTS, variantFromString, type SceneParams, type VariantId } from "./params.ts";
import { MAX_EXCLUSIONS, type BuiltScene } from "./scene.ts";

export interface StageOptions {
  host?: HTMLElement;
  bridge?: StageBridge;
  /** Lab transport speed: scales musical smoothing so ×10 replays track. */
  timeScale?: () => number;
  variant?: VariantId;
  seed?: number;
  /** Render a single still at idle (poster generation). */
  still?: boolean;
  onFrame?: (stats: StageStats) => void;
}
export interface StageStats {
  fps: number;
  frameMs: number;
  quality: number;
  dpr: number;
  tier: "active" | "idle" | "still" | "frozen";
  colour: number;
  coupling: number;
  breath: number;
  arc: number;
  rim: number;
  /** Seconds into the current ripple, or -1. */
  ripple: number;
  frames: number;
}
export interface StageController {
  setVariant(v: VariantId): void;
  setParam<K extends keyof SceneParams>(key: K, value: SceneParams[K]): void;
  params(): SceneParams;
  setSeed(seed: number | null): void;
  renderNow(): void;
  destroy(): void;
}

let active: Promise<StageController | null> | null = null;

export function initStage(options: StageOptions = {}) {
  active ||= start(options);
  return active;
}

async function start(options: StageOptions): Promise<StageController | null> {
  const host = options.host || document.querySelector<HTMLElement>("#stage");
  const canvas = host?.querySelector<HTMLCanvasElement>("canvas");
  if (!host || !canvas) return null;
  const bridge = options.bridge || (await import("../../lib/stage-bridge")).stageBridge;
  const query = new URLSearchParams(location.search);
  let variant: VariantId =
    options.variant ||
    (import.meta.env.DEV ? variantFromString(query.get("visual")) : "a");
  let params: SceneParams = { ...VARIANTS[variant].params };
  const timeScale = options.timeScale || (() => 1);

  let built: BuiltScene;
  let renderer: import("three").WebGLRenderer;
  const mobile = matchMedia("(max-width: 767px)").matches;
  try {
    const three = await import("three");
    const { buildScene } = await import("./scene.ts");
    renderer = new three.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: !!options.still,
    });
    renderer.outputColorSpace = three.SRGBColorSpace;
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.autoClear = false;
    built = buildScene(renderer, { mobile, seed: DEFAULT_SEED });
  } catch (error) {
    host.dataset.renderer = "poster";
    console.warn("Ambient scene using static fallback.", error);
    return null;
  }
  const u = built.uniforms;
  const baseDpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
  const governor = new QualityGovernor();
  const env = new PhaseEnvelopes(params.idleColour);

  // ---- state
  let width = 0,
    height = 0,
    dpr = baseDpr;
  let frame = 0,
    previous = 0,
    lastRender = 0,
    frames = 0,
    destroyed = false;
  let spin = 0,
    drift = 0,
    twinkle = 0,
    disturb = 0;
  let breath = 0,
    arc = 0,
    high = 0,
    low = 0,
    seekBoost = 0;
  let macro: Float32Array | null = null;
  let macroFor: string | null = null;
  let boundaries: number[] = [];
  let lastPos = 0;
  let rippleAge = -1;
  let rippleSeed = 0;
  let orbit = 0;
  let seedOverride: number | null = import.meta.env.DEV && query.has("seed") ? Number(query.get("seed")) || 0 : options.seed ?? null;
  const seedPhase = { x: 0, y: 0, z: 0 };
  const seedTarget = { x: 0, y: 0, z: 0 };
  let lightJitter = 0,
    lightTarget = 0;
  let sectionIndex = -1,
    sectionTau = 2;
  const poseFrom: Pose = { cx: 0, cy: 0, r: 1, calm: 1 };
  const poseTo: Pose = { cx: 0, cy: 0, r: 1, calm: 1 };
  const pose: Pose = { cx: 0, cy: 0, r: 1, calm: 1 };
  let poseStart = -1;
  let poseRoute = bridge.getSnapshot().route;
  // Tonight's moon eases in after the poster swap (lab: ?moon=0..1).
  const moonOverride = import.meta.env.DEV && query.has("moon") ? Number(query.get("moon")) : null;
  const moonTarget = moonLightZ(moonOverride ?? lunarPhase(new Date()));
  let lightZ = DEFAULT_LIGHT_Z;
  // Pointer parallax: desktop with a fine pointer only, never when frozen
  // or in reduced motion.
  const fine = matchMedia("(pointer: fine)");
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (event: PointerEvent) => {
    if (!fine.matches || options.still) return;
    parallax.tx = (event.clientX / Math.max(1, innerWidth)) * 2 - 1;
    parallax.ty = (event.clientY / Math.max(1, innerHeight)) * 2 - 1;
    schedule();
  };
  addEventListener("pointermove", onPointer, { passive: true });
  let fpsEma = 0,
    msEma = 0;

  const applySeed = (id: string | null) => {
    const seed = seedOverride ?? (id ? hashString(id) : DEFAULT_SEED);
    seedTarget.x = (seeded(seed, 1) - 0.5) * 6;
    seedTarget.y = (seeded(seed, 2) - 0.5) * 6;
    seedTarget.z = (seeded(seed, 3) - 0.5) * 6;
    rippleSeed = seed;
  };
  applySeed(bridge.getSnapshot().itemId);
  Object.assign(seedPhase, seedTarget);

  const applyParams = () => {
    u.uSurfaceAlpha.value = params.surfaceAlpha;
    u.uRimAlpha.value = params.rimAlpha;
    u.uAtmoIntensity.value = params.atmoIntensity;
    u.uDustAlpha.value = params.dustAlpha;
    u.uRingAlpha.value = params.ringAlpha;
    u.uRipple.value.w = params.rippleSeconds;
    built.composite.uniforms.uGrain.value = params.grain;
    built.composite.uniforms.uVignette.value = params.vignette;
    built.composite.uniforms.uExposure.value = params.exposure;
    env.setIdleColour(params.idleColour);
  };
  applyParams();

  const snapPose = (route: string) => {
    poseFor(route, width / Math.max(1, height), poseTo);
    Object.assign(pose, poseTo);
    Object.assign(poseFrom, poseTo);
    poseStart = -1;
    poseRoute = route as StageSnapshot["route"];
  };
  const glideTo = (route: string, now: number) => {
    Object.assign(poseFrom, pose);
    poseFor(route, width / Math.max(1, height), poseTo);
    poseStart = now;
    poseRoute = route as StageSnapshot["route"];
  };

  const resize = () => {
    width = Math.max(1, innerWidth);
    height = Math.max(1, innerHeight);
    dpr = governor.dpr(baseDpr);
    built.setSize(width, height, dpr);
    snapPose(poseRoute);
    updateExclusions();
    renderNow();
  };

  const updateExclusions = () => {
    const rects = bridge.getExclusionRects();
    const slots = u.uExcl.value;
    let n = 0;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (n < MAX_EXCLUSIONS - 1 || rects.length <= MAX_EXCLUSIONS) {
        slots[n++].set(r.left, r.top, r.right, r.bottom);
      } else {
        // Merge the overflow into one bounding box in the last slot.
        const last = slots[MAX_EXCLUSIONS - 1];
        if (n === MAX_EXCLUSIONS - 1) {
          last.set(r.left, r.top, r.right, r.bottom);
          n++;
        } else
          last.set(
            Math.min(last.x, r.left),
            Math.min(last.y, r.top),
            Math.max(last.z, r.right),
            Math.max(last.w, r.bottom),
          );
      }
    }
    u.uExclCount.value = n;
  };

  const ensureMacro = (snap: StageSnapshot) => {
    if (!snap.scoreAvailable || !snap.itemId) {
      macro = null;
      macroFor = null;
      boundaries = activeBoundaries(bridge.getItemMeta()?.boundariesSec, null);
      return;
    }
    if (macroFor === snap.itemId) return;
    const window = bridge.getScoreWindow(0, 1);
    if (!window) return;
    macro = macroEnvelope(window.data.energy, window.rateHz);
    macroFor = snap.itemId;
    boundaries = activeBoundaries(bridge.getItemMeta()?.boundariesSec, window.boundaries);
  };

  const frozen = () => bridge.getSnapshot().userPausedAnimation;
  const reduced = () => bridge.getSnapshot().reducedMotion || !!options.still;

  function step(now: number, dt: number) {
    const snap = bridge.getSnapshot();
    const features = bridge.getFeatures();
    const phase = snap.phase as Phase;
    const sim = dt * Math.max(1, timeScale());
    ensureMacro(snap);

    env.step(dt, phase, Math.max(0, (now - snap.phaseSince) / 1000));

    // ---- musical inputs (score-driven; identical on every device)
    if (!env.hold) {
      const scored = snap.scoreAvailable && !!macro;
      const pos = snap.positionSec;
      const tau = seekBoost > 0 ? 0.4 : 1;
      breath = approach(breath, scored ? features.energy : 0, sim, 1.5 * tau);
      arc = approach(arc, scored && macro ? sampleEnvelope(macro, pos + ARC_LOOKAHEAD_SEC) : 0, sim, 1.5 * tau);
      high = approach(high, scored ? features.high : 0, sim, 0.8);
      low = approach(low, scored ? features.low : 0, sim, 1.2);
      if (phase === "playing") {
        const hit = crossedBoundary(boundaries, lastPos, pos, 0.75 + sim * 1.5);
        if (hit !== null) {
          rippleAge = 0;
          // Start where the limb is on screen and travel across it.
          const toScreen = Math.atan2(-pose.cy, -pose.cx);
          u.uRipple.value.y = toScreen - 1.1 + (seeded(rippleSeed, Math.round(hit)) - 0.5) * 0.4;
        }
      }
      // structure owns the arc: each section gets a seeded light angle,
      // eased over min(0.35 × section, 6 s)
      const section = sectionAt(boundaries, pos, snap.durationSec ?? 0);
      if (section.index !== sectionIndex) {
        sectionIndex = section.index;
        sectionTau = Math.max(0.3, sectionEaseSeconds(section.length) / 3);
        lightTarget = (seeded(rippleSeed, 100 + section.index) - 0.5) * 0.3;
      }
      // variant B: ring orbit follows progress through the item
      const progress = snap.durationSec ? Math.min(1, pos / snap.durationSec) : 0;
      orbit = approach(orbit, progress * params.ringTurnsPerItem * Math.PI * 2, sim, seekBoost > 0 ? 0.45 : 1.2);
      lastPos = pos;
    }
    seekBoost = Math.max(0, seekBoost - dt);
    lightJitter = approach(lightJitter, lightTarget, sim, sectionTau);

    const c = env.coupling;
    const gains = musicalGains(
      params,
      { breath: breath * c, arc: arc * c, high: high * c, low: low * c, playing: c },
      VARIANTS[variant].atmosphereCap,
    );

    // ---- pose (route camera move, ease-in-out)
    if (snap.route !== poseRoute) glideTo(snap.route, now);
    if (poseStart >= 0) {
      const t = (now - poseStart) / 1000 / POSE_MOVE_SECONDS;
      mixPose(poseFrom, poseTo, easeInOut(t), pose);
      if (t >= 1) poseStart = -1;
    }

    // ---- integrated phases: speed changes never jump
    const motion = (1 - 0.15 * env.inhale) * (0.72 + 0.28 * pose.calm);
    drift += dt * params.driftSpeed * gains.drift * motion;
    spin += dt * params.spinSpeed * motion;
    twinkle += dt * 1.1;
    disturb = approach(disturb, 0, dt, 0.6);
    if (rippleAge >= 0) {
      rippleAge += dt;
      if (rippleAge > params.rippleSeconds) rippleAge = -1;
    }
    seedPhase.x = approach(seedPhase.x, seedTarget.x, dt, 1);
    seedPhase.y = approach(seedPhase.y, seedTarget.y, dt, 1);
    seedPhase.z = approach(seedPhase.z, seedTarget.z, dt, 1);

    // ---- uniforms
    u.uCenter.value.set(pose.cx, pose.cy);
    u.uRadius.value = pose.r;
    u.uCalm.value = pose.calm;
    u.uMotion.value = pose.calm;
    u.uSpin.value = spin;
    u.uDrift.value = drift;
    u.uTwinkle.value = twinkle;
    u.uDisturb.value = disturb;
    u.uRimGain.value = gains.rim * (1 + 0.04 * env.inhale);
    u.uDensity.value = gains.density;
    u.uSparkle.value = params.sparkle * gains.sparkle;
    u.uAtmoThick.value = params.atmoThickness * gains.atmosphere;
    u.uEdge.value = gains.edge;
    u.uColour.value = env.colour;
    u.uDim.value = env.dim;
    u.uOrbit.value = orbit;
    u.uRipple.value.x = rippleAge;
    u.uRipple.value.z = rippleAge >= 0 ? params.rippleStrength : 0;
    // Ripple brightness only spends what is left of the +15% rim cap.
    u.uRippleLight.value = Math.min(1, rippleBudget(gains.rim) / 0.12);
    u.uSeedPhase.value.set(seedPhase.x, seedPhase.y, seedPhase.z);
    // Sun upper right, slightly behind: a terminator crosses the visible limb
    // and the side nearest the content stays dark.
    const la = Math.atan2(0.68, 0.5) + lightJitter;
    if (!reduced()) lightZ = approach(lightZ, moonTarget, dt, 2);
    const xy = Math.sqrt(1 - lightZ * lightZ);
    u.uLightDir.value.set(Math.cos(la) * xy, Math.sin(la) * xy, lightZ);
    // ~8 px of depth at the near layer, ~2 px on the planet
    parallax.x = approach(parallax.x, parallax.tx, dt, 0.9);
    parallax.y = approach(parallax.y, parallax.ty, dt, 0.9);
    const unit = 2 / Math.max(1, height);
    u.uParallax.value.set(-parallax.x * 6 * unit * pose.calm, parallax.y * 6 * unit * pose.calm);
    built.composite.uniforms.uTime.value = now / 1000;

    stats.colour = env.colour;
    stats.coupling = c;
    stats.breath = breath;
    stats.arc = arc;
    stats.rim = gains.rim;
    stats.ripple = rippleAge;
    return (
      phase === "playing" ||
      poseStart >= 0 ||
      rippleAge >= 0 ||
      disturb > 0.01 ||
      Math.abs(lightZ - moonTarget) > 0.002 ||
      Math.abs(parallax.x - parallax.tx) + Math.abs(parallax.y - parallax.ty) > 0.004 ||
      env.settling(phase) ||
      seekBoost > 0
    );
  }

  const stats: StageStats = {
    fps: 0,
    frameMs: 0,
    quality: 1,
    dpr,
    tier: "idle",
    colour: 0,
    coupling: 0,
    breath: 0,
    arc: 0,
    rim: 1,
    ripple: -1,
    frames: 0,
  };

  function draw() {
    built.render();
    frames++;
    host!.dataset.frames = String(frames);
    stats.frames = frames;
  }

  /** Still frame: idle state, current route pose, no coupling. */
  function renderNow() {
    if (destroyed) return;
    if (reduced()) {
      env.rest();
      breath = arc = high = low = 0;
      rippleAge = -1;
      snapPose(bridge.getSnapshot().route);
      step(performance.now(), 0);
      stats.tier = "still";
    }
    draw();
    options.onFrame?.(stats);
  }

  function loop(now: number) {
    frame = 0;
    if (destroyed || document.hidden) {
      previous = 0;
      return;
    }
    if (frozen() || reduced()) {
      stats.tier = frozen() ? "frozen" : "still";
      previous = 0;
      return;
    }
    // Clamp dt after tab restore.
    const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
    previous = now;
    const isActive = step(now, dt) || !!options.onFrame;
    const due = isActive || now - lastRender >= 1000 / 20 - 2;
    if (due) {
      const frameMs = lastRender ? now - lastRender : 16.7;
      lastRender = now;
      if (isActive && bridge.getSnapshot().phase === "playing") {
        governor.sample(frameMs, dt);
        built.setQuality(governor.quality);
        const next = governor.dpr(baseDpr);
        if (next !== dpr) {
          dpr = next;
          built.setSize(width, height, dpr);
        }
      }
      msEma = msEma ? msEma + (frameMs - msEma) * 0.08 : frameMs;
      fpsEma = 1000 / Math.max(1, msEma);
      stats.fps = fpsEma;
      stats.frameMs = msEma;
      stats.quality = governor.quality;
      stats.dpr = dpr;
      stats.tier = isActive ? "active" : "idle";
      draw();
      options.onFrame?.(stats);
    }
    frame = requestAnimationFrame(loop);
  }

  function schedule() {
    if (!frame && !document.hidden && !destroyed && !frozen() && !reduced()) {
      previous = 0;
      frame = requestAnimationFrame(loop);
    }
  }

  // ---- bridge events
  const unsubscribe = [
    bridge.subscribe("phase", () => schedule()),
    bridge.subscribe("seek", (s) => {
      seekBoost = 1.3;
      disturb = Math.max(disturb, 0.6);
      lastPos = s.positionSec;
      if (reduced()) renderNow();
      schedule();
    }),
    bridge.subscribe("itemchange", (s) => {
      applySeed(s.itemId);
      sectionIndex = -1;
      macroFor = null;
      lastPos = 0;
      rippleAge = -1;
      schedule();
    }),
    bridge.subscribe("route", (s) => {
      // Paused animation: never move the scene; apply the pose on resume.
      if (frozen()) return;
      if (reduced()) snapPose(s.route);
      else glideTo(s.route, performance.now());
      if (reduced()) renderNow();
      schedule();
    }),
    bridge.subscribe("motionprefs", (s) => {
      controls();
      if (!s.userPausedAnimation && !s.reducedMotion && s.route !== poseRoute)
        glideTo(s.route, performance.now());
      if (s.reducedMotion) renderNow();
      schedule();
    }),
    bridge.subscribe("exclusions", () => {
      updateExclusions();
      if (frozen() || reduced()) renderNow();
    }),
  ];

  // Footer/menu toggle labels (the bridge owns the persisted preference).
  const controls = () => {
    const s = bridge.getSnapshot();
    document.querySelectorAll<HTMLButtonElement>(".motion-toggle").forEach((button) => {
      button.setAttribute("aria-pressed", String(s.userPausedAnimation));
      const label = button.querySelector(".motion-label");
      const text = s.reducedMotion
        ? "Reduced motion"
        : s.userPausedAnimation
          ? "Resume animation"
          : "Pause animation";
      if (label) label.textContent = text;
      else button.textContent = text;
      button.disabled = s.reducedMotion;
    });
  };
  const onToggle = (event: Event) => {
    if (!(event.target as Element).closest?.(".motion-toggle")) return;
    if (bridge.getSnapshot().reducedMotion) return;
    try {
      const next = localStorage.getItem("scene-paused") !== "true";
      localStorage.setItem("scene-paused", String(next));
    } catch {}
    // The bridge reads the preference in a microtask and emits motionprefs.
  };
  document.addEventListener("click", onToggle, true);
  document.addEventListener("astro:page-load", controls);
  controls();

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    } else {
      governor.reset();
      schedule();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  addEventListener("resize", resize);
  const onLost = (event: Event) => {
    event.preventDefault();
    host.classList.remove("is-ready");
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const onRestored = () => {
    resize();
    host.classList.add("is-ready");
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  // ---- first frame: warm shaders, render, then swap the poster
  width = Math.max(1, innerWidth);
  height = Math.max(1, innerHeight);
  built.setSize(width, height, dpr);
  snapPose(bridge.getSnapshot().route);
  updateExclusions();
  built.setQuality(1);
  try {
    built.compile();
  } catch {}
  step(performance.now(), 0);
  if (reduced()) renderNow();
  else draw();
  requestAnimationFrame(() => {
    host.classList.add("is-ready");
    host.dataset.renderer = "webgl";
    host.dataset.variant = variant;
    (window as unknown as { __stageReady?: boolean }).__stageReady = true;
  });
  schedule();

  return {
    setVariant(v) {
      variant = v;
      params = { ...VARIANTS[v].params };
      applyParams();
      host.dataset.variant = v;
      renderNow();
      schedule();
    },
    setParam(key, value) {
      params[key] = value;
      applyParams();
      if (frozen() || reduced()) renderNow();
    },
    params: () => params,
    setSeed(seed) {
      seedOverride = seed;
      applySeed(bridge.getSnapshot().itemId);
      schedule();
    },
    renderNow,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      unsubscribe.forEach((off) => off());
      document.removeEventListener("click", onToggle, true);
      document.removeEventListener("astro:page-load", controls);
      document.removeEventListener("visibilitychange", onVisibility);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      built.dispose();
      renderer.dispose();
      active = null;
    },
  };
}
