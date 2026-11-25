import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalog,resolve,verifiedAsset} from './current.mjs';
import {serveLibrary,selectLibrary} from '../asset-library/chloe-blog/library.mjs';
import {serveGestures} from '../motion-lab/gestures/server.mjs';
import {serveHumanLibrary,selectHumanLibrary} from '../asset-library/chloe-human/library.mjs';
import {serveShare} from '../sharing/server.mjs';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
export function createCurrentServer({root,catalogFile}){
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 return http.createServer(async(req,res)=>{try{
  if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return send(res,403,{error:'localhost only'});
  if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'read-only character reference server'});
  const u=new URL(req.url,'http://'+req.headers.host);const pathname=decodeURIComponent(u.pathname);
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p.startsWith('.')))return send(res,403,{error:'invalid path'});
  const c=await loadCatalog(catalogFile);
  if(pathname==='/characters'||pathname.startsWith('/characters/')){res.writeHead(307,{Location:'https://ai-staff-two.vercel.app/?kind=canonical','Cache-Control':'no-store'});return res.end();}
  if(['/library','/gestures','/share','/templates'].some(p=>pathname===p||pathname.startsWith(p+'/'))||pathname==='/api/characters/library/select')return send(res,410,{error:'RETIRED_CHARACTER_LIBRARY',current:'https://ai-staff-two.vercel.app/api/characters/current',viewer:'https://ai-staff-two.vercel.app/chakhan/'});
  if(['/api/characters/current','/api/characters/resolve'].includes(pathname)||pathname.startsWith('/api/characters/assets/')){res.writeHead(307,{Location:'https://ai-staff-two.vercel.app'+pathname+u.search,'Cache-Control':'no-store'});return res.end();}
  if(pathname==='/share'){res.writeHead(302,{Location:'/share/','Cache-Control':'no-store'});return res.end();}
  if(pathname.startsWith('/share/'))return await serveShare({root,pathname,res,method:req.method});
  if(pathname==='/templates'){res.writeHead(302,{Location:'/templates/','Cache-Control':'no-store'});return res.end();}
  if(pathname.startsWith('/templates/'))return await serveHumanLibrary({root,pathname,res,method:req.method,libraryPath:'asset-library/blog-templates/library.json',prefix:'/templates/',downloadFilename:'Chakhan-Blog-Poster-Kit.zip'});
  if(pathname==='/human'){res.writeHead(302,{Location:'/human/','Cache-Control':'no-store'});return res.end();}
  if(pathname.startsWith('/human/'))return await serveHumanLibrary({root,pathname,res,method:req.method});
  if(pathname==='/api/characters/human/select'){
   try{return send(res,200,await selectHumanLibrary({root,brief:u.searchParams.get('q')||'',limit:Number(u.searchParams.get('limit')||3),requiresRealSource:u.searchParams.get('evidence')==='1'}));}catch(e){if(['INVALID_LIMIT','INVALID_BRIEF'].includes(e.message))return send(res,400,{error:e.message});throw e;}
  }
  if(pathname==='/gestures'){res.writeHead(302,{Location:'/gestures/','Cache-Control':'no-store'});return res.end();}
  if(pathname.startsWith('/gestures/'))return await serveGestures({root,pathname,res,method:req.method});
  if(pathname==='/motion'||pathname.startsWith('/motion/'))return send(res,410,{error:'RETIRED_MOTION_PROTOTYPE',current:'/gestures/'});
  if(pathname==='/api/characters/library/select'){
   try{return send(res,200,await selectLibrary({root,brief:u.searchParams.get('q')||'',limit:Number(u.searchParams.get('limit')||3),transparentOnly:u.searchParams.get('alpha')==='1',requiresRealSource:u.searchParams.get('evidence')==='1',camera:u.searchParams.get('camera')||null,target:u.searchParams.get('target')||null}));}catch(e){if(['INVALID_LIMIT','INVALID_BRIEF'].includes(e.message))return send(res,400,{error:e.message});throw e;}
  }
  if(pathname==='/library'){res.writeHead(302,{Location:'/library/','Cache-Control':'no-store'});return res.end();}
  if(pathname.startsWith('/library/'))return await serveLibrary({root,pathname,res,method:req.method});
  if(pathname==='/api/characters/current')return send(res,200,{schema_version:c.schema_version,updated_on:c.updated_on,variants:Object.fromEntries(Object.keys(c.variants).filter(id=>c.variants[id].status!=='retired').map(id=>[id,resolve(c,c.variants[id].lookup_alias)]))});
  if(pathname==='/api/characters/resolve'){const q=u.searchParams.get('q')||'';let v;try{v=resolve(c,q,{production:u.searchParams.get('production')==='1'});}catch(e){return send(res,e.code==='RETIRED_CHARACTER_ASSET'?410:e.code==='CANDIDATE_NOT_PRODUCTION_APPROVED'?409:404,{error:e.code,available:Object.keys(c.variants).filter(id=>c.variants[id].status!=='retired')});}for(const kind of Object.keys(v.assets))await verifiedAsset(v,kind);return send(res,200,{...v,asset_integrity:'verified'});}
  if(pathname.startsWith('/character-assets/')){
   const [,base,id,kind,extra]=pathname.split('/');if(extra||!c.variants[id])return send(res,404,{error:'unknown variant'});
   if(c.variants[id].status==='retired')return send(res,410,{error:'RETIRED_CHARACTER_ASSET',current:'https://ai-staff-two.vercel.app/api/characters/current'});
   if(u.searchParams.get('production')==='1'&&!c.variants[id].production_usable)return send(res,409,{error:'CANDIDATE_NOT_PRODUCTION_APPROVED'});
   const a=await verifiedAsset(c.variants[id],kind);if(u.searchParams.has('sha')&&u.searchParams.get('sha')!==a.sha256)return send(res,409,{error:'STALE_ASSET_HASH'});
   res.writeHead(200,{'Content-Type':mime[path.extname(a.file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Character-Variant':id,'X-Character-Status':c.variants[id].status,'X-Asset-SHA256':a.sha256});return res.end(req.method==='HEAD'?undefined:a.bytes);
  }
  if(pathname==='/studio/'||pathname==='/studio/index.html'||pathname==='/studio/studio/'||pathname==='/studio/studio/index.html'){res.writeHead(302,{Location:'/characters/?variant=chakhan-white-v1','Cache-Control':'no-store'});return res.end();}
  if(/^\/studio\/assets\/clo02-|^\/robots\/CLO-02\/chakhan-sales\/.*\.(png|webp|jpg)$/i.test(pathname))return send(res,410,{error:'RETIRED_CHARACTER_ASSET',current:'/api/characters/resolve?q=착한클로이'});
  // Archives stay on disk; only the current viewer inputs are served.
  const publicFiles=new Set(['/index.html','/characters/index.html','/characters/current.js','/employees/index.html','/employees/app.js','/employees/styles.css','/employees/style.css','/employees/staff.json','/robots/CURRENT.md','/robots/current.json','/robots/registry.json','/studio/characters.json']);
  const publicPath=pathname.endsWith('/')?pathname+'index.html':pathname;
  if(!publicFiles.has(publicPath))return send(res,410,{error:'NOT_CURRENT_CHARACTER_RESOURCE',current:'/characters/'});
  const file=path.resolve(root,'.'+publicPath);const real=await realpath(file),base=await realpath(root);
  if(!real.toLowerCase().startsWith(base.toLowerCase()+path.sep)||!mime[path.extname(real)])return send(res,403,{error:'not an allowed public reference file'});
  res.writeHead(200,{'Content-Type':mime[path.extname(real)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(req.method==='HEAD'?undefined:await readFile(real));
 }catch(e){return send(res,e.code==='ENOENT'?404:409,{error:e.message});}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=process.env.AI_STAFF_PROJECT_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const server=createCurrentServer({root,catalogFile:path.join(root,'robots/current.json')});server.listen(Number(process.env.AI_STAFF_CHARACTER_PORT||54640),'127.0.0.1',()=>console.log('AI Staff current characters: http://127.0.0.1:'+server.address().port+'/characters/'));
}
