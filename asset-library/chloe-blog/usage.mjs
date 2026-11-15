import {readFile} from 'node:fs/promises';
const rules=JSON.parse(await readFile(new URL('./usage-rules.json',import.meta.url),'utf8'));
const desk=new Set(['08-headset','20-side-contract','28-customer-introduce','30-listen-customer','31-joint-document','32-two-quotes','34-confirm-happy','35-calm-explain']);
const vehicle=new Set(['11-show-car','12-interior','14-inspect','15-delivery','16-return','22-back-walk','23-rear-trunk','25-side-cabin','26-low-inspect','27-headlamp-guide','36-load-bag','37-follow-customer']);
export function enrichUsage(manifest){
 for(const a of manifest.assets){
  const r=rules[a.id];if(!r)throw Error('MISSING_EDITORIAL_DESCRIPTION: '+a.id);
  a.editorial={article_topics:r.topics,section_roles:r.sections,visible_scene:r.scene,use_when:r.when,caption_example:r.caption,keywords:r.keywords,
   depicted_environment:a.background==='white'||a.alpha===false?'흰 배경의 설명용 렌더 장면':'배경이 분리된 설명용 렌더 장면',
   scene_setting:desk.has(a.id)?'책상·서류·기기 등을 사용하는 상담 연출':vehicle.has(a.id)?'가상 차량의 외관·실내·주변을 이용하는 연출':'캐릭터 또는 손에 든 소품 중심의 연출',
   suitable_layouts:['밝은 블로그 본문','정보형 카드','가로 표지'],
   pointing_target:a.target||'장면 설명 참조',gaze:a.gaze||'장면 설명 참조',expression:a.expression||'친근한 안내',
   copy_space:a.id==='29-caption-point'?'원본 왼쪽 아래에 문구를 배치할 여백이 있음':'원본의 얼굴·손·서류 위에는 글을 덮지 말고 별도 레이아웃 여백에 배치',
   background_advice:a.alpha===false?'흰 배경 이미지로 사용. 투명 누끼로 간주하지 않음':'투명 PNG의 얼굴·손·소품이 배경에 묻히지 않도록 밝고 단순한 배경 사용',
   avoid:['실제 특정 차량의 사양·상태를 입증하는 사진','실제 계약서·서명·고객 정보의 증빙','가격·심사 통과·일정을 보장하는 표현'],
   avoid_terms:['실제차량사진','증빙사진','서명완료증빙','신분증사진','등록증사진','확정가격보장','심사통과보장'],
   image_kind:'정본 참조 생성형 파생 이미지'};
 }
 return manifest;
}
export function usageIndex(manifest){return {schema_version:1,character_id:'CLO-02',library_revision:manifest.library_revision,selection_order:['문단의 목적','행동과 대상','시선·표정','구도·촬영 범위','실제 이미지 확인'],assets:manifest.assets.filter(a=>a.production_usable!==false).map(a=>({id:a.id,title:a.title,file:a.file,url:'/library/'+a.file,sha256:a.sha256,action:a.action,target:a.target,camera_angle:a.camera_angle,framing:a.framing,editorial:a.editorial})),no_fit:'기존 이미지를 억지 배정하지 않고 문단 목적과 부족한 장면을 제작 대기 목록에 기록'};}
export function usageMarkdown(manifest){return '# AI 블로그 작성자를 위한 이미지 사용 설명\n\n원본 그림에 보이는 장면과 글에서 권장하는 사용처를 구분한다. 실차·서류의 증빙 사진으로 사용하지 않는다. 문단의 목적을 먼저 정하고 행동·대상·시선·표정·구도를 비교해 선택한다.\n\n'+manifest.assets.filter(a=>a.production_usable!==false).map(a=>`## ${a.id} · ${a.title}\n\n- 실제 그림: ${a.editorial.visible_scene}\n- 글 주제: ${a.editorial.article_topics.join(' / ')}\n- 어울리는 문단: ${a.editorial.section_roles.join(' / ')}\n- 사용 시점: ${a.editorial.use_when}\n- 환경: ${a.editorial.depicted_environment}\n- 시선 / 대상: ${a.editorial.gaze} / ${a.editorial.pointing_target}\n- 배치: ${a.editorial.copy_space}\n- 배경: ${a.editorial.background_advice}\n- 캡션 예: ${a.editorial.caption_example}\n- 파일: ${a.file}\n`).join('\n');}
