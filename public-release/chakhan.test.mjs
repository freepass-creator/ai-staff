import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';
const c=JSON.parse(await readFile(new URL('./site/chakhan-use-cuts.json',import.meta.url),'utf8'));
test('Chakhan consumers receive only branded transparent usage cuts and portable URLs',async()=>{
 assert.equal(c.brand,'착한거래');assert.equal(c.assets.length,7);assert.equal(c.selection_policy.brand_fallback_allowed,false);
 for(const a of c.assets){assert.equal(a.brand,'착한거래');assert.equal(a.variant,'chakhan-white-v1');assert.equal(a.nameplate,'착한거래');assert.equal(a.emission_color,'yellow');assert.equal(a.profile_usable,false);assert.equal(a.transparent_background,true);assert.ok(a.production_usable);assert.match(a.png_url,/^https:\/\/github\.com\/freepass-creator\/ai-staff\/releases\/download\/ai-staff-r1-20261115\/Chakhan-CLO-02-VER1\.0-(?:use|cover)-/);assert.match(a.sha256,/^[a-f0-9]{64}$/);assert.ok(a.usage.length>25);assert.match(a.thumbnail,/^chakhan\/thumbs\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/);assert.ok((await stat(new URL('./site/'+a.thumbnail,import.meta.url))).size<150000);}
 assert.ok(!/(?:["\s])[A-Za-z]:[/\\]|incoming-pc1|source_thread|PRIVATE KEY/.test(JSON.stringify(c)));
 assert.match(c.downloads.zip.sha256,/^[a-f0-9]{64}$/);assert.ok(c.downloads.zip.bytes>0);
});


test('main-cover choices contain four distinct emotional poses and fixed-pixel composition examples',async()=>{
 const poses=c.assets.filter(a=>a.group==='cover_emotion');assert.equal(poses.length,4);assert.deepEqual(new Set(poses.map(a=>a.emotion)),new Set(['think','aha','dejected','confident']));assert.ok(poses.every(a=>a.hand_master_revision==='robot-hand-v1.0'&&a.hand_reference_usable===false));assert.ok(poses.filter(a=>['cover-aha','cover-dejected'].includes(a.id)).every(a=>a.palm_revision==='robot-hand-v1.0'));
 assert.equal(c.covers.length,4);for(const cover of c.covers){assert.equal(cover.platform_version,'VER1.0');assert.equal(cover.width,1200);assert.equal(cover.height,1200);assert.ok(poses.some(a=>a.id===cover.pose_id&&a.sha256===cover.character_source_sha256));assert.match(cover.sha256,/^[a-f0-9]{64}$/);assert.ok((await stat(new URL('./site/'+cover.thumbnail,import.meta.url))).size<150000);}
 const hand=JSON.parse(await readFile(new URL('../robots/hand-grip-policy.json',import.meta.url),'utf8'));assert.equal(hand.anatomy.long_fingers_per_hand,4);assert.equal(hand.anatomy.separate_opposable_thumb,true);assert.equal(hand.materials.palm_or_hand_back_LED,false);
});
