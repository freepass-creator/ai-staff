import {readFile,writeFile,mkdir,access,readdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {renderTemplate,validateJob} from './layouts.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function exportBatch({input,bundle,output,playwrightModule}){
 input=path.resolve(input);bundle=path.resolve(bundle);output=path.resolve(output);
 const jobs=JSON.parse(await readFile(input,'utf8')),assetManifest=JSON.parse(await readFile(path.join(bundle,'assets.json'),'utf8'));
 if(!Array.isArray(jobs)||!jobs.length||jobs.length>100)throw Error('BATCH_MUST_HAVE_1_TO_100_ITEMS');
 if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('DUPLICATE_OUTPUT_ID');
 for(const j of jobs)validateJob(j,assetManifest.assets);
 const registered=new Set(assetManifest.files.map(f=>f.file));
 const identity=assetManifest.identity;
 if(!identity||identity.character_id!=='CLO-02'||identity.selected_panel!=='B'||!assetManifest.files.some(f=>f.file===identity.reference&&f.sha256===identity.reference_sha256))throw Error('IDENTITY_LOCK_REQUIRED');
 for(const asset of Object.values(assetManifest.assets))if(!asset.file.startsWith('assets/')||asset.file.split('/').includes('..')||!registered.has(asset.file))throw Error('UNREGISTERED_ASSET_FILE');
 for(const f of assetManifest.files){
  const p=path.resolve(bundle,f.file);
  if(!p.toLowerCase().startsWith(bundle.toLowerCase()+path.sep))throw Error('ASSET_PATH_OUTSIDE_BUNDLE');
  if(sha(await readFile(p))!==f.sha256)throw Error('ASSET_HASH_MISMATCH:'+f.file);
 }
 try{await access(output);}catch(e){if(e.code!=='ENOENT')throw e;await mkdir(output,{recursive:true});}
 if((await readdir(output)).length)throw Error('OUTPUT_DIRECTORY_NOT_EMPTY');
 for(const j of jobs)for(const ext of ['png','html']){
  try{await access(path.join(output,j.id+'.'+ext));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  throw Error('OUTPUT_EXISTS:'+j.id+'.'+ext);
 }
 // HTML resolves only registered fonts/CI/images from this exact bundle.
 await cp(path.join(bundle,'assets'),path.join(output,'assets'),{recursive:true,errorOnExist:false});
 const imported=playwrightModule||process.env.AI_STAFF_PLAYWRIGHT_MODULE||'playwright';
 const {chromium}=await import(path.isAbsolute(imported)?pathToFileURL(imported).href:imported);
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-color-profile=srgb']});
 const receipt={status:'PASS',jobs:[]};
 try{
  for(const j of jobs){
   const l=validateJob(j,assetManifest.assets),html=renderTemplate(j,assetManifest.assets),htmlFile=path.join(output,j.id+'.html');
   await writeFile(htmlFile,html);
   const page=await browser.newPage({viewport:{width:l.width,height:l.height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(htmlFile).href);
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
   const qa=await page.evaluate(()=>{
    const issues=[],board=document.querySelector('.canvas').getBoundingClientRect();
    for(const el of document.querySelectorAll('[data-fit]')){
     const r=el.getBoundingClientRect();
     const maxHeight=parseFloat(getComputedStyle(el).maxHeight)||el.clientHeight;
     if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>maxHeight+4)issues.push('text-overflow:'+el.textContent);
     if(r.x<0||r.y<0||r.right>board.right+1||r.bottom>board.bottom+1)issues.push('outside-canvas:'+el.textContent);
    }
    const visual=document.querySelector('.character,.scene');
    if(visual){const v=visual.getBoundingClientRect();for(const el of document.querySelectorAll('[data-fit]')){const t=el.getBoundingClientRect();if(Math.min(v.right,t.right)-Math.max(v.left,t.left)>1&&Math.min(v.bottom,t.bottom)-Math.max(v.top,t.top)>1)issues.push('text-visual-overlap:'+el.textContent);}}
    return {issues,fonts:[document.fonts.check('900 60px SUITE'),document.fonts.check('400 32px BodyKR'),document.fonts.check('700 32px BodyKR')],images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)};
   });
   if(qa.issues.length||qa.fonts.some(v=>!v)||!qa.images||errors.length)throw Error('LAYOUT_QA_FAILED:'+j.id+':'+JSON.stringify({...qa,errors}));
   const png=await page.screenshot({type:'png',fullPage:false});await writeFile(path.join(output,j.id+'.png'),png);
   receipt.jobs.push({id:j.id,template:j.template,width:l.width,height:l.height,png_sha256:sha(png),qa});
   await page.close();
  }
 }finally{await browser.close();}
 await writeFile(path.join(output,'render-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options={};for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!['--input','--bundle','--output','--playwright-module'].includes(key)||!process.argv[i+1])throw Error('USAGE: --input jobs.json --bundle kit --output new-folder [--playwright-module path]');options[key.slice(2).replace(/-([a-z])/g,(_,a)=>a.toUpperCase())]=process.argv[i+1];}
 if(!options.input||!options.bundle||!options.output)throw Error('INPUT_BUNDLE_OUTPUT_REQUIRED');
 const result=await exportBatch(options);console.log(JSON.stringify({status:result.status,exported:result.jobs.length}));
}
