import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {poseAt,presets} from './animation.js';
const spec=JSON.parse(await readFile(new URL('./spec.json',import.meta.url),'utf8'));
test('joint tree is connected and digit controls stay attached through palm and arm',()=>{
 const byId=new Map(spec.parts.map(p=>[p.id,p]));assert.equal(byId.size,20);
 for(const part of spec.parts){const seen=new Set();let current=part;while(current.parent){assert(!seen.has(current.id));seen.add(current.id);current=byId.get(current.parent);assert(current); }assert.equal(current.id,'body');}
 for(const d of ['little','ring','middle','index','thumb']){assert.equal(byId.get(d+'-3').parent,d+'-2');assert.equal(byId.get(d+'-1').parent,'palm');}
 assert.equal(byId.get('palm').parent,'forearm');assert.equal(byId.get('forearm').parent,'upper-arm');
});
test('neutral, reduced strength and repeat boundaries cannot accumulate deformation',()=>{
 for(const p of Object.keys(presets)){assert.deepEqual(poseAt(spec,p,0),poseAt(spec,p,6));assert.deepEqual(poseAt(spec,p,-6),poseAt(spec,p,0));for(const t of [0,.75,1.5,3,4.5,6])assert.deepEqual(poseAt(spec,p,t,0),poseAt(spec,'neutral',0));}
});
test('all preset frames stay within small-motion limits and reject invalid input',()=>{
 for(const p of Object.keys(presets))for(let t=0;t<=6;t+=.05)for(const f of Object.values(poseAt(spec,p,t,1))){assert(Math.abs(f.angle)<=4);assert(f.sy>=.89&&f.sy<=1);}
 for(const args of [['missing',0],['__proto__',0],['toString',0],['idle',NaN],['idle',0,Infinity]])assert.throws(()=>poseAt(spec,...args),/INVALID/);
});
