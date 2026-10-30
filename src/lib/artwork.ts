const cache = new Map<string, HTMLImageElement>();
export function preloadArtwork(url: string | null | undefined) {
  if (!url) return;
  url = new URL(url, location.href).href;
  if (cache.has(url)) return;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  cache.set(url, image);
  void image.decode().catch(() => {});
}
let bound = false;
export function bindArtworkPreload() {
  if (bound) return;
  bound = true;
  const onIntent = (event: Event) => {
    const row = (event.target as Element).closest<HTMLElement>(
      "[data-preload-artwork]",
    );
    if (row) preloadArtwork(row.dataset.preloadArtwork);
  };
  document.addEventListener("pointerover", onIntent, { passive: true });
  document.addEventListener("focusin", onIntent);
}
