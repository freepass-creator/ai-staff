(function(){'use strict';
  const actor=new window.AIStaffSecretary.Actor(document.getElementById('actor'));
  const $=id=>document.getElementById(id),status=$('status'),stage=$('stage');
  const MOTION_LABELS={idle:'숨쉬기',greet:'인사',present:'설명',nod:'끄덕임',still:'정지'};
  function update(){const s=actor.getState();$('view-caption').textContent=window.AIStaffSecretary.labels[s.view]+' · '+MOTION_LABELS[s.motion];}
  $('actor').addEventListener('secretary:ready',()=>{stage.dataset.error='false';status.textContent='6방향 기준 이미지가 준비되었습니다.'});
  $('actor').addEventListener('secretary:error',()=>{stage.dataset.error='true';status.textContent='이미지 파일을 불러오지 못했습니다. refs/turnaround-preview.svg 경로를 확인해 주세요.'});
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{actor.setView(button.dataset.view);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();}));
  document.querySelectorAll('[data-motion]').forEach(button=>button.addEventListener('click',()=>{actor.setMotion(button.dataset.motion);document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();}));
  $('speed').addEventListener('input',e=>{actor.setSpeed(e.target.value);$('speed-label').textContent=Number(e.target.value).toFixed(1)+'×'});
  $('toggle').addEventListener('click',e=>{if(actor.paused){actor.play();e.target.textContent='일시정지'}else{actor.pause();e.target.textContent='재생'}});
  $('export').addEventListener('click',async()=>{try{const blob=await actor.exportPng({width:1080,height:1920});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='AIStaff-secretary-'+actor.view+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='선택한 방향을 PNG로 저장했습니다.'}catch(err){status.textContent='저장 실패: '+err.message}});
  update();
})();
