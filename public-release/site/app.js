import {buildApprovedMap, approvedUrl} from './current-gate.mjs';

const labels={approved:'제작 승인',all:'전체',canonical:'클로이 정본',human:'사람형',robot:'로봇 활용',scene:'장면 합성',template:'포스터',revision:'R1 제안',hand:'손 정본'};
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let catalog,approved=new Map(),apiVerified=false,kind=labels[params.get('kind')]?params.get('kind'):'approved',active;
const query=$('query');
query.value=params.get('q')||'';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const verifiedLink=asset=>approvedUrl(asset,approved,location.origin);
const statusText=(asset,link)=>link?'현재 API 승인 · '+(labels[asset.category]||asset.category):
  asset.status==='design_proposal'?'R1 디자인 제안 · 제작 불가':
  apiVerified?'참고 자료 · 자동 제작 제외':'API 확인 전 · 자동 제작 금지';

function open(asset){
 active=asset;
 const link=verifiedLink(asset),source=link||asset.png_url;
 $('large-image').src=source;
 $('large-image').alt=asset.title;
 $('preview-title').textContent=asset.title;
 $('preview-usage').textContent=asset.usage;
 $('preview-status').textContent=statusText(asset,link);
 $('preview-tags').textContent=(asset.tags||[]).filter(Boolean).join(' · ');
 $('download').href=source;
 $('download').textContent=link?'승인 API PNG 보기 ↗':'참고 원본 보기 ↗';
 $('download').target='_blank';
 $('download').rel='noopener';
 $('copy-status').textContent='';
 $('vector-kit').hidden=!asset.vector;
 $('vector-kit').href=catalog.downloads.assets.url;
 $('preview').showModal();
}

function render(){
 const terms=query.value.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const visible=catalog.assets.filter(a=>
  (kind==='all'||(kind==='approved'?Boolean(verifiedLink(a)):a.category===kind))&&
  terms.every(t=>[a.title,a.usage,a.id,...(a.tags||[])].join(' ').normalize('NFKC').toLocaleLowerCase().includes(t)));
 $('cards').replaceChildren();
 for(const a of visible){
  const link=verifiedLink(a),source=link||a.png_url;
  const card=make('article','asset-card'),button=make('button','asset-preview');
  button.type='button';
  button.setAttribute('aria-label',a.title+' 크게 보기');
  button.onclick=()=>open(a);
  const image=make('img');
  image.src=a.thumbnail;image.alt=a.title;image.loading='lazy';
  const label=link?'API 승인':a.status==='design_proposal'?'R1 검토용':'참고 자료';
  const badge=make('span','badge'+(!link?' draft':''),label);
  button.append(image,badge);
  const copy=make('div','card-copy'),title=make('h3','',a.title),usage=make('p','',a.usage);
  const links=make('div','card-links'),png=make('a','',link?'승인 PNG ↗':'참고 PNG ↗'),more=make('button','','크게 보기');
  png.href=source;png.target='_blank';png.rel='noopener';
  more.type='button';more.onclick=()=>open(a);
  links.append(png,more);copy.append(title,usage,links);card.append(button,copy);$('cards').append(card);
 }
 $('result-count').textContent=visible.length+'개 자산 · '+(
  !apiVerified?'승인 API 미확인: 이 화면에서 자동 제작하지 마세요.':
  kind==='approved'?'API의 현재 ID·SHA256과 일치하는 이미지만 표시합니다.':
  '참고 자료는 제작 승인 이미지와 다릅니다.');
 $('empty').hidden=visible.length!==0;
 for(const button of $('filters').children)button.setAttribute('aria-pressed',String(button.dataset.kind===kind));
 const p=new URLSearchParams();if(kind!=='approved')p.set('kind',kind);if(query.value)p.set('q',query.value);
 history.replaceState(null,'',location.pathname+(p.size?'?'+p.toString():''));
}

try{
 const response=await fetch('catalog.json',{cache:'no-cache'});
 if(!response.ok)throw Error('CATALOG_UNAVAILABLE');
 catalog=await response.json();
 if(!Array.isArray(catalog.assets))throw Error('CATALOG_INVALID');
 try{
  const result=await fetch('api/characters/current',{cache:'no-store'});
  if(!result.ok)throw Error('CURRENT_API_UNAVAILABLE');
  approved=buildApprovedMap(await result.json());
  apiVerified=true;
  const visibleApproved=catalog.assets.filter(a=>Boolean(verifiedLink(a))).length;
  $('current-api-status').textContent='최신 API 연결됨 · 승인 자산 '+approved.size+'종 · 갤러리 제작 가능 '+visibleApproved+'종';
  $('usable-count').textContent=approved.size;
 }catch{
  approved=new Map();apiVerified=false;
  $('current-api-status').textContent='최신 승인 API를 확인할 수 없습니다. 기존 PNG는 자동 제작에 사용하지 마세요.';
  $('usable-count').textContent='—';
 }
 for(const [key,label]of Object.entries(labels)){
  const count=key==='all'?catalog.assets.length:
   key==='approved'?catalog.assets.filter(a=>Boolean(verifiedLink(a))).length:
   catalog.assets.filter(a=>a.category===key).length;
  const b=make('button','',label+' '+count);
  b.dataset.kind=key;b.type='button';b.onclick=()=>{kind=key;render();};$('filters').append(b);
 }
 $('all-download').href=catalog.downloads.assets.url;
 $('template-download').href=catalog.downloads.templates.url;
 const robot=catalog.assets.find(a=>a.id==='canonical-basic-purple-v1'),human=catalog.assets.find(a=>a.id==='human-10-navy-present');
 if(robot)$('hero-robot').src=robot.thumbnail;
 if(human)$('hero-human').src=human.thumbnail;
 $('release-link').href='https://github.com/freepass-creator/ai-staff/releases/tag/'+encodeURIComponent(catalog.release_tag);
 query.oninput=render;render();
}catch{
 $('current-api-status').textContent='갤러리 목록을 불러오지 못했습니다. 승인 여부를 확인할 수 없습니다.';
 $('usable-count').textContent='—';
 $('result-count').textContent='자산 목록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.';
}
$('preview').querySelector('.close').onclick=()=>$('preview').close();
$('preview').onclick=e=>{
 if(e.target===$('preview')){
  const r=$('preview').getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('preview').close();
 }
};
$('copy-link').onclick=async()=>{
 if(!active)return;
 const link=verifiedLink(active),source=link||active.png_url;
 try{await navigator.clipboard.writeText(source);$('copy-status').textContent=link?'현재 승인 API 링크를 복사했습니다.':'참고 원본 링크를 복사했습니다.';}
 catch{$('copy-status').textContent=source;}
};
