import type { StageBridge } from "./stage-bridge";
import { getMedia, registerDevMedia, playTrack, seek } from "./player";
export function mountBridgeDebug(bridge: StageBridge) {
  if (document.getElementById("bridge-debug")) return;
  const box = document.createElement("output");
  box.id = "bridge-debug";
  box.setAttribute("aria-label", "Development stage bridge");
  box.style.cssText =
    "position:fixed;right:12px;top:80px;z-index:90;background:#0b1019ed;border:1px solid #49617d;padding:12px;white-space:pre;font:10px/1.7 monospace;color:#c7d9ed;max-width:280px";
  const readout = document.createElement("span");
  readout.style.display = "block";
  box.append(readout);
  const timeline = document.createElement("canvas");
  timeline.width = 256;
  timeline.height = 64;
  timeline.style.cssText =
    "display:block;margin-top:8px;width:256px;height:64px";
  timeline.setAttribute(
    "aria-label",
    "Score bands, detected boundaries and playhead",
  );
  box.append(timeline);
  const history: string[] = [];
  const unsubscribe = bridge.subscribe("phase", (s) => {
    history.push(s.phase);
    if (history.length > 8) history.shift();
  });
  function button(label: string, action: () => void) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "display:block;background:transparent;color:inherit;border:1px solid #53647a;margin-top:7px;padding:6px;font:inherit;cursor:pointer";
    b.onclick = action;
    box.append(b);
  }
  button("Test buffering", () => {
    const source = getMedia("mix:roam-mix-2026");
    if (!source) return;
    const url = new URL(source.src, location.href);
    url.searchParams.set("slow", "1");
    registerDevMedia({
      ...source,
      id: "dev:buffer",
      title: "Development buffer test",
      src: url.href,
    });
    void playTrack("dev:buffer");
  });
  button("Seek near end", () => {
    const duration = bridge.getSnapshot().durationSec;
    if (duration) seek(Math.max(0, duration - 0.4));
  });
  button("Test media error", () => {
    const source = getMedia("mix:roam-mix-2026");
    if (!source) return;
    registerDevMedia({
      ...source,
      id: "dev:error",
      title: "Development error test",
      src: new URL("/__missing-media.mp3", location.href).href,
    });
    void playTrack("dev:error");
  });
  document.body.append(box);
  let timer: ReturnType<typeof setTimeout>;
  const render = () => {
    const s = bridge.getSnapshot(),
      f = bridge.getFeatures();
    readout.textContent = `BRIDGE / DEVELOPMENT\nphase  ${s.phase}\nroute  ${s.route}\nitem   ${s.itemKind || "—"} / ${s.itemId || "—"}\ntime   ${s.positionSec.toFixed(1)}\nenergy ${f.energy.toFixed(3)}\nplay   ${f.playing.toFixed(3)}\nscore ${s.scoreAvailable}\nlow/mid/high ${f.low.toFixed(2)} / ${f.mid.toFixed(2)} / ${f.high.toFixed(2)}\ntext zones ${bridge.getExclusionRects().length}\nmotion ${s.reducedMotion ? "reduced" : s.userPausedAnimation ? "paused" : "on"}\nlog ${history.join(" → ")}`;
    const context = timeline.getContext("2d"),
      window = bridge.getScoreWindow(0, s.durationSec || 0);
    if (context) {
      context.clearRect(0, 0, 256, 64);
      if (window) {
        const bands = ["energy", "low", "mid", "high"] as const;
        const colors = ["#c7d9ed", "#819dbb", "#6a8a91", "#9a91ab"];
        bands.forEach((band, row) => {
          context.strokeStyle = colors[row];
          context.beginPath();
          for (let x = 0; x < 256; x++) {
            const index = Math.min(
              window.data[band].length - 1,
              Math.floor((x / 255) * (window.endIndex - 1)),
            );
            const y = row * 16 + 15 - (window.data[band][index] / 255) * 14;
            if (x === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.stroke();
        });
        context.fillStyle = "#c7d9ed44";
        for (const at of window.boundaries)
          context.fillRect((at / window.duration) * 256, 0, 1, 64);
        context.fillStyle = "#fff";
        context.fillRect((s.positionSec / window.duration) * 256, 0, 1, 64);
      }
    }
    timer = setTimeout(render, 100);
  };
  render();
  document.addEventListener("astro:after-swap", () =>
    document.body.append(box),
  );
  addEventListener(
    "pagehide",
    () => {
      clearTimeout(timer);
      unsubscribe();
    },
    { once: true },
  );
}
