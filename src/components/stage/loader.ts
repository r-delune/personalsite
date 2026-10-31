// Keep Three.js, scene construction and GPU allocation behind user preferences.
// The lab imports runtime directly so still rendering and its controls are intact.
type Connection = EventTarget & { saveData?: boolean };
export function launchStage() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  let paused = false;
  try { paused = localStorage.getItem("scene-paused") === "true"; } catch {}
  let starting = false;
  let activated = false;
  let optedIn = false;

  const syncPoster = () => {
    const root = location.pathname.split("/")[1];
    const group = !root ? "home" : root === "music" ? "listen" : root === "mixes" ? "mixes" : "read";
    const host = document.querySelector<HTMLElement>("#stage");
    if (!host) return;
    host.dataset.renderer = "poster";
    host.querySelector("source")?.setAttribute("srcset", `/poster/${group}-mobile.avif`);
    host.querySelector("img")?.setAttribute("src", `/poster/${group}.avif`);
    document.querySelectorAll<HTMLButtonElement>(".motion-toggle").forEach((button) => {
      button.disabled = reduced.matches || starting;
      button.setAttribute("aria-pressed", String(paused));
      const label = button.querySelector(".motion-label") || button;
      label.textContent = reduced.matches ? "Reduced motion" : paused ? "Resume animation" : "Enable animation";
    });
  };
  const load = async () => {
    if (starting || activated || reduced.matches || paused || (connection?.saveData && !optedIn)) {
      if (!activated) syncPoster();
      return;
    }
    starting = true;
    syncPoster();
    try {
      const { initStage } = await import("./runtime");
      // Preferences may change while the deferred chunk downloads.
      if (reduced.matches || paused || (connection?.saveData && !optedIn)) return;
      document.removeEventListener("click", onToggle, true);
      const controller = await initStage();
      activated = !!controller;
      if (!activated) document.addEventListener("click", onToggle, true);
      else {
        document.removeEventListener("astro:page-load", syncPoster);
        reduced.removeEventListener("change", onPreference);
        connection?.removeEventListener("change", onPreference);
      }
    } catch (error) {
      console.warn("Ambient scene using static fallback.", error);
    } finally {
      starting = false;
      if (!activated) syncPoster();
    }
  };
  const onToggle = (event: Event) => {
    if (!(event.target as Element).closest?.(".motion-toggle") || reduced.matches || starting) return;
    optedIn = true;
    paused = false;
    try { localStorage.setItem("scene-paused", "false"); } catch {}
    void load();
  };
  const onPreference = () => { void load(); };
  document.addEventListener("click", onToggle, true);
  document.addEventListener("astro:page-load", syncPoster);
  reduced.addEventListener("change", onPreference);
  connection?.addEventListener("change", onPreference);
  syncPoster();
  if ("requestIdleCallback" in window) window.requestIdleCallback(() => void load(), { timeout: 1600 });
  else setTimeout(() => void load(), 100);
}
