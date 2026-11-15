import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {layouts,validateJob,renderTemplate} from './layouts.mjs';
import {varyJobs} from './vary.mjs';
const examples=JSON.parse(await readFile(new URL('./examples.json',import.meta.url),'utf8'));
const assets=Object.fromEntries(examples.flatMap(j=>[j.character,j.scene].filter(Boolean).map(id=>[id,{file:'assets/characters/'+id.replaceAll('/','-')+'.png',kind:id===j.scene?'scene':'character'}])));
test('six layouts plus robot and generated-scene variants have distinct supported geometry',()=>{
 assert.equal(Object.keys(layouts).length,6);assert.ok(examples.length>=10);
 for(const j of examples){const l=validateJob(j,assets);assert.ok(l.width>=1080&&l.height>=675);assert.match(renderTemplate(j,assets),/ci-P2\.svg/);}
});
test('batch variation alternates backgrounds and upper-body outfits, preserving explicit art direction',()=>{
 const jobs=varyJobs(Array.from({length:3},(_,i)=>({id:'cover-'+i,template:'cover',title:'제목'})));
 assert.equal(new Set(jobs.map(j=>j.theme)).size,3);assert.equal(new Set(jobs.map(j=>j.character)).size,3);
 const explicit={id:'fixed',template:'cover',theme:'lilac',character:null,title:'제목'};
 assert.deepEqual(varyJobs([explicit])[0],explicit);
});
test('content and row limits reject clipping instead of silently shrinking or truncating',()=>{
 assert.throws(()=>validateJob({...examples[0],title:'가'.repeat(35)},assets),/TEXT_LIMIT/);
 assert.throws(()=>validateJob({...examples[0],title:'첫째\n둘째\n셋째'},assets),/TEXT_LIMIT/);
 assert.throws(()=>validateJob({...examples[1],rows:examples[1].rows.slice(1)},assets),/ROW_COUNT/);
 assert.throws(()=>validateJob({...examples[2],items:[]},assets),/ITEM_COUNT/);
 assert.throws(()=>validateJob({...examples[0],unknown:'x'},assets),/UNKNOWN_FIELD/);
 assert.throws(()=>validateJob({...examples[0],theme:'ink'},assets),/THEME_CONTRAST_RULE/);
 assert.throws(()=>validateJob({...examples[0],theme:'unknown'},assets),/UNKNOWN_THEME/);
});
test('text is escaped and unregistered or contradictory visuals are rejected',()=>{
 const output=renderTemplate({...examples[0],title:'<script>안녕</script>'},assets);
 assert.ok(output.includes('&lt;script&gt;'));assert.ok(!output.includes('<script>'));
 assert.throws(()=>validateJob({...examples[0],character:'https://example.com/x.png'},assets),/UNREGISTERED_ASSET/);
 assert.throws(()=>validateJob({...examples[0],scene:examples[7].scene},assets),/ONE_VISUAL_ONLY/);
 assert.throws(()=>validateJob({...examples[2],character:null,scene:examples[7].scene},assets),/SCENE_ONLY_ON_COVER/);
});
