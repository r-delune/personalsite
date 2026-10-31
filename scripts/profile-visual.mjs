// Sustained real-time profile. Defaults to the acceptance duration of 15 min.
import { launchVisualBrowser, labUrl } from './visual-browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.VISUAL_OUTPUT||'artifacts/visual-verification';await mkdir(out,{recursive:true});
const seconds=Number(process.env.PROFILE_SECONDS||900);
// Optional stagger keeps comparison recordings out of the sustained measurement.
for(let left=Number(process.env.PROFILE_START_DELAY||0);left>0;left-=5) await new Promise(r=>setTimeout(r,Math.min(5,left)*1000));
const browser=await launchVisualBrowser();const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await page.goto(`${labUrl}/lab?play&mock=0&speed=10`);await page.waitForFunction(()=>window.__lab?.stats());
await page.waitForTimeout(10000);
const cdp=await page.context().newCDPSession(page);
const renderer=await page.evaluate(()=>{
  const gl=document.querySelector('#stage canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
});
await page.evaluate(()=>{
  window.__profileTasks=[];
  new PerformanceObserver(list=>window.__profileTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask'});
});
const samples=[];const start=Date.now();let bucket=-1;
while(Date.now()-start<seconds*1000){
  const elapsed=(Date.now()-start)/1000;
  const next=Math.floor(elapsed/60);
  if(next!==bucket){bucket=next;await page.evaluate(i=>{
    const lab=window.__lab;
    // Cycle item identities while reusing the cached real mix score.
    const meta={...lab.writer.bridge.getItemMeta()};
    lab.writer.item(`profile:${i}`,'mix',lab.state.duration,meta);
    lab.state.pos=(i*241)%lab.state.duration;lab.state.playing=true;
  },bucket);}
  const heap=await cdp.send('Runtime.getHeapUsage');
  const state=await page.evaluate(()=>({stats:{...window.__lab.stats()},gpu:window.__lab.controller.inspect()}));
  samples.push({elapsed,heapUsed:heap.usedSize,heapTotal:heap.totalSize,...state});
  await page.waitForTimeout(5000);
}
const result={date:new Date().toISOString(),browser:browser.version(),renderer,seconds:(Date.now()-start)/1000,viewport:{width:1440,height:900,dpr:2},samples,longTasks:await page.evaluate(()=>window.__profileTasks)};
await writeFile(`${out}/profile-15min.json`,JSON.stringify(result,null,2));
await browser.close();console.log(JSON.stringify({seconds:result.seconds,samples:samples.length,fps:samples.reduce((n,s)=>n+s.stats.fps,0)/samples.length,heapRange:[Math.min(...samples.map(s=>s.heapUsed)),Math.max(...samples.map(s=>s.heapUsed))],gpu:samples.at(-1).gpu,longTasks:result.longTasks},null,2));
