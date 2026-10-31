import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { siteOrigin } from "./scripts/site-config.mjs";
import { launchAssets } from "./scripts/launch-assets.mjs";
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
const env = loadEnv(mode, process.cwd(), "");
const preview = mode === "preview" || env.PREVIEW === "1";
if (argv.includes("build") && mode !== "preview" && env.PREVIEW === "1")
  throw new Error("PREVIEW=1 cannot be used with a production build. Use pnpm build:preview instead.");

export default defineConfig({
  site: siteOrigin(process.env.PUBLIC_SITE_URL || env.PUBLIC_SITE_URL),
  trailingSlash: "never",
  security: { csp: {
    directives: ["default-src 'self'", "base-uri 'none'", "object-src 'none'", "worker-src 'self'", "manifest-src 'self'", "form-action 'none'", "img-src 'self' data: https:", `media-src 'self' https:${preview ? " http://127.0.0.1:4357 http://localhost:4357" : ""}`, "connect-src 'self' https:"],
    scriptDirective: { resources: ["'self'"] },
    styleDirective: { resources: [
      { resource: "'self'", kind: "element" },
      { resource: "'unsafe-inline'", kind: "attribute" },
    ] },
  } },
  output: "static",
  build: { format: "file" },
  integrations: [preact(), mdx(), stageLab(), launchAssets({ preview })],
  markdown: { shikiConfig: { theme: 'github-dark' } },
  vite: { plugins: [localMixPlugin()] },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
