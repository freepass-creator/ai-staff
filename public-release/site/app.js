const labels={all:'전체',canonical:'로봇 VER1.0 정본',human:'사람형',robot:'로봇 활용',scene:'장면 합성',template:'포스터',revision:'R1 제안',hand:'손 정본'};
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let catalog,kind=labels[params.get('kind')]?params.get('kind'):'all',active;
const query=$('query');query.value=params.get('q')||'';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function open(asset){active=asset;$('large-image').src=asset.png_url;$('large-image').alt=asset.title;$('preview-title').textContent=asset.title;$('preview-usage').textContent=asset.usage;$('preview-status').textContent=asset.production_usable?'사용 가능 · '+labels[asset.category]:'디자인 검토용 · R1 제안';$('preview-tags').textContent=asset.tags.filter(Boolean).join(' · ');$('download').href=asset.png_url;$('download').target='_blank';$('download').rel='noopener';$('copy-status').textContent='';$('vector-kit').hidden=!asset.vector;$('vector-kit').href=catalog.downloads.assets.url;$('preview').showModal();}
function render(){
 const terms=query.value.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const visible=catalog.assets.filter(a=>(kind==='all'||a.category===kind)&&terms.every(t=>[a.title,a.usage,a.id,...a.tags].join(' ').normalize('NFKC').toLocaleLowerCase().includes(t)));
 $('cards').replaceChildren();
 for(const a of visible){const card=make('article','asset-card'),button=make('button','asset-preview');button.type='button';button.setAttribute('aria-label',a.title+' 크게 보기');button.onclick=()=>open(a);const image=make('img');image.src=a.thumbnail;image.alt=a.title;image.loading='lazy';const badge=make('span','badge'+(!a.production_usable?' draft':''),!a.production_usable?'R1 검토용':a.status==='canonical'?'최신 정본':labels[a.category]);button.append(image,badge);const copy=make('div','card-copy'),title=make('h3','',a.title),usage=make('p','',a.usage),links=make('div','card-links'),png=make('a','','PNG 원본 ↗'),more=make('button','','크게 보기');png.href=a.png_url;png.target='_blank';png.rel='noopener';more.type='button';more.onclick=()=>open(a);links.append(png,more);copy.append(title,usage,links);card.append(button,copy);$('cards').append(card);}
 $('result-count').textContent=visible.length+'개 자산 · '+(kind==='revision'?'제안은 정본과 구분해 사용하세요.':'그림의 용도를 확인하고 골라 쓰세요.');$('empty').hidden=visible.length!==0;
 for(const button of $('filters').children)button.setAttribute('aria-pressed',String(button.dataset.kind===kind));
 const p=new URLSearchParams();if(kind!=='all')p.set('kind',kind);if(query.value)p.set('q',query.value);history.replaceState(null,'',location.pathname+(p.size?'?'+p.toString():''));
}
try{
 const response=await fetch('catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('catalog');catalog=await response.json();
 for(const [key,label]of Object.entries(labels)){const count=key==='all'?catalog.assets.length:catalog.assets.filter(a=>a.category===key).length;const b=make('button','',label+' '+count);b.dataset.kind=key;b.type='button';b.onclick=()=>{kind=key;render();};$('filters').append(b);}
 $('usable-count').textContent=catalog.assets.filter(a=>a.production_usable).length;$('all-download').href=catalog.downloads.assets.url;$('template-download').href=catalog.downloads.assets.url;
 $('hero-robot').src=catalog.assets.find(a=>a.id==='canonical-basic-purple-v1').thumbnail;$('hero-human').src=catalog.assets.find(a=>a.id==='human-10-navy-present').thumbnail;
 $('release-link').href='https://github.com/freepass-creator/ai-staff/releases/tag/'+catalog.release_tag;query.oninput=render;render();
}catch{$('result-count').textContent='자산 목록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.';}
$('preview').querySelector('.close').onclick=()=>$('preview').close();$('preview').onclick=e=>{if(e.target===$('preview')){const r=$('preview').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('preview').close();}};
$('copy-link').onclick=async()=>{if(!active)return;try{await navigator.clipboard.writeText(active.png_url);$('copy-status').textContent='원본 링크를 복사했습니다.';}catch{$('copy-status').textContent=active.png_url;}};
