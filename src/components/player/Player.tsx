import { useStore } from "@nanostores/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  $player,
  currentTrack,
  toggle,
  seek,
  next,
  volume,
} from "../../lib/player";
import { time } from "../../lib/format";
export default function Player() {
  const state = useStore($player);
  const track = currentTrack();
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  useEffect(() => {
    if (!ref.current) {
      document.documentElement.style.setProperty("--player-h", "0px");
      return;
    }
    const observer = new ResizeObserver((entries) => {
      document.documentElement.style.setProperty(
        "--player-h",
        `${entries[0].target.getBoundingClientRect().height}px`,
      );
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [!!track]);
  if (!track) return null;
  return (
    <div class="player" ref={ref} aria-label="Audio player">
      <div class="player-meta">
        <img src={track.artwork} alt="" width="37" height="37" />
        <a href={track.href}>
          <span class="player-title">{track.title}</span>
          <span class="player-artist">{track.artist}</span>
        </a>
      </div>
      <div class="transport">
        <button onClick={() => next(-1)} aria-label="Previous track">
          ‹
        </button>
        <button
          class="play-toggle"
          onClick={toggle}
          aria-label={state.playing ? "Pause" : "Play"}
        >
          {state.playing ? "Ⅱ" : "▶"}
        </button>
        <button onClick={() => next(1)} aria-label="Next track">
          ›
        </button>
      </div>
      <div class="player-progress">
        <span>{time(preview ?? state.time)}</span>
        <input
          aria-label="Playback position"
          type="range"
          min="0"
          max={state.duration || track.duration}
          step="1"
          value={preview ?? state.time}
          onInput={(e) => setPreview(Number(e.currentTarget.value))}
          onChange={(e) => {
            seek(Number(e.currentTarget.value));
            setPreview(null);
          }}
        />
        <span>{time(state.duration || track.duration)}</span>
      </div>
      <input
        class="player-volume"
        aria-label="Volume"
        type="range"
        min="0"
        max="1"
        step=".01"
        defaultValue="1"
        onInput={(e) => volume(Number(e.currentTarget.value))}
      />
      {state.error && (
        <div class="player-message" aria-live="polite">
          {state.error}
          <button onClick={toggle}>Retry</button>
        </div>
      )}
      {state.pending && !state.error && (
        <div class="player-message" role="status">
          Loading recording…
        </div>
      )}
    </div>
  );
}
