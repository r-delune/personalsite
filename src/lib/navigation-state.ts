/** Only morph artwork between its catalogue and its own release detail. */
export function sharedRelease(from: URL, to: URL): string | null {
  if (from.origin !== to.origin) return null;
  const clean = (url: URL) => url.pathname.replace(/\/+$/, "");
  const source = clean(from),
    destination = clean(to);
  const detail =
    source === "/music" ? destination : destination === "/music" ? source : "";
  return /^\/music\/([a-z0-9-]+)$/.exec(detail)?.[1] ?? null;
}
/** An older aborted transition must never clean a newer one's names. */
export function createTransitionCleanup() {
  let generation = 0;
  let callbacks: (() => void)[] = [];
  const clear = () => {
    const pending = callbacks;
    callbacks = [];
    pending.forEach((callback) => callback());
  };
  return {
    begin() {
      clear();
      const current = ++generation;
      return () => {
        if (current === generation) clear();
      };
    },
    add(callback: () => void) {
      callbacks.push(callback);
    },
  };
}
