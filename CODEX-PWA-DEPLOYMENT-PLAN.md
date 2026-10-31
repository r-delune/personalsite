# PWA and deployment plan

31 October 2026. Planning only: no packages installed, service worker registered, media uploaded, hosting provisioned or deployment performed.

## Recommended first release

Keep Astro's static output, Preact player and existing transitions. Add installation, an app icon, reliable offline access to a small set of pages, and safe updates. Audio continues to stream online. Defer offline album/mix downloads, push notifications, accounts, app-store packaging and background downloads.

This gives the personal site a useful app-like form without making visitors download a music library. Installability and offline functionality are separate concerns; the manifest enables installation features, while a service worker adds the proposed offline behaviour. [MDN installation guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Current foundation

- Astro 7.4.4 / Vite 8.3.5, static output, no PWA integration or worker found.
- `LAUNCH.md` and `scripts/site-config.mjs` already target **https://me.rdelune.dev** and Cloudflare Pages. Treat that as the proposed production address, pending final domain confirmation.
- Released tracks already reference **https://audio.rdelune.dev**. Reuse that media origin if its ownership, storage configuration and access are available; do not provision a duplicate media setup blindly.
- Mix streaming currently relies on `PUBLIC_MIX_MEDIA_BASE`; local audio is served by a development-only route. That route cannot be used in production.
- Existing production checks cover copy, metadata, links and indexing. Preview output is noindex. Security/header generation and a quality workflow are present.
- Native audio and Media Session handlers already exist. Installation does not replace the audio engine or guarantee OS background playback.
- No Git remote is configured in this checkout. Publishing from GitHub needs a repository/remote and the appropriate account access first.
- Concurrent visual, content and launch edits remain in the shared working tree. Consolidate them into a reviewed release candidate before provisioning automatic deployment.

## Architecture and tools

| Concern | Choice |
| --- | --- |
| Website | Existing Astro static build; no server adapter required for this scope |
| Hosting | Cloudflare Pages, using verified `dist` output |
| Deployment | GitHub Actions checks, then Wrangler Direct Upload of the checked artifact |
| Media | Existing `audio.rdelune.dev`; Cloudflare R2 with a custom domain if a new backend is actually needed |
| PWA | Web manifest, self-hosted icons, small TypeScript registration controller |
| Worker tooling | Workbox, preferably `@vite-pwa/astro` with `injectManifest` if its peer support passes the compatibility check |
| Alternative integration | Workbox build-time manifest injection after Astro output if the current integration cannot support Astro 7 / Vite 8 cleanly |
| App UI | Small Preact utility component for installation/status; register once across Astro navigation |

The official [Astro PWA integration](https://vite-pwa-org.netlify.app/frameworks/astro) exposes registration and update facilities; its existence does not establish compatibility with this project's exact dependency versions. First verify current peer dependencies and build a small spike. Do not force incompatible peers or downgrade Astro to add a PWA. [Workbox build tooling](https://developer.chrome.com/docs/workbox/modules/workbox-build) also supports manifest injection into a custom worker independently of an Astro plugin.

## 1. Prepare a deployable baseline

Deliverable: a production build that passes without a service worker.

- Agree the final domain, GitHub repository and production branch. Preserve the existing rdelune consultancy site.
- Reconcile the shared working tree, integrate current content and transition work, then run checks on a stable commit.
- Run `pnpm check`, `pnpm test`, `pnpm build` and the production dependency check. Resolve actual failures rather than bypassing the content guard. Re-evaluate current copy; earlier placeholder reports may be stale after the other chat's content work.
- Keep preview-only samples, the stage lab, diagnostics, local paths and unpublished material out of production output. Confirm this in the emitted artifact, including assets that might later be cached.
- Verify media configuration before showing playable controls. Any mix whose final source or publication details are missing remains unavailable or excluded under the current catalogue rules.

## 2. Add the PWA foundation

Deliverable: installable staging build, small offline footprint, no forced reloads.

### Identity and installation

Use a stable same-origin manifest: `id: "/"`, `start_url: "/"`, `scope: "/"`, `name: "Brían Diolún"`, `short_name: "Brían"`, `display: "standalone"`, dark theme/background matching the site. Confirm the short name visually on devices.

Generate regular 192px/512px PNG icons, a separately checked maskable icon, and an Apple touch icon from the existing b/d identity. Use CSS/vector/native image tooling for this simple mark. Check small-size legibility, maskable safe area and device cropping. Include manifest/theme metadata consistently in the shared layout.

Keep installation optional and quiet: a menu/footer “Install app” action when supported. Hide it in standalone mode. Give concise platform-specific instructions where a browser does not expose an install prompt. Never show an unsolicited installation modal on first visit.

### Cache policy

Proposed initial offline budget: **under 3 MB of transferred first-install app assets**, measured on the built artifact. Exclude optional WebGL runtime/Three.js from eager downloads; offline views may use the static route poster. Revise the budget only after measurement.

| Resource | Proposed behaviour |
| --- | --- |
| Manifest, icons, minimal fonts/CSS/app modules, home and offline document | Small revisioned precache |
| Remaining core public pages | Precache if the measured budget allows; explicitly list what works offline |
| Other public HTML / future writing | Network-first; bounded last-successful cache; offline document for uncached routes |
| Fingerprinted `/_astro/` dependencies | Revisioned/cache-first; preserve dependencies required by cached HTML |
| Posters and artwork | Bounded cache, with static offline poster included in the shell |
| Peaks/scores/tracklists | Small, versioned and bounded; only for available content, not the entire archive automatically |
| Audio, range requests, external services | Network only in v1; no service-worker audio interception or precache |
| Lab/dev/local-media paths, non-GET requests, errors | Excluded from caching |

Astro's ClientRouter loads HTML with `fetch()`, so handling only `request.mode === "navigate"` is insufficient. Generate an allowlist of built HTML paths and cover both full navigations and router/prefetch HTML fetches. Do not assume those fetches have a special Accept header. Normalize fragments and mix `?t=` position queries without merging unrelated query variants. Never replace missing JS, JSON, images or audio with an HTML fallback.

An offline message must be honest: browsing may work; music needs a connection. Installation must not say the entire site/music is “available offline” merely because worker installation completed. Keep the player usable after reconnecting without repeated permission prompts.

### Updates and navigation

Register once in the persistent application lifecycle; do not register on every `astro:page-load`. Leave development and ordinary preview deployments worker-free. Enable workers on the production origin and a separate, explicit PWA staging build only.

Use the normal waiting-worker lifecycle for v1: **no automatic `skipWaiting`, no forced `controllerchange` reload, no reload during playing/loading/buffering**. New versions activate after existing sessions close. A later manual “Update now” flow would need coordination across tabs/windows so one idle tab cannot interrupt another that is playing.

Version caches, retain a consistent set of HTML and its dependencies, and clean obsolete versions only when it is safe. Do not delete caches belonging to other applications on the same origin. Treat cached availability as best effort; browser storage can be evicted.

Keep the live player/stage persistence and transition interruption behaviour. Test the installed window as well as the ordinary browser; installation should not change route semantics or steal keyboard focus.

### CSP and headers

Audit the current per-page CSP against registration and worker dependencies. Add only necessary same-origin `worker-src` and `manifest-src` permissions; use a same-origin bundled registration module and worker. Do not relax script hashes or introduce CDN script dependencies.

Serve `/sw.js` and the manifest with revalidation rather than long immutable caching. Keep fingerprinted assets immutable. Verify real hosting responses because local preview does not apply Cloudflare `_headers`.

## 3. Finish production media delivery

Deliverable: stable HTTPS streaming with seeking, without committing audio to Git.

- Audit the existing audio origin first. Confirm stream URLs, MIME types, `Content-Length`, Range/206 responses, caching and error behaviour on the actual host.
- If new storage is needed, use an R2 bucket dedicated to public release media with a production custom domain. Upload only approved streaming files, preserving masters locally. Public bucket access is a distinct deployment decision, not implicit permission to expose every local audio file.
- Pages has a **25 MiB per-file asset limit**; long mixes belong outside the site artifact. [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/). R2 supports serving through custom domains; its `r2.dev` URL is intended for non-production use. [R2 public-bucket guidance](https://developers.cloudflare.com/r2/buckets/public-buckets/).
- Configure `PUBLIC_MIX_MEDIA_BASE` to the verified HTTPS origin/path. Keep credentials only in CI/hosting secrets; all `PUBLIC_*` values are public build configuration.
- Retain native streaming without adding `crossOrigin` in v1, consistent with the current audio contract. Do not change CORS mode just to make the app installable. Allow cross-origin media where needed in CSP, and configure CORS only for features that actually fetch those resources.

Offline music is a later milestone: explicit “Save for offline”, size disclosure, download/progress/cancel/delete controls, storage quotas, versioned media, CORS validation and range-aware playback. Partial streamed responses are not a complete offline file. The [Workbox media guidance](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video) explains why cached media needs special handling. That work would require revisiting the current no-crossOrigin audio contract deliberately.

## 4. Provision staging and deployment automation

Deliverable: a shareable HTTPS staging site whose checked artifact can be promoted.

Use Direct Upload from CI so deployment happens after all required jobs pass. A separate auto-deploying Pages Git integration should not publish a commit while the quality workflow is still running. This is a proposed refinement to the existing launch notes, not hosting already configured. [Cloudflare CI upload guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

Pipeline: frozen-lockfile install with Node 24 / pnpm 10 → check/tests/dependency gate → production build and artifact validation → upload exact checked `dist` → deployment smoke tests. Keep ordinary previews noindex and worker-free. Use a dedicated staging hostname/build flag for worker/offline/update testing, also noindex. A preview is public unless access control is explicitly configured.

Add artifact checks for valid manifest/icon sizes, existing manifest start URL, worker presence or absence by build mode, offline route, no audio in precache, cache budget, and no lab/debug/local URLs in cached output. Ensure CSP hashes are produced from the final HTML after the PWA integration has injected any metadata/scripts.

Use scoped Cloudflare credentials, a defined production environment and deployment concurrency so an older run cannot overwrite a newer release. Do not enable production auto-publishing until the branch/release flow is agreed.

## 5. Validate, then release

Staging acceptance must include:

- Installation and launch on desktop Chromium, Android and iOS/Safari home-screen mode; icon, title, safe areas, deep links and external links.
- Online first visit, repeat visit, offline launch, cached-page navigation, uncached-route fallback, reconnection and missing assets. Test both direct loads and Astro client navigation.
- A→B deployment while audio plays; no forced refresh or media reset. Close/reopen and verify B activates. Test more than one window/tab.
- Real streaming, scrubbing near the end, Media Session controls and background/lock-screen behaviour on physical phones. Do not promise uninterrupted playback across OS suspension.
- Rapid navigation, browser Back, modal focus, reduced motion, data saving and static-poster fallback in standalone mode.
- Actual HTTPS, headers/CSP, canonical domain, indexing, 404 status and cache headers. Installability checks alone do not establish accessibility or good performance.

Release sequence: approve the tested artifact and public content → configure the production domain/media → deploy → smoke-test production with and without an existing worker → monitor failures → submit sitemap when ready. This plan does not authorize the final public release by itself.

Rollback must cover the worker too: keep a known-good site artifact, a compatible repair-worker procedure at the stable `/sw.js` URL, and old hashed dependencies needed by active sessions. Rolling back hosting alone does not remove an already installed service worker. Never rely on telling every visitor to clear browser storage as the recovery plan.

## Proposed work packets

1. **Release baseline:** reconcile changes, settle public copy/media, repository and final domain. Exit: production build passes.
2. **PWA foundation:** compatibility spike, manifest/icons, bounded caching, offline fallback, registration and build checks. Exit: local built-mode checks pass.
3. **Cloud staging:** media/CI/hosting setup and device/update verification. Exit: staging acceptance above passes.
4. **Production release:** publish the reviewed artifact, verify responses, document recovery. Exit: installed and browser versions work on the real origin.
5. **Optional later:** user-managed offline music, after a separate storage/player design.

Immediate next implementation step: packet 1 and the small PWA compatibility spike. Account credentials, media publishing decisions and final production deployment are unnecessary for that local work.
