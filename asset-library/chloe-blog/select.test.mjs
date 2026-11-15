import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectScenes} from './select.mjs';
import {enrichUsage} from './usage.mjs';
const make=()=>enrichUsage({assets:[
 {id:'27-headlamp-guide',title:'차량 부위 설명',file:'27.png',sha256:'a'.repeat(64),action:'가리키기',target:'차량',camera_angle:'앞쪽 사선',alpha:false},
 {id:'31-joint-document',title:'서류 함께 확인',file:'31.png',sha256:'b'.repeat(64),action:'함께 확인',target:'서류',camera_angle:'높은 사선',alpha:false},
 {id:'29-caption-point',title:'설명란 가리키기',file:'29.png',sha256:'c'.repeat(64),action:'가리키기',target:'설명란',camera_angle:'앞쪽 사선',alpha:true},
 {id:'30-listen-customer',title:'고객 설명 듣기',file:'30.png',sha256:'d'.repeat(64),action:'듣기',target:'고객',camera_angle:'사선',alpha:false}
]});
test('owner-rejected artwork is not selected even with a strong purpose match',()=>{
 const m=make();m.assets[0].production_usable=false;
 assert.equal(selectScenes(m,'헤드램프를 짚어 설명하는 문단').matches.length,0);
 assert.equal(selectScenes(m,'고객과 계약서를 함께 확인').matches[0].id,'31-joint-document');
});
test('matches paragraph purpose rather than an unrelated camera or generic robot pose',()=>{
 const m=make();assert.equal(selectScenes(m,'헤드램프를 짚어 설명하는 문단').matches[0].id,'27-headlamp-guide');
 assert.equal(selectScenes(m,'고객과 계약서를 함께 확인').matches[0].id,'31-joint-document');
 assert.equal(selectScenes(m,'왼쪽 여백의 설명란을 가리키기').matches[0].id,'29-caption-point');
 assert.equal(selectScenes(m,'고객의 말을 듣는 상담 장면').matches[0].id,'30-listen-customer');
});
test('evidence requirements and hard constraints cannot be overridden by keyword scores',()=>{
 const m=make();let r=selectScenes(m,'계약서 서명완료증빙');assert.equal(r.matches.length,0);assert.equal(r.needs_real_source,true);
 for(const q of ['실제 계약서 사진','실제 계약서의 사진','실제 출고 사진','실제 영업장 촬영']){r=selectScenes(m,q);assert.equal(r.matches.length,0);assert.equal(r.needs_real_source,true);}
 r=selectScenes(m,'헤드램프 설명',{transparentOnly:true});assert.equal(r.matches.length,0);
 r=selectScenes(m,'서류 함께 확인',{camera:'측면'});assert.equal(r.matches.length,0);
});
test('missing or vague briefs do not silently receive an unrelated existing image',()=>{
 const m=make();let r=selectScenes(m,'우주선 엔진 정비');assert.equal(r.needs_new_scene,true);assert.equal(r.matches.length,0);
 r=selectScenes(m,'고객');assert.equal(r.needs_more_context,true);assert.equal(r.matches.length,0);
 assert.equal(selectScenes(m,'').needs_more_context,true);assert.throws(()=>selectScenes(m,'견적',{limit:0}),/INVALID_LIMIT/);
});
