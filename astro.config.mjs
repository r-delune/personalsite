import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { siteOrigin } from "./scripts/site-config.mjs";
import preact from "@astrojs/preact";
import mdx from '@astrojs/mdx';
import { localMixPlugin } from './scripts/local-mix-plugin.mjs';
import { stageLab } from './src/lab/integration.mjs';

// Astro takes a config object, not a function: read the mode from the CLI so
// `--mode preview` and `.env.<mode>` files keep working.
const argv = process.argv;
const modeFlag = argv.indexOf("--mode");
const mode =
  modeFlag > -1 ? argv[modeFlag + 1] : argv.includes("build") ? "production" : "development";
const env = loadEnv(mode, process.cwd(), "PUBLIC_");

export default defineConfig({
  site: siteOrigin(process.env.PUBLIC_SITE_URL || env.PUBLIC_SITE_URL),
  trailingSlash: "never",
  security: { csp: {
    directives: ["default-src 'self'", "base-uri 'none'", "object-src 'none'", "form-action 'none'", "img-src 'self' data: https:", "media-src 'self' https: http://127.0.0.1:4357 http://localhost:4357", "connect-src 'self' https:"],
    scriptDirective: { resources: ["'self'"] },
    styleDirective: { resources: [
      { resource: "'self'", kind: "element" },
      { resource: "'unsafe-inline'", kind: "attribute" },
    ] },
  } },
  output: "static",
  integrations: [preact(), mdx(), stageLab()],
  markdown: { shikiConfig: { theme: 'github-dark' } },
  vite: { plugins: [localMixPlugin()] },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
