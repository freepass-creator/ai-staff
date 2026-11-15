import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {Resvg}=createRequire(import.meta.url)(process.argv[3]);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const c=JSON.parse(await readFile(path.join(root,'robots/revisions/current.json'),'utf8'));
const current=JSON.parse(await readFile(path.join(root,'robots/current.json'),'utf8'));
const refs=JSON.parse(await readFile(path.join(root,'robots/revisions/existing-references.json'),'utf8')).references;
const ids=['COD-01','CLO-02','COD-03','CLO-04'];
const boxes=JSON.parse(await readFile(process.argv[4],'utf8'));
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1150"><rect width="2000" height="1150" fill="#ededeb"/>';
let pairs='<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1500"><rect width="1800" height="1500" fill="#ededeb"/>';
for(let i=0;i<4;i++){
 const id=ids[i],source=id==='CLO-02'?current.variants['basic-purple-v1'].assets.png.file:c.proposals.find(a=>a.character_id===id).source_png;
 const png=await readFile(source),[x,y,w,h]=boxes[id],dh=950,dw=w/h*dh,left=i*500+(500-dw)/2;
 svg+=`<text x="${i*500+250}" y="50" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="bold">${id} ${id==='CLO-02'?'V1 CURRENT':'FRONT REVISION'}</text><svg x="${left}" y="110" width="${dw}" height="${dh}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><image width="1024" height="1536" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
 if(id!=='CLO-02'){
  const j=['COD-01','COD-03','CLO-04'].indexOf(id),original=await readFile(refs.find(a=>a.character_id===id).file);
  pairs+=`<text x="${j*600+300}" y="45" text-anchor="middle" font-family="sans-serif" font-size="30">${id} · EXISTING IDENTITY</text><image x="${j*600+75}" y="65" width="450" height="450" href="data:image/png;base64,${original.toString('base64')}"/><svg x="${j*600+300-dw/2}" y="550" width="${dw}" height="${dh}" viewBox="${x} ${y} ${w} ${h}"><image width="1024" height="1536" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
 }
}
svg+='<path d="M20 1064H1980" stroke="#a8aaa4"/><text x="1000" y="1120" text-anchor="middle" font-family="sans-serif" font-size="22">EXISTING CHARACTERS · FRONT VIEW · COMMON DISPLAY HEIGHT · CLO-02 UNCHANGED · DERIVATIVES, NOT 3D BLUEPRINTS</text></svg>';
await writeFile(process.argv[2],new Resvg(svg).render().asPng());
await writeFile(process.argv[2].replace('.png','-sources.png'),new Resvg(pairs+'</svg>').render().asPng());
