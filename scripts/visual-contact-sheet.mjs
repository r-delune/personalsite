import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), sharp=createRequire(require.resolve('astro/package.json'))('sharp');
const dir=process.env.VISUAL_OUTPUT||'artifacts/visual-verification';
const names=['A · Breathing limb','B · Orbiting dust','C · Atmosphere'];
const layers=[];
for(let i=0;i<3;i++){
  const v='abc'[i];
  layers.push({input:await sharp(`${dir}/variant-${v}-desktop.png`).resize(480,300).png().toBuffer(),left:i*480,top:45});
  layers.push({input:await sharp(`${dir}/variant-${v}-mobile.png`).resize(180,390).png().toBuffer(),left:i*480+150,top:365});
  const label=Buffer.from(`<svg width="480" height="40"><text x="20" y="28" font-family="monospace" font-size="18" fill="#eae9e5">${names[i]}</text></svg>`);
  layers.push({input:label,left:i*480,top:0});
}
await sharp({create:{width:1440,height:775,channels:3,background:'#0b0c0e'}}).composite(layers).png().toFile(`${dir}/comparison.png`);
