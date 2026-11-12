/* AI Staff / blog still workbench. No external services or WebGL dependency. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const CANVAS=$('art');
  const ctx=CANVAS.getContext('2d');
  const FONT='"Pretendard","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif';
  const FORMATS={
    body:{width:1200,height:800,label:'블로그 본문'},
    portrait:{width:1080,height:1350,label:'세로형 카드'},
    wide:{width:1200,height:630,label:'대표 커버'}
  };
  const CUTS=['cover','compare','check','explain','faq','closing'];
  const CUT_LABELS={cover:'표지',compare:'핵심비교',check:'체크리스트',explain:'AI설명',faq:'FAQ',closing:'마무리'};
  const TOPICS={
    price:{
      code:'price',badge:'장기렌트 가격 · 시세',
      hook:'월 대여료, 숫자만 보면 놓칩니다',
      intro:'같은 차량도 조건에 따라 비교 결과가 달라질 수 있어요.',
      compare:'가격을 볼 때 맞춰야 할 기준',check:'견적에서 꼭 확인할 3가지',
      question:'왜 같은 차도 대여료가 다를까요?',
      answer:'기간·초기비용·주행거리·보험 조건이 다르면 단순 금액 비교는 어렵습니다.',
      faq:'가장 저렴한 월 대여료가 정답일까요?',
      reply:'총비용과 계약 조건까지 함께 봐야 판단할 수 있습니다.',
      points:['계약 기간과 주행거리','보증금·선납금·월 대여료','보험·면책금·만기 조건']
    },
    cars:{
      code:'cars',badge:'신차 · 차종별 비교',
      hook:'같은 신차, 어떤 조건으로 비교할까요?',
      intro:'모델·트림·옵션을 먼저 맞추고 견적을 비교하세요.',
      compare:'차종 비교에서 달라지는 항목',check:'신차 비교 전 체크포인트',
      question:'차종 이름만 같으면 같은 견적일까요?',
      answer:'트림과 선택 옵션, 계약 조건이 다르면 비교 기준이 달라집니다.',
      faq:'같은 모델인데 월 대여료가 왜 다르죠?',
      reply:'트림·옵션·초기비용·약정 조건의 차이를 먼저 살펴보세요.',
      points:['모델·세부 트림·선택 옵션','연간 주행거리와 계약 기간','월 대여료와 초기 비용']
    },
    guide:{
      code:'guide',badge:'장기렌트 실전 가이드',
      hook:'장기렌트 계약 전, 이것부터 확인하세요',
      intro:'복잡해 보이는 계약도 확인 순서를 정하면 쉬워집니다.',
      compare:'계약서에서 비교할 핵심 항목',check:'놓치기 쉬운 계약 조건',
      question:'월 대여료 말고 무엇을 봐야 할까요?',
      answer:'중도해지·면책금·만기 반납 조건을 계약서에서 확인하세요.',
      faq:'계약 후 조건을 바꾸기 쉬울까요?',
      reply:'변경 가능 여부와 수수료는 계약별로 달라 확인이 필요합니다.',
      points:['중도해지 위약금 기준','사고 면책금과 보험 범위','만기 반납·인수 조건']
    },
    credit:{
      code:'credit',badge:'신용 · 심사 · 승인 정보',
      hook:'심사 기준, 먼저 이해하고 비교하세요',
      intro:'승인 여부는 공급사·상품·개인 조건에 따라 달라집니다.',
      compare:'심사 조건에서 확인할 부분',check:'견적 문의 전 준비하면 좋은 것',
      question:'신용 조건이 다르면 선택지도 다를까요?',
      answer:'상품과 심사 방식에 따라 제출 서류·초기 비용·승인 기준이 달라질 수 있습니다.',
      faq:'누구나 반드시 승인되나요?',
      reply:'아닙니다. 실제 승인 가능 여부는 공급사의 개별 심사가 필요합니다.',
      points:['상품별 신청 가능 조건','필요 서류와 심사 과정','초기 비용·보증 조건']
    },
    market:{
      code:'market',badge:'자동차 시장 · 이슈',
      hook:'자동차 시장 뉴스, 숫자보다 맥락',
      intro:'발표일과 실제 적용 시점을 구별해서 읽어보세요.',
      compare:'시장 이슈를 읽는 세 가지 기준',check:'뉴스 확인 체크리스트',
      question:'오늘 나온 소식, 지금 바로 적용될까요?',
      answer:'정책·가격·출시 일정은 발표와 실제 시행 시점이 다를 수 있습니다.',
      faq:'전망을 확정 사실로 봐도 될까요?',
      reply:'전망은 예측입니다. 원문 출처와 기준일을 확인하세요.',
      points:['공식 발표와 실제 적용일','가격·사양의 적용 범위','원자료와 확인 날짜']
    },
    care:{
      code:'care',badge:'자동차 상식 · 관리',
      hook:'차량 관리, 알고 하면 달라집니다',
      intro:'내 차의 매뉴얼과 운행 환경에 맞춰 확인하세요.',
      compare:'관리 정보에서 구분할 것',check:'차량 관리 기본 체크',
      question:'모든 차에 같은 관리 주기가 적용될까요?',
      answer:'차종·연식·주행 환경·제조사 지침에 따라 관리 주기가 달라집니다.',
      faq:'인터넷의 관리 팁을 그대로 따라도 될까요?',
      reply:'차량별 취급설명서와 공식 점검 기준을 우선 확인하세요.',
      points:['제조사 권장 점검 기준','소모품과 주행 환경','증상 발생 시 점검 방법']
    },
    analysis:{
      code:'analysis',badge:'AI 자동차 분석실',
      hook:'AI가 비교한 결과, 기준부터 공개합니다',
      intro:'데이터의 출처·비교 방법·한계를 함께 보여드립니다.',
      compare:'AI 분석의 핵심 확인 항목',check:'분석 결과 검증 체크',
      question:'AI 추천은 언제나 정답일까요?',
      answer:'입력 데이터와 가정에 따라 결과가 달라지므로 원자료 검증이 필요합니다.',
      faq:'분석 결과만 보고 계약해도 될까요?',
      reply:'아닙니다. 실제 조건과 공급사 견적을 별도로 대조하세요.',
      points:['데이터 출처와 확인일','비교 조건의 동일성','가정·오차·미확인 항목']
    },
    notice:{
      code:'notice',badge:'착한거래 소식 · 안내',
      hook:'착한거래, 비교를 더 쉽게 만드는 중',
      intro:'계약을 재촉하지 않고 필요한 정보를 확인하도록 돕습니다.',
      compare:'착한거래가 돕는 비교 과정',check:'AI 비교 전 확인할 것',
      question:'착한거래에서는 무엇을 할 수 있나요?',
      answer:'차량과 계약 조건을 나란히 비교하고 궁금한 내용을 확인할 수 있습니다.',
      faq:'상담하면 바로 계약해야 하나요?',
      reply:'아니요. 먼저 정보만 확인하고 비교해 보셔도 됩니다.',
      points:['차량 조건과 견적 비교','보증금·기간·주행거리 확인','궁금한 내용부터 AI 상담']
    }
  };
  // 착한거래 클로이로 출력 가능한 내장 이미지는 확인된 10방향 원본뿐입니다.
  const IMAGE_FILES={
    angleFront:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-front.webp',
    angleFrontLeft:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-front-left.webp',
    angleLeft:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-left.webp',
    angleBackLeft:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-back-left.webp',
    angleBack:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-back.webp',
    angleBackRight:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-back-right.webp',
    angleRight:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-right.webp',
    angleFrontRight:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-front-right.webp',
    angleTop:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-top.webp',
    angleBottom:'../../robots/CLO-02/chakhan-sales/motion-3d/assets/chloe-bottom.webp'
  };
  let topic='price',cut='cover',format='body',actor='none',approved=false;
  let photo=null,personalPhoto=null,personalURL=null,loadVersion=0,raf=0,busy=false;
  function clearStatus(){ $('status').classList.remove('error'); }
  function status(message,error){ $('status').textContent=message; $('status').classList.toggle('error',!!error); }
  function defaults(category,part){
    const t=TOPICS[category];
    const common={badge:t.badge,items:t.points.slice()};
    if(part==='cover')return Object.assign(common,{headline:t.hook,subtitle:t.intro});
    if(part==='compare')return Object.assign(common,{headline:t.compare,subtitle:'서로 다른 조건을 같은 기준으로 맞춰 보세요.'});
    if(part==='check')return Object.assign(common,{headline:t.check,subtitle:'한 가지씩 확인하면 비교가 쉬워집니다.'});
    if(part==='explain')return Object.assign(common,{headline:t.question,subtitle:t.answer});
    if(part==='faq')return Object.assign(common,{headline:t.faq,subtitle:t.reply});
    return Object.assign(common,{headline:'장기렌터카, 계약하지 마시고 비교만 하세요.',subtitle:'착한거래에서 조건과 정보를 편하게 비교해 보세요.'});
  }
  function resetEditor(){
    const d=defaults(topic,cut);
    $('badge').value=d.badge;$('headline').value=d.headline;$('subtitle').value=d.subtitle;
    for(let i=1;i<=3;i++)$('item-'+i).value=d.items[i-1]||'';
  }
  function currentData(){
    return {badge:$('badge').value.trim(),headline:$('headline').value.trim(),subtitle:$('subtitle').value.trim(),
      items:[1,2,3].map(i=>$('item-'+i).value.trim()).filter(Boolean),evidence:$('evidence').value.trim()};
  }
  function fitLines(c,text,maxWidth,maxCount){
    const chars=Array.from(String(text||'').replace(/\s+/g,' ').trim());
    const lines=[];let line='';
    for(const char of chars){
      if(line&&c.measureText(line+char).width>maxWidth){lines.push(line.trim());line=char;}
      else line+=char;
    }
    if(line.trim())lines.push(line.trim());
    if(lines.length>maxCount){
      lines.length=maxCount;let last=lines[maxCount-1];
      while(last.length>0&&c.measureText(last+'…').width>maxWidth)last=Array.from(last).slice(0,-1).join('');
      lines[maxCount-1]=last.replace(/[.,\s]+$/,'')+'…';
    }
    return lines;
  }
  function drawText(c,value,x,y,width,size,weight,color,maxLines,lineMult){
    c.fillStyle=color||'#191919';c.textAlign='left';c.textBaseline='top';
    c.font=String(weight||700)+' '+size+'px '+FONT;
    const lines=fitLines(c,value,width,maxLines||2);
    const step=size*(lineMult||1.27);
    lines.forEach((s,i)=>c.fillText(s,x,y+i*step));
    return y+lines.length*step;
  }
  function titleText(c,value,x,y,width,size,maxLines,highlight){
    let fontSize=size,lines=[];
    while(fontSize>=51){
      c.font='900 '+fontSize+'px '+FONT;
      lines=fitLines(c,value,width,99);
      if(lines.length<=maxLines)break;
      fontSize-=3;
    }
    c.font='900 '+fontSize+'px '+FONT;
    lines=fitLines(c,value,width,maxLines);
    if(highlight&&lines.length){
      c.fillStyle='#f0fa00';
      const lineW=Math.min(width,c.measureText(lines[0]).width+14);
      c.fillRect(x-3,y+fontSize*.72,lineW,fontSize*.3);
    }
    c.fillStyle='#181818';c.textAlign='left';c.textBaseline='top';
    const step=fontSize*1.22;
    lines.forEach((line,i)=>c.fillText(line,x,y+i*step));
    return y+lines.length*step;
  }
  function rounded(c,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }
  function background(c,H,part){
    c.fillStyle='#fff';c.fillRect(0,0,1200,H);
    c.save();c.strokeStyle=part==='closing'?'#e8ef00':'#f0f0eb';c.lineWidth=2;
    c.beginPath();c.arc(1130,H*.43,H*.42,0,Math.PI*2);c.stroke();
    c.beginPath();c.arc(1130,H*.43,H*.29,0,Math.PI*2);c.stroke();
    c.restore();
    c.fillStyle=part==='cover'||part==='closing'?'#f6fd00':'#f6f9e7';
    c.fillRect(0,0,11,H);
    c.fillStyle='#1b1b1b';c.font='900 41px '+FONT;c.textAlign='left';c.textBaseline='top';
    c.fillText('착한거래',81,56);
    c.strokeStyle='#e7ef00';c.lineWidth=7;c.lineCap='round';
    c.beginPath();c.moveTo(84,105);c.quadraticCurveTo(141,125,212,104);c.stroke();
    c.font='700 17px '+FONT;c.fillStyle='#7f7f79';c.fillText('AI COMPARE / CONTENT NOTE',842,72);
    c.fillStyle='#e8e8e3';c.fillRect(79,132,1042,2);
  }
  function marker(c,value){
    if(!value)return;
    c.font='800 19px '+FONT;
    const width=Math.min(620,c.measureText(value).width+35);
    rounded(c,80,166,width,37,9);c.fillStyle='#f5f9d2';c.fill();
    c.fillStyle='#434a0d';c.textAlign='left';c.textBaseline='top';c.fillText(value,96,173);
  }
  function drawCharacter(c,H,source){
    if(!source||!source.complete||!source.naturalWidth)return;
    const tall=H>1060,short=H<730;
    const frame=tall?{x:692,y:755,w:428,h:Math.min(660,H-865)}
      :short?{x:842,y:166,w:290,h:Math.max(250,H-286)}
      :{x:806,y:225,w:340,h:420};
    if(frame.w<=0||frame.h<=0)return;
    c.save();
    rounded(c,frame.x,frame.y,frame.w,frame.h,32);
    c.fillStyle='#f7f8f3';c.fill();
    c.clip();
    const fit=Math.min((frame.w-22)/source.naturalWidth,(frame.h-14)/source.naturalHeight);
    const dw=source.naturalWidth*fit,dh=source.naturalHeight*fit;
    c.drawImage(source,frame.x+(frame.w-dw)/2,frame.y+frame.h-dh-7,dw,dh);
    c.restore();
    c.save();c.strokeStyle='#e8e8e2';c.lineWidth=2;rounded(c,frame.x,frame.y,frame.w,frame.h,32);c.stroke();c.restore();
  }
  function rows(c,points,H,hasPhoto){
    const tall=H>1060,short=H<730;
    const start=short?395:tall?730:510;
    const rowGap=short?43:tall?110:68;
    const width=hasPhoto?680:1040;
    points.slice(0,3).forEach((p,i)=>{
      const y=start+i*rowGap;
      c.fillStyle='#e8e8e4';c.fillRect(81,y+rowGap-9,width,1);
      c.fillStyle='#737a0f';c.font='900 '+(short?19:22)+'px '+FONT;
      c.textBaseline='top';c.fillText('0'+(i+1),83,y+2);
      drawText(c,p,134,y,width-66,short?23:27,720,'#252525',1,1.15);
    });
  }
  function summaryBox(c,value,H,hasPhoto,part){
    const tall=H>1060,short=H<730;
    const x=80,y=short?394:tall?650:484,w=hasPhoto?(tall?615:694):1040,h=short?118:tall?235:180;
    rounded(c,x,y,w,h,22);c.fillStyle=part==='faq'?'#f4f4f0':'#f5f9d1';c.fill();
    c.fillStyle='#dfe700';c.fillRect(x, y+25,8,h-50);
    drawText(c,value,x+33,y+26,w-67,short?28:tall?41:34,800,'#222222',short?3:4,1.3);
  }
  function footer(c,H,cutKey,data){
    const y=H-97;
    c.fillStyle='#e8e8e2';c.fillRect(80,y,1040,2);
    drawText(c,'착한거래 · 조건부터 비교하세요',81,y+17,540,19,800,'#3a3a36',1,1.1);
    c.textAlign='right';c.textBaseline='top';c.fillStyle='#85857e';c.font='600 17px '+FONT;
    c.fillText(CUT_LABELS[cutKey]+' / AI STAFF',1115,y+20);
    if(data.evidence){drawText(c,data.evidence,82,y+45,1038,15,600,'#73736c',1,1.1);}
  }
  function drawSampleWarning(c,H){
    c.save();rounded(c,585,H-160,535,38,6);c.fillStyle='#b74128';c.fill();
    c.font='800 20px '+FONT;c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
    c.fillText('업로드한 새 이미지 검수 전 · 외부 게시 금지',852,H-141);c.restore();
  }
  function render(target,part,data){
    const def=FORMATS[format];const c=target.getContext('2d');
    target.width=def.width;target.height=def.height;
    const scale=def.width/1200,H=def.height/scale;
    c.setTransform(scale,0,0,scale,0,0);
    background(c,H,part);
    const photoReady=photo&&photo.complete&&photo.naturalWidth>0, tall=H>1060,short=H<730;
    const mainW=photoReady&&!tall?715:1040;
    marker(c,data.badge);
    if(part==='cover'){
      const end=titleText(c,data.headline,80,short?227:237,mainW,short?68:84,short?2:3,true);
      drawText(c,data.subtitle,84,Math.min(end+25,short?457:tall?590:566),mainW,short?25:30,650,'#54544e',2,1.35);
    }else if(part==='closing'){
      const end=titleText(c,data.headline,80,short?234:tall?310:245,mainW,short?63:75,3,true);
      drawText(c,data.subtitle,85,Math.min(end+30,short?456:tall?610:570),mainW,short?25:30,700,'#5c5c55',2,1.3);
      if(tall)drawText(c,'CONTRACT?  COMPARE FIRST.',84,650,1020,19,850,'#7d860e',1,1.1);
    }else{
      const headlineEnd=titleText(c,data.headline,80,short?225:238,mainW,short?59:tall?75:69,2,part==='faq');
      if(part==='compare'||part==='check'){
        drawText(c,data.subtitle,84,Math.min(headlineEnd+12,short?342:tall?475:420),mainW,short?21:27,630,'#62625d',2,1.35);
        rows(c,data.items,H,photoReady);
      }else{
        drawText(c,part==='faq'?'Q.':'AI INSIGHT',83,short?348:tall?526:435,mainW,short?19:22,900,'#747b13',1,1.15);
        summaryBox(c,data.subtitle,H,photoReady,part);
      }
    }
    drawCharacter(c,H,photoReady?photo:null);
    if(actor==='uploaded'&&!approved)drawSampleWarning(c,H);
    footer(c,H,part,data);
  }
  function refresh(){
    raf=0;
    try{render(CANVAS,cut,currentData());}
    catch(e){status('미리보기를 그리지 못했습니다: '+e.message,true);}
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(refresh);}
  function pickCut(next){
    if(!CUTS.includes(next))return;
    cut=next;
    document.querySelectorAll('[data-cut]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cut===next)));
    resetEditor();schedule();
  }
  function pickTopic(next){
    if(!TOPICS[next])return;topic=next;resetEditor();schedule();
  }
  function pickFormat(next){
    if(!FORMATS[next])return;format=next;const f=FORMATS[next];
    $('dimensions').textContent=f.width+' × '+f.height+' · '+f.label;schedule();
  }
  function actorStatus(message){$('actor-state').textContent=message;}
  function loadActor(next){
    loadVersion++;const request=loadVersion;actor=next;photo=null;
    approved=$('sample-approved').checked;
    if(next==='none'){actorStatus('캐릭터 없이도 바로 사용할 수 있습니다. 모든 정지컷이 PNG로 저장됩니다.');schedule();return;}
    if(next==='uploaded'){
      photo=personalPhoto;
      actorStatus(photo?'사용자가 불러온 원본 이미지를 사용합니다. (브라우저 안에서만 보관)':'먼저 아래에서 검수된 캐릭터 이미지를 불러와 주세요.');
      schedule();return;
    }
    const src=IMAGE_FILES[next];if(!src){actorStatus('이미지를 선택할 수 없습니다.');schedule();return;}
    actorStatus('대표가 확인한 착한거래 클로이 브랜드 변형을 불러오는 중입니다.');
    const image=new Image();image.onload=()=>{
      if(request!==loadVersion)return;
      photo=image;actorStatus('착한거래 클로이(CLO-02-CHAKHAN) 기준 10방향 원본입니다. 다른 클로이 외형으로 자동 대체하지 않습니다.');schedule();
    };
    image.onerror=()=>{
      if(request!==loadVersion)return;
      photo=null;actorStatus('원본 파일을 읽지 못했습니다. 다른 포즈나 파일 업로드를 이용하세요.');schedule();
    };
    image.src=src;
  }
  function chooseUploaded(file){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){
      actorStatus('PNG·WebP·JPG, 12MB 이하 이미지 파일만 사용할 수 있습니다.');$('file').value='';return;
    }
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{
      if(personalURL)URL.revokeObjectURL(personalURL);
      personalURL=url;personalPhoto=image;$('actor').value='uploaded';$('sample-approved').checked=false;approved=false;loadActor('uploaded');
      actorStatus(file.name+' 원본이 준비됐습니다. 형태를 변경하지 않고 카드 안에 배치합니다.');
    };
    image.onerror=()=>{URL.revokeObjectURL(url);actorStatus('이미지를 읽지 못했습니다. 다른 PNG 파일로 시도하세요.');};
    image.src=url;
  }
  function checkExport(data){
    if(busy){status('이미지 파일을 저장하고 있습니다. 중복 실행은 하지 않습니다.',true);return false;}
    if(actor==='uploaded'&&!personalPhoto){status('검수된 캐릭터 원본 파일을 먼저 불러오세요.',true);return false;}
    if(actor==='uploaded'&&!approved){status('직접 업로드한 캐릭터 이미지는 외형 검수 확인 후 내보낼 수 있습니다.',true);return false;}
    if(actor!=='none'&&!photo){status('캐릭터 이미지를 불러오는 중이거나 파일이 없습니다.',true);return false;}
    const whole=[data.headline,data.subtitle,...data.items,data.badge].join(' ');
    if(/(?:[₩￦$])|(?:\d[\d,.]*\s*(?:만원|천원|원|%))/.test(whole)&&!data.evidence){
      status('금액이나 수치를 표시하는 경우 출처·기준일을 먼저 입력하세요.',true);return false;
    }
    return true;
  }
  function canvasBlob(canvas){
    return new Promise((resolve,reject)=>{
      try{canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG를 생성하지 못했습니다.')),'image/png');}
      catch(e){reject(e);}
    });
  }
  function download(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  function crc32(data){
    let crc=0xffffffff;
    for(let i=0;i<data.length;i++){
      crc^=data[i];
      for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    }
    return(crc^0xffffffff)>>>0;
  }
  function zipBlobs(files){
    const encoder=new TextEncoder(),body=[],center=[];
    let offset=0,centralSize=0;
    files.forEach(file=>{
      const name=encoder.encode(file.name),data=file.bytes,crc=crc32(data),len=data.byteLength;
      const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
      l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);
      l.setUint16(8,0,true);l.setUint32(14,crc,true);l.setUint32(18,len,true);l.setUint32(22,len,true);l.setUint16(26,name.length,true);
      local.set(name,30);body.push(local,data);
      const cd=new Uint8Array(46+name.length),v=new DataView(cd.buffer);
      v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);
      v.setUint32(16,crc,true);v.setUint32(20,len,true);v.setUint32(24,len,true);v.setUint16(28,name.length,true);
      v.setUint32(42,offset,true);cd.set(name,46);center.push(cd);
      offset+=local.length+len;centralSize+=cd.length;
    });
    const end=new Uint8Array(22),v=new DataView(end.buffer);
    v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
    v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...body,...center,end],{type:'application/zip'});
  }
  async function saveOne(){
    const data=currentData();if(!checkExport(data))return;
    busy=true;$('save-png').disabled=$('save-pack').disabled=true;status('PNG를 저장하고 있습니다.');
    try{
      await document.fonts.ready;
      const canvas=document.createElement('canvas');render(canvas,cut,data);
      download(await canvasBlob(canvas),'chakhandeal-'+TOPICS[topic].code+'-'+cut+'-'+format+'.png');
      clearStatus();status('현재 '+CUT_LABELS[cut]+' 컷 PNG 저장 요청을 보냈습니다.');
    }catch(e){status('PNG 저장 실패: '+e.message,true);}
    finally{busy=false;$('save-png').disabled=$('save-pack').disabled=false;}
  }
  async function savePack(){
    const data=currentData();if(!checkExport(data))return;
    busy=true;$('save-png').disabled=$('save-pack').disabled=true;
    try{
      await document.fonts.ready;
      const files=[];
      for(let i=0;i<CUTS.length;i++){
        const part=CUTS[i],d=part===cut?data:Object.assign(defaults(topic,part),{evidence:data.evidence});
        if(!checkPackEvidence(d))throw new Error('일괄 출력의 기본 문구에도 기준일/출처 확인이 필요합니다.');
        const temp=document.createElement('canvas');render(temp,part,d);
        const blob=await canvasBlob(temp);
        files.push({name:String(i+1).padStart(2,'0')+'-'+part+'.png',bytes:new Uint8Array(await blob.arrayBuffer())});
        status('6컷 생성 중 · '+(i+1)+'/6');
      }
      download(zipBlobs(files),'chakhandeal-'+topic+'-'+format+'-6cuts.zip');
      clearStatus();status('6컷 ZIP 저장 요청을 보냈습니다. 선택한 컷은 수정한 내용, 나머지는 기본 문구로 구성됩니다.');
    }catch(e){status('6컷 저장 실패: '+e.message,true);}
    finally{busy=false;$('save-png').disabled=$('save-pack').disabled=false;}
  }
  function checkPackEvidence(data){
    const whole=[data.headline,data.subtitle,...data.items].join(' ');
    return !/(?:[₩￦$])|(?:\d[\d,.]*\s*(?:만원|천원|원|%))/.test(whole)||!!data.evidence;
  }
  $('category').addEventListener('change',e=>pickTopic(e.target.value));
  $('format').addEventListener('change',e=>pickFormat(e.target.value));
  document.querySelectorAll('[data-cut]').forEach(b=>b.addEventListener('click',()=>pickCut(b.dataset.cut)));
  ['badge','headline','subtitle','item-1','item-2','item-3','evidence'].forEach(id=>$(id).addEventListener('input',schedule));
  $('actor').addEventListener('change',e=>loadActor(e.target.value));
  $('file').addEventListener('change',e=>chooseUploaded(e.target.files[0]));
  $('sample-approved').addEventListener('change',e=>{approved=e.target.checked;schedule();});
  $('save-png').addEventListener('click',saveOne);
  $('save-pack').addEventListener('click',savePack);
  window.addEventListener('pagehide',()=>{if(personalURL)URL.revokeObjectURL(personalURL);});
  if(!ctx){status('Canvas 지원 브라우저가 필요합니다.',true);$('save-png').disabled=$('save-pack').disabled=true;return;}
  resetEditor();pickFormat(format);schedule();
}());