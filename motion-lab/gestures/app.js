import {presets,poseAt,applyPose,exportMotion} from './animation.js';
const status=document.getElementById('status'),select=document.getElementById('preset'),strength=document.getElementById('strength'),pause=document.getElementById('pause');
try{
 const spec=await(await fetch('spec.json',{cache:'no-store'})).json(),response=await fetch(spec.fast_svg_file?'web.svg':'rig.svg',{cache:'no-store'});if(!response.ok)throw Error('SVG 관절 파일을 읽을 수 없습니다.');
 const bytes=await response.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(sha!==(spec.fast_svg_sha256||spec.svg_sha256))throw Error('SVG 해시가 변경됐습니다.');
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('SVG 구조 오류');
 const svg=document.importNode(doc.documentElement,true);document.getElementById('mount').append(svg);
 for(const [key,p]of Object.entries(presets)){const o=document.createElement('option');o.value=key;o.textContent=p.label;select.append(o);}select.value='greet';
 let t=0,last=performance.now(),paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function renderAt(time,preset=select.value,amount=Number(strength.value)){t=time;const f=poseAt(spec,preset,time,amount);applyPose(svg,spec,f);return f;}
 function update(){renderAt(t);}select.onchange=()=>{t=0;update();};strength.oninput=update;
 const pauseLabel=()=>pause.textContent=paused?'재생':'잠시 멈춤';pauseLabel();pause.onclick=()=>{paused=!paused;pauseLabel();};
 document.getElementById('background').onclick=()=>document.getElementById('stage').classList.toggle('dark');
 document.getElementById('download').onclick=()=>{const data=exportMotion(svg,spec,select.value,Number(strength.value)),url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='Chloe-'+select.value+'-planar.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 document.getElementById('joints').textContent=spec.parts.map(p=>p.id+' ('+p.pivot.join(', ')+')').join(' · ');
 window.chloeGestures={spec,svg,renderAt,exportMotion:(p=select.value,s=Number(strength.value))=>exportMotion(svg,spec,p,s),pause(){paused=true;pauseLabel();},resume(){paused=false;pauseLabel();}};
 let lastPaint=0;renderAt(0);function tick(now){if(!paused){t+=(now-last)/1000;if(now-lastPaint>=1000/24){renderAt(t);lastPaint=now;}}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
 status.textContent=spec.palm_review_note||'20개 SVG 부품 연결 · 질감 내장 웹 재생본 (경로 SVG 별도 제공)';
}catch(e){status.textContent=e.message;status.setAttribute('role','alert');}
