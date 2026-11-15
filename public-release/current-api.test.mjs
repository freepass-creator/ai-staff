import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';
import {createCharacterApi} from './current-api.mjs';import {createCurrentServer} from '../robots/current-server.mjs';
const bytes=Buffer.from('registered PNG fixture'),sha=createHash('sha256').update(bytes).digest('hex'),data={revision:'current-batch',assets:[{id:'cover-confident',sha256:sha,upstream_url:'https://example.invalid/fixed.png'}],aliases:{착한클로이:'cover-confident'},retired_ids:['robot-33-think-choice']};
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
