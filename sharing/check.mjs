import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]);
const {createCurrentServer}=await import(pathToFileURL(path.join(root,'robots/current-server.mjs')).href);
const server=createCurrentServer({root,catalogFile:path.join(root,'robots/current.json')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
try{
 for(const route of ['/','/characters/','/human/','/templates/','/library/','/gestures/','/gestures/rig.svg','/gestures/download.zip','/human/download.zip','/templates/download.zip','/library/download.zip'])assert.equal((await fetch(base+route,{method:'HEAD'})).status,200,route);
 for(const route of ['/library/poses/01-welcome-structured-palm.png','/library/exports/01-welcome-hero.png'])assert.equal((await fetch(base+route)).status,404,route);
 assert.equal((await fetch(base+'/motion/')).status,410);
 const robot=await(await fetch(base+'/api/characters/resolve?q='+encodeURIComponent('착한클로이')+'&production=1')).json();
 assert.equal(robot.asset_integrity,'verified');
 const basic=await(await fetch(base+'/api/characters/resolve?q='+encodeURIComponent('기본클로이')+'&production=1')).json();assert.equal(basic.asset_integrity,'verified');
 const human=await(await fetch(base+'/api/characters/human/select?q='+encodeURIComponent('태블릿 상담'))).json();assert.equal(human.matches[0].id,'02-tablet-consultation');
 const real=await(await fetch(base+'/api/characters/human/select?q='+encodeURIComponent('실제 계약서 서명 사진'))).json();assert.equal(real.status,'real_source_required');
 const lib=await(await fetch(base+'/library/manifest.json')).json();assert.equal(lib.assets.length,37);assert.ok(!lib.assets.some(a=>a.production_usable===false));
 console.log('CURRENT_SOURCE_AND_ASSETS_PASS');
}finally{await new Promise(r=>server.close(r));}
