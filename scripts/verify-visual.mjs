// Real-score visual acceptance + comparison media. Run against astro dev:
// LAB_URL=http://127.0.0.1:4357 node scripts/verify-visual.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('astro/package.json'))('sharp');
import { mkdir, writeFile } from 'node:fs/promises';
import { launchVisualBrowser, labUrl } from './visual-browser.mjs';
const out = process.env.VISUAL_OUTPUT || 'artifacts/visual-verification';
await mkdir(out, {recursive:true});
const browser = await launchVisualBrowser();
const report = {date:new Date().toISOString(), browser:browser.version(), source:'real roam-mix-2026.score.json', variants:{}, assertions:[], errors:[]};
async function lab(variant='a', viewport={width:1440,height:900}) {
  const page = await browser.newPage({viewport});
  page.setDefaultTimeout(15000);
  page.on('pageerror', e=>report.errors.push(e.message));
  page.on('console', m=>{ if(m.type()==='error') report.errors.push(m.text()); });
  await page.goto(`${labUrl}/lab?mock=0&visual=${variant}&moon=0.5`);
  await page.waitForFunction(()=>window.__lab?.stats() && window.__lab.writer.bridge.getSnapshot().scoreAvailable);
  await page.evaluate(()=>{
    window.__longTasks=[];
    new PerformanceObserver(list=>{for(const e of list.getEntries()) window.__longTasks.push({start:e.startTime,ms:e.duration});}).observe({type:'longtask'});
  });
  return page;
}
const stats = p => p.evaluate(()=>({...window.__lab.stats()}));
const set = (p, value) => p.evaluate(v=>Object.assign(window.__lab.state,v),value);
const seek = (p, pos) => p.evaluate(t=>window.__lab.seek(t),pos);
const wait = (p, ms) => p.waitForTimeout(ms);
try {
  // Use the actual mix envelope, not stand-in data, to choose quiet and peak.
  const p = await lab();
  const paletteBefore = await p.evaluate(()=>window.__lab.controller.inspect().palette);
  const times = await p.evaluate(async()=>{
    const {macroEnvelope}=await import('/src/components/stage/coupling.ts');
    const s=await (await fetch('/data/roam-mix-2026.score.json')).json();
    const e=macroEnvelope(s.data.energy,s.rateHz);
    let quiet=120, peak=120;
    for(let i=120;i<e.length-120;i++){if(e[i]<e[quiet])quiet=i;if(e[i]>e[peak])peak=i;}
    return {quiet,peak,boundary:s.boundaries.find(t=>t>120),duration:s.duration};
  });
  report.passages=times;
  await set(p,{phase:'playing',playing:false});
  await seek(p,times.quiet); await wait(p,4500); const quiet=await stats(p);
  await p.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}',path:`${out}/muted-quiet.png`});
  await seek(p,times.peak); const before=await stats(p); await wait(p,150); const early=await stats(p); await wait(p,2500); const peak=await stats(p);
  await p.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}',path:`${out}/muted-peak.png`});
  assert.ok(peak.arc-quiet.arc>.5,`muted arc ${quiet.arc} → ${peak.arc}`);
  assert.ok(Math.abs(early.arc-before.arc)<.45,'seek must ease');
  report.assertions.push({test:'muted arc and eased seek',quiet:quiet.arc,peak:peak.arc,early:early.arc});
  assert.deepEqual(await p.evaluate(()=>window.__lab.controller.inspect().palette),paletteBefore);
  report.assertions.push({test:'palette uniforms unchanged across quiet passage, peak and seek',passed:true});
  await p.evaluate(()=>{
    const cover=document.createElement('div');cover.id='contrast-cover';
    Object.assign(cover.style,{position:'fixed',inset:'0',pointerEvents:'none'});
    document.body.append(cover);window.__lab.writer.exclusions([cover]);
  });await wait(p,100);
  const protectedPng=await p.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}'});
  const {data,info}=await sharp(protectedPng).raw().toBuffer({resolveWithObject:true});
  let maxChannel=0;for(let i=0;i<data.length;i++)if(i%info.channels<3)maxChannel=Math.max(maxChannel,data[i]);
  assert.ok(maxChannel<=37, `combined highlights behind text: ${maxChannel}`);
  report.assertions.push({test:'combined rendered highlights stay dark behind full UI overlap',maxChannel,passed:true});
  await p.evaluate(()=>{window.__lab.writer.exclusions([]);document.getElementById('contrast-cover').remove();});
  await set(p,{phase:'buffering'}); await wait(p,100); const hold=await stats(p); await wait(p,900);const held=await stats(p);
  assert.equal(held.arc,hold.arc);assert.equal(held.colour,hold.colour);assert.equal(held.ripple,hold.ripple);
  report.assertions.push({test:'buffering holds arc, colour and ripple',passed:true});
  await p.evaluate(()=>window.__lab.writer.motion(false,true)); await wait(p,100);
  const frozen=await p.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}'});
  const frames=await p.locator('#stage').getAttribute('data-frames');
  await seek(p,times.quiet); await p.evaluate(()=>{window.__lab.writer.route('about');window.__lab.writer.exclusions([]);}); await wait(p,500);
  assert.equal(await p.locator('#stage').getAttribute('data-frames'),frames);
  assert.ok(frozen.equals(await p.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}'})));
  report.assertions.push({test:'animation pause freezes pixels across seek, route and exclusion updates',passed:true});
  await p.evaluate(()=>window.__lab.writer.motion(true,false)); await wait(p,200);
  const reduced=await p.locator('#stage').getAttribute('data-frames');await wait(p,600);
  assert.equal(await p.locator('#stage').getAttribute('data-frames'),reduced);
  const rs=await stats(p); assert.equal(rs.coupling,0);
  await p.setViewportSize({width:1280,height:720});await wait(p,200);
  assert.ok(Number(await p.locator('#stage').getAttribute('data-frames'))>Number(reduced));
  report.assertions.push({test:'reduced motion stays still and rerenders on resize',passed:true});
  await p.evaluate(()=>{
    const gl=document.querySelector('#stage canvas').getContext('webgl2');
    window.__lose=gl.getExtension('WEBGL_lose_context');window.__lose.loseContext();
  });await wait(p,300);
  assert.equal(await p.locator('#stage').evaluate(e=>e.classList.contains('is-ready')),false);
  await p.evaluate(()=>window.__lose.restoreContext());await wait(p,800);
  assert.equal(await p.locator('#stage').evaluate(e=>e.classList.contains('is-ready')),true);
  const restored=await p.locator('#stage').getAttribute('data-frames');await wait(p,500);
  assert.equal(await p.locator('#stage').getAttribute('data-frames'),restored);
  report.assertions.push({test:'context loss restores fallback, reduced-motion restore remains still',passed:true});
  await p.close();
  if(process.env.CHECKS_ONLY !== '1') for(const v of ['a','b','c']) {
    const page=await lab(v);
    // Record the real canvas at 30 fps; caption makes the transport sequence reviewable.
    await page.evaluate(()=>{
      const source=document.querySelector('#stage canvas');
      const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=900;
      const ctx=canvas.getContext('2d');const chunks=[];
      const recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2500000});
      window.__recording={recorder,chunks,canvas,stop:false};
      recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
      function draw(){if(window.__recording.stop)return;ctx.drawImage(source,0,0);ctx.fillStyle='#eae9e5';ctx.font='16px monospace';const s=window.__lab.state;ctx.fillText(`${s.phase==='auto'?(s.playing?'playing':'idle'):s.phase} · ${(s.pos/60).toFixed(1)} min`,28,42);requestAnimationFrame(draw);}draw();
    });
    await wait(page,1000);
    await seek(page,times.quiet);await set(page,{playing:true,speed:10});await wait(page,4000);
    await seek(page,times.peak-20);await wait(page,4000);
    await seek(page,times.boundary-1);await wait(page,3500);
    await set(page,{playing:false,phase:'paused'});await wait(page,3500);
    await set(page,{phase:'ended'});await wait(page,3500);
    const recording=await page.evaluate(async()=>{
      const r=window.__recording;await new Promise(resolve=>{r.recorder.onstop=resolve;r.recorder.stop();});r.stop=true;
      const bytes=new Uint8Array(await new Blob(r.chunks,{type:'video/webm'}).arrayBuffer());let b='';for(let i=0;i<bytes.length;i++)b+=String.fromCharCode(bytes[i]);return btoa(b);
    });
    await writeFile(`${out}/variant-${v}.webm`,Buffer.from(recording,'base64'));
    await set(page,{phase:'playing',playing:true,speed:1});await seek(page,times.peak);await wait(page,3500);
    await page.evaluate(()=>window.__longTasks=[]);
    const samples=[];for(let i=0;i<30;i++){samples.push(await stats(page));await wait(page,100);}
    report.variants[v]={fps: samples.reduce((a,s)=>a+s.fps,0)/samples.length,frameMs:samples.reduce((a,s)=>a+s.frameMs,0)/samples.length,quality:samples.at(-1).quality,longTasks:await page.evaluate(()=>window.__longTasks)};
    await page.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}',path:`${out}/variant-${v}-desktop.png`});
    await page.setViewportSize({width:375,height:812});await wait(page,1200);
    await page.locator('#stage canvas').screenshot({style:'.lab-panel,.lab-strip,.lab-mock{visibility:hidden!important}',path:`${out}/variant-${v}-mobile.png`});
    await page.close();
  }
} catch(e) {report.failure=e.stack;process.exitCode=1;}
finally {await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
