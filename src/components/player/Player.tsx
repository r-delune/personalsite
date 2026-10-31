import { chapterAt } from "../../lib/tracklist.mjs";
import { useStore } from "@nanostores/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  $player,
  currentTrack,
  getMedia,
  toggle,
  seek,
  next,
  volume,
  mute,
} from "../../lib/player";
import { time } from "../../lib/format";
import { setAnimationPaused, stageBridge } from "../../lib/stage-bridge";
import {
  $playMode,
  $hudAwake,
  bindPlayMode,
  exitPlayMode,
  featuredTrackId,
  playModeToggle,
  togglePlayMode,
} from "../../lib/ui-mode";

// ---- icons (1.5 px strokes, drawn on a 24 grid so they sit with Geist)
const Svg = (props: { children: JSX.Element | JSX.Element[]; size?: number }) => (
  <svg
    width={props.size ?? 18}
    height={props.size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {props.children}
  </svg>
);
const PlayIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
  </Svg>
);
const PauseIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="7" y="5.5" width="3.2" height="13" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.8" y="5.5" width="3.2" height="13" rx="1" fill="currentColor" stroke="none" />
  </Svg>
);
const PrevIcon = () => (
  <Svg size={16}>
    <path d="M17 6.5v11L9.5 12z" fill="currentColor" stroke="none" />
    <path d="M7 6.5v11" stroke-width="1.8" />
  </Svg>
);
const NextIcon = () => (
  <Svg size={16}>
    <path d="M7 6.5v11l7.5-5.5z" fill="currentColor" stroke="none" />
    <path d="M17 6.5v11" stroke-width="1.8" />
  </Svg>
);
const VolumeIcon = ({ level, muted }: { level: number; muted: boolean }) => (
  <Svg size={17}>
    <path d="M4.5 9.5h3l4.5-3.8v12.6l-4.5-3.8h-3z" />
    {muted || level === 0 ? (
      <path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5" />
    ) : (
      <>
        <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
        {level > 0.5 ? <path d="M18 7a7.2 7.2 0 0 1 0 10" /> : <></>}
      </>
    )}
  </Svg>
);
const ExpandIcon = () => (
  <Svg size={16}>
    <path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5l-6 6M4.5 19.5l6-6" />
  </Svg>
);
const CollapseIcon = () => (
  <Svg size={16}>
    <path d="M19 10h-5V5M5 14h5v5M14 10l5.5-5.5M10 14l-5.5 5.5" />
  </Svg>
);

/** Three bars that breathe while music plays; still when paused. */
const Bars = ({ playing }: { playing: boolean }) => (
  <span class={`np-bars ${playing ? "is-live" : ""}`} aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

/**
 * A progress line drawn by hand, with a real range input over it for
 * keyboard, screen reader and touch use. Hovering previews the time.
 */
function Progress(props: {
  value: number;
  max: number;
  onPreview: (v: number | null) => void;
  onCommit: (v: number) => void;
  variant?: "capsule" | "hud";
}) {
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const pct = props.max ? Math.min(100, (props.value / props.max) * 100) : 0;
  const style = { "--p": `${pct}%` } as Record<string, string>;
  return (
    <div
      class={`progress progress-${props.variant ?? "capsule"}`}
      style={style}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        setHover({ x: f * 100, t: f * props.max });
      }}
      onPointerLeave={() => setHover(null)}
    >
      <span class="progress-track">
        <span class="progress-fill" />
        {hover && (
          <span class="progress-ghost" style={{ width: `${hover.x}%` }} />
        )}
      </span>
      <span class="progress-thumb" />
      {hover && (
        <span class="progress-tip" style={{ left: `${hover.x}%` }}>
          {time(hover.t)}
        </span>
      )}
      <input
        aria-label="Playback position"
        aria-valuetext={`${time(props.value)} of ${time(props.max)}`}
        type="range"
        min="0"
        max={props.max || 0}
        step="1"
        value={props.value}
        onInput={(e) => props.onPreview(Number(e.currentTarget.value))}
        onPointerCancel={() => props.onPreview(null)}
        onChange={(e) => {
          props.onCommit(Number(e.currentTarget.value));
          props.onPreview(null);
        }}
      />
    </div>
  );
}

export default function Player() {
  const state = useStore($player);
  const playMode = useStore($playMode);
  const hudAwake = useStore($hudAwake);
  const track = currentTrack();
  const chapter =
    track?.kind === "mix" ? chapterAt(track.tracklist || [], state.time) : null;
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [volumeOpen, setVolumeOpen] = useState(false);
  // The background stays still while the visitor's "pause animation"
  // preference is on. Say so while something plays, so a still scene never
  // reads as broken. Not shown for OS reduced motion (expected stillness).
  const [visualsPaused, setVisualsPaused] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  useEffect(() => {
    bindPlayMode();
    const sync = () => {
      const s = stageBridge.getSnapshot();
      setVisualsPaused(s.userPausedAnimation && !s.reducedMotion);
    };
    sync();
    return stageBridge.subscribe("motionprefs", sync);
  }, []);
  useEffect(() => setPreview(null), [state.id]);
  // Tab title shows what's playing, quietly.
  useEffect(() => {
    const base = document.title.replace(/^▶ .*? — /, "");
    document.title =
      track && state.playing ? `▶ ${track.title} — ${base}` : base;
  }, [track?.id, state.playing]);
  useEffect(() => {
    if (!ref.current) {
      document.documentElement.style.setProperty("--player-h", "0px");
      return;
    }
    const observer = new ResizeObserver((entries) => {
      // The capsule floats; reserve its height plus the gap beneath it.
      const h = entries[0].target.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--player-h", `${h + 24}px`);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [!!track]);

  const duration = state.duration || track?.duration || 0;
  const shown = preview ?? state.time;
  const idleFeatured = !track ? getMedia(featuredTrackId() || "") : undefined;

  const hud = (
    <div
      class={`play-hud ${playMode ? "is-on" : ""} ${hudAwake ? "is-awake" : ""}`}
      role="region"
      aria-label="Play mode"
      aria-hidden={!playMode}
      tabIndex={-1}
      inert={!playMode}
    >
      <div class="play-hud-caption" aria-live="polite">
        <span class="micro play-hud-kicker">
          {track ? (
            <>
              <Bars playing={state.playing} />
              {state.playing ? "Now playing" : state.pending ? "Loading" : "Paused"}
            </>
          ) : (
            "Play mode"
          )}
        </span>
        <span class="play-hud-title">
          {track?.title ?? idleFeatured?.title ?? "Brían Diolún"}
        </span>
        <span class="micro play-hud-sub">
          {chapter
            ? `${chapter.artist} — ${chapter.title}`
            : track
              ? track.artist
              : idleFeatured
                ? `${idleFeatured.artist} · press space to listen`
                : ""}
        </span>
      </div>
      <div class="play-hud-controls">
        {track?.kind === "track" && (
          <button class="icon-btn" onClick={() => next(-1)} aria-label="Previous track">
            <PrevIcon />
          </button>
        )}
        <button
          class="play-btn play-btn-lg"
          onClick={playModeToggle}
          aria-label={state.playing ? "Pause" : "Play"}
        >
          {state.playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
        {track?.kind === "track" && (
          <button class="icon-btn" onClick={() => next(1)} aria-label="Next track">
            <NextIcon />
          </button>
        )}
      </div>
      <button
        class="play-hud-exit micro"
        onClick={exitPlayMode}
        aria-label="Leave play mode"
      >
        <CollapseIcon /> <span>Esc</span>
      </button>
      {track && (
        <div class="play-hud-time micro">
          {time(shown)} <span>/ {time(duration)}</span>
        </div>
      )}
      {track && (
        <Progress
          variant="hud"
          value={shown}
          max={duration}
          onPreview={setPreview}
          onCommit={seek}
        />
      )}
    </div>
  );

  if (!track) return hud;
  return (
    <>
      {hud}
      <div
        class={`player capsule ${state.playing ? "is-playing" : ""} ${state.pending ? "is-pending" : ""}`}
        data-stage-exclude
        ref={ref}
        aria-label="Audio player"
        inert={playMode}
      >
        <div class="player-meta">
          <a href={track.href} class="player-art" tabIndex={-1} aria-hidden="true">
            {track.artwork && (
              <img src={track.artwork} alt="" width="40" height="40" />
            )}
          </a>
          <a href={track.href} class="player-text">
            <span class="player-title">
              <Bars playing={state.playing} />
              {track.title}
            </span>
            <span class="player-artist" aria-live="polite" aria-atomic="true">
              {chapter
                ? `now: ${chapter.artist} — ${chapter.title}`
                : track.artist}
            </span>
          </a>
        </div>
        <div class="transport">
          {track.kind === "track" && (
            <button class="icon-btn" onClick={() => next(-1)} aria-label="Previous track">
              <PrevIcon />
            </button>
          )}
          <button
            class="play-btn play-toggle"
            onClick={toggle}
            aria-label={
              state.pending ? "Cancel playback" : state.playing ? "Pause" : "Play"
            }
          >
            {state.pending ? (
              <span class="spinner" aria-hidden="true" />
            ) : state.playing ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>
          {track.kind === "track" && (
            <button class="icon-btn" onClick={() => next(1)} aria-label="Next track">
              <NextIcon />
            </button>
          )}
        </div>
        <div class="player-progress">
          <span class="t">{time(shown)}</span>
          <Progress
            value={shown}
            max={duration}
            onPreview={setPreview}
            onCommit={seek}
          />
          <span class="t t-end">{time(duration)}</span>
        </div>
        <div class="player-tools">
          <div
            class={`volume-control ${volumeOpen ? "is-open" : ""}`}
            onMouseEnter={() => setVolumeOpen(true)}
            onMouseLeave={(e) => {
              if (!e.currentTarget.contains(document.activeElement))
                setVolumeOpen(false);
            }}
            onFocus={() => setVolumeOpen(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setVolumeOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setVolumeOpen(false);
            }}
          >
            <button
              class="icon-btn"
              aria-label={state.muted ? "Unmute" : "Mute"}
              aria-expanded={volumeOpen}
              onClick={mute}
            >
              <VolumeIcon level={state.volume} muted={state.muted} />
            </button>
            <div class="volume-pop">
              <input
                class="player-volume"
                aria-label="Volume level"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={state.volume}
                style={{ "--v": `${state.volume * 100}%` } as Record<string, string>}
                onInput={(e) => volume(Number(e.currentTarget.value))}
              />
            </div>
          </div>
          <button
            class="icon-btn focus-btn"
            onClick={togglePlayMode}
            aria-label="Play mode (F)"
            title="Play mode · F"
          >
            <ExpandIcon />
          </button>
        </div>
        {state.error && (
          <div class="player-message" aria-live="polite">
            {state.error}
            <button onClick={toggle}>Retry</button>
          </div>
        )}
        {state.playing && visualsPaused && !noticeDismissed && (
          <div class="player-message player-notice" role="status">
            Visuals are paused.
            <button onClick={() => setAnimationPaused(false)}>Resume</button>
            <button
              class="player-notice-close"
              aria-label="Dismiss"
              onClick={() => setNoticeDismissed(true)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </>
  );
}
