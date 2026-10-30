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
    readout.textContent = `BRIDGE / DEVELOPMENT\nphase  ${s.phase}\nroute  ${s.route}\nitem   ${s.itemKind || "—"} / ${s.itemId || "—"}\ntime   ${s.positionSec.toFixed(1)}\nenergy ${f.energy.toFixed(3)}\nplay   ${f.playing.toFixed(3)}\nanalysis ${s.analysisAvailable}\nmotion ${s.reducedMotion ? "reduced" : s.userPausedAnimation ? "paused" : "on"}\nlog ${history.join(" → ")}`;
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
