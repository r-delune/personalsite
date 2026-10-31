import {launchVisualBrowser,labUrl} from './visual-browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.VISUAL_OUTPUT||'artifacts/visual-verification';await mkdir(out,{recursive:true});
const browser=await launchVisualBrowser();const results={browser:browser.version(),viewport:{width:1440,height:900,dpr:2},variants:{}};
for(const v of ['a','b','c']){
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
  await page.goto(`${labUrl}/lab?phase=playing&t=1282&route=mixes&visual=${v}`);
  await page.waitForFunction(()=>window.__lab?.stats()?.colour>.95);
  await page.evaluate(()=>{window.__tasks=[];new PerformanceObserver(l=>window.__tasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask'});});
  await page.waitForTimeout(1500);const samples=[];
  for(let i=0;i<30;i++){samples.push(await page.evaluate(()=>({...window.__lab.stats()})));await page.waitForTimeout(100);}
  results.variants[v]={fps:samples.reduce((n,s)=>n+s.fps,0)/samples.length,frameMs:samples.reduce((n,s)=>n+s.frameMs,0)/samples.length,quality:samples.at(-1).quality,dpr:samples.at(-1).dpr,longTasks:await page.evaluate(()=>window.__tasks)};
  await page.close();
}
await browser.close();await writeFile(`${out}/final-performance.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
