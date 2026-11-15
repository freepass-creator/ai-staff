import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {selectScenes} from './select.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function selectLibrary({root,brief,...options}){
 const link=JSON.parse(await readFile(path.join(root,'asset-library/chloe-blog/library.json'),'utf8'));
 const base=await realpath(link.library_root),manifest=JSON.parse(await readFile(path.join(base,'manifest.json'),'utf8'));
 const result=selectScenes(manifest,brief,options);
 for(const a of result.matches){const file=await realpath(path.resolve(base,a.file));if(!file.startsWith(base+path.sep)||hash(await readFile(file))!==a.sha256)throw Error('LIBRARY_ASSET_HASH_MISMATCH');}
 return {library_revision:manifest.library_revision,...result};
}
// Serve only explicitly registered library files, never directory listings or old designs.
export async function serveLibrary({root,pathname,res,method}){
 const link=JSON.parse(await readFile(path.join(root,'asset-library/chloe-blog/library.json'),'utf8'));
 if(pathname==='/library/download.zip'){
  const bytes=await readFile(link.portable_bundle);
  if(!link.portable_bundle_sha256||hash(bytes)!==link.portable_bundle_sha256)throw Error('LIBRARY_BUNDLE_HASH_MISMATCH');
  res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Chloe-Blog-V1-Kit.zip"','Cache-Control':'no-store','X-Asset-SHA256':link.portable_bundle_sha256});res.end(method==='HEAD'?undefined:bytes);return;
 }
 const base=await realpath(link.library_root);
 const manifest=JSON.parse(await readFile(path.join(base,'manifest.json'),'utf8'));
 const exports=JSON.parse(await readFile(path.join(base,'exports.json'),'utf8'));
 const lock=JSON.parse(await readFile(path.join(base,'identity-lock.json'),'utf8'));
 const allowed=new Map(['index.html','AI-START-HERE.md','AI-WRITER-USAGE.md','usage-index.json','usage-rules.json','selection-examples.json','production-plan.json','select.mjs','usage.mjs','context-scenes.html','context-scenes.png','manifest.json','prompts.json','identity-lock.json','README.md','build.mjs','template.mjs','gallery.mjs','gallery-ui.mjs','exports.json','contact-sheet.png','rental-scenes.html','rental-scenes.png','angle-scenes.html','angle-scenes.png','brand/ci-P2.svg','brand/SUITE-Heavy.woff2','brand/LICENSE-SUITE-OFL.txt'].map(f=>[f,null]));
 const active=manifest.assets.filter(a=>a.production_usable!==false),activeIds=new Set(active.map(a=>a.id));
 for(const a of active)allowed.set(a.file,a.sha256);
 for(const a of exports.exports.filter(a=>activeIds.has(a.asset_id)))allowed.set(a.file,a.sha256);
 for(const [name,sha]of Object.entries(lock.reference_hashes))allowed.set('refs/'+name,sha);
 const name=pathname.slice('/library/'.length)||'index.html';
 if(!allowed.has(name)){res.writeHead(404,{'Cache-Control':'no-store'});res.end('UNKNOWN_LIBRARY_ASSET');return;}
 const file=await realpath(path.resolve(base,name));
 if(!file.startsWith(base+path.sep))throw Error('INVALID_LIBRARY_PATH');
 const bytes=await readFile(file),sha=hash(bytes);
 if(allowed.get(name)&&allowed.get(name)!==sha)throw Error('LIBRARY_ASSET_HASH_MISMATCH');
 const mime={'.html':'text/html; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.txt':'text/plain; charset=utf-8'};
 res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Asset-SHA256':sha});res.end(method==='HEAD'?undefined:bytes);
}
