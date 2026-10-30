import type { StageBridge } from "./stage-bridge";
export function mountBridgeDebug(bridge: StageBridge) {
  if (document.getElementById("bridge-debug")) return;
  const box = document.createElement("output");
  box.id = "bridge-debug";
  box.setAttribute("aria-label", "Development stage bridge");
  box.style.cssText =
    "position:fixed;right:12px;top:80px;z-index:90;background:#0b1019ed;border:1px solid #49617d;padding:12px;white-space:pre;font:10px/1.7 monospace;color:#c7d9ed;pointer-events:none";
  document.body.append(box);
  let timer: ReturnType<typeof setTimeout>;
  const render = () => {
    const s = bridge.getSnapshot(),
      f = bridge.getFeatures();
    box.textContent = `BRIDGE / DEVELOPMENT\nphase  ${s.phase}\nroute  ${s.route}\nitem   ${s.itemKind || "—"} / ${s.itemId || "—"}\ntime   ${s.positionSec.toFixed(1)}\nenergy ${f.energy.toFixed(3)}\nplay   ${f.playing.toFixed(3)}\nanalysis ${s.analysisAvailable}\nmotion ${s.reducedMotion ? "reduced" : s.userPausedAnimation ? "paused" : "on"}`;
    timer = setTimeout(render, 100);
  };
  render();
  document.addEventListener(
    "astro:before-swap",
    () => {
      clearTimeout(timer);
      box.remove();
    },
    { once: true },
  );
}
