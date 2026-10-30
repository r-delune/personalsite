// One production origin shared by Astro, canonical URLs, structured data and RSS.
export function siteOrigin(value = "https://me.rdelune.dev") {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash)
    throw new Error("PUBLIC_SITE_URL must be an HTTPS origin without a path, credentials, port, query or fragment.");
  return url.origin;
}
