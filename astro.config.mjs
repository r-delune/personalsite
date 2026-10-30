import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import mdx from '@astrojs/mdx';
import { localMixPlugin } from './scripts/local-mix-plugin.mjs';

export default defineConfig({
  output: "static",
  integrations: [preact(), mdx()],
  markdown: { shikiConfig: { theme: 'github-dark' } },
  vite: { plugins: [localMixPlugin()] },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
