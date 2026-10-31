import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("astro/package.json"))("sharp");
mkdirSync("public/social", { recursive: true });
// Code-authored artwork; no external image or network dependency.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="glow"><stop stop-color="#657ca3"/><stop offset="1" stop-color="#141b29"/></radialGradient></defs>
<rect width="1200" height="630" fill="#0b0c0e"/>
<circle cx="1060" cy="650" r="440" fill="url(#glow)" stroke="#7485a0" stroke-width="2"/>
<g font-family="sans-serif" fill="#e7e9ee"><text x="80" y="130" font-size="24" letter-spacing="5">MUSIC · MIXES · SOFTWARE</text>
<text x="76" y="320" font-size="88" font-weight="500">Brían Diolún</text>
<text x="80" y="390" font-size="28" fill="#a5afbe">Music as Brían Diolún. Mixes as Roam.</text>
<text x="80" y="545" font-size="24" fill="#a5afbe">me.rdelune.dev</text></g></svg>`;
await sharp(Buffer.from(svg)).png().toFile("public/social/default.png");
