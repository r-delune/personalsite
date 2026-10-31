import test from "node:test";
import assert from "node:assert/strict";
import { pwaEnabled, pageKey, isExcluded, pageURLFromFile } from "../src/pwa/policy.mjs";
test("offline route keys match both flat Cloudflare HTML and directory exports", () => {
  for (const [file, expected] of [["index.html", "/"], ["music/index.html", "/music"], ["music.html", "/music"], ["writing/post.html", "/writing/post"]])
    assert.equal(pageURLFromFile(file), expected);
});
test("PWA is production-only unless staging explicitly opts in", () => {
  assert.equal(pwaEnabled("production"), true);
  assert.equal(pwaEnabled("production", { PUBLIC_PWA_ENABLED: "0" }), false);
  assert.equal(pwaEnabled("development", { PUBLIC_PWA_ENABLED: "1" }), false);
  assert.equal(pwaEnabled("preview"), false);
  assert.equal(pwaEnabled("preview", { PUBLIC_PWA_ENABLED: "1" }), true);
});
test("HTML caching normalizes position links but preserves other query variants", () => {
  const url = (path: string) => new URL(path, "https://example.com");
  assert.equal(pageKey(url("/mixes/test/?t=120#track")), "/mixes/test");
  assert.equal(pageKey(url("/")), "/");
  assert.equal(pageKey(url("/music?filter=drafts")), null);
  assert.equal(pageKey(url("/music?t=10&private=1")), null);
});
test("audio, lab, local-media and sample routes never enter caches", () => {
  for (const path of [
    "/track.mp3",
    "/track.WAV",
    "/lab",
    "/_lab/test",
    "/api/private",
    "/__local-media/track.mp3",
    "/writing/sample-template",
  ])
    assert(isExcluded(path), path);
  for (const path of [
    "/music",
    "/mixes/holiday-fizzler",
    "/poster/home.avif",
    "/_astro/app.js",
  ])
    assert(!isExcluded(path), path);
});
