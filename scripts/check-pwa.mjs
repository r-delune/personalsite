import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { loadEnv } from "vite";
import { pwaEnabled, isExcluded, OFFLINE_BUDGET } from "../src/pwa/policy.mjs";
const mode = process.argv.includes("--preview") ? "preview" : "production";
const enabled = pwaEnabled(mode, {
  ...loadEnv(mode, process.cwd(), "PUBLIC_"),
  ...process.env,
});
const home = await readFile("dist/index.html", "utf8");
if (!enabled) {
  assert(
    !home.includes('rel="manifest"'),
    "Ordinary previews must not advertise installation",
  );
  for (const file of ["sw.js", "manifest.webmanifest"]) {
    assert.equal(
      await stat(`dist/${file}`).then(
        () => true,
        () => false,
      ),
      false,
      `Unexpected preview worker/manifest: ${file}`,
    );
  }
  console.log("PWA disabled for this build; no worker or install metadata.");
} else {
  const manifest = JSON.parse(
    await readFile("dist/manifest.webmanifest", "utf8"),
  );
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert(
    home.includes('rel="manifest"') &&
      home.includes("worker-src") &&
      home.includes("manifest-src"),
  );
  for (const icon of manifest.icons) {
    const bytes = await readFile(`dist${icon.src}`);
    assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a");
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
  const report = JSON.parse(await readFile("dist/pwa-report.json", "utf8"));
  assert(report.bytes <= OFFLINE_BUDGET);
  for (const route of ["/", "/music", "/mixes", "/work", "/about", "/offline"])
    assert(report.pages.includes(route), `Missing offline page ${route}`);
  for (const url of report.assets)
    assert(!isExcluded(url), `Forbidden cached asset ${url}`);
  assert(
    !report.assets.some((url) => /\bruntime\.[\w-]+\.js$/.test(url)),
    "Optional scene runtime must stay lazy",
  );
  const worker = await readFile("dist/sw.js", "utf8");
  assert(
    !worker.includes("__WB_MANIFEST"),
    "Precache manifest was not injected",
  );
  assert((await stat("dist/sw.js")).size > 1000);
  assert(
    (await readFile("dist/_headers", "utf8")).includes(
      "/sw.js\n  Cache-Control: no-cache",
    ),
  );
  console.log(
    `Verified PWA identity, icons, offline routes, exclusions, update headers and ${report.bytes}-byte cache budget.`,
  );
}
