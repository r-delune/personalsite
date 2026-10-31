import assert from "node:assert/strict";
const origin = new URL(process.argv[2] || "https://me.rdelune.dev").origin;
const observations = [];
for (const path of ["/", "/music", "/mixes/roam-mix-2026", "/work", "/about", "/offline", "/manifest.webmanifest", "/sw.js", "/pwa-report.json"]) {
  const response = await fetch(origin + path, { redirect: "manual", signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path}: expected direct 200, got ${response.status}`);
  const type = response.headers.get("content-type") || "";
  const cache = response.headers.get("cache-control") || "";
  if (path === "/") {
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert(response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
    if (new URL(origin).hostname.endsWith(".pages.dev")) assert(response.headers.get("x-robots-tag")?.includes("noindex"));
    else assert(!response.headers.get("x-robots-tag")?.includes("noindex"));
    const html = await response.text();
    assert(html.includes('rel="manifest"') && html.includes("worker-src"));
  } else if (path === "/sw.js") {
    assert(type.includes("javascript"));
    assert(cache.includes("no-cache"));
    const source = await response.text();
    assert(!source.includes("__WB_MANIFEST"));
  } else if (path === "/manifest.webmanifest") {
    assert(type.includes("json"));
    const manifest = await response.json();
    assert.equal(manifest.id, "/");
    assert.equal(manifest.display, "standalone");
  } else await response.body?.cancel();
  observations.push({ path, status: response.status, type, cache });
}
const missing = await fetch(origin + "/not-a-real-pwa-page", { redirect: "manual", signal: AbortSignal.timeout(20000) });
assert.equal(missing.status, 404, "Missing routes must retain a 404 status");
await missing.body?.cancel();
console.log(JSON.stringify({ origin, verified: true, routes: observations, missingStatus: 404 }, null, 2));
