import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function serveGestures({root,pathname,res,method}){
 const name=pathname.slice('/gestures/'.length)||'index.html',allowed=new Set(['index.html','app.js','animation.js','spec.json','rig.svg','web.svg','path-animated.svg','preview.mp4','animated.svg','download.zip','README.md']);
 if(!allowed.has(name)){res.writeHead(404);return res.end('UNKNOWN_GESTURE_ASSET');}
 let file=path.join(root,'motion-lab/gestures',name),expected;
 if(['rig.svg','web.svg','path-animated.svg','preview.mp4','animated.svg','download.zip'].includes(name)){const spec=JSON.parse(await readFile(path.join(root,'motion-lab/gestures/spec.json'),'utf8'));const pair={'rig.svg':['svg_file','svg_sha256'],'web.svg':['fast_svg_file','fast_svg_sha256'],'path-animated.svg':['path_animated_file','path_animated_sha256'],'preview.mp4':['preview_file','preview_sha256'],'animated.svg':['animated_svg_file','animated_svg_sha256'],'download.zip':['bundle_file','bundle_sha256']}[name];file=spec[pair[0]];expected=spec[pair[1]];if(!file||!expected)throw Error('GESTURE_ASSET_NOT_READY');}
 const bytes=await readFile(file),sha=createHash('sha256').update(bytes).digest('hex');if(expected&&expected!==sha)throw Error('GESTURE_HASH_MISMATCH');
 const mime={'.zip':'application/zip','.svg':'image/svg+xml','.mp4':'video/mp4','.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
 res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Content-Length':bytes.length,'Cache-Control':'no-store','X-Asset-SHA256':sha,'X-Content-Type-Options':'nosniff'});res.end(method==='HEAD'?undefined:bytes);
}
