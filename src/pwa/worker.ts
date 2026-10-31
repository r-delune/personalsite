import { setCacheNameDetails, cacheNames } from "workbox-core";
import { precacheAndRoute, matchPrecache } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CACHE_PREFIX, pageKey, isExcluded } from "./policy.mjs";

// Keep worker types module-local: adding lib.webworker to the Astro project
// changes the global event overloads used by the browser's pointer handlers.
declare const self: {
  location: { origin: string };
  __WB_MANIFEST: { url: string; revision: string | null }[];
  addEventListener(type: "activate", callback: (event: {
    waitUntil(promise: Promise<unknown>): void;
  }) => void): void;
};
declare const __BUILD_ID__: string;
declare const __HTML_ROUTES__: string[];
setCacheNameDetails({
  prefix: CACHE_PREFIX.slice(0, -1),
  suffix: __BUILD_ID__,
});
const routes = new Set(__HTML_ROUTES__);

// Never intercept streamed partial content, even if a future cache rule broadens.
registerRoute(
  ({ request, url }) =>
    request.headers.has("range") ||
    request.destination === "audio" ||
    request.destination === "video" ||
    isExcluded(url.pathname),
  new NetworkOnly(),
);

// Astro's router fetches HTML without navigation mode or a special Accept header.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.mode === "navigate" || routes.has(pageKey(url) || "")),
  async ({ request, url }) => {
    const key = pageKey(url);
    const cached =
      key && routes.has(key) ? await matchPrecache(key) : undefined;
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch {
      return (
        (await matchPrecache("/offline")) ||
        new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }
  },
);
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [/^t$/] });

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ["script", "style", "font"].includes(request.destination),
  new CacheFirst({
    cacheName: `${CACHE_PREFIX}${__BUILD_ID__}-assets`,
    plugins: [
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 86400 }),
    ],
  }),
);
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin && request.destination === "image",
  new CacheFirst({
    cacheName: `${CACHE_PREFIX}${__BUILD_ID__}-images`,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 86400 }),
    ],
  }),
);

// No skipWaiting, clients.claim or controllerchange reload. Listening sessions
// keep their version until they close. Only this app's obsolete caches expire.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                !key.includes(__BUILD_ID__) &&
                key !== cacheNames.precache,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
