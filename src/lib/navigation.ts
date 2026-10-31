import { sharedRelease, createTransitionCleanup } from "./navigation-state";

type Preparation = Event & {
  from: URL;
  to: URL;
  signal: AbortSignal;
  newDocument: Document;
};
type Swap = Preparation & { viewTransition: ViewTransition };
let bound = false;
export function bindAppNavigation() {
  if (bound) return;
  bound = true;
  const scopes = createTransitionCleanup();
  let finish = () => {};
  let activeTransition: ViewTransition | undefined;
  let reveal = { finished: Promise.resolve<unknown>(undefined) };
  const routeClosedDialogs = new WeakSet<HTMLDialogElement>();
  // A fresh interaction takes priority over a decorative snapshot in flight.
  const interrupt = () => activeTransition?.skipTransition();
  document.addEventListener("pointermove", interrupt, {
    capture: true,
    passive: true,
  });
  document.addEventListener("pointerdown", interrupt, {
    capture: true,
    passive: true,
  });
  document.addEventListener("keydown", interrupt, true);
  function syncRail() {
    const root = location.pathname.split("/")[1];
    const rail = document.querySelector<HTMLElement>(".rail");
    rail?.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
      if (a.pathname.split("/")[1] === root)
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const active = rail?.querySelector<HTMLElement>("a[aria-current]");
    const indicator = rail?.querySelector<HTMLElement>(".rail-active");
    if (indicator && rail) {
      indicator.style.opacity = active ? "1" : "0";
      if (active)
        indicator.style.transform = `translateY(${active.offsetTop + active.offsetHeight / 2 - 7}px)`;
    }
  }
  // Delegation binds once, including on the initial page and retained DOM.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-print]")) window.print();
    if (target?.closest(".menu-trigger")) {
      const dialog = document.querySelector<HTMLDialogElement>("#mobile-menu");
      if (dialog && !dialog.open) {
        routeClosedDialogs.delete(dialog);
        dialog.showModal();
      }
      document.documentElement.classList.add("menu-open");
      document
        .querySelector(".menu-trigger")
        ?.setAttribute("aria-expanded", "true");
    }
    if (target?.closest(".menu-close"))
      document.querySelector<HTMLDialogElement>("#mobile-menu")?.close();
  });
  document.addEventListener(
    "close",
    (event) => {
      if (
        !(event.target instanceof HTMLDialogElement) ||
        event.target.id !== "mobile-menu"
      )
        return;
      document.documentElement.classList.remove("menu-open");
      const trigger =
        document.querySelector<HTMLButtonElement>(".menu-trigger");
      trigger?.setAttribute("aria-expanded", "false");
      if (!routeClosedDialogs.has(event.target))
        trigger?.focus({ preventScroll: true });
    },
    true,
  );
  document.addEventListener("astro:before-preparation", (raw) => {
    const event = raw as Preparation & { loader: () => Promise<void> };
    const dialog = document.querySelector<HTMLDialogElement>("#mobile-menu");
    if (dialog?.open) {
      routeClosedDialogs.add(dialog);
      dialog.close();
    }
    document.documentElement.classList.remove("menu-open");
    document
      .querySelector(".menu-trigger")
      ?.setAttribute("aria-expanded", "false");
    finish = scopes.begin();
    const currentFinish = finish;
    event.signal.addEventListener("abort", currentFinish, { once: true });
    const load = event.loader;
    // Assign BOTH snapshot names after fetch but before the old capture.
    // after-preparation carries no payload; before-swap is too late for old names.
    event.loader = async () => {
      try {
        await load();
        if (!event.defaultPrevented) prepareSurfaces(event);
      } catch (error) {
        currentFinish();
        throw error;
      }
    };
  });
  function prepareSurfaces(event: Preparation) {
    if (
      event.signal.aborted ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const touched: HTMLElement[] = [];
    const name = (element: HTMLElement | null, value: string) => {
      if (!element) return;
      element.style.viewTransitionName = value;
      touched.push(element);
    };
    const release = sharedRelease(event.from, event.to);
    if (release) {
      const find = (doc: Document) =>
        Array.from(doc.querySelectorAll<HTMLElement>("[data-cover-name]")).find(
          (image) => image.dataset.coverName === release,
        ) ?? null;
      const oldCover = find(document),
        newCover = find(event.newDocument);
      if (oldCover && newCover) {
        name(oldCover, "release-cover");
        name(newCover, "release-cover");
      }
    }
    scopes.add(() =>
      touched.forEach((element) =>
        element.style.removeProperty("view-transition-name"),
      ),
    );
  }
  document.addEventListener("astro:before-swap", (raw) => {
    const event = raw as Swap;
    const currentFinish = finish;
    const transition = event.viewTransition;
    const root = event.newDocument.documentElement;
    const rows = Array.from(
      event.newDocument.querySelectorAll<HTMLElement>("main [data-row]"),
    )
      .filter((row) => !row.parentElement?.closest("[data-row]"))
      .slice(0, 6);
    root.classList.add("route-enter");
    rows.forEach((row, i) => row.setAttribute("data-route-row", String(i)));
    scopes.add(() => {
      root.classList.remove("route-enter");
      // Astro copies root attributes; it does not move the incoming <html> node.
      document.documentElement.classList.remove("route-enter");
      rows.forEach((row) => row.removeAttribute("data-route-row"));
    });
    const currentReveal = { finished: Promise.resolve<unknown>(undefined) };
    reveal = currentReveal;
    activeTransition = transition;
    const complete = async () => {
      await currentReveal.finished;
      currentFinish();
      if (activeTransition === transition) activeTransition = undefined;
    };
    // Runs for completion, skipped animations and rejected transitions.
    void transition.finished.then(complete, complete);
  });
  document.addEventListener("astro:after-swap", () => {
    syncRail();
    const animations = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main, main .page-title, main .route-body, main [data-route-row]",
      ),
    ).flatMap((element) => element.getAnimations());
    reveal.finished = Promise.allSettled(
      animations.map((animation) => animation.finished),
    );
  });
  document.addEventListener("astro:page-load", () => {
    syncRail();
  });
  addEventListener("resize", syncRail);
  syncRail();
}
