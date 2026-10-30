// The one scene (D-014): a lit particle moon with a terminator, a thin
// atmosphere, three parallax depths of dust and (variant B) a debris ring,
// shot through one lens (ACES + sRGB, grain, vignette, dither).
// Buffers are generated once; all motion is shader time and parameters.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  HalfFloatType,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";

export const MAX_EXCLUSIONS = 12;

const linear = (hex: string) => new Color(hex); // three converts sRGB hex → linear
export const PALETTE = {
  bg: "#0b0c0e",
  accent: "#a9c5e5",
  accent2: "#a080b5",
  moon: "#d9d6cf", // warm off-white, slightly lowered
  moonDark: "#5f6470",
};

function makeUniforms(mobile: boolean) {
  return {
    uAspect: { value: 1 },
    uViewport: { value: new Vector2(1, 1) },
    uDpr: { value: 1 },
    uCenter: { value: new Vector2(1, -1) },
    uRadius: { value: 1.3 },
    uCalm: { value: 1 },
    uSpin: { value: 0 },
    uDrift: { value: 0 },
    uTwinkle: { value: 0 },
    uMotion: { value: 1 },
    uDisturb: { value: 0 },
    uSurfaceAlpha: { value: 0.2 },
    uRimAlpha: { value: 0.6 },
    uRimGain: { value: 1 },
    uDensity: { value: 0.88 },
    uDustAlpha: { value: 0.3 },
    uSparkle: { value: 0.2 },
    uAtmoIntensity: { value: 0.3 },
    uAtmoThick: { value: 0.05 },
    uEdge: { value: 0 },
    uColour: { value: 0.1 },
    uDim: { value: 1 },
    uLightDir: { value: new Vector3(0.5, 0.68, 0.3).normalize() },
    uSeedPhase: { value: new Vector3(0, 0, 0) },
    // x = age (s, <0 = none), y = start angle, z = strength, w = duration
    uRipple: { value: new Vector4(-1, 0, 0, 3) },
    uRingAlpha: { value: 0 },
    /** 0..1 share of the rim cap left for ripple brightness. */
    uRippleLight: { value: 1 },
    uOrbit: { value: 0 },
    /** Pointer parallax in half-height units (desktop, fine pointer). */
    uParallax: { value: new Vector2(0, 0) },
    uExcl: { value: Array.from({ length: MAX_EXCLUSIONS }, () => new Vector4()) },
    uExclCount: { value: 0 },
    uExclPad: { value: 120 },
    uAccent: { value: linear(PALETTE.accent) },
    uAccent2: { value: linear(PALETTE.accent2) },
    uMoon: { value: linear(PALETTE.moon) },
    uMoonDark: { value: linear(PALETTE.moonDark) },
    uBg: { value: linear(PALETTE.bg) },
    uMobile: { value: mobile ? 1 : 0 },
  };
}
export type StageUniforms = ReturnType<typeof makeUniforms>;

const COMMON = /* glsl */ `
uniform float uAspect, uDpr, uRadius, uCalm, uMotion, uExclPad;
uniform vec2 uViewport, uCenter;
uniform vec4 uExcl[${MAX_EXCLUSIONS}];
uniform int uExclCount;
vec2 toCss(vec2 p){
  vec2 ndc = vec2(p.x / uAspect, p.y);
  return vec2((ndc.x * .5 + .5) * uViewport.x, (.5 - ndc.y * .5) * uViewport.y);
}
// 1 inside/behind UI, smooth falloff over uExclPad CSS px, 0 beyond.
float exclusion(vec2 css){
  float f = 0.;
  for (int i = 0; i < ${MAX_EXCLUSIONS}; i++) {
    if (i >= uExclCount) break;
    vec4 r = uExcl[i];
    vec2 c = (r.xy + r.zw) * .5, h = (r.zw - r.xy) * .5;
    vec2 q = abs(css - c) - h;
    float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
    f = max(f, 1. - smoothstep(0., uExclPad, d));
  }
  return f;
}
`;

const POINTS_VERTEX = /* glsl */ `
${COMMON}
attribute vec4 aSeed; // x,y,z random; w kind: 0 surface, 1/2/3 dust depth, 4 ring
uniform vec2 uParallax;
uniform float uSpin, uDrift, uTwinkle, uDisturb, uSurfaceAlpha, uRimAlpha, uRimGain,
  uDensity, uDustAlpha, uSparkle, uColour, uDim, uRingAlpha, uOrbit, uRippleLight;
uniform vec3 uLightDir, uSeedPhase, uAccent, uAccent2, uMoon, uMoonDark;
uniform vec4 uRipple;
varying float vAlpha;
varying vec3 vColor;
void hide(){ gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vAlpha = 0.; }
float ripple(float ang){
  if (uRipple.x < 0.) return 0.;
  float front = uRipple.y + uRipple.x / uRipple.w * 2.2;
  float da = abs(mod(ang - front + 3.14159265, 6.2831853) - 3.14159265);
  float env = smoothstep(0., .5, uRipple.x) * (1. - smoothstep(uRipple.w * .55, uRipple.w, uRipple.x));
  return exp(-da * da * 5.) * env * uRipple.z;
}
void main(){
  float kind = aSeed.w;
  vec2 pos;
  float alpha;
  vec3 col;
  float size;
  if (kind < .5) {
    // ---- surface: a lit body, dense at the limb and thinning inwards
    vec3 p = position;
    float ca = cos(uSpin), sa = sin(uSpin);
    p = vec3(ca * p.x + sa * p.z, p.y, -sa * p.x + ca * p.z);
    float ct = cos(.38), st = sin(.38);
    p.yz = vec2(ct * p.y - st * p.z, st * p.y + ct * p.z);
    if (p.z < 0.) { hide(); return; }
    float limb = 1. - p.z;
    float lit = dot(p, uLightDir);
    float day = smoothstep(-.14, .4, lit);
    vec3 q = position * 2.1 + uSeedPhase;
    float terr = .5 + .5 * sin(q.x * 1.9 + sin(q.y * 2.4 + q.z * 1.3)) * sin(q.y * 1.4 + sin(q.z * 2.2 + q.x * .8));
    float keep = mix(.34, 1., pow(limb, .55));
    keep *= mix(1., uDensity, smoothstep(.55, .96, limb));
    pos = uCenter + p.xy * uRadius + uParallax * .25;
    float rip = ripple(atan(p.y, p.x)) * smoothstep(.7, 1., limb);
    pos += normalize(p.xy + 1e-5) * uRadius * .013 * rip;
    float excl = exclusion(toCss(pos));
    keep = min(1., keep + rip * .3);
    keep *= mix(1., .68, excl);
    if (aSeed.x > keep) { hide(); return; }
    alpha = uSurfaceAlpha * mix(.06, 1., day) * mix(.2, 1., terr * terr) * (.55 + .45 * aSeed.y);
    float rim = pow(limb, 4.) * uRimAlpha * mix(.12, 1., day) * (uRimGain + rip * .12 * uRippleLight);
    float body = alpha;
    alpha += rim;
    vec3 surf = mix(uMoonDark, uMoon, day);
    vec3 rimCol = mix(uMoon, mix(uAccent, uAccent2, (1. - day) * .8), uColour * .85);
    col = mix(surf, rimCol, clamp(rim / max(alpha, 1e-3), 0., 1.));
    col = mix(col, uAccent2, (1. - day) * uColour * .3);
    // calm behind UI: alpha and contrast
    alpha = mix(alpha, .5 * (body + .12), excl * .28);
    alpha *= mix(1., .58, excl);
    size = .85 + aSeed.z * .9 + limb * .7;
  } else if (kind < 3.5) {
    // ---- dust in three parallax depths, orbiting the moon
    float k = kind < 1.5 ? .55 : kind < 2.5 ? 1. : 1.28;
    float spread = kind < 1.5 ? 1.7 : 1.;
    float rad = position.x, ang0 = position.y;
    float speed = (.55 + aSeed.y * .9) / (rad * rad) * (kind < 1.5 ? .35 : 1.);
    float a = ang0 + uDrift * speed;
    vec2 local = vec2(cos(a), sin(a) * mix(1., .86, position.z)) * rad * spread;
    float wob = (.012 + .03 * uDisturb) * uMotion;
    local += vec2(sin(uDrift * 9. + aSeed.x * 40.), cos(uDrift * 7.7 + aSeed.y * 30.)) * wob;
    pos = uCenter * k + vec2(uAspect, 0.) * (1. - k) * .35 + local * uRadius + uParallax * k * k;
    float excl = exclusion(toCss(pos));
    float tw = .5 + .5 * sin(uTwinkle * (.7 + aSeed.z * 2.4) + aSeed.x * 60.);
    alpha = uDustAlpha * (.25 + .75 * aSeed.z) * (1. + uSparkle * (tw * 2. - 1.));
    alpha *= kind < 1.5 ? .55 : kind < 2.5 ? .85 : 1.;
    alpha *= smoothstep(1.0, 1.08, rad) * (1. - smoothstep(2.2, 3.4, rad * spread));
    alpha *= mix(1., .58, excl);
    if (aSeed.x > mix(1., .68, excl)) { hide(); return; }
    col = mix(uMoon * .9, mix(uAccent, uAccent2, aSeed.y), uColour * .35 * aSeed.z);
    size = (kind < 1.5 ? .7 : kind < 2.5 ? .9 : 1.25) + aSeed.z * .7;
  } else {
    // ---- variant B: tilted debris ring whose orbit follows the mix
    if (uRingAlpha <= 0.) { hide(); return; }
    float rad = position.x;
    float a = position.y + uOrbit + uDrift * .15;
    vec2 local = vec2(cos(a) * rad, sin(a) * rad * .2 + position.z * .012);
    // tilted so the ring crosses the visible upper-left quadrant
    float ct = cos(2.32), st = sin(2.32);
    local = vec2(ct * local.x - st * local.y, st * local.x + ct * local.y);
    bool far = sin(a) < 0.;
    if (far && length(local) < 1.) { hide(); return; }
    pos = uCenter + local * uRadius + uParallax * .6;
    float rip = ripple(a);
    float excl = exclusion(toCss(pos));
    float front = far ? .45 : 1.;
    alpha = uRingAlpha * (.3 + .7 * aSeed.z) * front * (1. + rip * .5);
    alpha *= mix(1., .58, excl);
    col = mix(uMoon * .85, mix(uAccent, uAccent2, aSeed.y), uColour * .45);
    size = .9 + aSeed.z * .9;
  }
  alpha *= uDim * mix(.8, 1., uCalm);
  vAlpha = alpha;
  vColor = col;
  gl_Position = vec4(pos.x / uAspect, pos.y, 0., 1.);
  gl_PointSize = size * uDpr;
}
`;

const POINTS_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .1, d) * vAlpha;
  if (a < .002) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

// Body (opaque, occludes far dust) + atmosphere (additive), premultiplied.
const BODY_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uAtmoIntensity, uAtmoThick, uEdge, uColour, uDim, uRimGain, uRippleLight;
uniform vec2 uParallax;
uniform vec3 uLightDir, uAccent, uAccent2, uMoon, uBg;
uniform vec4 uRipple;
varying vec2 vUv;
void main(){
  vec2 ndc = vUv * 2. - 1.;
  vec2 p = vec2(ndc.x * uAspect, ndc.y);
  vec2 d = (p - uCenter - uParallax * .25) / uRadius;
  float r = length(d);
  vec2 css = vec2(vUv.x * uViewport.x, (1. - vUv.y) * uViewport.y);
  float excl = exclusion(css);
  float px = 2. / (uViewport.y * uRadius);
  float inside = 1. - smoothstep(1. - px, 1. + px * .5, r);
  vec2 dir = d / max(r, 1e-4);
  float litSide = .5 + .5 * dot(dir, normalize(uLightDir.xy));
  // body: soft lambert so the interior reads as a solid lit sphere
  vec3 n = vec3(d, sqrt(max(0., 1. - r * r)));
  float lam = max(dot(n, uLightDir), 0.);
  vec3 body = uBg * .92 + uMoon * (.006 + .05 * pow(lam, 1.4)) * mix(1., .72, excl)
    + uAccent2 * .012 * uColour * (1. - lam);
  // atmosphere: view-angle scattering just inside and a thin shell outside
  float th = uAtmoThick;
  float out_ = max(r - 1., 0.);
  float sharp = 1. + uEdge * 1.5;
  float shell = exp(-pow(out_ / th, sharp)) * smoothstep(1. - px, 1. + px, r);
  float inner = pow(clamp(r, 0., 1.), 10.) * inside;
  float ang = atan(d.y, d.x);
  float rip = 0.;
  if (uRipple.x >= 0.) {
    float front = uRipple.y + uRipple.x / uRipple.w * 2.2;
    float da = abs(mod(ang - front + 3.14159265, 6.2831853) - 3.14159265);
    rip = exp(-da * da * 5.) * smoothstep(0., .5, uRipple.x)
      * (1. - smoothstep(uRipple.w * .55, uRipple.w, uRipple.x)) * uRipple.z;
  }
  float glow = (shell + inner * .55) * mix(.12, 1., litSide) * uAtmoIntensity * (uRimGain + rip * .12 * uRippleLight);
  float depth = clamp(out_ / (th * 2.5), 0., 1.) + inside * .35;
  vec3 near = mix(uMoon * .9, uAccent, uColour);
  vec3 far = mix(uMoon * .55, uAccent2, uColour);
  vec3 atmo = mix(near, far, depth) * glow * mix(1., .58, excl);
  vec3 col = (body * inside + atmo) * uDim;
  gl_FragColor = vec4(col, inside);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uTime, uGrain, uVignette, uExposure;
varying vec2 vUv;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb * uExposure;
  vec2 v = vUv - .5;
  v.x *= uResolution.x / uResolution.y;
  c *= 1. - uVignette * smoothstep(.35, 1.05, length(v));
  float g = hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.) - .5;
  c += g * uGrain * (.015 + dot(c, vec3(.3, .5, .2)));
  gl_FragColor = vec4(max(c, 0.), 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (ign(gl_FragCoord.xy) - .5) / 255.;
}
`;

export interface BuiltScene {
  uniforms: StageUniforms;
  composite: ShaderMaterial;
  /** Fraction (0.55..1) of points drawn: frame-local quality. */
  setQuality(q: number): void;
  setSize(width: number, height: number, dpr: number): void;
  render(): void;
  compile(): void;
  counts: { surface: number; dust: number; ring: number };
  dispose(): void;
}

export function buildScene(
  renderer: WebGLRenderer,
  opts: { mobile: boolean; seed: number },
): BuiltScene {
  const { mobile } = opts;
  let s = opts.seed >>> 0 || 19;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const uniforms = makeUniforms(mobile);
  const surface = mobile ? 16000 : 52000;
  const dustMid = mobile ? 2600 : 7000;
  const dustNear = mobile ? 700 : 1800;
  const dustFar = mobile ? 1600 : 3600;
  const ring = mobile ? 2400 : 7000;

  // Main points: surface + mid/near dust + ring, in shuffled order so a draw
  // range subsamples every class evenly.
  const mainCount = surface + dustMid + dustNear + ring;
  const pos = new Float32Array(mainCount * 3);
  const seedAttr = new Float32Array(mainCount * 4);
  const kinds: number[] = [];
  for (let i = 0; i < surface; i++) kinds.push(0);
  for (let i = 0; i < dustMid; i++) kinds.push(2);
  for (let i = 0; i < dustNear; i++) kinds.push(3);
  for (let i = 0; i < ring; i++) kinds.push(4);
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const fill = (target: Float32Array, seeds: Float32Array, i: number, kind: number) => {
    if (kind === 0) {
      const z = rand() * 2 - 1,
        a = rand() * Math.PI * 2,
        r = Math.sqrt(1 - z * z);
      target.set([Math.cos(a) * r, Math.sin(a) * r, z], i * 3);
    } else if (kind <= 3) {
      const near = kind === 3;
      const rad = 1.04 + Math.pow(rand(), near ? 1.6 : 2.4) * (near ? 1.6 : 1.3);
      target.set([kind === 1 ? 1.05 + rand() * 2.2 : rad, rand() * Math.PI * 2, rand()], i * 3);
    } else {
      const t = rand();
      // two bands with a gap, like a real debris ring
      const band = rand() < 0.7 ? 1.38 + t * 0.14 : 1.58 + t * 0.07;
      target.set([band, rand() * Math.PI * 2, (rand() * 2 - 1) * 0.35], i * 3);
    }
    seeds.set([rand(), rand(), rand(), kind], i * 4);
  };
  kinds.forEach((kind, i) => fill(pos, seedAttr, i, kind));
  const mainGeometry = new BufferGeometry();
  mainGeometry.setAttribute("position", new BufferAttribute(pos, 3));
  mainGeometry.setAttribute("aSeed", new BufferAttribute(seedAttr, 4));

  const farPos = new Float32Array(dustFar * 3);
  const farSeed = new Float32Array(dustFar * 4);
  for (let i = 0; i < dustFar; i++) fill(farPos, farSeed, i, 1);
  const farGeometry = new BufferGeometry();
  farGeometry.setAttribute("position", new BufferAttribute(farPos, 3));
  farGeometry.setAttribute("aSeed", new BufferAttribute(farSeed, 4));

  const pointsMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: POINTS_VERTEX,
    fragmentShader: POINTS_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const bodyMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: QUAD_VERTEX,
    fragmentShader: BODY_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    toneMapped: false,
  });
  const scene = new Scene();
  const far = new Points(farGeometry, pointsMaterial);
  far.frustumCulled = false;
  far.renderOrder = 0;
  const quad = new PlaneGeometry(2, 2);
  const body = new Mesh(quad, bodyMaterial);
  body.frustumCulled = false;
  body.renderOrder = 1;
  const main = new Points(mainGeometry, pointsMaterial);
  main.frustumCulled = false;
  main.renderOrder = 2;
  scene.add(far, body, main);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const canFloat =
    renderer.extensions.has("EXT_color_buffer_float") ||
    renderer.extensions.has("EXT_color_buffer_half_float");
  const target = new WebGLRenderTarget(1, 1, {
    type: canFloat ? HalfFloatType : UnsignedByteType,
    depthBuffer: false,
  });
  const composite = new ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture },
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uGrain: { value: 0.012 },
      uVignette: { value: 0.22 },
      uExposure: { value: 1.15 },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const post = new Scene();
  const postMesh = new Mesh(quad, composite);
  postMesh.frustumCulled = false;
  post.add(postMesh);

  return {
    uniforms,
    composite,
    counts: { surface, dust: dustMid + dustNear + dustFar, ring },
    setQuality(q) {
      const f = Math.min(1, Math.max(0.55, q));
      mainGeometry.setDrawRange(0, Math.round(mainCount * f));
      farGeometry.setDrawRange(0, Math.round(dustFar * f));
    },
    setSize(width, height, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      target.setSize(Math.max(1, Math.round(width * dpr)), Math.max(1, Math.round(height * dpr)));
      uniforms.uAspect.value = width / Math.max(1, height);
      uniforms.uViewport.value.set(width, height);
      uniforms.uDpr.value = dpr;
      composite.uniforms.uResolution.value.set(width, height);
    },
    render() {
      renderer.setRenderTarget(target);
      renderer.setClearColor(PALETTE.bg, 1);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post, camera);
    },
    compile() {
      renderer.compile(scene, camera);
      renderer.compile(post, camera);
    },
    dispose() {
      mainGeometry.dispose();
      farGeometry.dispose();
      quad.dispose();
      pointsMaterial.dispose();
      bodyMaterial.dispose();
      composite.dispose();
      target.dispose();
    },
  };
}
