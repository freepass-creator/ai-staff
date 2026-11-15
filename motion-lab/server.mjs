import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function serveMotion({root,pathname,res,method}){
 const name=pathname.slice('/motion/'.length)||'index.html';
 const allowed=new Set(['index.html','app.js','motion.js','spec.json','README.md','preview.mp4']);
 if(!allowed.has(name)){res.writeHead(404);return res.end('UNKNOWN_MOTION_ASSET');}
 let file=path.join(root,'motion-lab',name),sha;
 if(name==='preview.mp4'){const s=JSON.parse(await readFile(path.join(root,'motion-lab/spec.json'),'utf8'));if(!s.preview_sha256)throw Error('MOTION_PREVIEW_NOT_READY');file=s.preview_file;sha=s.preview_sha256;}
 const bytes=await readFile(file),actual=createHash('sha256').update(bytes).digest('hex');if(sha&&sha!==actual)throw Error('MOTION_PREVIEW_HASH_MISMATCH');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.mp4':'video/mp4'};
 res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Content-Length':bytes.length,'Cache-Control':'no-store','X-Asset-SHA256':actual});res.end(method==='HEAD'?undefined:bytes);
}
