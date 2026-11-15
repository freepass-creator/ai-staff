const $=id=>document.getElementById(id),make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
try{
 const r=await fetch('../chakhan-use-cuts.json',{cache:'no-cache'});if(!r.ok)throw Error('catalog');const data=await r.json();
 if(data.brand!=='착한거래'||data.assets.length!==3||data.assets.some(a=>a.brand!=='착한거래'||a.nameplate!=='착한거래'||a.emission_color!=='yellow'||!a.transparent_background))throw Error('brand');
 $('kit').href=data.downloads.zip.url;
 for(const a of data.assets){const article=make('article','asset-card'),preview=make('a','asset-preview'),img=make('img');preview.href=a.png_url;preview.target='_blank';preview.rel='noopener';preview.setAttribute('aria-label',a.label+' PNG 원본 받기');img.src='../'+a.thumbnail;img.alt=a.label;preview.append(img);const copy=make('div','card-copy'),heading=make('h2','',a.label),usage=make('p','',a.usage),links=make('div','card-links'),png=make('a','','PNG 원본 받기 ↗'),button=make('button','','원본 링크 복사'),status=make('p','copy-result');png.href=a.png_url;png.target='_blank';png.rel='noopener';button.type='button';button.onclick=async()=>{try{await navigator.clipboard.writeText(a.png_url);status.textContent='원본 링크를 복사했습니다.';}catch{status.textContent=a.png_url;}};links.append(png,button);copy.append(heading,usage,links,status);article.append(preview,copy);$('cut-cards').append(article);}
 $('status').textContent='착한거래 전용 3컷 · 투명 PNG · 사용 상황과 SHA256 포함';
}catch{$('status').textContent='착한거래 이미지 목록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.';}
$('background').onclick=()=>{const dark=document.body.classList.toggle('dark-cuts');$('background').setAttribute('aria-pressed',String(dark));$('background').textContent=dark?'밝은 배경에서 보기':'어두운 배경에서 보기';};
