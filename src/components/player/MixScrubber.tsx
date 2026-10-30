import { chapterAt, type Chapter } from "../../lib/tracklist.mjs";
import { useEffect, useRef, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { $player, playTrack, pause, seek } from "../../lib/player";
import { parseTime, time } from "../../lib/format";
interface Props {
  id: string;
  src: string;
  duration: number;
  peaks: string | null;
  tracklist?: Chapter[];
}
interface Peaks {
  version: number;
  duration: number;
  length: number;
  peak: number[];
  rms: number[];
}
export default function MixScrubber({
  id,
  src,
  duration,
  peaks,
  tracklist = [],
}: Props) {
  const state = useStore($player),
    active = state.id === id;
  const [staged, setStaged] = useState<number | null>(null),
    [drag, setDrag] = useState<number | null>(null),
    [data, setData] = useState<Peaks | null>(null),
    [copied, setCopied] = useState("");
  const [waveLoading, setWaveLoading] = useState(Boolean(peaks));
  const canvas = useRef<HTMLCanvasElement>(null),
    canceled = useRef(false);
  const d = active && state.duration ? state.duration : duration;
  const position = Math.max(
    0,
    Math.min(d, drag ?? (active ? state.time : (staged ?? 0))),
  );
  useEffect(() => {
    setStaged(parseTime(new URLSearchParams(location.search).get("t")));
    const controller = new AbortController();
    if (peaks)
      fetch(peaks, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((v: Peaks) => {
          if (
            v.version !== 2 ||
            v.rms.length !== v.length ||
            v.peak.length !== v.length
          )
            throw new Error();
          setData(v);
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setWaveLoading(false);
        });
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const draw = () => {
      const { width, height } = element.getBoundingClientRect(),
        ratio = Math.min(devicePixelRatio, 2);
      element.width = width * ratio;
      element.height = height * ratio;
      const ctx = element.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, width, height);
      if (!data) return;
      const bars = Math.max(1, Math.floor(width / 3));
      for (let i = 0; i < bars; i++) {
        const first = Math.floor((i * data.length) / bars),
          last = Math.max(
            first + 1,
            Math.floor(((i + 1) * data.length) / bars),
          );
        let rms = 0,
          peak = 0;
        for (let j = first; j < Math.min(last, data.length); j++) {
          rms = Math.max(rms, data.rms[j] || 0);
          peak = Math.max(peak, data.peak[j] || 0);
        }
        const x = i * 3;
        ctx.fillStyle = "#58647444";
        ctx.fillRect(
          x,
          (height - peak * height * 0.9) / 2,
          2,
          Math.max(1, peak * height * 0.9),
        );
        ctx.fillStyle = i / bars < position / d ? "#c1cbd8" : "#66717f";
        ctx.fillRect(
          x,
          (height - rms * height * 0.8) / 2,
          2,
          Math.max(1, rms * height * 0.8),
        );
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => observer.disconnect();
  }, [data, position, d]);
  const currentChapter = active ? chapterAt(tracklist, state.time) : null;
  const commit = (value: number) => {
    if (canceled.current) return;
    const n = Math.max(0, Math.min(value, d));
    setStaged(active ? null : n);
    setDrag(null);
    if (active) seek(n);
  };
  const copy = async () => {
    const url = new URL(location.href);
    url.searchParams.set("t", String(Math.floor(position)));
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied("Copied " + time(position));
    } catch {
      setCopied(url.href);
    }
    setTimeout(() => setCopied(""), 1500);
  };
  return (
    <div class="mix-listener" data-stage-exclude>
      <div class="mix-listener-controls">
        <button
          class="primary-action"
          disabled={!src}
          onClick={() => {
            if (active && state.playing) pause();
            else {
              const start =
                staged ??
                (active && state.phase !== "ended"
                  ? Math.min(state.time, d)
                  : 0);
              setStaged(null);
              void playTrack(id, start);
            }
          }}
        >
          {active && state.playing
            ? "Ⅱ Pause"
            : staged !== null
              ? `▶ Play from ${time(staged)}`
              : "▶ Play"}
        </button>
        <span class="micro">
          {time(d)}
          {!src ? " · AUDIO NOT CONFIGURED" : ""}
        </span>
      </div>
      <div class={`waveform-control${!data ? " no-data" : ""}`}>
        <canvas ref={canvas} aria-hidden="true" />
        <span
          class="waveform-position"
          style={{ left: `${Math.min(100, (position / d) * 100)}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          aria-label="Mix position"
          aria-valuetext={`${time(position)} of ${time(d)}`}
          min="0"
          max={d}
          step="1"
          value={position}
          onPointerDown={() => {
            canceled.current = false;
          }}
          onPointerCancel={() => {
            canceled.current = true;
            setDrag(null);
          }}
          onInput={(e) => setDrag(Number(e.currentTarget.value))}
          onChange={(e) => commit(Number(e.currentTarget.value))}
          onKeyDown={(e) => {
            const keys: Record<string, number> = {
              ArrowLeft: -5,
              ArrowDown: -5,
              ArrowRight: 5,
              ArrowUp: 5,
              PageUp: 60,
              PageDown: -60,
            };
            if (e.key in keys || e.key === "Home" || e.key === "End") {
              e.preventDefault();
              canceled.current = false;
              commit(
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? d
                    : position + keys[e.key],
              );
            }
          }}
        />
      </div>
      {tracklist.length > 0 && (
        <div class="chapter-ticks" aria-label="Waveform chapters">
          {tracklist.map((chapter) => (
            <button
              class="chapter-tick"
              style={{ left: `${(chapter.at / d) * 100}%` }}
              title={`${chapter.artist} — ${chapter.title}`}
              aria-label={`Play from ${time(chapter.at)}, ${chapter.artist} — ${chapter.title}`}
              onClick={() => {
                canceled.current = false;
                commit(chapter.at);
              }}
            >
              <span class="chapter-tooltip">
                {chapter.artist} — {chapter.title}
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="waveform-footer">
        <span class="micro">{time(position)}</span>
        <span class="micro">{time(d)}</span>
      </div>
      <button class="text-control copy-time" onClick={copy}>
        Copy link at {time(position)} ↗
      </button>
      {copied && (
        <output class="copy-feedback" aria-live="polite">
          {copied}
        </output>
      )}
      {tracklist.length > 0 && (
        <section
          class="mix-tracklist"
          data-stage-exclude
          aria-label="Tracklist"
        >
          <h2 class="micro">TRACKLIST</h2>
          <ol>
            {tracklist.map((chapter) => (
              <li>
                <button
                  class={currentChapter === chapter ? "is-current" : ""}
                  aria-current={currentChapter === chapter ? "true" : undefined}
                  aria-label={`Play from ${time(chapter.at)}, ${chapter.artist} — ${chapter.title}`}
                  onClick={() => {
                    canceled.current = false;
                    commit(chapter.at);
                  }}
                >
                  <time class="micro">{time(chapter.at)}</time>
                  <span>
                    {chapter.artist} — {chapter.title}
                  </span>
                  {chapter.label && (
                    <span class="micro chapter-label">{chapter.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {!data && (
        <p class="micro subdued">
          {waveLoading
            ? "Loading waveform…"
            : peaks
              ? "Waveform unavailable; position control remains available."
              : "No waveform imported."}
        </p>
      )}
    </div>
  );
}
