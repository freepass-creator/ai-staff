const $=id=>document.getElementById(id),make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
let catalog,group=new URLSearchParams(location.search).get('group')||'cover_emotion';
function showCuts(){
 $('cut-cards').replaceChildren();
 for(const a of catalog.assets.filter(a=>group==='all'||a.group===group)){
  const article=make('article','asset-card'),preview=make('a','asset-preview'),img=make('img');preview.href=a.png_url;preview.target='_blank';preview.rel='noopener';preview.setAttribute('aria-label',a.label+' PNG 원본 받기');img.src='../'+a.thumbnail;img.alt=a.label;preview.append(img);
  const copy=make('div','card-copy'),heading=make('h2','',a.label),usage=make('p','',a.usage),links=make('div','card-links'),png=make('a','','PNG 원본 받기 ↗'),button=make('button','','원본 링크 복사'),status=make('p','copy-result');png.href=a.png_url;png.target='_blank';png.rel='noopener';button.type='button';button.onclick=async()=>{try{await navigator.clipboard.writeText(a.png_url);status.textContent='원본 링크를 복사했습니다.';}catch{status.textContent=a.png_url;}};links.append(png,button);copy.append(heading,usage,links,status);article.append(preview,copy);$('cut-cards').append(article);
 }
 for(const b of $('groups').children)b.setAttribute('aria-pressed',String(b.dataset.group===group));
 history.replaceState(null,'',location.pathname+(group==='cover_emotion'?'':'?group='+encodeURIComponent(group)));
}
try{
 const r=await fetch('../chakhan-use-cuts.json',{cache:'no-cache'});if(!r.ok)throw Error('catalog');catalog=await r.json();
 if(catalog.brand!=='착한거래'||!catalog.assets.length||catalog.assets.some(a=>a.brand!=='착한거래'||a.nameplate!=='착한거래'||a.emission_color!=='yellow'||!a.transparent_background))throw Error('brand');
 $('kit').href=catalog.downloads.zip.url;
 for(const [id,label]of [['cover_emotion','표지 감정'],['consultation','상담·안내'],['all','전체']]){const count=catalog.assets.filter(a=>id==='all'||a.group===id).length,b=make('button','',label+' '+count);b.type='button';b.dataset.group=id;b.onclick=()=>{group=id;showCuts();};$('groups').append(b);}
 if(!['cover_emotion','consultation','all'].includes(group))group='cover_emotion';showCuts();
 for(const c of catalog.covers||[]){const article=make('article','asset-card'),a=make('a'),img=make('img');a.href=c.png_url;a.target='_blank';a.rel='noopener';img.width=1200;img.height=1200;img.src='../'+c.thumbnail;img.alt=c.label;img.loading='lazy';a.append(img);const text=make('div','card-copy');text.append(make('h3','',c.label),make('p','',c.headline));article.append(a,text);$('cover-grid').append(article);}
 const emotions=catalog.assets.filter(a=>a.group==='cover_emotion').length;$('status').textContent='표지 감정 '+emotions+'컷 · 상담·안내 '+(catalog.assets.length-emotions)+'컷 · 표지 구성 예시 '+(catalog.covers||[]).length+'개';
}catch{$('status').textContent='착한거래 이미지 목록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.';}
$('background').onclick=()=>{const dark=document.body.classList.toggle('dark-cuts');$('background').setAttribute('aria-pressed',String(dark));$('background').textContent=dark?'밝은 배경에서 보기':'어두운 배경에서 보기';};
