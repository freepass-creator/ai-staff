import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectHumanScenes,loadHumanLibrary} from './library.mjs';
import {createCurrentServer} from '../../robots/current-server.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

test('specific action outranks generic consultation and unavailable scenes stay excluded',()=>{
  const scenes=[
    {id:'generic',keywords:['상담'],primary_keywords:[],production_usable:true},
    {id:'phone',keywords:['전화','상담'],primary_keywords:['전화'],production_usable:true},
    {id:'held',keywords:['전화','상담','통화'],primary_keywords:['전화'],production_usable:false}
  ];
  const result=selectHumanScenes({scenes},'전화 상담');
  assert.equal(result.status,'matched');assert.equal(result.matches[0].id,'phone');
  assert.ok(!result.matches.some(v=>v.id==='held'));
});
test('weak, unrelated, and real-evidence requests are distinguished',()=>{
  const library={scenes:[{id:'a',keywords:['상담'],production_usable:true}]};
  assert.equal(selectHumanScenes(library,'상담').status,'weak_match');
  assert.equal(selectHumanScenes(library,'미술관 전시').status,'no_match');
  assert.equal(selectHumanScenes(library,'').matches.length,0);
  assert.equal(selectHumanScenes(library,'상담',{requiresRealSource:true}).status,'real_source_required');
  for(const brief of ['실제 계약서 서명 사진','실제 출고 사진','실제 직원 프로필 사진'])assert.equal(selectHumanScenes(library,brief).status,'real_source_required');
  assert.throws(()=>selectHumanScenes(library,'상담',{limit:99}),/INVALID_LIMIT/);
});
test('registered library, guarded HTTP downloads and selection work end to end',async()=>{
  const library=await loadHumanLibrary(root);
  const server=createCurrentServer({root,catalogFile:path.join(root,'robots/current.json')});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await fetch(base+'/human/')).status,200);
    const png=await fetch(base+'/human/01-front-welcome.png',{method:'HEAD'});
    assert.equal(png.status,200);assert.equal(png.headers.get('x-asset-sha256'),library.scenes[0].source_sha256);
    const svg=await fetch(base+'/human/01-front-welcome.svg',{method:'HEAD'});
    assert.equal(svg.status,200);assert.match(svg.headers.get('content-type'),/image\/svg/);
    assert.equal((await fetch(base+'/human/unregistered.png')).status,404);
    assert.equal((await fetch(base+'/human/%5csecret')).status,403);
    assert.equal((await fetch(base+'/human/',{method:'POST'})).status,405);
    const match=await (await fetch(base+'/api/characters/human/select?q='+encodeURIComponent('태블릿 상담'))).json();
    assert.equal(match.matches[0].id,'02-tablet-consultation');
    assert.equal((await fetch(base+'/api/characters/human/select?limit=99')).status,400);
    const real=await (await fetch(base+'/api/characters/human/select?q='+encodeURIComponent('상담')+'&evidence=1')).json();
    assert.equal(real.status,'real_source_required');
    assert.equal((await fetch(base+'/api/characters/current')).status,200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
