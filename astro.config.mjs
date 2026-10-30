import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { siteOrigin } from "./scripts/site-config.mjs";
import preact from "@astrojs/preact";
import mdx from '@astrojs/mdx';
import { localMixPlugin } from './scripts/local-mix-plugin.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "PUBLIC_");
  return {
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
  integrations: [preact(), mdx()],
  markdown: { shikiConfig: { theme: 'github-dark' } },
  vite: { plugins: [localMixPlugin()] },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
  };
});
