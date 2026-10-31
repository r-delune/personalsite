type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let bound = false;
export function bindPWA() {
  if (bound || !document.querySelector('meta[name="pwa-enabled"]')) return;
  bound = true;
  let prompt: InstallPrompt | null = null;
  let waiting = false;
  let help = false;
  const standalone = matchMedia("(display-mode: standalone)");
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = () =>
    standalone.matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  function sync() {
    document
      .querySelectorAll<HTMLButtonElement>("[data-pwa-install]")
      .forEach((button) => {
        button.hidden = !!installed() || (!prompt && !isIOS);
      });
    document
      .querySelectorAll<HTMLElement>("[data-pwa-status]")
      .forEach((status) => {
        const message = !navigator.onLine
          ? "Offline · music needs a connection"
          : help
            ? "Open Share, then choose Add to Home Screen."
            : waiting
              ? "Update ready for your next session."
              : "";
        status.hidden = !message;
        status.textContent = message;
      });
  }
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    sync();
  });
  addEventListener("appinstalled", () => {
    prompt = null;
    help = false;
    sync();
  });
  standalone.addEventListener("change", sync);
  addEventListener("online", sync);
  addEventListener("offline", sync);
  document.addEventListener("astro:page-load", sync);
  document.addEventListener("click", async (event) => {
    if (!(event.target as Element).closest?.("[data-pwa-install]")) return;
    if (prompt) {
      const current = prompt;
      prompt = null;
      sync();
      await current.prompt();
      await current.userChoice;
    } else {
      help = !help;
    }
    sync();
  });
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        waiting = !!registration.waiting;
        sync();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            waiting = !!registration.waiting;
            sync();
          });
        });
      })
      .catch((error) => console.warn("Offline browsing unavailable.", error));
  }
  sync();
}
