import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const site=new URL('./site/',import.meta.url),catalog=JSON.parse(await readFile(new URL('catalog.json',site),'utf8'));
test('public catalog contains current identities and keeps new R1 designs as proposals',()=>{
 const ids=catalog.assets.map(a=>a.id);assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length>=90);
 assert.equal(catalog.assets.filter(a=>a.status==='canonical').length,2);
 const proposals=catalog.assets.filter(a=>a.category==='revision');assert.equal(proposals.length,3);assert.ok(proposals.every(a=>a.status==='design_proposal'&&a.production_usable===false));
 assert.deepEqual(proposals.map(a=>a.character_id).sort(),['CLO-04','COD-01','COD-03']);
 assert.ok(!ids.some(id=>/^revision-clo-0[13]-/.test(id)));
 assert.ok(!ids.includes('robot-01-welcome'));assert.equal(catalog.assets.filter(a=>a.category==='scene').length,30);
});
test('all scene composites bind to a registered unchanged human image',()=>{
 const humans=new Set(catalog.assets.filter(a=>a.category==='human').map(a=>a.png_sha256));
 for(const scene of catalog.assets.filter(a=>a.category==='scene'))assert.ok(humans.has(scene.character_source_sha256),scene.id);
});
test('four existing robot identities retain number and male/female presentation',()=>{
 assert.deepEqual(catalog.family_identity.members.map(a=>[a.number,a.id,a.presentation]),[[1,'COD-01','male'],[2,'CLO-02','female'],[3,'COD-03','male'],[4,'CLO-04','female']]);
 assert.deepEqual(catalog.family_identity.invalid_character_ids,['CLO-01','CLO-03']);
});
test('public URLs, checksums, tiny previews, and metadata remain safe to publish',async()=>{
 const text=JSON.stringify(catalog);assert.ok(!/(?:["\s])[A-Za-z]:[/\\]|incoming-pc1|source_thread|source\.bundle|PRIVATE KEY/.test(text));
 for(const a of catalog.assets){assert.match(a.png_sha256,/^[a-f0-9]{64}$/);assert.ok(a.png_url.startsWith('https://github.com/freepass-creator/ai-staff/releases/download/'));assert.ok(a.thumbnail.startsWith('thumbs/'));assert.ok(!a.thumbnail.includes('..'));const s=await stat(new URL(a.thumbnail,site));assert.ok(s.size<150000,a.id);}
 assert.equal(catalog.backgrounds.length,3);
});

test('profile selection admits exactly the selected02 and forbids all fallback',async()=>{
 const p=JSON.parse(await readFile(new URL('../asset-library/kakao-profiles/library.json',import.meta.url),'utf8'));
 assert.equal(p.profiles.length,1);assert.equal(p.profiles[0].number,'02');assert.equal(p.profiles[0].sha256,'49b6f9ae899afc64271aac75e0705b192316053d32ff85c6c316f20d02774352');assert.equal(p.selection_policy.fallback_allowed,false);assert.equal(p.selection_policy.search_generated_or_archive_images,false);
});
