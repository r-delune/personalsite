# Launching me.rdelune.dev

`PUBLIC_SITE_URL` defaults to `https://me.rdelune.dev`. Override it with a bare
HTTPS origin if the domain changes. Canonicals, social URLs, sitemap, structured
data and RSS use that same origin. The default social card can be regenerated
with `node scripts/generate-social.mjs`.

The separate Cloudflare Pages project is `rdelune-personalsite`. Publish the checked
`dist` artifact using Wrangler Direct Upload; Cloudflare does not rebuild it.
Production uses `pnpm build`. Ordinary previews use `pnpm build:preview`.
Production builds reject `PREVIEW=1`. Configure `PUBLIC_MIX_MEDIA_BASE` with an
HTTPS media origin for published mixes; local preview media stays local.

The build checks rendered copy, metadata, JSON, indexing, internal links and
accessibility basics (language, primary heading, skip link, main landmark and alt text).
Any failed check removes `dist`, including stale output from an earlier build.
Any rendered `TODO(copy)` text intentionally prevents publication until that
copy is approved. Do not deploy preview output
as the production site or bypass the build command by uploading an older `dist`.

Preview HTML has `noindex`, an empty sitemap, and no sitemap advertisement.
Preview `_headers` also sets `X-Robots-Tag`. Cloudflare's alternate pages.dev
hostnames receive noindex even for production artifacts. These rules control
indexing; they do not make a preview private.

The generated `_headers` file applies nosniff, DENY framing, a referrer policy,
camera/microphone/location restrictions and one-year HSTS for this hostname only.
It also caches fingerprinted Astro assets. Astro generates a per-page CSP with
script hashes. Style elements use generated hashes and self-hosted stylesheets;
inline style attributes remain allowed for Shiki, waveform positions and scene
transitions. Framing is denied through the response header because meta CSP
cannot enforce `frame-ancestors`.

Cloudflare Pages applies `_headers`; a plain local server does not. Before
publishing, enable the domain's HTTPS redirect in Cloudflare and verify the actual
responses, 404 status, headers, player and transitions on the deployed host.
HSTS deliberately excludes `includeSubDomains` and preload.

The quality workflow runs type checks, tests and verified preview and production
builds on push/PR, plus a production dependency audit. Production publication must remain conditional on the production
command succeeding. Search Console submission and real-user Core Web Vitals
measurement happen after deployment; neither is provisioned automatically here.

Visitors with reduced motion, data saving, or a saved animation pause keep the
static route poster without loading the scene runtime/Three.js. Data-saving and
paused visitors can explicitly enable animation. The development lab continues
to load the renderer directly for its still-image and comparison tools.

## PWA builds and deployment

The private source repository is `https://github.com/r-delune/personalsite`.
Use Node 24 and pnpm 10 for CI. The manual `Deploy checked site` workflow supports
staging and production; production does not auto-publish on every push.

Production enables the PWA by default. For PWA staging, run
`PUBLIC_PWA_ENABLED=1 pnpm build:preview`. Ordinary previews do not generate a
worker or advertise installation. `PUBLIC_PWA_ENABLED=0` disables future worker
registration/generation, but does not remove a worker already installed in a
visitor's browser; repair that worker at `/sw.js` when needed.

The manifest has a stable `/` identity and standalone display. The worker caches
published HTML and its static dependencies, plus small posters/artwork/data.
The build enforces a 3 MiB raw precache budget and excludes audio, lab routes,
sample posts and local media. Optional renderer chunks stay out of the eager
precache and can be cached after they are actually requested. Cache versions
follow content hashes. Updates wait until existing sessions close; there is no
forced reload, automatic skipWaiting or autoplay on reopening.

Set `PUBLIC_MIX_MEDIA_BASE=https://audio.rdelune.dev/mixes` for deployment.
The confirmed first mix is **26' (2026)**. Its current streaming file hashes to
`f843b1b3515ff0efef191045945e8217b02975ab1aa4c235c37408539d3dc53d`, is
168,574,431 bytes, and lasts 4214.360775 seconds. Its waveform/score data were
regenerated from that file; the older input README describes an earlier version.
The immutable R2 key is `mixes/roam-mix-2026.f843b1b3.mp3` in `roam-tracks`.

`node scripts/publish-mix.mjs /absolute/path/to/ROAM_MIX_2026.mp3` verifies the
source hash/size before an explicit R2 upload. Then run
`PUBLIC_MIX_MEDIA_BASE=https://audio.rdelune.dev/mixes node scripts/check-media.mjs --remote`
to verify HTTPS media type, byte length and 206 seeking before site deployment.
Do not publish an artifact referring to an unverified/missing object.

For repeatable GitHub deployment, configure each GitHub environment (`staging`,
`production`) with a narrowly scoped Cloudflare Pages token in secret
`CLOUDFLARE_API_TOKEN` and account ID in variable `CLOUDFLARE_ACCOUNT_ID`.
The workflow uploads the exact checked artifact and serializes deployments per
target. Add production environment protection/reviewers to match your release
process. OAuth credentials from the local Wrangler login are never copied into
GitHub or this repository.

The first release can use the existing local Wrangler login. Staging deployment:
`wrangler pages deploy dist --project-name rdelune-personalsite --branch pwa-staging`.
After staging passes, build production again and deploy with `--branch main`.
Check actual responses, install metadata, offline browsing, worker updates,
playback and seeking. Cloudflare's pages.dev alternate origin remains noindex.
Keep a known-good artifact and preserve old hashed dependencies while old
sessions may still be open. A host rollback alone does not remove an installed
service worker; recovery must include a compatible worker at its stable URL.
