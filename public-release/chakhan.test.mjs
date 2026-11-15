import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';
const c=JSON.parse(await readFile(new URL('./site/chakhan-use-cuts.json',import.meta.url),'utf8'));
test('Chakhan consumers receive only branded transparent usage cuts and portable URLs',async()=>{
 assert.equal(c.brand,'착한거래');assert.equal(c.assets.length,3);assert.equal(c.selection_policy.brand_fallback_allowed,false);
 for(const a of c.assets){assert.equal(a.brand,'착한거래');assert.equal(a.variant,'chakhan-white-v1');assert.equal(a.nameplate,'착한거래');assert.equal(a.emission_color,'yellow');assert.equal(a.profile_usable,false);assert.equal(a.transparent_background,true);assert.ok(a.production_usable);assert.match(a.png_url,/^https:\/\/github\.com\/freepass-creator\/ai-staff\/releases\/download\/ai-staff-r1-20261115\/Chakhan-CLO-02-use-/);assert.match(a.sha256,/^[a-f0-9]{64}$/);assert.ok(a.usage.length>25);assert.match(a.thumbnail,/^chakhan\/thumbs\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/);assert.ok((await stat(new URL('./site/'+a.thumbnail,import.meta.url))).size<150000);}
 assert.ok(!/(?:["\s])[A-Za-z]:[/\\]|incoming-pc1|source_thread|PRIVATE KEY/.test(JSON.stringify(c)));
 assert.match(c.downloads.zip.sha256,/^[a-f0-9]{64}$/);assert.ok(c.downloads.zip.bytes>0);
});
