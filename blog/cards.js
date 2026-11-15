/* Code-native cards: all text and numbers come from the validated article. */
(function(root){'use strict';
const C=root.StaffBlog,W=1200,INK=C.BRAND.ink,LIME=C.BRAND.lime;
let assetsPromise;
function loadImage(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('이미지를 불러오지 못했습니다: '+url));i.src=url})}
async function assets(){if(!assetsPromise)assetsPromise=(async()=>{await Promise.all([500,700,900].map(w=>document.fonts.load(`${w} 56px Pretendard`)));await document.fonts.ready;if(!document.fonts.check('900 56px Pretendard'))throw Error('Pretendard 폰트를 불러오지 못했습니다.');return{marker:await loadImage('brand/marker-band.svg')}})();return assetsPromise}
function font(ctx,size=56,weight=500){ctx.font=`${weight} ${size}px Pretendard`;ctx.textBaseline='top'}
function lines(ctx,text,max){const out=[];for(const para of String(text).split('\n')){let line='';for(const ch of [...para]){if(line&&ctx.measureText(line+ch).width>max){out.push(line.trimEnd());line=ch.trimStart()}else line+=ch}out.push(line)}return out}
function text(ctx,value,x,y,width,{size=56,weight=500,color=INK,line=1.4}={}){font(ctx,size,weight);ctx.fillStyle=color;const rows=lines(ctx,value,width);for(const row of rows){ctx.fillText(row,x,y);y+=size*line}return y}
function blockHeight(ctx,value,width,size=56,weight=500,line=1.4){font(ctx,size,weight);return lines(ctx,value,width).length*size*line}
function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function content(card){const s=card.section;if(s.calculation){const calc=C.calculate(s.calculation);return{notice:calc.notice,blocks:calc.rows.map(r=>({label:r.label,main:C.money(r.total_won),detail:`월 ${C.money(r.monthly_won)} × ${r.months}개월\n초기 소모 비용 ${C.money(r.upfront_won)}\n만기 소모 비용 ${C.money(r.final_won)}`})),foot:calc.scope+(calc.same_period?'':'\n기간이 달라 합계만으로 유불리를 단정할 수 없습니다.')}}if(s.pairs)return{blocks:s.pairs.map(p=>({label:p.label,main:p.value,detail:p.note}))};if(s.questions)return{blocks:s.questions.map((q,i)=>({label:`Q${i+1}`,main:q.question,detail:q.answer}))};if(s.items)return{blocks:s.items.map((v,i)=>({label:String(i+1).padStart(2,'0'),main:v}))};return{blocks:s.text.map((v,i)=>({label:String(i+1).padStart(2,'0'),main:v}))}}
async function render(card){const a=await assets(),canvas=document.createElement('canvas');canvas.width=W;canvas.height=900;let ctx=canvas.getContext('2d');let heights=[],data;
 if(card.kind!=='cover'){data=content(card);font(ctx,72,900);const top=200+blockHeight(ctx,card.headline,1040,72,900,1.25)+(data.notice?100:0);heights=data.blocks.map(b=>110+blockHeight(ctx,b.label,980,56,700)+blockHeight(ctx,b.main,980,60,700)+(b.detail?28+blockHeight(ctx,b.detail,980,56,500):0));const footer=data.foot?blockHeight(ctx,data.foot,1040,56,500)+70:0;canvas.height=Math.ceil(top+heights.reduce((n,h)=>n+h+28,0)+footer+140);if(canvas.height>6400)throw Error(`${card.id}: 내용이 너무 많습니다. 문장을 줄이거나 이미지를 나누세요.`);ctx=canvas.getContext('2d')}
 const dark=card.kind==='cover'&&(card.variant===1||card.variant===3),bg=dark?INK:'#FFFFFF',fg=dark?'#FFFFFF':INK;rect(ctx,0,0,W,canvas.height,bg);rect(ctx,64,60,18,42,LIME);text(ctx,'착한거래',102,54,600,{size:44,weight:900,color:fg});text(ctx,'AI 신차 장기렌터카 비교견적',64,112,1050,{size:30,weight:500,color:fg});
 if(card.kind==='cover'){
  const side=card.variant>=2,tx=side?470:64,tw=side?650:740;let y=235;const hh=blockHeight(ctx,card.headline,tw,84,900,1.15);ctx.drawImage(a.marker,tx-8,y+hh-20,Math.min(tw,680),48);y=text(ctx,card.headline,tx,y,tw,{size:84,weight:900,color:fg,line:1.15});if(y>625)throw Error('표지 문장을 더 짧게 다듬어 주세요.');const deckEnd=text(ctx,card.deck,tx,y+48,tw,{size:42,weight:500,color:fg,line:1.4});if(deckEnd>800)throw Error('표지 보조 문장을 줄여 주세요. 두 줄 안팎을 권장합니다.');
  try{const robot=await loadImage('/assets/'+card.pose+'.png');const h=670,w=h*robot.width/robot.height,x=side?-25:800;ctx.drawImage(robot,x,230,w,h)}catch{throw Error('승인된 클로이 PNG가 없습니다. 로컬 제작소에서 실행하거나 자산 경로를 확인하세요.')}
  text(ctx,'CLO-02 · 클로이 Ver.2.0',64,838,1050,{size:26,weight:500,color:fg});
 }else{
  let y=text(ctx,card.headline,64,195,1072,{size:72,weight:900,line:1.25})+40;
  if(data.notice)y=text(ctx,data.notice,64,y,1072,{size:56,weight:700})+24;
  data.blocks.forEach((b,i)=>{const h=heights[i];rect(ctx,64,y,1072,h,i%2?'#F1F1ED':'#FAFAF5');rect(ctx,64,y,8,h,LIME);let yy=y+30;yy=text(ctx,b.label,98,yy,990,{size:56,weight:700})+12;yy=text(ctx,b.main,98,yy,990,{size:60,weight:700});if(b.detail)text(ctx,b.detail,98,yy+28,990,{size:56});y+=h+28});
  if(data.foot)y=text(ctx,data.foot,64,y+12,1072,{size:56})+24;
  if(y>canvas.height-70)throw Error(card.id+': 마지막 문장이 이미지 영역을 벗어났습니다.');text(ctx,'착한거래 · 비교할 때 꺼내 보는 메모',64,canvas.height-65,1072,{size:30,weight:500});
 }
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw Error('PNG 생성 실패');return{canvas,blob,report:{id:card.id,width:W,height:canvas.height,font:'Pretendard',bodyMinPx:card.kind==='cover'?42:56,at350Px:card.kind==='cover'?12.25:16.33,source:'structured_article',clipped:false}};
}
root.StaffBlogCards={render,assets};
})(globalThis);
