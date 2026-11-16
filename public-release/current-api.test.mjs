import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';
import {createCharacterApi,validateCurrentAssets} from './current-api.mjs';import {createCurrentServer} from '../robots/current-server.mjs';
import {mkdtemp} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import path from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL,fileURLToPath} from 'node:url';
const bytes=Buffer.from('registered PNG fixture'),sha=createHash('sha256').update(bytes).digest('hex'),data={revision:'current-batch',assets:[{id:'cover-confident',sha256:sha,upstream_url:'https://example.invalid/fixed.png'}],aliases:{착한클로이:'cover-confident'},retired_ids:['robot-33-think-choice']};
test('final API gate rejects retired SHA or ID and duplicate IDs across merged collections',()=>{assert.throws(()=>validateCurrentAssets(data.assets,{sha256:[sha]}),/RETIRED_ASSET/);assert.throws(()=>validateCurrentAssets(data.assets,{ids:['cover-confident']}),/RETIRED_ASSET/);assert.throws(()=>validateCurrentAssets([...data.assets,...data.assets]),/DUPLICATE_CURRENT_ASSET/);assert.equal(validateCurrentAssets(data.assets).length,1);});
async function run(server,fn){await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn('http://127.0.0.1:'+server.address().port);}finally{await new Promise(r=>server.close(r));}}
test('current API exposes stable IDs without upstream URLs, blocks retired IDs and old hashes',async()=>{
 let calls=0;await run(createServer(createCharacterApi(data,{fetchAsset:async()=>{calls++;return new Response(bytes);}})),async base=>{
  const current=await fetch(base+'/api/characters/current');assert.equal(current.headers.get('cache-control'),'no-store');assert.equal(current.headers.get('access-control-allow-origin'),'*');assert.equal(JSON.stringify(await current.json()).includes('example.invalid'),false);
  for(const route of ['resolve?id=robot-33-think-choice','assets/robot-33-think-choice','assets/cover-confident?revision=old','resolve?id=cover-confident&revision=old'])assert.equal((await fetch(base+'/api/characters/'+route)).status,410);
  assert.equal(calls,0);assert.equal((await fetch(base+'/api/characters/resolve?q=clo02')).status,409);assert.equal((await fetch(base+'/api/characters/assets/https://evil.invalid')).status,404);
  const image=await fetch(base+'/api/characters/assets/cover-confident?revision='+sha);assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);assert.equal(image.headers.get('x-asset-sha256'),sha);assert.equal(calls,1);
 });
});
test('current byte drift fails closed without returning or selecting an old image',async()=>{await run(createServer(createCharacterApi(data,{fetchAsset:async()=>new Response('changed')})),async base=>{const r=await fetch(base+'/api/characters/assets/cover-confident');assert.equal(r.status,502);assert.equal((await r.json()).error,'ASSET_INTEGRITY_FAILED');});});
test('retired local libraries and ZIP routes cannot bypass online selection',async()=>{
 const root=new URL('../',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');await run(createCurrentServer({root,catalogFile:new URL('../robots/current.json',import.meta.url)}),async base=>{
  for(const route of ['/library/','/library/download.zip','/share/download.zip','/templates/','/gestures/','/api/characters/library/select?q=phone'])assert.equal((await fetch(base+route)).status,410,route);
  const r=await fetch(base+'/api/characters/current',{redirect:'manual'});assert.equal(r.status,307);assert.equal(r.headers.get('location'),'https://ai-staff-two.vercel.app/api/characters/current');
 });
});
test('published source has no retired records or mixed retired downloads',async()=>{const c=JSON.parse(await readFile(new URL('./site/catalog.json',import.meta.url))),p=JSON.parse(await readFile(new URL('../robots/retired-public-assets.json',import.meta.url)));assert.ok(c.assets.every(a=>!p.asset_ids.includes(a.id)));for(const d of Object.values(c.downloads))assert.ok(!p.release_files.includes(d.url.split('/').pop()));assert.equal(c.assets.filter(a=>a.category==='robot').length,7);});
test('compiled single API supplies robot, all human poses and five-digit hand masters together',async()=>{
 const base=process.platform==='win32'?'D:/dev-artifacts/ai-staff':tmpdir(),out=await mkdtemp(path.join(base,'unified-api-contract-'));
 execFileSync(process.execPath,[fileURLToPath(new URL('./build.mjs',import.meta.url)),out]);const {default:handler}=await import(pathToFileURL(path.join(out,'api/character.mjs')));
 await run(createServer(handler),async url=>{
  const data=await(await fetch(url+'/api/characters/current')).json();assert.equal(data.assets.length,25);assert.equal(data.assets.filter(a=>a.kind==='human_pose').length,12);const hands=data.assets.filter(a=>a.kind==='hand_master');assert.equal(hands.length,3);assert.equal(data.hand_master_revision,'robot-hand-v1.0');assert.ok(hands.every(a=>a.topology.digits_per_hand===5&&a.topology.long_fingers===4&&a.topology.thumbs===1));assert.deepEqual(hands.map(a=>[a.side,a.surface]),[['left','palm'],['right','palm'],['left','dorsal']]);
  assert.equal((await(await fetch(url+'/api/characters/current?kind=human_pose')).json()).assets.length,12);assert.equal((await(await fetch(url+'/api/characters/current?kind=hand_master')).json()).assets.length,3);assert.equal((await fetch(url+'/api/characters/current?kind=archive')).status,400);
  const human=await(await fetch(url+'/api/characters/resolve?q='+encodeURIComponent('사람형클로이'))).json();assert.equal(human.id,'human-01-front-welcome');const palm=await(await fetch(url+'/api/characters/resolve?id=hand-right-palm-v1')).json();assert.equal(palm.side,'right');assert.equal(palm.surface,'palm');
  assert.equal((await fetch(url+'/api/characters/assets/cover-confident?revision=78bafda7a873ecae3b12f7c2c7350020c31bf08e32347127735e30a472f7962b')).status,410);
 });
});
