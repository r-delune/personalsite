import { readFile, writeFile, readdir, stat, rm } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { loadEnv } from "vite";
import { build } from "esbuild";
import { init, parse } from "es-module-lexer";
import { injectManifest } from "workbox-build";
import { htmlFiles } from "./launch-assets.mjs";
import { pwaEnabled, isExcluded, OFFLINE_BUDGET, pageURLFromFile } from "../src/pwa/policy.mjs";

export async function buildPWA(directory, { enabled, preview = false } = {}) {
  const root = resolve(directory);
  if (!enabled) {
    for (const name of ["sw.js", "manifest.webmanifest", "pwa-report.json"])
      await rm(join(root, name), { force: true });
    return;
  }
  const manifest = {
    id: "/",
    name: "Brían Diolún",
    short_name: "Brían",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    description: "Music, mixes and software by Brían Diolún.",
    lang: "en",
    icons: [192, 512]
      .map((size) => ({
        src: `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      }))
      .concat([
        {
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ]),
  };
  await writeFile(
    join(root, "manifest.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );
  const entries = new Map();
  const pages = [];
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  await init;
  async function add(url, file = url) {
    if (!url.startsWith("/") || isExcluded(url) || entries.has(url)) return;
    const path = resolve(root, file.replace(/^\//, ""));
    if (!path.startsWith(root + "/"))
      throw new Error(`Invalid PWA asset path: ${file}`);
    const bytes = await readFile(path);
    entries.set(url, { url, revision: hash(bytes), bytes: bytes.length });
    const text = bytes.toString("utf8");
    if (path.endsWith(".js")) {
      for (const item of parse(text)[0]) {
        // Static dependency graph only: optional renderer imports stay lazy.
        if (item.d !== -1 || !item.n || !/^(?:\.|\/)/.test(item.n)) continue;
        await add(new URL(item.n, `https://build.invalid${url}`).pathname);
      }
    } else if (path.endsWith(".css")) {
      for (const match of text.matchAll(
        /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g,
      )) {
        const value = (match[1] ?? match[2] ?? match[3]).trim();
        if (/^(?:data:|https?:|#)/i.test(value)) continue;
        await add(new URL(value, `https://build.invalid${url}`).pathname);
      }
    }
  }
  for (const file of await htmlFiles(root)) {
    const rel = relative(root, file).replaceAll("\\", "/");
    const url = pageURLFromFile(rel);
    const html = await readFile(file, "utf8");
    if (rel === "404.html" || isExcluded(url)) continue;
    if (
      !preview &&
      url !== "/offline" &&
      /name="robots" content="[^"]*noindex/.test(html)
    )
      continue;
    pages.push(url);
    await add(url, rel);
    for (const match of html.matchAll(
      /(?:src|component-url|renderer-url|before-hydration-url)="([^"#]+)"|<link\b[^>]*href="([^"#]+)"/g,
    )) {
      const value = (match[1] || match[2]).replaceAll("&amp;", "&");
      if (!value.startsWith("/") || value.startsWith("//")) continue;
      const asset = new URL(value, "https://build.invalid").pathname;
      // Do not treat canonical links, document links, PDF downloads or manifests as dependencies.
      if (/\.(?:js|css|woff2?|avif|png|jpe?g|svg|webp)$/.test(asset))
        await add(asset);
    }
  }
  for (const name of await readdir(join(root, "poster")))
    if (name.endsWith(".avif")) await add(`/poster/${name}`);
  const mixes = JSON.parse(await readFile("src/fixtures/mixes.json", "utf8"));
  for (const mix of mixes) {
    if (!pages.includes(`/mixes/${mix.slug}`)) continue;
    for (const asset of [mix.peaks, mix.score]) if (asset) await add(asset);
  }
  for (const name of await readdir(join(root, "icons")))
    await add(`/icons/${name}`);
  await add("/manifest.webmanifest");
  const sorted = [...entries.values()].sort((a, b) =>
    a.url.localeCompare(b.url),
  );
  const id = hash(JSON.stringify(sorted)).slice(0, 16);
  const source = join(root, ".pwa-worker.js");
  await build({
    entryPoints: ["src/pwa/worker.ts"],
    outfile: source,
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2020",
    sourcemap: false,
    define: {
      __BUILD_ID__: JSON.stringify(id),
      __HTML_ROUTES__: JSON.stringify(pages),
      "process.env.NODE_ENV": '"production"',
    },
  });
  const result = await injectManifest({
    swSrc: source,
    swDest: join(root, "sw.js"),
    globDirectory: root,
    globPatterns: [],
    additionalManifestEntries: sorted.map(({ url, revision }) => ({
      url,
      revision,
    })),
  });
  await rm(source);
  if (result.warnings.length) throw new Error(result.warnings.join("\n"));
  const bytes =
    sorted.reduce((sum, entry) => sum + entry.bytes, 0) +
    (await stat(join(root, "sw.js"))).size;
  if (bytes > OFFLINE_BUDGET)
    throw new Error(`PWA precache exceeds 3 MiB: ${bytes} bytes`);
  const report = {
    build: id,
    bytes,
    budget: OFFLINE_BUDGET,
    pages,
    assets: sorted.map(({ url }) => url),
  };
  await writeFile(
    join(root, "pwa-report.json"),
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    join(root, "_headers"),
    (await readFile(join(root, "_headers"), "utf8")) +
      `\n/sw.js\n  Cache-Control: no-cache, max-age=0, must-revalidate\n/manifest.webmanifest\n  Cache-Control: no-cache, max-age=0, must-revalidate\n`,
  );
  console.log(
    `PWA: ${pages.length} pages, ${sorted.length} assets, ${(bytes / 1048576).toFixed(2)} MiB. Audio excluded; updates wait for closed sessions.`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const preview = process.argv.includes("--preview");
  const mode = preview ? "preview" : "production";
  const env = { ...loadEnv(mode, process.cwd(), "PUBLIC_"), ...process.env };
  await buildPWA(process.env.PWA_BUILD_DIR || "dist", {
    enabled: pwaEnabled(mode, env),
    preview,
  });
}
