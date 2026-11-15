import {createPlayer} from './motion.js';
const status=document.getElementById('status'),canvas=document.getElementById('chloe');
try{
 const spec=await(await fetch('./spec.json',{cache:'no-store'})).json(),player=await createPlayer(canvas,spec);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduce.matches,clock=0,last=performance.now();
 const state=()=>({body:document.getElementById('body').checked,eyes:document.getElementById('eyes').checked,strength:Number(document.getElementById('strength').value)});
 const pause=document.getElementById('pause');pause.textContent=paused?'재생':'잠시 멈춤';
 pause.onclick=()=>{paused=!paused;pause.textContent=paused?'재생':'잠시 멈춤';};
 for(const id of ['body','eyes','strength'])document.getElementById(id).addEventListener('input',()=>{if(paused)player.renderAt(clock,state());});
 window.chloeMotion={spec,player,renderAt(t,options){paused=true;clock=t;pause.textContent='재생';return player.renderAt(t,options);},resume(){paused=false;}};
 const tick=now=>{if(!paused)clock+=(now-last)/1000;last=now;if(!paused)player.renderAt(clock,state());requestAnimationFrame(tick);};
 player.renderAt(0,state());requestAnimationFrame(tick);status.textContent='현재 클로이 이미지 연결 완료 · 몸 움직임과 눈 깜박임을 각각 켜고 끌 수 있습니다.';
}catch(e){status.textContent=e.message;status.setAttribute('role','alert');}
