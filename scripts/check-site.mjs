import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { htmlFiles } from "./launch-assets.mjs";
import { siteOrigin } from "./site-config.mjs";

const preview = process.argv.includes("--preview");
const root = "dist";
const pages = await htmlFiles(root);
assert(pages.length, "Build emitted no HTML pages");
for (const path of pages) {
  const html = await readFile(path, "utf8");
  const head = html.split("</head>")[0];
  const is404 = relative(root, path) === "404.html";
  const isOffline = ["offline/index.html", "offline.html"].includes(relative(root, path).replaceAll("\\", "/"));
  assert(/<html\b[^>]*\blang="[^"]+"/.test(html), `${path}: missing document language`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: expected one primary heading`);
  assert(/<main\b[^>]*\bid="main"/.test(html) && /href="#main"/.test(html), `${path}: missing main landmark or skip link`);
  for (const image of html.matchAll(/<img\b[^>]*>/g))
    assert(/\balt="[^"]*"/.test(image[0]), `${path}: image missing alt text`);
  assert(/<meta name="description" content="[^"]+"/.test(head), `${path}: missing description`);
  assert(/property="og:image" content="https:\/\//.test(head), `${path}: missing social image`);
  assert(/http-equiv="content-security-policy"/i.test(head), `${path}: missing CSP`);
  const noindex = /name="robots" content="[^"]*noindex/.test(head);
  assert.equal(noindex, preview || is404 || isOffline, `${path}: incorrect indexing policy`);
  if (!is404 && !isOffline) assert(/rel="canonical" href="https:\/\//.test(head), `${path}: missing canonical`);
  for (const match of html.matchAll(/<script\b[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g))
    JSON.parse(match[1]);
  const pageURL = new URL(relative(root, path).replace(/index\.html$/, "").replace(/\.html$/, ""), siteOrigin());
  for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (href.startsWith("#") || !href || /^[a-z]+:/i.test(href) || href.startsWith("//")) continue;
    const url = new URL(href, pageURL);
    const target = join(root, decodeURIComponent(url.pathname));
    const candidates = [target, `${target}.html`, join(target, "index.html")];
    let found = false;
    for (const candidate of candidates) {
      try { if ((await stat(candidate)).isFile()) { found = true; break; } } catch {}
    }
    assert(found, `${path}: broken internal link ${href}`);
  }
}
await stat(join(root, "social/default.png"));
const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
assert.equal(sitemap.includes("<loc>"), !preview, "Incorrect sitemap visibility");
console.log(`Verified metadata, JSON, CSP, indexing, internal links and accessibility basics across ${pages.length} HTML pages.`);
