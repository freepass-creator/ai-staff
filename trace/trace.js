(() => {
"use strict";
const W=1024,H=1536,NS="http://www.w3.org/2000/svg";
const initial={
  head:{color:"#e9b000",joint:[512,658],points:[[235,260],[298,194],[399,151],[512,131],[625,151],[728,194],[791,260],[799,383],[781,510],[749,602],[684,662],[512,681],[340,662],[275,602],[243,510],[225,383]]},
  leftArm:{color:"#e9b000",joint:[315,746],points:[[158,567],[214,567],[218,644],[277,649],[292,680],[329,675],[360,698],[382,746],[371,808],[333,853],[296,872],[261,910],[197,921],[120,903],[80,855],[76,781],[96,705],[137,654]]},
  rightArm:{color:"#e9b000",joint:[731,781],points:[[684,691],[745,691],[789,730],[815,787],[803,848],[855,868],[890,934],[900,981],[922,1055],[915,1135],[873,1164],[815,1159],[771,1118],[752,1076],[756,1010],[727,980],[705,938],[685,889],[673,845],[664,790],[673,733]]},
  torso:{color:"#e9b000",joint:[512,1020],points:[[367,681],[437,701],[512,708],[587,701],[658,681],[718,751],[726,889],[695,1038],[639,1139],[592,1182],[435,1182],[383,1139],[327,1038],[299,889],[305,751]]},
  leftLeg:{color:"#e9b000",joint:[396,1042],points:[[326,1024],[490,1031],[487,1200],[463,1357],[444,1468],[267,1468],[269,1406],[310,1318],[311,1171]]},
  rightLeg:{color:"#e9b000",joint:[626,1042],points:[[533,1031],[702,1024],[714,1171],[713,1318],[755,1406],[757,1468],[580,1468],[561,1357],[537,1200]]}
};
const labels={head:"머리·얼굴",leftArm:"화면 왼쪽 팔·손",rightArm:"화면 오른쪽 팔·손",torso:"몸통",leftLeg:"화면 왼쪽 다리",rightLeg:"화면 오른쪽 다리"};
const clone=o=>JSON.parse(JSON.stringify(o));
let parts=clone(initial),selected="head",active=null,activeVertex=-1,down=null;
const svg=document.querySelector("#surface"),root=document.querySelector("#shapes"),pointsLayer=document.querySelector("#vertices"),source=document.querySelector("#source"),partSelect=document.querySelector("#part"),status=document.querySelector("#status");
Object.keys(labels).forEach(k=>{let o=document.createElement("option");o.value=k;o.textContent=labels[k];partSelect.appendChild(o)});
function node(type,attrs){let e=document.createElementNS(NS,type);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e}
function xy(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const transform=svg.getScreenCTM();if(!transform)return [0,0];const q=p.matrixTransform(transform.inverse());return [Math.max(0,Math.min(W,Math.round(q.x))),Math.max(0,Math.min(H,Math.round(q.y)))]}
function path(pts){return pts.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" ")+" Z"}
function render(){
root.replaceChildren();pointsLayer.replaceChildren();
const mode=document.querySelector("#view").value;
const defs=node("defs",{}),clip=node("clipPath",{id:"active-clip"});clip.appendChild(node("path",{d:path(parts[selected].points)}));defs.appendChild(clip);root.appendChild(defs);
const old=svg.querySelector("#solo-source");if(old)old.remove();
source.style.display=mode==="solo"?"none":"";
if(mode==="solo"){let img=node("image",{id:"solo-source",href:source.getAttribute("href"),x:0,y:0,width:W,height:H,"clip-path":"url(#active-clip)"});svg.insertBefore(img,root)}
if(mode==="none")return;
if(mode==="all")Object.entries(parts).forEach(([key,v])=>{if(key!==selected)root.appendChild(node("path",{d:path(v.points),class:"other"}))});
const cur=parts[selected];
root.appendChild(node("path",{d:path(cur.points),class:"outline"}));
cur.points.forEach((p,i)=>{let c=node("circle",{cx:p[0],cy:p[1],r:i===activeVertex?11:8,class:"vertex","data-index":i});pointsLayer.appendChild(c)});
pointsLayer.appendChild(node("circle",{cx:cur.joint[0],cy:cur.joint[1],r:12,class:"joint","data-joint":"1"}));
status.textContent=labels[selected]+" · 경계점 "+cur.points.length+"개 · 관절 ("+cur.joint.join(", ")+") · 마스크는 검수 초안";
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function sanitizePart(key,value){
if(!value||!Array.isArray(value.points)||value.points.length<3||value.points.length>300||!Array.isArray(value.joint)||value.joint.length!==2)throw Error(key+" 좌표 오류");
const nums=[...value.points.flat(),...value.joint];if(!nums.every(n=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=1536))throw Error(key+" 숫자 오류");
if(value.points.some(p=>!Array.isArray(p)||p.length!==2||p[0]>W))throw Error(key+" 범위 오류");
return {color:"#e9b000",joint:value.joint,points:value.points};
}
partSelect.addEventListener("change",()=>{selected=partSelect.value;activeVertex=-1;render()});
document.querySelector("#view").addEventListener("change",render);
svg.addEventListener("pointerdown",e=>{if(document.querySelector("#view").value==="none")return;let i=e.target.dataset.index,kind=e.target.dataset.joint?"joint":i!==undefined?"point":null;if(!kind)return;active={kind,index:Number(i)};activeVertex=kind==="point"?Number(i):-1;down=xy(e);svg.setPointerCapture(e.pointerId);render()});
svg.addEventListener("pointermove",e=>{if(!active)return;const p=xy(e);if(active.kind==="joint")parts[selected].joint=p;else parts[selected].points[active.index]=p;render()});
svg.addEventListener("pointerup",()=>{active=null;down=null});svg.addEventListener("pointercancel",()=>{active=null;down=null});
document.querySelector("#add-point").addEventListener("click",()=>{let a=parts[selected].points,max=-1,best=0;for(let i=0;i<a.length;i++){const b=a[(i+1)%a.length],d=Math.hypot(a[i][0]-b[0],a[i][1]-b[1]);if(d>max){max=d;best=i}}const next=a[(best+1)%a.length];a.splice(best+1,0,[Math.round((a[best][0]+next[0])/2),Math.round((a[best][1]+next[1])/2)]);activeVertex=best+1;render()});
document.querySelector("#delete-point").addEventListener("click",()=>{if(activeVertex>=0&&parts[selected].points.length>3){parts[selected].points.splice(activeVertex,1);activeVertex=-1;render()}});
document.querySelector("#json").addEventListener("click",()=>{const o={schema_version:1,source:"../studio/assets/clo02-thumbs-up-master.webp",source_size:[W,H],status:"manual_review_required",identity:"unverified_against_purple_clo02_reference",parts};download(new Blob([JSON.stringify(o,null,2)],{type:"application/json"}),"CLO-02-tracing-draft.json")});
document.querySelector("#load-json").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(o.schema_version!==1||o.source_size?.[0]!==W||o.source_size?.[1]!==H)throw Error("원본 규격 불일치");let clean={};for(const k of Object.keys(initial))clean[k]=sanitizePart(k,o.parts?.[k]);parts=clean;activeVertex=-1;render()}catch(err){status.textContent="가져오기 실패: "+err.message}});
document.querySelector("#png").addEventListener("click",async()=>{
try{
const img=new Image();img.decoding="async";img.src=new URL(source.getAttribute("href"),document.baseURI).href;await img.decode();
const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");if(!ctx)throw Error("캔버스 미지원");
const poly=parts[selected].points;ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.clip();ctx.drawImage(img,0,0,W,H);
c.toBlob(b=>b?download(b,"CLO-02-"+selected+"-source-cutout.png"):status.textContent="PNG 생성 실패","image/png");
}catch(err){status.textContent="PNG 실패: "+err.message}
});
render();
})();
