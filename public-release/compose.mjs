import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
const [input,output,modulePath]=process.argv.slice(2);if(!input||!output||!modulePath)throw Error('USAGE: compose.mjs inputs.json new-output-folder resvg-module');
const require=createRequire(import.meta.url),{Resvg}=require(modulePath),sha=b=>createHash('sha256').update(b).digest('hex');
const data=JSON.parse(await readFile(input,'utf8')),local=p=>path.isAbsolute(p)?p:path.resolve(path.dirname(path.resolve(input)),p);await mkdir(output,{recursive:false});
const scenes=[];
for(const bg of data.backgrounds){
 const bytes=await readFile(local(bg.file));if(sha(bytes)!==bg.sha256)throw Error('BACKGROUND_CHANGED');
 for(const actor of data.characters.filter(a=>bg.character_ids.includes(a.id))){
  const image=await readFile(local(actor.file));if(sha(image)!==actor.sha256)throw Error('CHARACTER_CHANGED');
  const [bx,by,bw,bh]=actor.alpha_bounds;
  const full=['full_body','full_seated_with_desk'].includes(actor.framing),height=full?780:930;
  let h=height,w=bw/bh*h;if(!full&&w>820){w=820;h=w*bh/bw;}
  const x=full?140:55,y=full?940-h:1030-h,id='scene-'+bg.id+'-'+actor.id;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><defs><filter id="soft"><feGaussianBlur stdDeviation="13"/></filter></defs><image width="1600" height="1000" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${bytes.toString('base64')}"/>${full?`<ellipse cx="${x+w/2}" cy="944" rx="${w*.34}" ry="16" fill="#2b342b" opacity=".14" filter="url(#soft)"/>`:''}<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden"><image width="${actor.width}" height="${actor.height}" href="data:image/png;base64,${image.toString('base64')}"/></svg></svg>`;
  const png=new Resvg(svg).render().asPng(),file=output+'/'+id+'.png';await writeFile(file,png);
  scenes.push({id,file,sha256:sha(png),title:bg.label+' · '+actor.label,usage:actor.usage,environment:bg.label,framing:actor.framing,outfit:actor.outfit,character_id:actor.id,character_sha256:actor.sha256,background_sha256:bg.sha256,composition:{canvas:[1600,1000],character_box:[x,y,w,h],source_view_box:[bx,by,bw,bh],method:'original PNG textures positioned in SVG, no character regeneration'}});
 }
}
await writeFile(output+'/scenes.json',JSON.stringify({schema:'ai-staff/fixed-character-scenes/v1',scenes},null,2)+'\n');console.log(JSON.stringify({status:'PASS',scenes:scenes.length,character_regeneration:false}));
