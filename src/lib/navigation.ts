let bound = false,
  timer: ReturnType<typeof setTimeout> | undefined,
  cover: string | null = null;
export function bindAppNavigation() {
  if (bound) return;
  bound = true;
  function syncRail() {
    const root = location.pathname.split("/")[1];
    document.querySelectorAll<HTMLAnchorElement>(".rail>a").forEach((a) => {
      if (a.pathname.split("/")[1] === root)
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const active = document.querySelector<HTMLElement>(".rail>a[aria-current]"),
      rail = document.querySelector<HTMLElement>(".rail"),
      indicator = document.querySelector<HTMLElement>(".rail-active");
    if (indicator && rail) {
      indicator.style.opacity = active ? "1" : "0";
      if (active)
        indicator.style.transform = `translateY(${active.offsetTop + active.offsetHeight / 2 - 7}px)`;
    }
  }
  function bindPage() {
    syncRail();
    document
      .querySelector<HTMLButtonElement>("[data-print]")
      ?.addEventListener("click", () => window.print());
    const dialog = document.querySelector<HTMLDialogElement>("#mobile-menu"),
      trigger = document.querySelector<HTMLButtonElement>(".menu-trigger");
    if (!dialog || !trigger) return;
    trigger.onclick = () => {
      dialog.showModal();
      document.documentElement.classList.add("menu-open");
      trigger.setAttribute("aria-expanded", "true");
    };
    const close = () => dialog.close();
    dialog.querySelector<HTMLButtonElement>(".menu-close")!.onclick = close;
    dialog.addEventListener("close", () => {
      document.documentElement.classList.remove("menu-open");
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus({ preventScroll: true });
    });
    dialog
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", close));
  }
  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[data-cover-link]",
    );
    if (link) {
      cover = link.dataset.coverLink || null;
      const img = link.querySelector<HTMLElement>("img");
      if (img && cover) img.style.viewTransitionName = `cover-${cover}`;
    }
  });
  document.addEventListener("astro:before-preparation", () => {
    const header = document.querySelector<HTMLElement>(
      ".release-detail [data-cover-name]",
    );
    if (header) {
      cover = header.dataset.coverName || null;
      header.style.viewTransitionName = `cover-${cover}`;
    }
  });
  document.addEventListener("astro:before-swap", (event) => {
    clearTimeout(timer);
    document.querySelector<HTMLDialogElement>("#mobile-menu")?.close();
    document.documentElement.classList.remove("menu-open");
    const next = (event as Event & { newDocument: Document }).newDocument;
    next.documentElement.classList.add("route-enter");
    if (cover) {
      const match = Array.from(
        next.querySelectorAll<HTMLElement>("[data-cover-name]"),
      ).find((img) => img.dataset.coverName === cover);
      if (match) match.style.viewTransitionName = `cover-${cover}`;
    }
  });
  document.addEventListener("astro:after-swap", () => {
    syncRail();
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.documentElement.classList.remove("route-enter");
      document
        .querySelectorAll<HTMLElement>("[data-cover-name]")
        .forEach((img) => img.style.removeProperty("view-transition-name"));
      cover = null;
    }, 350);
  });
  document.addEventListener("astro:page-load", bindPage);
  addEventListener("resize", syncRail);
  bindPage();
}
