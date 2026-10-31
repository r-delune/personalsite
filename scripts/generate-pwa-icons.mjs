import { createRequire } from "node:module";
import { mkdir, readdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("astro/package.json"))("sharp");
await mkdir("public/icons", { recursive: true });
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0b0c0e"/><text x="256" y="320" text-anchor="middle" fill="#eae9e5" font-family="sans-serif" font-size="190" letter-spacing="-16">b∕d</text></svg>`,
);
for (const size of [180, 192, 512])
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp(svg).png().toFile("public/icons/maskable-512.png");
// Release covers render at a few hundred CSS pixels; keep the original files,
// but ship appropriately sized artwork to the page, player and offline cache.
await mkdir("public/artwork/optimized", { recursive: true });
for (const name of await readdir("public/artwork")) {
  if (!name.endsWith(".jpg")) continue;
  await sharp(`public/artwork/${name}`)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`public/artwork/optimized/${name.replace(/\.jpg$/, ".webp")}`);
}
