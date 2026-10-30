import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTracklist,
  chapterAt,
  validateTracklist,
} from "../src/lib/tracklist.mjs";
import { validateScore, sampleScore } from "../src/lib/visual-score.ts";
import { createStageBridge } from "../src/lib/stage-bridge.ts";
const score = () => ({
  version: 1,
  rateHz: 4,
  duration: 1,
  bands: ["energy", "low", "mid", "high"],
  data: {
    energy: [0, 255, 128, 64],
    low: [0, 255, 128, 64],
    mid: [0, 255, 128, 64],
    high: [0, 255, 128, 64],
  },
  boundaries: [0.5],
});
const meta = (id: string, url: string | null) => ({
  itemId: id,
  itemKind: "mix" as const,
  durationSec: 1,
  peaksUrl: null,
  scoreUrl: url,
  boundariesSec: [],
  bpm: null,
  beatStartAtSec: null,
});
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
test("tracklist ingest drops placeholders, parses hours and labels, and selects chapter at exact boundaries", () => {
  const { chapters, droppedLines } = parseTracklist(
    "# Comment\n00:00 Artist - Track [Label]\n00:30 TODO - TODO\n1:02:03 Other — Title",
    4000,
  );
  assert.deepEqual(droppedLines, [3]);
  assert.deepEqual(chapters, [
    { at: 0, artist: "Artist", title: "Track", label: "Label" },
    { at: 3723, artist: "Other", title: "Title" },
  ]);
  assert.equal(chapterAt(chapters, 3722)?.title, "Track");
  assert.equal(chapterAt(chapters, 3723)?.title, "Title");
  assert.equal(chapterAt(chapters, -1), null);
  assert.deepEqual(parseTracklist("00:00 TODO - TODO", 100).chapters, []);
});
test("tracklist validation rejects duplicate, descending and out-of-range timestamps", () => {
  for (const text of [
    "00:10 A - B\n00:10 C - D",
    "00:20 A - B\n00:10 C - D",
    "01:40 A - B",
    "00:60 A - B",
    "bad text",
  ])
    assert.throws(() => parseTracklist(text, 100));
  assert.throws(() =>
    validateTracklist([{ at: NaN, artist: "A", title: "B" }], 100),
  );
});
test("score validation and interpolation reject malformed data and clamp endpoints", () => {
  const s = validateScore(score());
  assert.equal(sampleScore(s, "energy", 0.125), 0.5);
  assert.equal(sampleScore(s, "energy", -1), 0);
  assert.equal(sampleScore(s, "high", 100), 64 / 255);
  const bad = score();
  bad.data.low[0] = 256;
  assert.throws(() => validateScore(bad));
  assert.throws(() => validateScore({ ...score(), boundaries: [0.8, 0.2] }));
});
test("bridge smooths score bands without multiplying by playing and reuses zero-copy windows", async () => {
  let now = 0;
  const w = createStageBridge(
    () => now,
    async () => score(),
  );
  w.item("mix:1", "mix", 1, meta("mix:1", "/score"));
  await settle();
  assert.equal(w.bridge.getSnapshot().scoreAvailable, true);
  w.seek(0.125);
  now = 80;
  const f = w.bridge.getFeatures();
  assert(Math.abs(f.energy - 0.5 * (1 - Math.exp(-1))) < 1e-9);
  assert.equal(f.playing, 0);
  assert.equal(f.low, f.energy);
  const window = w.bridge.getScoreWindow(0, 0.25)!;
  assert.equal(window, w.bridge.getScoreWindow(0.5, 1));
  assert.equal(window.startIndex, 2);
  assert.equal(window.endIndex, 4);
  assert.equal(window.data.energy[1], 255);
  w.item("track:no-score", "track", 1);
  assert.equal(w.bridge.getSnapshot().scoreAvailable, false);
  assert.equal(w.bridge.getScoreWindow(0, 1), null);
  assert.equal(w.bridge.getFeatures().energy, 0);
});
test("late score loads cannot attach to a different item; shared URLs fetch only once; invalid scores never block", async () => {
  let complete: (value: unknown) => void = () => {};
  let requests = 0;
  const w = createStageBridge(
    () => 0,
    () => {
      requests++;
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  );
  w.item("a", "mix", 1, meta("a", "/score"));
  await settle();
  w.item("b", "track", 1);
  complete(score());
  await settle();
  assert.equal(w.bridge.getSnapshot().scoreAvailable, false);
  w.item("c", "mix", 1, meta("c", "/score"));
  await settle();
  assert.equal(requests, 1);
  assert.equal(w.bridge.getSnapshot().scoreAvailable, true);
  const invalid = createStageBridge(
    () => 0,
    async () => ({ version: 99 }),
  );
  invalid.item("bad", "mix", 1, meta("bad", "/bad"));
  invalid.transport("playing", 0, 1);
  await settle();
  assert.equal(invalid.bridge.getSnapshot().phase, "playing");
  assert.equal(invalid.bridge.getSnapshot().scoreAvailable, false);
});
test("exclusion updates reuse the public array and emit only on writer updates", () => {
  const w = createStageBridge(() => 0);
  const rects = w.bridge.getExclusionRects();
  let events = 0;
  w.bridge.subscribe("exclusions", () => events++);
  const rect = { x: 10, y: 20, width: 300, height: 40 };
  const element = { getBoundingClientRect: () => rect } as Element;
  w.exclusions([element]);
  assert.equal(rects, w.bridge.getExclusionRects());
  assert.equal(rects[0], rect);
  w.exclusions([]);
  assert.equal(rects.length, 0);
  assert.equal(events, 2);
});
