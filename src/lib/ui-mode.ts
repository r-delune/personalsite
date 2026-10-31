// Play mode: click the empty sky (or press F, or the player's expand button)
// and the page steps aside. Content, rail and chrome fade with a soft blur,
// the planet glides to centre stage and then drifts through a slow sequence
// of camera "shots" while the music plays. Click, Escape or any navigation
// key brings everything back.
//
// One attribute drives both the CSS and the stage: <html data-ui="play">.
import { atom } from "nanostores";
import { routePose, stageWriter, refreshExclusions } from "./stage-bridge";
import { $player, currentTrack, playTrack } from "./player";
import initialTracks from "../fixtures/playable-tracks.json";

export const $playMode = atom(false);
/** True while the play-mode HUD should show its controls (recent input). */
export const $hudAwake = atom(false);

/** Long, slow shots. Order matters: wide → horizon → close limb → wide… */
export const STORY_SHOTS = ["storyboard-0", "storyboard-1", "storyboard-2"] as const;
const SHOT_SECONDS = 26;
const HUD_SLEEP_MS = 2600;
const CLICK_SLOP = 6;

/** Anything a visitor might mean to click, read or select is not sky. */
const NOT_SKY = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "dialog",
  "video",
  "audio",
  "img",
  "svg",
  "figure",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "li",
  "dt",
  "dd",
  "table",
  "pre",
  "code",
  "blockquote",
  "[role=slider]",
  "[role=button]",
  "[contenteditable=true]",
  "[data-stage-exclude]",
  "[data-panel]",
  "[data-no-sky]",
  ".player",
  ".play-hud",
  ".topbar",
  ".site-footer",
].join(",");

let shotTimer = 0;
let shotIndex = 0;
let sleepTimer = 0;
let bound = false;
let restoreFocus: HTMLElement | null = null;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function featuredTrackId(): string | undefined {
  return initialTracks[0]?.id;
}

function setShot(index: number) {
  shotIndex = index % STORY_SHOTS.length;
  stageWriter.route(STORY_SHOTS[shotIndex] as never);
}

function scheduleShots() {
  clearInterval(shotTimer);
  if (reduced()) return;
  shotTimer = window.setInterval(() => {
    // Hold the frame while paused or hidden; the scene keeps breathing.
    if (document.hidden || !$player.get().playing) return;
    setShot(shotIndex + 1);
  }, SHOT_SECONDS * 1000);
}

export function wakeHud() {
  $hudAwake.set(true);
  document.documentElement.classList.remove("hud-asleep");
  clearTimeout(sleepTimer);
  sleepTimer = window.setTimeout(() => {
    // Keep controls up while the pointer rests on them or focus is inside.
    const hud = document.querySelector(".play-hud");
    if (hud?.matches(":hover") || hud?.contains(document.activeElement)) {
      wakeHud();
      return;
    }
    $hudAwake.set(false);
    document.documentElement.classList.add("hud-asleep");
  }, HUD_SLEEP_MS);
}

export function enterPlayMode() {
  if ($playMode.get()) return;
  const html = document.documentElement;
  // Never strand keyboard focus on content that is about to disappear.
  const active = document.activeElement as HTMLElement | null;
  restoreFocus = active && active !== document.body ? active : null;
  active?.blur?.();
  html.dataset.ui = "play";
  $playMode.set(true);
  setShot(0);
  scheduleShots();
  refreshExclusions();
  wakeHud();
  queueMicrotask(() =>
    document.querySelector<HTMLElement>(".play-hud")?.focus({ preventScroll: true }),
  );
}

export function exitPlayMode() {
  if (!$playMode.get()) return;
  const html = document.documentElement;
  clearInterval(shotTimer);
  clearTimeout(sleepTimer);
  html.classList.remove("hud-asleep");
  html.dataset.ui = "browse";
  $playMode.set(false);
  $hudAwake.set(false);
  stageWriter.route(routePose(location.pathname));
  refreshExclusions();
  if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  restoreFocus = null;
}

export function togglePlayMode() {
  if ($playMode.get()) exitPlayMode();
  else enterPlayMode();
}

/** Play/pause from inside play mode; starts the featured release if idle. */
export function playModeToggle() {
  const item = currentTrack();
  const id = item?.id ?? featuredTrackId();
  if (id) void playTrack(id);
}

function isSky(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element.closest(NOT_SKY)) return false;
  // Text nodes inside generic containers: treat a click on a container
  // that directly holds text as content, not sky.
  const own = Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim(),
  );
  return !own;
}

export function bindPlayMode() {
  if (bound) return;
  bound = true;
  const html = document.documentElement;
  html.dataset.ui = "browse";

  let down: { x: number; y: number; button: number } | null = null;
  document.addEventListener(
    "pointerdown",
    (event) => {
      down = { x: event.clientX, y: event.clientY, button: event.button };
    },
    { passive: true, capture: true },
  );

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    const start = down;
    down = null;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP)
      return;
    if (String(getSelection() || "").length) return;
    // An open overlay closes first; that click never also changes mode.
    if (document.querySelector("dialog[open]")) return;

    if ($playMode.get()) {
      if ((event.target as Element).closest(".play-hud-controls,.play-hud button"))
        return;
      exitPlayMode();
      return;
    }
    if (isSky(event.target)) enterPlayMode();
  });

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const typing = (event.target as Element).closest?.(
      "input,textarea,select,[contenteditable=true]",
    );
    if ($playMode.get()) {
      if (event.key === "Escape" || event.key.toLowerCase() === "f") {
        event.preventDefault();
        exitPlayMode();
        return;
      }
      if (event.code === "Space") {
        // The player's own Space handler needs a loaded track; cover idle.
        if (!currentTrack()) {
          event.preventDefault();
          playModeToggle();
        }
        wakeHud();
        return;
      }
      if (event.key === "Tab" || event.key.startsWith("Arrow") || "jlm".includes(event.key.toLowerCase())) {
        wakeHud();
        return;
      }
      exitPlayMode();
      return;
    }
    if (typing || event.repeat) return;
    if (event.key.toLowerCase() === "f" && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      enterPlayMode();
    }
  });

  let last = { x: -1, y: -1 };
  window.addEventListener(
    "pointermove",
    (event: PointerEvent) => {
      if (!$playMode.get()) return;
      if (Math.hypot(event.clientX - last.x, event.clientY - last.y) < 3) return;
      last = { x: event.clientX, y: event.clientY };
      wakeHud();
    },
    { passive: true },
  );
  addEventListener("touchstart", () => $playMode.get() && wakeHud(), { passive: true });

  // Navigating anywhere returns to browsing.
  document.addEventListener("astro:before-preparation", exitPlayMode);
  // Astro swaps <html> attributes on navigation; put ours back.
  document.addEventListener("astro:after-swap", () => {
    html.dataset.ui = $playMode.get() ? "play" : "browse";
  });
  addEventListener("popstate", exitPlayMode);

  // Hints: rest the pointer on empty sky and a tiny label offers play mode.
  bindSkyHint();
}

function bindSkyHint() {
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine.matches) return;
  const hint = document.createElement("div");
  hint.className = "sky-hint micro";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = "Click · play mode";
  document.body.append(hint);
  let timer = 0;
  let anchor = { x: 0, y: 0 };
  const hide = () => {
    clearTimeout(timer);
    hint.classList.remove("is-on");
    html().classList.remove("over-sky");
  };
  const html = () => document.documentElement;
  window.addEventListener(
    "pointermove",
    (event: PointerEvent) => {
      if ($playMode.get() || event.pointerType !== "mouse") return hide();
      const sky = isSky(event.target);
      html().classList.toggle("over-sky", sky);
      if (!sky) return hide();
      if (hint.classList.contains("is-on")) {
        if (Math.hypot(event.clientX - anchor.x, event.clientY - anchor.y) > 24) hide();
        else return;
      }
      clearTimeout(timer);
      anchor = { x: event.clientX, y: event.clientY };
      timer = window.setTimeout(() => {
        hint.style.transform = `translate(${anchor.x + 14}px, ${anchor.y + 16}px)`;
        hint.classList.add("is-on");
      }, 650);
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", hide);
  document.addEventListener("pointerdown", hide, true);
  // Keep the hint body-level across Astro swaps.
  document.addEventListener("astro:after-swap", () => {
    if (!hint.isConnected) document.body.append(hint);
    hide();
  });
}
