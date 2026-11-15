export const presets={
 idle:{label:'대기 · 살랑임',body:.2,head:.2,arm:0,forearm:0,wrist:0,curl:0},
 greet:{label:'인사 · 작은 손짓',body:.15,head:.35,arm:.7,forearm:1.2,wrist:4,curl:.025},
 explain:{label:'설명 · 손목 제스처',body:.12,head:.25,arm:-1.1,forearm:2,wrist:-3,curl:.06},
 listen:{label:'경청 · 고개 기울임',body:.08,head:1,arm:0,forearm:.3,wrist:.5,curl:0},
 fingers:{label:'손가락 · 짧은 굴곡 시험',body:0,head:0,arm:0,forearm:0,wrist:.7,curl:.10},
 neutral:{label:'원본 대조 · 정지',body:0,head:0,arm:0,forearm:0,wrist:0,curl:0}
};
const tidy=n=>Number(n.toFixed(6));
export function poseAt(spec,preset,time,strength=1){
 if(!Object.hasOwn(presets,preset)||!Number.isFinite(time)||!Number.isFinite(strength))throw Error('INVALID_GESTURE_INPUT');
 const p=presets[preset],phase=2*Math.PI*((time%6+6)%6)/6,s=Math.sin(phase),close=(1-Math.cos(phase))/2,k=Math.max(0,Math.min(spec.max_supported_strength??1,strength));
 const result={};
 for(const part of spec.parts){
  let angle=0,sy=1;
  if(part.id==='body')angle=p.body*s*k;
  if(part.id==='head')angle=p.head*s*k;
  if(part.id==='upper-arm')angle=p.arm*s*k;
  if(part.id==='forearm')angle=p.forearm*s*k;
  if(part.id==='palm')angle=p.wrist*Math.sin(phase*2)*k;
  if(/^(little|ring|middle|index|thumb)-/.test(part.id)){
   const digit=part.id.split('-')[0],weight={little:1,ring:.9,middle:.8,index:.65,thumb:.35}[digit];
   sy=1-p.curl*weight*close*k;
   // Limited planar splay plus projected shortening; not a 3D finger curl.
   angle=(digit==='thumb'?2.5:digit==='little'?-1.2:0)*p.curl*10*close*k;
  }
  result[part.id]={angle:tidy(angle),sy:tidy(sy)};
 }
 return result;
}
export function applyPose(svg,spec,frame){
 for(const part of spec.parts){const v=frame[part.id],[x,y]=part.pivot;
  svg.getElementById(part.id).setAttribute('transform',`rotate(${v.angle} ${x} ${y})`);
  svg.getElementById(part.id+'-scale').setAttribute('transform',`scale(1 ${v.sy})`);
  const filler=svg.getElementById(part.id+'-filler');if(filler)filler.setAttribute('opacity',Math.min(1,Math.abs(v.angle)*.8).toFixed(6));
 }
}
export function exportMotion(svg,spec,preset,strength=1){
 const copy=svg.cloneNode(true),ns='http://www.w3.org/2000/svg',count=120;
 applyPose(copy,spec,poseAt(spec,'neutral',0,0));
 for(const part of spec.parts){const [x,y]=part.pivot,frames=Array.from({length:count+1},(_,i)=>poseAt(spec,preset,i*6/count,strength)[part.id]);
  for(const [target,type,values] of [[part.id,'rotate',frames.map(v=>`${v.angle} ${x} ${y}`)],[part.id+'-scale','scale',frames.map(v=>`1 ${v.sy}`)]]){
   if(new Set(values).size===1)continue;
   const a=document.createElementNS(ns,'animateTransform');Object.entries({attributeName:'transform',type,dur:'6s',repeatCount:'indefinite',values:values.join(';'),calcMode:'linear'}).forEach(([k,v])=>a.setAttribute(k,v));copy.getElementById(target).append(a);
  }
  const filler=copy.getElementById(part.id+'-filler');if(filler){const a=document.createElementNS(ns,'animate');Object.entries({attributeName:'opacity',dur:'6s',repeatCount:'indefinite',values:frames.map(v=>Math.min(1,Math.abs(v.angle)*.8).toFixed(6)).join(';')}).forEach(([k,v])=>a.setAttribute(k,v));filler.append(a);}
 }
 return new XMLSerializer().serializeToString(copy);
}
