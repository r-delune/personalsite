import test from "node:test";
import assert from "node:assert/strict";
import {
  PhaseEnvelopes, QualityGovernor, activeBoundaries, crossedBoundary, macroEnvelope,
  musicalGains, lunarPhase, moonLightZ, poseFor, rippleBudget, sampleEnvelope, sectionEaseSeconds, seeded, hashString,
} from "../src/components/stage/coupling.ts";
import { CAPS, VARIANTS } from "../src/components/stage/params.ts";

test("musical gains never exceed the locked caps for any variant", () => {
  for (const v of Object.values(VARIANTS)) {
    const g = musicalGains(v.params, { breath: 1, arc: 1, high: 1, low: 1, playing: 1 }, v.atmosphereCap);
    assert.ok(g.drift <= 1 + CAPS.drift + 1e-9);
    assert.ok(g.rim <= 1 + CAPS.rim + 1e-9);
    assert.ok(g.sparkle <= 1 + CAPS.sparkle + 1e-9);
    assert.ok(g.atmosphere <= 1 + v.atmosphereCap + 1e-9);
    assert.ok(rippleBudget(g.rim) >= 0);
    const idle = musicalGains(v.params, { breath: 0, arc: 0, high: 0, low: 0, playing: 0 });
    assert.equal(idle.drift, 1);
    assert.equal(idle.rim, 1);
  }
});

test("colour blooms on play within ~3 s and recedes on pause", () => {
  const env = new PhaseEnvelopes(0.1);
  for (let t = 0; t < 3; t += 1 / 60) env.step(1 / 60, "playing", t);
  assert.ok(env.colour > 0.9, `colour ${env.colour}`);
  env.step(1 / 60, "buffering", 0);
  const held = env.coupling;
  for (let t = 0; t < 2; t += 1 / 60) env.step(1 / 60, "buffering", t);
  assert.equal(env.coupling, held);
  for (let t = 0; t < 6; t += 1 / 60) env.step(1 / 60, "paused", t);
  assert.ok(env.colour < 0.2 && env.coupling < 0.01 && env.dim < 0.95);
});

test("loading inhale returns to idle after ~3 s", () => {
  const env = new PhaseEnvelopes(0.1);
  for (let t = 0; t < 2; t += 1 / 60) env.step(1 / 60, "loading", t);
  assert.ok(env.inhale > 0.9);
  for (let t = 3; t < 6; t += 1 / 60) env.step(1 / 60, "loading", t);
  assert.ok(env.inhale < 0.05);
});

test("macro envelope is normalised, smooth and deterministic for position", () => {
  const energy = Array.from({ length: 4 * 600 }, (_, i) => Math.round(128 + 120 * Math.sin(i / 4 / 120)));
  const env = macroEnvelope(energy, 4);
  assert.equal(env.length, 600);
  assert.ok(Math.max(...env) === 1 && Math.min(...env) === 0);
  assert.equal(sampleEnvelope(env, 123.4), sampleEnvelope(env, 123.4));
  for (let i = 1; i < env.length; i++) assert.ok(Math.abs(env[i] - env[i - 1]) < 0.05);
});

test("boundary priority and ripple crossing ignore seeks", () => {
  assert.deepEqual(activeBoundaries([0, 300, 120], [50, 60]), [120, 300]);
  assert.deepEqual(activeBoundaries([], [60, 50]), [50, 60]);
  assert.equal(crossedBoundary([100, 200], 99.9, 100.05, 1), 100);
  assert.equal(crossedBoundary([100, 200], 50, 150, 1), null);
  assert.equal(crossedBoundary([100], 101, 99, 1), null);
  assert.equal(sectionEaseSeconds(10), 3.5);
  assert.equal(sectionEaseSeconds(400), 6);
});

test("governor drops fast, recovers slowly and never oscillates", () => {
  const g = new QualityGovernor();
  for (let i = 0; i < 60; i++) g.sample(40, 1 / 25);
  const low = g.quality;
  assert.ok(low < 0.7 && low >= 0.55);
  for (let i = 0; i < 60; i++) g.sample(8, 1 / 60);
  assert.ok(g.quality > low && g.quality < 0.8, `recovered too fast ${g.quality}`);
  g.sample(250, 0.25);
  assert.ok(g.quality >= 0.55);
});

test("poses keep the planet clear of the content", () => {
  for (const route of ["home", "music", "mixes", "about"]) {
    // desktop: limb stays right of the left content column
    for (const aspect of [1440 / 900, 1280 / 720]) {
      const p = poseFor(route, aspect);
      assert.ok((p.cx - p.r) / aspect > -0.15, `${route}@${aspect.toFixed(2)}`);
    }
    // phone: full-width content, so the planet stays in the lower 30%
    const m = poseFor(route, 375 / 812);
    assert.ok(m.cy + m.r < -0.4, `${route}@mobile top ${m.cy + m.r}`);
  }
  assert.ok(poseFor("about", 1.6).r < poseFor("home", 1.6).r);
});

test("seeds are stable per item", () => {
  assert.equal(hashString("mix:a"), hashString("mix:a"));
  assert.notEqual(seeded(1, 2), seeded(1, 3));
});

test("lunar phase matches known dates and stays in a readable light range", () => {
  const newMoon = lunarPhase(new Date(Date.UTC(2024, 3, 8, 18, 21))); // eclipse new moon
  assert.ok(Math.min(newMoon, 1 - newMoon) < 0.03, String(newMoon));
  assert.ok(Math.abs(lunarPhase(new Date(Date.UTC(2024, 8, 18, 2, 34))) - 0.5) < 0.03); // full moon
  for (let p = 0; p < 1; p += 0.05) {
    const z = moonLightZ(p);
    assert.ok(z >= -0.25 - 1e-9 && z <= 0.55 + 1e-9);
  }
});
