// Renders the per-route poster stills from the real scene through the same
// lens, with the real route poses and bridge exclusion rectangles. Run with the dev server up:
//   pnpm dev   (in another terminal)
//   pnpm exec playwright install chromium   (once, if Chrome is not installed)
//   pnpm posters
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const sharp = astroRequire("sharp");
import { launchVisualBrowser, labUrl as base } from "./visual-browser.mjs";
const groups = { home: "/", listen: "/music", mixes: "/mixes", read: "/about" };
const sizes = { "": [1600, 1000, 1], "-mobile": [375, 812, 2] };
mkdirSync("public/poster", { recursive: true });
const browser = await launchVisualBrowser();
for (const [group, route] of Object.entries(groups)) {
  for (const [suffix, [width, height, scale]] of Object.entries(sizes)) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    // Defer the automatic runtime so this explicitly uses the still lens.
    await page.addInitScript(() => localStorage.setItem("scene-paused", "true"));
    await page.goto(`${base}${route}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const { initStage } = await import("/src/components/stage/runtime.ts");
      await initStage({ still: true });
    });
    await page.waitForFunction(() => window.__stageReady === true, null, { timeout: 30000 });
    await page.waitForTimeout(500);
    // Export the framebuffer, excluding CSS shades, text and controls.
    const png = Buffer.from(await page.locator("#stage canvas").evaluate(canvas => canvas.toDataURL("image/png").split(",")[1]), "base64");
    const out = `public/poster/${group}${suffix}.avif`;
    await sharp(png).avif({ quality: 50, effort: 6 }).toFile(out);
    console.log(out);
    await page.close();
  }
}
await browser.close();
