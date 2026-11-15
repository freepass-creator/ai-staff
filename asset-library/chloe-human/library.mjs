import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadHumanLibrary(root){
  return JSON.parse(await readFile(path.join(root,'asset-library/chloe-human/library.json'),'utf8'));
}
export function selectHumanScenes(library,brief,{limit=3,requiresRealSource=false}={}){
  if(typeof brief!=='string'||brief.length>2000)throw Error('INVALID_BRIEF');
  if(!Number.isInteger(limit)||limit<1||limit>5)throw Error('INVALID_LIMIT');
  const normalized=brief.normalize('NFKC').replace(/\s/g,'');
  const evidence=/실제.{0,12}(계약서|출고|차량|영업장|직원).{0,8}(사진|촬영|증빙)/.test(normalized)||['증빙사진','서명완료증빙','실제서명','신분증사진','등록증사진','실차사진'].some(t=>normalized.includes(t));
  if(requiresRealSource||evidence)return {status:'real_source_required',matches:[]};
  const query=brief.toLowerCase().normalize('NFKC');
  const matches=library.scenes.filter(a=>a.production_usable===true).map(a=>{
    const matched_terms=a.keywords.filter(k=>query.includes(k.toLowerCase()));
    const primary_hits=(a.primary_keywords||[]).filter(k=>query.includes(k.toLowerCase()));
    return {id:a.id,label:a.label,form:'human',usage:a.usage,layout:a.layout,camera_angle:a.camera_angle,framing:a.framing,
      png_url:'/human/'+a.id+'.png',svg_url:'/human/'+a.id+'.svg',source_sha256:a.source_sha256,svg_sha256:a.svg_sha256,
      matched_terms,confidence:primary_hits.length?'scene_keyword':'general_keyword',score:matched_terms.length+primary_hits.length*3};
  }).filter(a=>a.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit);
  return {status:matches.length?(matches[0].confidence==='scene_keyword'?'matched':'weak_match'):'no_match',method:'keyword rules; verify scene relevance',matches};
}
export async function selectHumanLibrary({root,brief,...options}){
  const library=await loadHumanLibrary(root),result=selectHumanScenes(library,brief,options);
  for(const scene of result.matches){
    const bytes=await readFile(path.join(library.library_root,scene.id+'.png'));
    if(hash(bytes)!==scene.source_sha256)throw Error('HUMAN_ASSET_HASH_MISMATCH');
  }
  return {revision:library.revision,...result};
}
export async function serveHumanLibrary({root,pathname,res,method,libraryPath='asset-library/chloe-human/library.json',prefix='/human/',downloadFilename='Chloe-Human-Asset-Kit.zip',catalog}){
  const library=catalog||JSON.parse(await readFile(path.join(root,libraryPath),'utf8'));
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(method==='HEAD'?undefined:JSON.stringify(body));};
  if(pathname===prefix+'download.zip'){
    const bytes=await readFile(library.package.file);
    if(hash(bytes)!==library.package.sha256)throw Error('HUMAN_BUNDLE_HASH_MISMATCH');
    res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+downloadFilename+'"','Cache-Control':'no-store','X-Asset-SHA256':library.package.sha256});return res.end(method==='HEAD'?undefined:bytes);
  }
  const base=await realpath(library.library_root),manifest=JSON.parse(await readFile(path.join(base,'manifest.json'),'utf8'));
  const allowed=new Map(manifest.files.map(f=>[f.file,f.sha256]));allowed.set('manifest.json',null);
  const name=pathname.slice(prefix.length)||'index.html';
  if(!allowed.has(name))return send(404,{error:'UNKNOWN_HUMAN_ASSET'});
  const file=await realpath(path.resolve(base,name));
  if(!file.toLowerCase().startsWith(base.toLowerCase()+path.sep))return send(403,{error:'INVALID_LIBRARY_PATH'});
  const bytes=await readFile(file),sha=hash(bytes);
  if(allowed.get(name)&&allowed.get(name)!==sha)throw Error('HUMAN_ASSET_HASH_MISMATCH');
  const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.py':'text/plain; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Asset-SHA256':sha});return res.end(method==='HEAD'?undefined:bytes);
}
