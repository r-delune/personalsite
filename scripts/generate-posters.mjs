import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const sharp = astroRequire("sharp");
mkdirSync("public/poster", { recursive: true });
for (const mobile of [false, true]) {
  const w = mobile ? 750 : 1600,
    h = mobile ? 1624 : 1000,
    aspect = w / h;
  let seed = 19;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  const circles = [];
  const count = mobile ? 19000 : 65000;
  for (let i = 0; i < count; i++) {
    const z = random(),
      angle = random() * Math.PI * 2,
      r = Math.sqrt(1 - z * z),
      dust = random() < 0.19;
    const spread = dust ? 1.04 + random() ** 2 * 0.8 : 1;
    const x = Math.cos(angle) * r * spread,
      y = Math.sin(angle) * r * spread,
      aSeed = random();
    const radius = mobile ? 1.2 : 1.42,
      cx = mobile ? aspect * 1.5 : aspect * 0.89 + 0.04,
      cy = mobile ? -1.72 : -1.12;
    const px = ((x * radius + cx + aspect) * h) / 2,
      py = ((1 - y * radius - cy) * h) / 2;
    const rim = (1 - z) ** 5,
      alpha =
        (0.24 + 0.66 * rim) *
        (0.5 + 0.5 * aSeed) *
        (dust ? 0.7 : 1) *
        (0.8 + (0.5 + 0.5 * Math.sin(y * 30 + x * 8 + z * 10)) * 0.2);
    if (px < 0 || px > w || py < 0 || py > h) continue;
    circles.push(
      `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${((0.95 + aSeed * 0.85 + rim * 0.65) / 2).toFixed(2)}" fill="#93accd" opacity="${alpha.toFixed(3)}"/>`,
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#0b0c0e"/>${circles.join("")}</svg>`;
  const file = mobile ? "horizon-mobile" : "horizon";
  await sharp(Buffer.from(svg))
    .avif({ quality: 65 })
    .toFile(`public/poster/${file}.avif`);
  if (!mobile) writeFileSync("public/poster/horizon.svg", svg);
}
