import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s·,，.!?？:：()\-_/]/g,'');
const generic=new Set(['블로그','상담','차량','계약','서류','안내','확인','고객','설명','표정']);
export function selectScenes(manifest,brief,{limit=3,requiresRealSource=false,transparentOnly=false,camera=null,target=null}={}){
 if(!Number.isInteger(limit)||limit<1||limit>10)throw Error('INVALID_LIMIT');
 if(typeof brief!=='string'||brief.length>2000)throw Error('INVALID_BRIEF');
 const q=norm(brief);if(!q)return {matches:[],needs_new_scene:false,needs_more_context:true,reason:'EMPTY_BRIEF'};
 const evidence=['실제차량사진','실차사진','증빙사진','서명완료증빙','신분증사진','등록증사진','실제서명','확정가격보장','최저가보장','심사통과보장'];
 const realPhoto=/실제.{0,12}(계약서|출고|차량|영업장|직원).{0,5}(사진|촬영|증빙)/.test(q);
 if(requiresRealSource||realPhoto||evidence.some(t=>q.includes(norm(t))))return {matches:[],needs_new_scene:false,needs_real_source:true,reason:'ILLUSTRATION_NOT_EVIDENCE'};
 const candidates=[];
 for(const a of manifest.assets){
  if(a.production_usable===false)continue;
  if(!a.editorial)continue;
  if(transparentOnly&&!a.alpha||camera&&a.camera_angle!==camera||target&&a.target!==target)continue;
  if(a.editorial.avoid_terms.some(t=>q.includes(norm(t))))continue;
  const terms=[...new Set([...a.editorial.keywords,...a.editorial.article_topics,...a.editorial.section_roles,a.action,a.target].filter(Boolean))];
  const matched=terms.filter(t=>q.includes(norm(t)));
  const score=matched.reduce((n,t)=>n+(generic.has(t)?1:Math.min(7,2+norm(t).length)),0);
  if(score)candidates.push({a,score,matched});
 }
 candidates.sort((a,b)=>b.score-a.score||a.a.id.localeCompare(b.a.id));
 const strong=candidates.filter(c=>c.score>=4);
 if(!strong.length)return {matches:[],needs_new_scene:candidates.length===0,needs_more_context:candidates.length>0,reason:candidates.length?'BRIEF_TOO_BROAD':'NO_SUITABLE_SCENE',suggested_next:'문단 목적·행동·대상·구도를 구체화하고, 적합한 장면이 없으면 production-plan.json 대기 목록에 기록'};
 return {matches:strong.slice(0,limit).map(({a,score,matched})=>({id:a.id,title:a.title,url:'/library/'+a.file,file:a.file,sha256:a.sha256,score,matched_terms:matched,action:a.action,target:a.target,gaze:a.gaze,camera_angle:a.camera_angle,framing:a.framing,alpha:a.alpha,editorial:a.editorial,ready_layout_copy:a.copy,is_canonical_design:false,review_before_use:'장면 PNG가 기본 선택. 완성 표지·카드는 기존 문구가 글과 맞을 때만 사용. 실제 그림·문단 의미·가리키는 방향을 최종 확인'})),needs_new_scene:false,needs_more_context:false,reason:'MATCHED_EDITORIAL_PURPOSE'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [dir,brief]=process.argv.slice(2);if(!dir||!brief)throw Error('node select.mjs <library-folder> "문단의 장면 설명"');const m=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));console.log(JSON.stringify(selectScenes(m,brief),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
