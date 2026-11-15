export const themes={paper:{name:'크림',bg:'#F7F6F1',panel:'#EBEDE2'},peach:{name:'살구',bg:'#FBE7D8',panel:'#F2D4BE'},sky:{name:'하늘',bg:'#E9F0F8',panel:'#D7E3F0'},sage:{name:'세이지',bg:'#E5EDE6',panel:'#CDDCD0'},lilac:{name:'라일락',bg:'#F0EAF8',panel:'#E0D7EE'},ink:{name:'짙은 바탕',bg:'#18201E',panel:'#29332B'}};
export const layouts={
 cover:{name:'표지 · 캐릭터 중심',width:1200,height:675,titleSize:76,titleWidth:660,titleTop:162,characterBox:[760,138,376,473],defaultTheme:'peach',role:'글의 도입과 대표 이미지',itemCount:0},
 comparison:{name:'두 견적 비교표',width:1080,height:1080,titleSize:66,titleWidth:730,titleTop:150,characterBox:[846,142,170,180],defaultTheme:'sky',role:'같은 기준으로 두 대상을 비교',rows:4,itemCount:0},
 checklist:{name:'네 가지 체크리스트',width:1080,height:1350,titleSize:70,titleWidth:940,titleTop:158,characterBox:[794,1054,222,232],defaultTheme:'paper',role:'준비 사항·계약 전 확인 목록',itemCount:4},
 process:{name:'네 단계 흐름',width:1200,height:900,titleSize:66,titleWidth:1060,titleTop:156,characterBox:[940,354,196,412],defaultTheme:'sage',role:'문의·확인·안내 등 순서 설명',itemCount:4},
 caution:{name:'조건·주의사항 강조',width:1080,height:1080,titleSize:70,titleWidth:940,titleTop:158,characterBox:[834,850,182,166],defaultTheme:'ink',role:'놓치기 쉬운 조건과 재확인 사항',itemCount:3},
 faq:{name:'세 가지 FAQ',width:1080,height:1350,titleSize:70,titleWidth:940,titleTop:158,characterBox:[64,1080,208,172],defaultTheme:'lilac',role:'본문의 자주 묻는 질문',itemCount:3}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=s=>esc(s).replace(/\n/g,'<br>');
const len=s=>[...s.replace(/\n/g,'')].length;
export function validateJob(job,assets){
 const layout=layouts[job.template];if(!layout)throw Error('UNKNOWN_TEMPLATE');
 if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(job.id||''))throw Error('INVALID_ID');
 const keys=['id','template','theme','eyebrow','title','subtitle','note','character','scene','items','columns','rows'];
 for(const key of Object.keys(job))if(!keys.includes(key))throw Error('UNKNOWN_FIELD:'+key);
 if(job.theme&&!themes[job.theme])throw Error('UNKNOWN_THEME');
 if(job.template==='caution'&&job.theme&&job.theme!=='ink'||job.template!=='caution'&&job.theme==='ink')throw Error('THEME_CONTRAST_RULE');
 for(const [key,max,lines] of [['title',34,2],['eyebrow',26,1],['subtitle',66,2],['note',66,2]]){
  const value=job[key]??'';if(typeof value!=='string'||len(value)>max||value.split('\n').length>lines)throw Error('TEXT_LIMIT:'+key);
 }
 if(!job.title?.trim())throw Error('TITLE_REQUIRED');
 for(const key of ['character','scene'])if(job[key]!=null&&!assets[job[key]])throw Error('UNREGISTERED_ASSET:'+key);
 if(job.character&&job.scene)throw Error('ONE_VISUAL_ONLY');
 if(job.scene&&job.template!=='cover')throw Error('SCENE_ONLY_ON_COVER');
 if(job.character&&assets[job.character].kind!=='character')throw Error('NOT_CHARACTER');
 if(job.scene&&assets[job.scene].kind!=='scene')throw Error('NOT_SCENE');
 if(layout.itemCount){
  if(!Array.isArray(job.items)||job.items.length!==layout.itemCount)throw Error('ITEM_COUNT');
  for(const item of job.items){
   if(Object.keys(item).some(k=>!['title','body'].includes(k))||typeof item.title!=='string'||typeof item.body!=='string'||!item.title.trim()||len(item.title)>24||len(item.body)>48||item.title.includes('\n')||item.body.includes('\n'))throw Error('ITEM_TEXT_LIMIT');
  }
 }else if(job.items)throw Error('ITEMS_NOT_SUPPORTED');
 if(job.template==='comparison'){
  if(!Array.isArray(job.columns)||job.columns.length!==2||job.columns.some(s=>typeof s!=='string'||len(s)>12||s.includes('\n')))throw Error('COLUMN_LIMIT');
  if(!Array.isArray(job.rows)||job.rows.length!==4)throw Error('ROW_COUNT');
  for(const row of job.rows)if(!Array.isArray(row)||row.length!==3||row.some(s=>typeof s!=='string'||len(s)>14||s.includes('\n')))throw Error('ROW_TEXT_LIMIT');
 }else if(job.rows||job.columns)throw Error('TABLE_NOT_SUPPORTED');
 return layout;
}
export function renderTemplate(job,assets){
 const l=validateJob(job,assets),dark=job.template==='caution',theme=themes[job.theme||l.defaultTheme];
 const [x,y,w,h]=l.characterBox;
 const visual=job.character?`<img data-box="character" class="character" src="${esc(assets[job.character].file)}" alt="클로이" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">`:job.scene?`<img data-box="scene" class="scene" src="${esc(assets[job.scene].file)}" alt="설명용 생성 장면">`:'';
 const items=(cls)=>job.items.map((a,i)=>`<section class="${cls}" data-box="item"><span class="number">${job.template==='faq'?'Q'+(i+1):job.template==='caution'?'!':String(i+1).padStart(2,'0')}</span><div><h2 data-fit>${text(a.title)}</h2><p data-fit>${text(a.body)}</p></div></section>`).join('');
 let content='';
 if(job.template==='cover')content=`<div class="visual-panel"></div><p class="cover-sub" data-fit>${text(job.subtitle||'')}</p><span class="cover-rule"></span>`;
 if(job.template==='comparison')content=`<div class="table"><div class="table-row table-head"><div>비교 기준</div>${job.columns.map(s=>`<div data-fit>${text(s)}</div>`).join('')}</div>${job.rows.map(row=>`<div class="table-row">${row.map(s=>`<div data-fit>${text(s)}</div>`).join('')}</div>`).join('')}</div>`;
 if(job.template==='checklist')content=`<main class="check-items">${items('check')}</main><div class="bottom-copy" data-fit>${text(job.subtitle||'확인한 항목을 차근차근 정리해요.')}</div>`;
 if(job.template==='process')content=`<main class="process-items">${items('step')}</main>`;
 if(job.template==='caution')content=`<main class="caution-items">${items('warning')}</main>`;
 if(job.template==='faq')content=`<main class="faq-items">${items('answer')}</main><div class="faq-end" data-fit>${text(job.subtitle||'궁금한 조건은\n질문 목록으로 남겨주세요.')}</div>`;
 return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=${l.width}"><title>${esc(job.title.replace(/\n/g,' '))}</title><style>
 @font-face{font-family:SUITE;src:url('assets/fonts/SUITE-Heavy.woff2');font-weight:900;font-display:block}
 @font-face{font-family:BodyKR;src:url('assets/fonts/NotoSansKR-400.woff2');font-weight:400;font-display:block}
 @font-face{font-family:BodyKR;src:url('assets/fonts/NotoSansKR-700.woff2');font-weight:700;font-display:block}
 *{box-sizing:border-box}html,body{margin:0;width:${l.width}px;height:${l.height}px}body{font:400 34px/1.5 BodyKR,sans-serif;color:#0B0B0C;background:${theme.bg}}
 .canvas{position:relative;width:100%;height:100%;overflow:hidden}.ci{position:absolute;left:64px;top:44px;width:202px;height:66px;padding:${dark?'8px 10px':'0'};background:${dark?'white':'transparent'};border-radius:3px;object-fit:contain}.eyebrow{position:absolute;right:64px;top:58px;max-width:740px;height:38px;font-size:23px;line-height:1.5;font-weight:700;color:${dark?'#D5D9D4':'#626862'};letter-spacing:.02em}
 h1{position:absolute;left:64px;top:${l.titleTop}px;margin:0;width:${job.scene?550:l.titleWidth}px;max-height:${l.titleSize*2.4}px;font:900 ${job.scene?64:l.titleSize}px/1.18 SUITE,sans-serif;letter-spacing:-.035em;word-break:keep-all;color:${dark?'#FCFCF7':'#0B0B0C'};z-index:2}
 .note{position:absolute;left:64px;bottom:42px;width:${job.scene?550:job.template==='faq'?952:job.template==='caution'?720:job.template==='cover'?660:job.template==='process'?830:job.template==='checklist'?680:952}px;max-height:76px;font-size:25px;line-height:1.5;color:${dark?'#D0D6CD':'#626862'};z-index:2}
 .character{position:absolute;object-fit:contain;object-position:center bottom;z-index:3}.scene{position:absolute;right:35px;bottom:70px;width:530px;height:385px;object-fit:contain;z-index:3}h2,p{margin:0}h2{font-weight:700;letter-spacing:-.02em;word-break:keep-all}.number{font:900 38px/1 SUITE,sans-serif}.cover-sub{position:absolute;left:64px;top:390px;width:${job.scene?550:660}px;max-height:104px;font-size:33px;line-height:1.55;color:#4A524A;z-index:2}.cover-rule{position:absolute;left:64px;top:350px;width:95px;height:8px;background:#F6FD00;border-radius:2px}.visual-panel{position:absolute;right:64px;top:150px;width:360px;height:460px;border-radius:4px;background:${theme.panel}}
 .table{position:absolute;left:64px;top:363px;width:952px;border-top:5px solid #0B0B0C}.table-row{display:grid;grid-template-columns:272px 340px 340px;border-bottom:1px solid #CDD1C7;min-height:123px;background:#fff}.table-row div{padding:34px 24px;font-size:31px;line-height:1.55;word-break:keep-all}.table-row div:first-child{font-weight:700;background:#EFEEE7}.table-head{min-height:91px}.table-head div{font-weight:700;font-size:30px;padding:24px}.table-head div:nth-child(2){background:#F6FD00}.table-head div:nth-child(3){background:#E5E9DF}
 .check-items{position:absolute;left:64px;top:365px;width:952px;display:grid;gap:17px;border-top:5px solid #0B0B0C}.check{display:grid;grid-template-columns:104px 1fr;gap:24px;padding:28px 14px;border-bottom:1px solid #CCD0C4;min-height:146px}.check .number{width:92px;height:72px;display:grid;place-items:center;background:#F6FD00;font-size:47px;border-radius:2px}.check h2{font-size:40px;max-height:61px}.check p{font-size:30px;color:#626862;max-height:47px}.bottom-copy{position:absolute;left:64px;top:1116px;width:660px;max-height:112px;font-size:36px;line-height:1.5;font-weight:700}
 .process-items{position:absolute;left:64px;top:317px;width:820px;display:grid;border-top:5px solid #0B0B0C}.step{height:114px;padding:15px 12px;display:grid;grid-template-columns:98px 1fr;gap:24px;border-bottom:1px solid #CCD0C4}.step .number{display:grid;place-items:center;align-self:center;background:#F6FD00;color:#0B0B0C;font-size:49px;height:70px}.step h2{font-size:37px;max-height:56px}.step p{font-size:28px;color:#626862;line-height:1.55;max-height:44px}
 .caution-items{position:absolute;left:64px;top:375px;width:952px;display:grid;gap:16px;border-top:5px solid #F6FD00}.warning{height:142px;display:grid;grid-template-columns:62px 1fr;gap:24px;padding:24px 8px;border-bottom:1px solid #5B6554;color:#FAFBF6}.warning .number{width:51px;height:51px;display:grid;place-items:center;background:#F6FD00;color:#0B0B0C;border-radius:50%;font-size:36px}.warning h2{font-size:37px;max-height:57px}.warning p{font-size:29px;color:#D0D6CD;max-height:45px}
 .faq-items{position:absolute;left:64px;top:363px;width:952px;display:grid;gap:18px;border-top:5px solid #0B0B0C}.answer{min-height:210px;padding:30px 8px;display:grid;grid-template-columns:106px 1fr;gap:24px;border-bottom:1px solid #CCD0C4}.answer .number{font-size:48px;color:#0B0B0C;margin-top:5px;border-bottom:9px solid #F6FD00;align-self:start;width:max-content}.answer h2{font-size:35px;max-height:54px;margin-bottom:15px}.answer p{font-size:32px;line-height:1.5;max-height:97px;color:#4A524A}.faq-end{position:absolute;left:322px;top:1124px;width:694px;max-height:128px;font-size:37px;font-weight:700;line-height:1.5}
 </style><div class="canvas" data-template="${job.template}"><img data-box="ci" class="ci" src="assets/brand/ci-P2.svg" alt="착한거래"><div class="eyebrow" data-fit>${text(job.eyebrow||'장기렌터카 비교 가이드')}</div><h1 data-fit>${text(job.title)}</h1>${content}${visual}<footer class="note" data-fit>${text(job.note||'구성 예시 · 실제 조건은 견적·계약 자료로 확인하세요.')}</footer></div></html>`;
}
