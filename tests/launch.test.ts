import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { siteOrigin } from "../scripts/site-config.mjs";
import { writeLaunchAssets } from "../scripts/launch-assets.mjs";

test("launch assets advertise only indexable canonical pages, and previews advertise none", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-launch-"));
  try {
    await mkdir(join(directory, "writing"));
    await writeFile(join(directory, "index.html"), '<link rel="canonical" href="https://me.rdelune.dev/">');
    await writeFile(join(directory, "writing/index.html"), '<link rel="canonical" href="https://me.rdelune.dev/writing">');
    await writeFile(join(directory, "404.html"), '<meta name="robots" content="noindex, follow">');
    await writeLaunchAssets(directory, siteOrigin(), false);
    const sitemap = await readFile(join(directory, "sitemap.xml"), "utf8");
    assert.equal((sitemap.match(/<loc>/g) || []).length, 2);
    assert(!sitemap.includes("404"));
    assert((await readFile(join(directory, "robots.txt"), "utf8")).includes("Sitemap: https://me.rdelune.dev/sitemap.xml"));
    const headers = await readFile(join(directory, "_headers"), "utf8");
    assert(headers.includes("frame-ancestors 'none'"));
    assert(!headers.split("/_astro/*")[0].includes("X-Robots-Tag"));
    await writeLaunchAssets(directory, siteOrigin(), true);
    assert(!(await readFile(join(directory, "sitemap.xml"), "utf8")).includes("<loc>"));
    assert(!(await readFile(join(directory, "robots.txt"), "utf8")).includes("Sitemap:"));
    assert((await readFile(join(directory, "_headers"), "utf8")).split("/_astro/*")[0].includes("X-Robots-Tag: noindex"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("production origin rejects credentials, non-HTTPS and non-origin URLs", () => {
  assert.equal(siteOrigin(), "https://me.rdelune.dev");
  assert.equal(siteOrigin("https://example.com/"), "https://example.com");
  for (const url of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?x=1", "https://example.com#test", "https://example.com:8080"])
    assert.throws(() => siteOrigin(url));
});

test("failed build removes both stale and partially generated publication output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-build-"));
  try {
    await mkdir(join(directory, "scripts"));
    await mkdir(join(directory, "dist"));
    for (const name of ["generate-pwa-icons", "check-media", "build-pwa"])
      await writeFile(join(directory, `scripts/${name}.mjs`), "");
    await writeFile(join(directory, "dist/stale.html"), "Old publication output");
    await writeFile(join(directory, "scripts/prepare-fixture.mjs"), `import { existsSync } from 'node:fs'; if (existsSync('dist/stale.html')) process.exit(2);`);
    await writeFile(join(directory, "scripts/astro.mjs"), `import { mkdirSync, writeFileSync } from 'node:fs'; mkdirSync('dist', {recursive:true}); writeFileSync('dist/partial.html', 'TODO(copy)'); writeFileSync('compiled.flag', 'yes');`);
    await writeFile(join(directory, "scripts/check-content.mjs"), `process.exit(1);`);
    const result = spawnSync(process.execPath, [resolve("scripts/build.mjs")], { cwd: directory, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(await readFile(join(directory, "compiled.flag"), "utf8"), "yes");
    assert(result.stderr.includes("dist was removed"));
    await assert.rejects(stat(join(directory, "dist")), { code: "ENOENT" });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
