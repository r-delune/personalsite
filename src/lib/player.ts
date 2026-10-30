import { atom } from "nanostores";
import tracks from "../fixtures/playable-tracks.json";
export const $player = atom({
  id: "",
  playing: false,
  pending: false,
  time: 0,
  duration: 0,
  error: "",
});
let audio: HTMLAudioElement | undefined;
let bound = false;
let token = 0;
export const currentTrack = () => tracks.find((t) => t.id === $player.get().id);
function sync() {
  if (!audio) return;
  $player.set({
    ...$player.get(),
    playing: !audio.paused && !audio.ended,
    pending: audio.readyState < 3 && !audio.paused,
    time: audio.currentTime || 0,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
  });
}
function engine() {
  if (audio) return audio;
  audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "metadata";
  [
    "playing",
    "pause",
    "timeupdate",
    "durationchange",
    "ended",
    "seeked",
    "waiting",
    "canplay",
  ].forEach((event) => audio!.addEventListener(event, sync));
  audio.addEventListener("error", () => {
    $player.set({
      ...$player.get(),
      playing: false,
      pending: false,
      error: "This recording could not be loaded.",
    });
  });
  return audio;
}
export async function playTrack(id: string) {
  const track = tracks.find((t) => t.id === id);
  if (!track) return;
  const a = engine();
  const request = ++token;
  if ($player.get().id === id && !a.paused) {
    a.pause();
    return;
  }
  if ($player.get().id !== id) {
    a.src = track.src;
    $player.set({
      id,
      playing: false,
      pending: true,
      time: 0,
      duration: track.duration,
      error: "",
    });
  } else $player.set({ ...$player.get(), pending: true, error: "" });
  try {
    const session = navigator as Navigator & {
      audioSession?: { type: string };
    };
    if (session.audioSession) session.audioSession.type = "playback";
    await a.play();
    if (request === token) sync();
  } catch {
    if (request === token)
      $player.set({
        ...$player.get(),
        pending: false,
        playing: false,
        error: "Playback could not start. Try again.",
      });
  }
}
export function toggle() {
  const track = currentTrack();
  if (track) void playTrack(track.id);
}
export function seek(value: number) {
  if (audio && Number.isFinite(value)) {
    audio.currentTime = Math.max(0, Math.min(value, audio.duration || 0));
    sync();
  }
}
export function next(direction: number) {
  const index = tracks.findIndex((t) => t.id === $player.get().id);
  const track = tracks[index + direction];
  if (track) void playTrack(track.id);
}
export function volume(value: number) {
  if (audio) audio.volume = value;
}
export function bindPlayback() {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      "[data-track-id]",
    );
    if (button?.dataset.trackId) void playTrack(button.dataset.trackId);
  });
  $player.subscribe((state) => {
    document.querySelectorAll<HTMLElement>("[data-track-id]").forEach((b) => {
      const active = b.dataset.trackId === state.id;
      b.classList.toggle("is-playing", active && state.playing);
      b.setAttribute("aria-pressed", String(active && state.playing));
    });
  });
  document.addEventListener("astro:page-load", () => {
    const state = $player.get();
    document
      .querySelectorAll<HTMLElement>("[data-track-id]")
      .forEach((b) =>
        b.classList.toggle(
          "is-playing",
          b.dataset.trackId === state.id && state.playing,
        ),
      );
  });
}
