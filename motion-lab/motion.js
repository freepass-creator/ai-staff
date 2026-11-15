export const WIDTH=1024,HEIGHT=1536;
export function blinkAt(t){
 const phase=((t%6)+6)%6;
 let value=0;
 for(const [center,width]of [[1.65,.25],[4.35,.28]]){const d=Math.abs(phase-center)/(width/2);if(d<1)value=Math.max(value,.5+.5*Math.cos(Math.PI*d));}
 return value;
}
export async function createPlayer(canvas,spec){
 const response=await fetch(spec.source_url,{cache:'no-store'});if(!response.ok)throw Error('현재 캐릭터 이미지를 불러올 수 없습니다.');
 const bytes=await response.arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(digest!==spec.source_sha256)throw Error('이미지가 변경됐습니다. 현재 기준을 다시 확인해야 합니다.');
 const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));const img=new Image();img.src=url;await img.decode();
 if(img.width!==WIDTH||img.height!==HEIGHT)throw Error('이 시제품의 기준 이미지 크기와 다릅니다.');
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
 if(!gl)throw Error('이 브라우저에서는 모션 미리보기를 표시할 수 없습니다.');
 const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.0)*0.5,(1.0-position.y)*0.5);gl_Position=vec4(position,0.0,1.0);}`;
 const fragment=`precision highp float;
 varying vec2 uv;uniform sampler2D art;uniform float time;uniform float sway;uniform float blink;
 vec4 eye(vec2 p,float cx,vec4 original){
  if(blink<0.00001)return original;
  float dx=abs(p.x-cx),dy=p.y-370.5;
  if(dx>=54.0||abs(dy)>=46.0)return original;
  float region=(1.0-smoothstep(48.0,54.0,dx))*(1.0-smoothstep(40.0,46.0,abs(dy)));
  vec4 glass=texture2D(art,vec2(p.x,324.0)/vec2(1024.0,1536.0));
  float scale=1.0-0.965*blink;
  vec2 q=vec2(p.x,370.5+dy/scale);
  vec4 folded=glass;
  if(abs(dy/scale)<40.0)folded=texture2D(art,q/vec2(1024.0,1536.0));
  return mix(original,folded,region*smoothstep(0.0,0.25,blink));
 }
 void main(){
  vec2 p=uv*vec2(1024.0,1536.0),anchor=vec2(512.0,1460.0);
  float angle=sway*0.0055*sin(time*1.0471975512);
  vec2 shift=sway*vec2(1.8*sin(time*1.0471975512),0.6*sin(time*2.0943951024));
  vec2 q=p-anchor-shift;float c=cos(angle),s=sin(angle);
  p=vec2(c*q.x+s*q.y,-s*q.x+c*q.y)+anchor;
  vec2 sampleUV=p/vec2(1024.0,1536.0);
  if(min(sampleUV.x,sampleUV.y)<0.0||max(sampleUV.x,sampleUV.y)>1.0){gl_FragColor=vec4(0.0);return;}
  vec4 color=texture2D(art,sampleUV);
  color=eye(p,430.0,color);color=eye(p,594.0,color);
  gl_FragColor=color;
 }`;
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);URL.revokeObjectURL(url);
 const uniforms=Object.fromEntries(['time','sway','blink'].map(k=>[k,gl.getUniformLocation(program,k)]));
 function renderAt(t,{body=true,eyes=true,strength=.65,blinkOverride=null}={}){
  if(!Number.isFinite(t)||!Number.isFinite(strength)||blinkOverride!==null&&!Number.isFinite(blinkOverride))throw Error('INVALID_MOTION_TIME_OR_AMOUNT');
  strength=Math.max(0,Math.min(1,strength));if(blinkOverride!==null)blinkOverride=Math.max(0,Math.min(1,blinkOverride));
  gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(uniforms.time,t);gl.uniform1f(uniforms.sway,body?strength:0);gl.uniform1f(uniforms.blink,blinkOverride===null?(eyes?blinkAt(t):0):blinkOverride);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
  return {time:t,sway:body?strength:0,blink:blinkOverride===null?(eyes?blinkAt(t):0):blinkOverride};
 }
 return {renderAt,sourceHash:digest,width:img.width,height:img.height};
}
