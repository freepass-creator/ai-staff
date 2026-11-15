import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {Resvg}=createRequire(import.meta.url)(process.argv[3]);
const inputs=['D:/large/ai-staff/robot-family-r1-front-20261115/CLO-01-R1-front.png','D:/large/ai-staff/클로이/canonical-smooth-v1-20261115/CLO-02-freepass-front-v1.png','D:/large/ai-staff/robot-family-r1-front-20261115/CLO-03-R1-front.png','D:/large/ai-staff/robot-family-r1-front-20261115/CLO-04-R1-front.png'];
const bounds=[[175,120,670,1348],[180,132,661,1332],[180,74,664,1401],[175,60,675,1435]];
// Subject placement only: approved source bytes are never repainted.
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1150"><rect width="2000" height="1150" fill="#ededeb"/>';
for(let i=0;i<4;i++){const png=await readFile(inputs[i]);const [x,y,w,h]=bounds[i],dh=950,dw=w/h*dh,left=i*500+(500-dw)/2;svg+=`<text x="${i*500+250}" y="50" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="bold">CLO-0${i+1} ${i===1?'V1 · CURRENT':'R1 · PROPOSAL'}</text><svg x="${left}" y="110" width="${dw}" height="${dh}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><image width="1024" height="1536" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;}
svg+='<path d="M20 1064H1980" stroke="#a8aaa4" stroke-width="2"/><text x="1000" y="1120" text-anchor="middle" font-family="sans-serif" font-size="22">FRONT VIEW · SAME DISPLAY HEIGHT · CLO-02 ORIGINAL UNCHANGED · DESIGN COMPARISON, NOT A 3D BLUEPRINT</text></svg>';
await writeFile(process.argv[2],new Resvg(svg).render().asPng());

