let initialized = false;
export async function initStage() {
  if (initialized) return;
  initialized = true;
  const host = document.querySelector<HTMLElement>("#stage");
  const canvas = host?.querySelector<HTMLCanvasElement>("canvas");
  if (!host || !canvas) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  try {
    paused = localStorage.getItem("scene-paused") === "true";
  } catch {}
  let adaptive = false;
  let frozenTime = 0;
  let frame = 0;
  let previous = 0;
  let pose = 0;
  let targetPose = 0;
  let destroyed = false;
  let frames = 0;
  let phase = 0;
  let schedule: () => void = () => {};
  const controls = () => {
    document
      .querySelectorAll<HTMLButtonElement>(".motion-toggle")
      .forEach((button) => {
        button.setAttribute("aria-pressed", String(paused));
        const label = button.querySelector(".motion-label");
        const text = reduced.matches
          ? "Reduced motion"
          : paused
            ? "Resume animation"
            : "Pause animation";
        if (label) label.textContent = text;
        else button.textContent = text;
        button.disabled = reduced.matches;
      });
    document
      .querySelectorAll<HTMLButtonElement>(".framing-toggle")
      .forEach((b) => {
        b.setAttribute("aria-pressed", String(adaptive));
        b.textContent = adaptive ? "Framing: adaptive" : "Framing: fixed";
      });
  };
  const syncPose = () => {
    targetPose =
      adaptive &&
      ["about", "work"].includes(document.body.dataset.section || "")
        ? 1
        : 0;
    controls();
  };
  document.addEventListener("astro:page-load", syncPose);
  document.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest(".motion-toggle") && !reduced.matches) {
      paused = !paused;
      try {
        localStorage.setItem("scene-paused", String(paused));
      } catch {}
      controls();
      schedule();
    }
    if (target.closest(".framing-toggle")) {
      adaptive = !adaptive;
      syncPose();
      schedule();
    }
  });
  controls();
  let renderer: import("three").WebGLRenderer;
  try {
    const { WebGLRenderer, Scene, OrthographicCamera, BufferGeometry, BufferAttribute, ShaderMaterial, AdditiveBlending, Points } = await import("three");
    renderer = new WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setClearColor("#0b0c0e");
    const mobile = matchMedia("(max-width: 767px)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;
    let seed = 19;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
    const count = mobile ? 19000 : 65000;
    const position = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const z = random();
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      const dust = random() < 0.19;
      const spread = dust ? 1.04 + Math.pow(random(), 2) * 0.8 : 1;
      position.set(
        [Math.cos(a) * r * spread, Math.sin(a) * r * spread, z],
        i * 3,
      );
      seeds.set([random(), dust ? 1 : 0], i * 2);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(position, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 2));
    const uniforms = {
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uPose: { value: 0 },
      uDpr: { value: renderer.getPixelRatio() },
      uMobile: { value: mobile ? 1 : 0 },
    };
    const material = new ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms,
      vertexShader: `attribute vec2 aSeed; uniform float uAspect,uTime,uPose,uDpr,uMobile; varying float vAlpha; varying vec3 vColor;
      void main(){vec3 p=position; float angle=uTime*0.006; mat2 rot=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));p.xy=rot*p.xy;
      float dust=aSeed.y; float r=1.42-uPose*.12; vec2 center=vec2(uAspect*.89+.04,-1.12-uPose*.13);
      if(uMobile>.5){r=1.2;center=vec2(uAspect*1.5,-1.72-uPose*.12);}
      float drift=sin(uTime*.11+aSeed.x*31.)*.009*dust; p.xy+=vec2(drift,drift*.5);
      vec2 point=(p.xy*r+center); gl_Position=vec4(point.x/uAspect,point.y,0.,1.);
      float rim=pow(1.-position.z,5.);float bands=.5+.5*sin(p.y*30.+p.x*8.+position.z*10.);
      vAlpha=mix(.24,.9,rim)*mix(.5,1.,aSeed.x);vAlpha*=mix(1.,.7,dust);vAlpha*=1.-uPose*.25;
      vec3 blue=vec3(.49,.65,.88);vec3 warm=vec3(.65,.43,.73);vColor=mix(blue,warm,smoothstep(-.4,.7,p.x)*.4);
      vColor=mix(vColor,vec3(.78,.83,.92),rim*.6);vAlpha*=.8+bands*.2;
      gl_PointSize=(.95+aSeed.x*.85+rim*.65)*uDpr;}`,
      fragmentShader: `varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);float alpha=smoothstep(.5,.12,d)*vAlpha;gl_FragColor=vec4(vColor,alpha);}`,
    });
    scene.add(new Points(geometry, material));
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight, false);
      uniforms.uAspect.value = innerWidth / innerHeight;
      uniforms.uMobile.value = innerWidth < 768 ? 1 : 0;
      renderStill();
    };
    const renderStill = () => {
      uniforms.uTime.value = frozenTime;
      uniforms.uPose.value = pose;
      renderer.render(scene, camera);
      frames++;
      host.dataset.frames = String(frames);
    };
    function loop(now: number) {
      frame = 0;
      if (destroyed || document.hidden) {
        previous = 0;
        return;
      }
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      if (!paused && !reduced.matches) {
        phase += dt;
        frozenTime = phase;
        pose += (targetPose - pose) * (1 - Math.exp(-dt / 0.7));
      }
      renderStill();
      if (!paused && !reduced.matches) frame = requestAnimationFrame(loop);
    }
    function start() {
      if (!frame && !document.hidden && !destroyed) {
        previous = 0;
        frame = requestAnimationFrame(loop);
      }
    }
    schedule = start;
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      } else start();
    });
    reduced.addEventListener("change", () => {
      controls();
      cancelAnimationFrame(frame);
      frame = 0;
      renderStill();
      start();
    });
    canvas.addEventListener("webglcontextlost", () => {
      host.classList.remove("is-ready");
      cancelAnimationFrame(frame);
      frame = 0;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      renderStill();
      host.classList.add("is-ready");
      start();
    });
    resize();
    host.classList.add("is-ready");
    host.dataset.renderer = "webgl";
    host.dataset.initCount = "1";
    syncPose();
    start();
    addEventListener("pagehide", () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
  } catch (error) {
    host.dataset.renderer = "poster";
    console.warn("Ambient scene using static fallback.", error);
  }
}
