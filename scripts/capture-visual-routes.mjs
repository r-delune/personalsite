import { launchVisualBrowser,labUrl } from './visual-browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.VISUAL_OUTPUT||'artifacts/visual-verification';await mkdir(`${out}/routes`,{recursive:true});
const routes={home:'/',music:'/music',release:'/music/anna-doni',mixes:'/mixes',mix:'/mixes/roam-mix-2026',work:'/work',writing:'/writing',post:'/writing/sample-template',about:'/about',other:'/missing-visual-review'};
const browser=await launchVisualBrowser();const results=[];
for(const [width,height] of [[1440,900],[1280,720],[375,812]]){
  const page=await browser.newPage({viewport:{width,height}});
  for(const [name,route] of Object.entries(routes)){
    await page.goto(labUrl+route);await page.waitForFunction(()=>document.querySelector('#stage')?.dataset.renderer==='webgl');
    await page.waitForTimeout(1100);
    results.push({route,width,height,...await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,renderer:document.querySelector('#stage').dataset.renderer,exclusions:document.querySelectorAll('[data-stage-exclude]').length}))});
    await page.screenshot({path:`${out}/routes/${name}-${width}.jpg`,type:'jpeg',quality:80});
  }
  await page.close();
}
await browser.close();await writeFile(`${out}/routes.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
