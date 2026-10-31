import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchVisualBrowser,labUrl} from './visual-browser.mjs';
const browser=await launchVisualBrowser();
try {
 const page=await browser.newPage();await page.goto(`${labUrl}/lab?mock=0`);
 await page.waitForFunction(()=>window.__lab?.stats());
 await page.getByLabel('Follow real app bridge (local mix)').check();await page.waitForTimeout(800);
 await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(3500);
 const result=await page.evaluate(async()=>{
   const {stageBridge}=await import('/src/lib/stage-bridge.ts');
   const {scoreMatchesDuration}=await import('/src/components/stage/coupling.ts');
   const snapshot={...stageBridge.getSnapshot()},window=stageBridge.getScoreWindow(0,1);
   return {snapshot,scoreDuration:window?.duration,durationMatches:window&&scoreMatchesDuration(window.duration,snapshot.durationSec),stats:{...globalThis.__lab.stats()},hud:document.querySelector('.lab-hud').textContent};
 });
 assert.equal(result.snapshot.phase,'playing');assert.ok(result.snapshot.positionSec>1);
 assert.ok(result.stats.colour>.85);assert.equal(result.stats.scored,result.durationMatches);
 await writeFile('artifacts/visual-verification/real-audio.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
