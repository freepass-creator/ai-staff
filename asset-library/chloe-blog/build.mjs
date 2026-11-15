// Export code-native blog layouts without changing the generated character pixels.
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {renderCard,formats} from './template.mjs';
import {renderGallery} from './gallery.mjs';
import {enrichUsage,usageIndex,usageMarkdown} from './usage.mjs';
const args=process.argv.slice(2),root=path.resolve(args[0]||'.');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
enrichUsage(manifest);
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(root,'usage-index.json'),JSON.stringify(usageIndex(manifest),null,2)+'\n');
await writeFile(path.join(root,'AI-WRITER-USAGE.md'),usageMarkdown(manifest));
await writeFile(path.join(root,'index.html'),renderGallery(manifest));
if(manifest.assets.some(a=>a.series==='natural-angles'))await writeFile(path.join(root,'angle-scenes.html'),renderGallery(manifest,{anglesOnly:true}));
if(manifest.assets.some(a=>a.series==='contextual-actions'))await writeFile(path.join(root,'context-scenes.html'),renderGallery(manifest,{series:'contextual-actions'}));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const a of manifest.assets){if(sha(await readFile(path.join(root,a.file)))!==a.sha256)throw Error('POSE_HASH_MISMATCH: '+a.id);}
let chromium;
if(process.env.CHLOE_PLAYWRIGHT_MODULE)({chromium}=await import(pathToFileURL(process.env.CHLOE_PLAYWRIGHT_MODULE).href));
else ({chromium}=await import('playwright'));
const types={'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/card'){const a=manifest.assets.find(a=>a.id===u.searchParams.get('id'));if(!a)throw Error('UNKNOWN_ASSET');res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(renderCard(a,u.searchParams.get('format')||'hero'));}
 const target=await realpath(path.resolve(root,'.'+decodeURIComponent(u.pathname)));const base=await realpath(root);
 if(!target.startsWith(base+path.sep)||!types[path.extname(target)])throw Error('NOT_PUBLIC');
 res.setHeader('Content-Type',types[path.extname(target)]);res.end(await readFile(target));
 }catch(e){res.writeHead(404);res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const exports=[];
try{
 browser=await chromium.launch({channel:process.env.CHLOE_BROWSER_CHANNEL||'msedge',headless:true,args:['--force-color-profile=srgb']});
 const page=await browser.newPage({deviceScaleFactor:1});
 const base='http://127.0.0.1:'+server.address().port;
 await mkdir(path.join(root,'exports'),{recursive:true});
 for(const a of manifest.assets)for(const [format,size]of Object.entries(formats)){
  await page.setViewportSize(size);await page.goto(base+'/card?id='+a.id+'&format='+format);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  const clipping=await page.evaluate(()=>{const title=document.querySelector('h1').getBoundingClientRect(),pose=document.querySelector('.pose').getBoundingClientRect(),copy=document.querySelector('.copy').getBoundingClientRect();return {title_inside:title.right<=innerWidth&&title.bottom<innerHeight,copy_pose_separate:copy.bottom<=pose.top||copy.right<=pose.left||pose.right<=copy.left};});
  if(!clipping.title_inside||!clipping.copy_pose_separate)throw Error('LAYOUT_OVERLAP: '+a.id+' '+format);
  const file='exports/'+a.id+'-'+format+'.png';await page.screenshot({path:path.join(root,file)});exports.push({asset_id:a.id,format,width:size.width,height:size.height,file,sha256:sha(await readFile(path.join(root,file))),validation:clipping});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/index.html');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:path.join(root,'contact-sheet.png'),fullPage:true});
 if(manifest.assets.length>6){await page.goto(base+'/rental-scenes.html');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:path.join(root,'rental-scenes.png'),fullPage:true});}
 if(manifest.assets.some(a=>a.series==='natural-angles')){await page.goto(base+'/angle-scenes.html');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:path.join(root,'angle-scenes.png'),fullPage:true});}
 if(manifest.assets.some(a=>a.series==='contextual-actions')){await page.goto(base+'/context-scenes.html');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:path.join(root,'context-scenes.png'),fullPage:true});}
 await writeFile(path.join(root,'exports.json'),JSON.stringify({schema_version:1,exports},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',poses:manifest.assets.length,exports:exports.length}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
