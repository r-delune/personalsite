import { test } from "node:test";
import assert from "node:assert/strict";
import { createStageBridge, routePose } from "../src/lib/stage-bridge.ts";
import { parseTime } from "../src/lib/format.ts";
test("hot-path getters reuse objects and sample the active clock", () => {
  let position = 2;
  const writer = createStageBridge(() => 100);
  writer.position(() => position);
  const first = writer.bridge.getSnapshot();
  position = 18;
  assert.equal(writer.bridge.getSnapshot(), first);
  assert.equal(first.positionSec, 18);
  assert.equal(writer.bridge.getFeatures(), writer.bridge.getFeatures());
});
test("phase events only fire on real transitions and preserve phaseSince", () => {
  let now = 0;
  const writer = createStageBridge(() => now);
  const events: string[] = [];
  writer.bridge.subscribe("phase", (s) => events.push(s.phase));
  now = 10;
  writer.transport("loading", 0, 100);
  now = 50;
  writer.transport("loading", 0, 100);
  assert.equal(writer.bridge.getSnapshot().phaseSince, 10);
  now = 80;
  writer.transport("playing", 0, 100);
  writer.transport("buffering", 4, 100);
  writer.transport("paused", 4, 100);
  assert.deepEqual(events, ["loading", "playing", "buffering", "paused"]);
});
test("staging is not a bridge seek; committed seek emits once and unsubscribe works", () => {
  const writer = createStageBridge(() => 0);
  let count = 0;
  const stop = writer.bridge.subscribe("seek", () => count++);
  let staged = 42;
  assert.equal(count, 0);
  writer.seek(staged);
  assert.equal(count, 1);
  stop();
  writer.seek(50);
  assert.equal(count, 1);
});
test("static metadata identity changes only with item identity", () => {
  const w = createStageBridge(() => 0);
  assert.equal(w.bridge.getItemMeta(), null);
  w.item("1", "track", 100);
  const meta = w.bridge.getItemMeta();
  w.transport("playing", 8, 100);
  w.seek(10);
  assert.equal(w.bridge.getItemMeta(), meta);
  w.item("2", "track", 120);
  assert.notEqual(w.bridge.getItemMeta(), meta);
});
test("pose changes ignore query/hash and classify detail routes", () => {
  assert.equal(routePose("/music/album"), "release");
  assert.equal(routePose("/mixes/mix"), "mix");
  assert.equal(routePose("/writing/post"), "post");
  let count = 0;
  const w = createStageBridge(() => 0);
  w.bridge.subscribe("route", () => count++);
  w.route(routePose(new URL("https://site.test/music?t=1#x").pathname));
  w.route(routePose(new URL("https://site.test/music?t=2").pathname));
  assert.equal(count, 1);
});
test("native playback exposes only a playing envelope and zero compatibility energy", () => {
  let now = 0;
  const w = createStageBridge(() => now);
  assert.equal(w.bridge.getSnapshot().scoreAvailable, false);
  w.transport("playing", 0, 100);
  for (let i = 0; i < 20; i++) {
    now += 100;
    const f = w.bridge.getFeatures();
    assert(Number.isFinite(f.energy));
    assert.equal(f.energy, 0);
    assert(f.playing >= 0 && f.playing <= 1);
  }
  const playing = w.bridge.getFeatures().playing;
  assert(playing > 0);
  w.transport("paused", 2, 100);
  now += 100;
  assert(w.bridge.getFeatures().playing < playing);
  assert.equal(w.bridge.getSnapshot().scoreAvailable, false);
});
test("URL time parser rejects malformed and unsafe input", () => {
  assert.equal(parseTime("1h12m30s"), 4350);
  assert.equal(parseTime("90"), 90);
  assert.equal(parseTime("-1"), null);
  assert.equal(parseTime("1s2h"), null);
  assert.equal(parseTime("Infinity"), null);
  assert.equal(parseTime("999999999999999999999"), null);
});

test("score metadata preserves confirmed boundaries and clears on unscored items", () => {
  const w = createStageBridge(() => 0);
  const meta = {
    itemKind: "mix" as const,
    itemId: "mix:roam-mix-2026",
    durationSec: 3626.74,
    peaksUrl: "/data/roam-mix-2026.peaks.json",
    scoreUrl: "/data/roam-mix-2026.score.json",
    boundariesSec: [60, 120],
    bpm: null,
    beatStartAtSec: null,
  };
  let observed: unknown;
  w.bridge.subscribe("itemchange", () => {
    observed = w.bridge.getItemMeta();
  });
  w.item(meta.itemId, "mix", meta.durationSec, meta);
  assert.equal(observed, meta);
  w.seek(100);
  assert.equal(w.bridge.getItemMeta(), meta);
  assert.deepEqual(meta.boundariesSec, [60, 120]);
  w.item("track:unscored", "track", 100);
  assert.equal(w.bridge.getItemMeta()?.scoreUrl, null);
  assert.deepEqual(w.bridge.getItemMeta()?.boundariesSec, []);
});
