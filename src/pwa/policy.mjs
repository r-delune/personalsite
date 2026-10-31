export const CACHE_PREFIX = "bd-pwa-";
export const OFFLINE_BUDGET = 3 * 1024 * 1024;
export function pageURLFromFile(file) {
  return "/" + file.replaceAll("\\", "/")
    .replace(/(?:^|\/)index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "");
}
export function pwaEnabled(mode, env = {}) {
  return (
    mode !== "development" &&
    env.PUBLIC_PWA_ENABLED !== "0" &&
    (mode !== "preview" || env.PUBLIC_PWA_ENABLED === "1")
  );
}
export function pageKey(url) {
  // Position changes do not change the HTML. Other query variants stay distinct.
  if ([...url.searchParams.keys()].some((key) => key !== "t")) return null;
  return url.pathname.replace(/\/+$/, "") || "/";
}
export function isExcluded(path) {
  return (
    /^(?:\/(?:_lab|lab|api)(?:\/|$)|\/__)/.test(path) ||
    path.includes("sample-template") ||
    /\.(?:mp3|m4a|wav|flac|aiff|mp4)$/i.test(path)
  );
}
