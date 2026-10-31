import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files.sort();
}
const escapeXML = (text) => text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

// Derive the sitemap from the pages actually emitted, including future posts
// and projects. Never advertise noindex pages or preview-only content.
export async function writeLaunchAssets(directory, site, preview) {
  const urls = [];
  if (!preview) {
    for (const path of await htmlFiles(directory)) {
      const html = await readFile(path, "utf8");
      if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue;
      const canonical = /<link\s+rel="canonical"\s+href="([^"]+)"/i.exec(html)?.[1];
      if (!canonical) throw new Error(`Missing canonical URL: ${path}`);
      if (new URL(canonical).origin !== new URL(site).origin)
        throw new Error(`Unexpected canonical origin: ${path}`);
      urls.push(canonical);
    }
  }
  await writeFile(join(directory, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].sort().map((url) => `\n  <url><loc>${escapeXML(url)}</loc></url>`).join("")}\n</urlset>\n`);
  await writeFile(join(directory, "robots.txt"), `User-agent: *\nAllow: /\n${preview ? "# Preview pages use noindex; allow crawling so it can be read.\n" : `Sitemap: ${new URL("/sitemap.xml", site).href}\n`}`);
  await writeFile(join(directory, "_headers"), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: frame-ancestors 'none'
${preview ? "  X-Robots-Tag: noindex, follow\n" : ""}
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Keep alternate Cloudflare hostnames out of search, even for production builds.
https://:project.pages.dev/*
  X-Robots-Tag: noindex, follow
https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex, follow
`);
}

export function launchAssets({ preview }) {
  let site;
  return {
    name: "personal-site-launch-assets",
    hooks: {
      "astro:config:done": ({ config }) => { site = config.site; },
      "astro:build:done": async ({ dir }) => {
        await writeLaunchAssets(fileURLToPath(dir), site, preview);
      },
    },
  };
}
