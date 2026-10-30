import { atom } from "nanostores";
import initialTracks from "../fixtures/playable-tracks.json";
import { bindStageBridge, stageWriter } from "./stage-bridge";
export interface MediaItem {
  peaksUrl?: string | null;
  scoreUrl?: string | null;
  boundariesSec?: number[];
  bpm?: number | null;
  beatStartAtSec?: number | null;
  id: string;
  kind: "track" | "mix";
  title: string;
  artist: string;
  src: string;
  duration: number;
  artwork: string;
  href: string;
}
const media = new Map<string, MediaItem>(
  initialTracks.map((t) => [t.id, { ...t, kind: "track" }]),
);
export const $player = atom({
  id: "",
  phase: "idle" as import("./stage-bridge").PlaybackPhase,
  playing: false,
  pending: false,
  time: 0,
  duration: 0,
  error: "",
  volume: 1,
  muted: false,
});
let audio: HTMLAudioElement | undefined;
let generation = 0,
  operation = 0,
  intent = false,
  confirmed = false,
  pendingSeek: number | null = null;
let listeners: AbortController | undefined,
  bound = false;
let lastSaved = 0;
export const currentTrack = () => media.get($player.get().id);
export const getMedia = (id: string) => media.get(id);
export function registerDevMedia(item: MediaItem) {
  if (import.meta.env.DEV) media.set(item.id, item);
}
function clock() {
  return audio?.currentTime || 0;
}
function duration() {
  return audio && Number.isFinite(audio.duration)
    ? audio.duration
    : currentTrack()?.duration || 0;
}
function publish(phase = $player.get().phase, error = "") {
  const d = duration();
  $player.set({
    ...$player.get(),
    phase,
    playing: phase === "playing",
    pending: phase === "loading" || phase === "buffering",
    time: clock(),
    duration: d,
    error,
  });
  stageWriter.transport(phase, clock(), d || null);
}
function saveMix() {
  const item = currentTrack();
  if (item?.kind !== "mix") return;
  try {
    localStorage.setItem(
      "mix-resume",
      JSON.stringify({ id: item.id, position: clock() }),
    );
  } catch {}
}
function ensureAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "metadata";
  stageWriter.position(clock);
  return audio;
}
function valid(token: number, item: MediaItem) {
  return (
    token === generation &&
    currentTrack()?.id === item.id &&
    (!audio?.currentSrc ||
      audio.currentSrc === new URL(item.src, location.href).href)
  );
}
function installMediaEvents(item: MediaItem, token: number) {
  const a = ensureAudio();
  listeners?.abort();
  listeners = new AbortController();
  const on = (name: string, callback: () => void) =>
    a.addEventListener(
      name,
      () => {
        if (valid(token, item)) callback();
      },
      { signal: listeners!.signal },
    );
  on("loadedmetadata", () => {
    if (pendingSeek !== null) {
      const requested = pendingSeek;
      pendingSeek = null;
      commitSeek(requested);
    }
    publish();
  });
  on("durationchange", () => publish());
  on("playing", () => {
    if (!intent) {
      a.pause();
      return;
    }
    confirmed = true;
    publish("playing");
  });
  on("waiting", () => {
    if (intent) publish(confirmed ? "buffering" : "loading");
  });
  on("stalled", () => {
    if (intent && a.readyState < 3)
      publish(confirmed ? "buffering" : "loading");
  });
  on("pause", () => {
    if (!a.ended) {
      // Native pauses (including OS/lock-screen controls) cancel pending plays.
      intent = false;
      operation++;
      publish("paused");
      saveMix();
    }
  });
  on("timeupdate", () => {
    publish();
    if (performance.now() - lastSaved > 5000) {
      saveMix();
      lastSaved = performance.now();
    }
  });
  on("seeked", () => publish());
  on("ended", () => {
    intent = false;
    publish("ended");
    saveMix();
    if (item.kind === "track") next(1, true);
  });
  on("error", () => {
    intent = false;
    publish("error", "Media could not be loaded. Retry.");
  });
}
export async function playTrack(id: string, position?: number) {
  const item = media.get(id);
  if (!item?.src) return;
  const a = ensureAudio();
  if (
    $player.get().id === id &&
    (intent || $player.get().playing) &&
    $player.get().phase !== "error" &&
    position === undefined
  ) {
    pause();
    return;
  }
  if ($player.get().id !== id) {
    saveMix();
    intent = false;
    a.pause();
    listeners?.abort();
    generation++;
    confirmed = false;
    $player.set({
      ...$player.get(),
      id,
      phase: "loading",
      playing: false,
      pending: true,
      time: 0,
      duration: item.duration,
      error: "",
    });
    stageWriter.item(id, item.kind, item.duration || null, {
      itemId: id,
      itemKind: item.kind,
      durationSec: item.duration || null,
      peaksUrl: item.peaksUrl || null,
      scoreUrl: item.scoreUrl || null,
      boundariesSec: item.boundariesSec || [],
      bpm: item.bpm ?? null,
      beatStartAtSec: item.beatStartAtSec ?? null,
    });
    pendingSeek = position ?? null;
    installMediaEvents(item, generation);
    a.src = item.src;
    a.load();
  } else if ($player.get().phase === "error") {
    generation++;
    confirmed = false;
    pendingSeek = position ?? clock();
    installMediaEvents(item, generation);
    a.load();
  } else if (position !== undefined) {
    if (a.readyState >= 1) commitSeek(position);
    else pendingSeek = position;
  }
  const token = generation,
    request = ++operation;
  intent = true;
  publish("loading");
  const session = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (session.audioSession) session.audioSession.type = "playback";
  } catch {
    // This optional platform hint must never prevent native playback.
  }
  try {
    // Issue play synchronously from the gesture, before the first await.
    await a.play();
    if (token === generation && request === operation) {
      if (!intent) a.pause();
      else if (confirmed && !a.paused && a.readyState >= 3) publish("playing");
    }
  } catch {
    if (token === generation && request === operation && intent) {
      intent = false;
      a.pause();
      publish(
        "error",
        "Playback could not start. Retry.",
      );
    }
  }
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.artist,
      artwork: item.artwork
        ? [{ src: new URL(item.artwork, location.href).href }]
        : [],
    });
  }
}
export function pause() {
  intent = false;
  operation++;
  audio?.pause();
  publish("paused");
  saveMix();
}
export function toggle() {
  const item = currentTrack();
  if (item) void playTrack(item.id);
}
function commitSeek(value: number) {
  if (!audio || !Number.isFinite(value)) return;
  const target = Math.max(0, Math.min(value, duration()));
  try {
    audio.currentTime = target;
    stageWriter.seek(target);
    publish();
  } catch {
    publish("error", "This recording cannot seek to that position.");
  }
}
export function seek(value: number) {
  if (!currentTrack() || !Number.isFinite(value)) return;
  if (!audio || audio.readyState < 1) {
    pendingSeek = value;
    return;
  }
  commitSeek(value);
}
export function next(direction: number, automatic = false) {
  const item = currentTrack();
  if (!item || item.kind === "mix") return;
  const album = Array.from(media.values()).filter(
    (m) => m.kind === "track" && m.href === item.href,
  );
  const index = album.findIndex((m) => m.id === item.id);
  const target = album[index + direction];
  if (target) void playTrack(target.id);
  else if (!automatic) pause();
}
export function volume(value: number) {
  if (audio) audio.volume = value;
  $player.set({ ...$player.get(), volume: value });
}
export function mute() {
  if (audio) {
    audio.muted = !audio.muted;
    $player.set({ ...$player.get(), muted: audio.muted });
  }
}
function registerPageMedia() {
  const element = document.getElementById("media-catalogue");
  if (element) {
    try {
      for (const item of JSON.parse(element.textContent || "[]") as MediaItem[])
        media.set(item.id, item);
    } catch {
      console.error("Page media catalogue is invalid");
    }
  }
  syncButtons();
}
function syncButtons() {
  const s = $player.get();
  document
    .querySelectorAll<HTMLElement>("[data-track-id]")
    .forEach((button) => {
      const active = button.dataset.trackId === s.id;
      button.classList.toggle("is-playing", active && s.playing);
      button.setAttribute("aria-pressed", String(active && s.playing));
      const glyph = button.querySelector("[data-play-glyph]");
      if (glyph) glyph.textContent = active && s.playing ? "Ⅱ" : "▶";
    });
}
export function bindPlayback() {
  if (bound) return;
  bound = true;
  bindStageBridge();
  registerPageMedia();
  document.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      "[data-track-id]",
    );
    if (button?.dataset.trackId && !button.hasAttribute("disabled"))
      void playTrack(button.dataset.trackId);
  });
  $player.subscribe(syncButtons);
  document.addEventListener("astro:page-load", registerPageMedia);
  document.addEventListener("keydown", (event) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.repeat ||
      (event.target as Element).closest(
        "input,textarea,select,button,a,[role=slider],[contenteditable=true]",
      )
    )
      return;
    if (!currentTrack()) return;
    if (event.code === "Space") {
      event.preventDefault();
      toggle();
    } else if (event.key.toLowerCase() === "j") seek(clock() - 15);
    else if (event.key.toLowerCase() === "l") seek(clock() + 15);
    else if (event.key.toLowerCase() === "m") mute();
  });
  if ("mediaSession" in navigator) {
    const handlers: Partial<
      Record<MediaSessionAction, MediaSessionActionHandler>
    > = {
      play: () => {
        const item = currentTrack();
        if (item && !$player.get().playing) void playTrack(item.id);
      },
      pause,
      previoustrack: () => next(-1),
      nexttrack: () => next(1),
      seekbackward: (d) => seek(clock() - (d.seekOffset || 15)),
      seekforward: (d) => seek(clock() + (d.seekOffset || 15)),
      seekto: (d) => {
        if (d.seekTime !== undefined) seek(d.seekTime);
      },
    };
    for (const [action, handler] of Object.entries(handlers))
      try {
        navigator.mediaSession.setActionHandler(
          action as MediaSessionAction,
          handler!,
        );
      } catch {}
  }
}
