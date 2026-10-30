// Renders the per-route poster stills from the real scene through the same
// lens, via the dev-only /lab page. Run with the dev server up:
//   pnpm dev   (in another terminal)
//   pnpm add -D playwright && pnpm exec playwright install chromium   (once)
//   pnpm posters
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const sharp = astroRequire("sharp");
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed: pnpm add -D playwright && pnpm exec playwright install chromium");
  process.exit(1);
}
const base = process.env.LAB_URL || "http://127.0.0.1:4357";
const groups = { home: "home", listen: "music", mixes: "mixes", read: "about" };
const sizes = { "": [1600, 1000, 1], "-mobile": [375, 812, 2] };
mkdirSync("public/poster", { recursive: true });
const browser = await chromium.launch();
for (const [group, route] of Object.entries(groups)) {
  for (const [suffix, [width, height, scale]] of Object.entries(sizes)) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(`${base}/lab?poster=${route}`);
    await page.waitForFunction(() => window.__stageReady === true, null, { timeout: 30000 });
    await page.waitForTimeout(500);
    const png = await page.locator("canvas").screenshot();
    const out = `public/poster/${group}${suffix}.avif`;
    await sharp(png).avif({ quality: 50, effort: 6 }).toFile(out);
    console.log(out);
    await page.close();
  }
}
await browser.close();
