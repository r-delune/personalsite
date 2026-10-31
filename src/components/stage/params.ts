// Scene parameters, variants and the locked response caps (SPEC §8.4).
// Pure data: no three.js, no DOM. Shared by the runtime, the lab and tests.

export const MAX_EXCLUSIONS = 12;

export type VariantId = "a" | "b" | "c";

export interface SceneParams {
  /** Dust orbit speed at rest (radians of drift phase per second). */
  driftSpeed: number;
  /** Planet spin at rest (radians per second). */
  spinSpeed: number;
  surfaceAlpha: number;
  /** Brightness of the particle limb. */
  rimAlpha: number;
  atmoIntensity: number;
  /** Atmosphere scale height, in planet radii. */
  atmoThickness: number;
  dustAlpha: number;
  /** Dust twinkle amplitude at rest. */
  sparkle: number;
  /** Colour amount at rest (0 = monochrome, 1 = full palette). */
  idleColour: number;
  /** Energy → drift speed (fraction of idle; capped by CAPS.drift). */
  breathDrift: number;
  /** Energy → rim brightness (fraction of idle; shares CAPS.rim). */
  breathRim: number;
  /** Macro arc → rim brightness (shares CAPS.rim). */
  arcRim: number;
  /** Macro arc → particle density near the limb (fraction; CAPS.density). */
  arcDensity: number;
  /** Macro arc → atmosphere thickness (fraction; CAPS.atmosphere). */
  arcAtmo: number;
  /** `high` band → twinkle (shares CAPS.sparkle). */
  highSparkle: number;
  /** `high` band → atmosphere edge sharpness (variant C). */
  highEdge: number;
  /** `low` band → rim thickness (share of CAPS.rim budget). */
  lowRim: number;
  rippleStrength: number;
  rippleSeconds: number;
  /** Debris ring opacity (variant B only). */
  ringAlpha: number;
  /** Partial orbit turns the ring makes over one item. */
  ringTurnsPerItem: number;
  grain: number;
  vignette: number;
  exposure: number;
}

/**
 * Maximum change vs. the pose's idle baseline. drift/rim/sparkle are the
 * LOCKED §8.4 values. density/atmosphere are the limits recorded in D-059; all variants use the same conservative cap.
 */
export const CAPS = {
  drift: 0.2,
  rim: 0.15,
  sparkle: 0.1,
  density: 0.12,
  atmosphere: 0.15,
  atmosphereC: 0.15,
} as const;

const base: SceneParams = {
  driftSpeed: 0.022,
  spinSpeed: 0.006,
  surfaceAlpha: 0.26,
  rimAlpha: 0.62,
  atmoIntensity: 0.3,
  atmoThickness: 0.035,
  dustAlpha: 0.32,
  sparkle: 0.22,
  idleColour: 0.1,
  breathDrift: 0.2,
  breathRim: 0.09,
  arcRim: 0.06,
  arcDensity: 0.12,
  arcAtmo: 0.15,
  highSparkle: 0.05,
  highEdge: 0,
  lowRim: 0.03,
  rippleStrength: 0.75,
  rippleSeconds: 3.2,
  ringAlpha: 0,
  ringTurnsPerItem: 0.35,
  grain: 0.012,
  vignette: 0.22,
  exposure: 1.15,
};

export const VARIANTS: Record<
  VariantId,
  { name: string; pitch: string; params: SceneParams; atmosphereCap: number }
> = {
  a: {
    name: "A · Breathing limb",
    pitch:
      "At 5 s a pale, half-lit moon rests in the corner, its thin edge of light drawing a slow breath while dust idles past. At the mix's peak the limb is thicker and brighter, more dust has gathered close to the surface, and each transition sends one long ripple of light along the edge.",
    params: { ...base },
    atmosphereCap: CAPS.atmosphere,
  },
  b: {
    name: "B · Orbiting dust",
    pitch:
      "At 5 s a faint tilted ring of debris lies across the moon, barely turning. By the peak the ring has swung a third of the way round in step with the mix's progress, catching more light, and each transition shivers along it as a ripple.",
    params: { ...base, ringAlpha: 0.6, breathRim: 0.07, arcDensity: 0.08 },
    atmosphereCap: CAPS.atmosphere,
  },
  c: {
    name: "C · Atmosphere",
    pitch:
      "At 5 s the moon's sunlit edge carries a thin, cool haze, like dawn seen from orbit. At the peak the haze has swollen into a deep violet-to-blue band whose outer edge sharpens with the hats, while the surface itself stays almost still.",
    params: {
      ...base,
      atmoIntensity: 0.42,
      atmoThickness: 0.045,
      arcAtmo: 0.15,
      highEdge: 0.6,
      breathRim: 0.05,
      arcRim: 0.1,
      arcDensity: 0.04,
      breathDrift: 0.08,
    },
    atmosphereCap: CAPS.atmosphereC,
  },
};

/** Slider ranges for the lab panel. */
export const PARAM_RANGES: Record<keyof SceneParams, [number, number, number]> =
  {
    driftSpeed: [0, 0.08, 0.001],
    spinSpeed: [0, 0.03, 0.001],
    surfaceAlpha: [0, 0.6, 0.01],
    rimAlpha: [0, 1.5, 0.01],
    atmoIntensity: [0, 1, 0.01],
    atmoThickness: [0.01, 0.2, 0.005],
    dustAlpha: [0, 1, 0.01],
    sparkle: [0, 0.6, 0.01],
    idleColour: [0, 0.5, 0.01],
    breathDrift: [0, 0.2, 0.01],
    breathRim: [0, 0.15, 0.005],
    arcRim: [0, 0.15, 0.005],
    arcDensity: [0, 0.12, 0.005],
    arcAtmo: [0, 0.15, 0.005],
    highSparkle: [0, 0.1, 0.005],
    highEdge: [0, 1, 0.05],
    lowRim: [0, 0.15, 0.005],
    rippleStrength: [0, 1.5, 0.05],
    rippleSeconds: [2, 4, 0.1],
    ringAlpha: [0, 1, 0.01],
    ringTurnsPerItem: [0, 1, 0.05],
    grain: [0, 0.05, 0.001],
    vignette: [0, 0.6, 0.01],
    exposure: [0.5, 2, 0.05],
  };

export function variantFromString(value: string | null | undefined): VariantId {
  return value === "b" || value === "c" ? value : "a";
}
