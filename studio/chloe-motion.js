/* CLO-02: one continuous original texture, moved through connected joints.
   No cutout masks, replacement face pixels, video, or animation dependencies. */
(function () {
  'use strict';
  if(window.ChloeMotion)return;

  var W = 1024, H = 1536, COLS = 128, ROWS = 192, DEG = Math.PI / 180;
  var players = new Set(), meshes = {}, mounts = new WeakMap();
  var started = false;
  var frame = 0, observer, resizeObserver, boundsDirty = true;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var pointer = { x: 0, y: 0, active: false, revision: 0 };
  var BLINK_COMPRESSION = .90;
  var IDENTITY = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  // Source-space measurements of the three approved originals.
  var poses = {
    thumbs: {
      head: [512, 658], hip: [512, 1015], phase: 0,
      contour: [[0,560],[220,565],[260,605],[330,636],[408,652],[512,660],[622,652],[700,634],[762,606],[795,565],[1024,560]],
      eyes: [[383.5,466,70,67,103,75],[646.5,466,70,67,103,75]],
      arms: [
        { shoulder:[315,746], elbow:[194,868], wrist:[182,811], hand:[184,700],
          region:[[158,567],[214,567],[218,644],[277,649],[292,680],[329,675],[360,698],[382,746],[371,808],[333,853],[296,872],[261,910],[197,921],[120,903],[80,855],[76,781],[96,705],[137,654]],
          lower:[77,744,293,922], palm:[103,566,276,831] },
        { shoulder:[731,781], elbow:[767,878], wrist:[813,992], hand:[839,1074],
          region:[[684,691],[745,691],[789,730],[815,787],[803,848],[855,868],[890,934],[900,981],[922,1055],[915,1135],[873,1164],[815,1159],[771,1118],[752,1076],[756,1010],[727,980],[705,938],[685,889],[673,845],[664,790],[673,733]],
          lower:[704,845,891,1007], palm:[754,978,921,1164] }
      ]
    },
    compare: {
      head:[512,686], hip:[512,990], phase:2.6,
      contour:[[0,610],[244,614],[293,652],[397,679],[512,689],[639,678],[741,651],[779,614],[1024,610]],
      eyes:[[397,519.5,64,60,96,67],[633.5,519.5,64,60,96,67]],
      arms:[
        { shoulder:[326,746], elbow:[298,815], wrist:[198,805], hand:[124,785],
          region:[[24,717],[172,717],[207,738],[221,756],[278,765],[283,716],[311,692],[347,694],[378,717],[384,755],[379,802],[357,830],[304,845],[275,866],[225,870],[181,853],[106,865],[80,817],[74,781],[24,775]],
          lower:[188,754,303,870], palm:[25,721,217,861] },
        { shoulder:[698,746], elbow:[726,815], wrist:[826,805], hand:[900,785],
          region:[[1000,717],[852,717],[817,738],[803,756],[746,765],[741,716],[713,692],[677,694],[646,717],[640,755],[645,802],[667,830],[720,845],[749,866],[799,870],[843,853],[918,865],[944,817],[950,781],[1000,775]],
          lower:[721,754,836,870], palm:[807,721,999,861] }
      ]
    },
    consultation: {
      head:[494,671], hip:[496,1019], phase:5.1,
      contour:[[0,546],[145,550],[194,581],[242,613],[303,643],[393,664],[494,674],[597,660],[671,638],[724,604],[752,548],[868,546],[1024,540]],
      eyes:[[369.5,491,68,65,101,70],[621,491,68,65,101,70]],
      arms:[
        { shoulder:[295,754], elbow:[215,860], wrist:[159,780], hand:[135,670],
          region:[[8,640],[26,618],[51,630],[38,604],[48,581],[69,578],[85,594],[81,568],[96,551],[114,551],[136,590],[148,570],[170,551],[187,567],[185,601],[179,635],[218,615],[243,618],[256,640],[241,663],[218,698],[212,728],[239,750],[253,715],[282,692],[316,690],[347,715],[365,758],[350,817],[316,846],[285,858],[249,886],[206,899],[153,885],[118,850],[103,808],[103,768],[73,737],[55,700],[16,673]],
          lower:[99,746,285,899], palm:[7,549,257,790] },
        { shoulder:[686,771], elbow:[746,896], wrist:[813,862], hand:[820,700],
          region:[[761,543],[889,542],[916,558],[920,633],[944,645],[955,672],[947,697],[954,718],[949,743],[950,775],[939,801],[912,826],[870,847],[865,878],[837,919],[794,941],[748,949],[706,934],[683,901],[683,861],[668,837],[649,787],[650,738],[666,713],[696,717],[710,731],[710,699],[719,673],[739,665],[749,682],[748,568]],
          lower:[681,812,865,948], palm:[706,541,958,849], phone:true }
      ]
    }
  };

  var limbRegions = {
    thumbs: [
      {"palmRegion":[[146,566],[214,566],[216,642],[249,648],[271,663],[276,697],[271,714],[276,737],[272,759],[276,785],[264,811],[228,832],[140,831],[112,816],[101,778],[111,731],[133,677],[149,642]],"lowerRegion":[[96,726],[109,711],[128,714],[128,782],[153,815],[211,821],[246,800],[254,781],[276,803],[292,831],[288,858],[269,885],[222,909],[173,915],[131,903],[101,877],[84,838],[79,793],[84,755]],"jointFade":[-16,28]},
      {"palmRegion":[[795,982],[828,981],[854,990],[872,1008],[894,1015],[909,1032],[913,1062],[906,1089],[895,1112],[877,1137],[860,1154],[844,1158],[830,1148],[817,1145],[802,1132],[792,1118],[792,1099],[780,1091],[768,1097],[756,1087],[755,1065],[764,1037],[766,1012],[777,991]],"lowerRegion":[[718,852],[752,843],[782,852],[806,866],[841,879],[868,909],[889,947],[892,974],[868,994],[834,1006],[800,1005],[774,995],[746,979],[727,950],[715,918],[705,884]],"jointFade":[-14,26]}
    ],
    compare: [
      {"palmRegion":[[22,718],[168,718],[195,729],[219,760],[221,813],[194,842],[163,861],[91,861],[80,786],[22,767]],"lowerRegion":[[215,755],[249,755],[282,768],[298,797],[304,827],[294,853],[269,867],[233,868],[204,855],[187,842],[187,813],[198,786]],"jointFade":[-16,28]},
      {"palmRegion":[[1002,718],[856,718],[829,729],[805,760],[803,813],[830,842],[861,861],[933,861],[944,786],[1002,767]],"lowerRegion":[[809,755],[775,755],[742,768],[726,797],[720,827],[730,853],[755,867],[791,868],[820,855],[837,842],[837,813],[826,786]],"jointFade":[-16,28]}
    ],
    consultation: [
      {"palmRegion":[[8,644],[5,630],[23,620],[34,614],[49,626],[64,641],[41,608],[35,589],[50,580],[65,572],[79,586],[98,611],[84,581],[78,561],[94,552],[112,546],[126,568],[140,607],[148,574],[150,551],[170,556],[190,557],[186,581],[179,633],[211,618],[232,606],[245,621],[258,636],[244,652],[218,687],[211,736],[202,770],[169,783],[135,784],[93,769],[76,739],[56,699],[17,670],[6,660]],"lowerRegion":[[104,747],[131,756],[155,775],[186,779],[211,762],[235,748],[258,772],[280,810],[285,849],[272,872],[244,890],[213,901],[174,892],[141,878],[119,852],[107,817],[101,783]],"jointFade":[-16,28]},
      {"palmRegion":[[776,543],[887,543],[907,549],[919,570],[917,634],[936,641],[949,652],[954,672],[946,689],[953,710],[948,729],[953,746],[948,768],[944,791],[932,810],[908,821],[887,833],[876,845],[812,851],[778,844],[755,832],[747,811],[744,766],[731,772],[718,765],[709,749],[707,727],[714,698],[721,678],[738,668],[750,680],[749,568]],"lowerRegion":[[737,813],[759,831],[780,848],[813,853],[850,843],[868,863],[865,885],[850,908],[826,929],[797,942],[763,949],[732,945],[705,930],[687,910],[680,882],[685,857],[700,836],[720,819]],"jointFade":[-16,28]}
    ]
  };
  Object.keys(poses).forEach(function(name) {
    poses[name].arms.forEach(function(arm,index) { Object.assign(arm,limbRegions[name][index]); });
  });
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, v) { var t = clamp((v-a)/(b-a),0,1); return t*t*(3-2*t); }
  function ease(t) { return .5-.5*Math.cos(Math.PI*clamp(t,0,1)); }
  function settle(t) { t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10); }
  function contourY(points, x) {
    for (var i=1;i<points.length;i++) if(x<=points[i][0]) {
      var a=points[i-1],b=points[i];
      return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
    }
    return points[points.length-1][1];
  }
  function regionWeight(points, x, y, feather) {
    var inside=false, distance=Infinity;
    for(var i=0,j=points.length-1;i<points.length;j=i++) {
      var a=points[j],b=points[i],vx=b[0]-a[0],vy=b[1]-a[1];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
      var u=clamp(((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy || 1),0,1);
      distance=Math.min(distance,Math.hypot(x-a[0]-u*vx,y-a[1]-u*vy));
    }
    // The blend lies just outside the limb; painted edges stay together.
    return inside ? 1 : 1-smooth(0,feather,distance);
  }

  // The lash band follows the original eye without pulling the eyebrow.
  function eyeWeight(eye,x,y) {
    var dx=x-eye[0],dy=y-eye[1],d=Math.hypot(dx,dy);
    if(d<.0001)return 1;
    var ux=dx/d,uy=dy/d;
    var inner=1/Math.sqrt(ux*ux/(eye[2]*eye[2])+uy*uy/(eye[3]*eye[3]));
    var outer=1/Math.sqrt(ux*ux/(eye[4]*eye[4])+uy*uy/(eye[5]*eye[5]));
    var original=1-smooth(inner,outer,d);
    var topZero,topFull;
    if(eye[1]===466) {topZero=384;topFull=392;}
    else if(eye[1]===519.5) {topZero=448;topFull=456;}
    else if(eye[1]===491) {topZero=408;topFull=424;}
    else return original;
    // u is negative on the lash side of either eye. Keep the extension away
    // from the inner eye / smile. Feather only through the dark surrounding face.
    var u=dx*(eye[0]<512?1:-1),rx=eye[2];
    var horizontal=smooth(-rx-40,-rx-22,u)*(1-smooth(-rx+26,-rx+50,u));
    var upper=smooth(topZero,topFull,y);
    var lower=1-smooth(eye[1],eye[1]+eye[5]*.7,y);
    return Math.max(original,horizontal*upper*lower);
  }

  // The studio adds a small, front-facing leg rig to the approved thumbs pose.
  // It foreshortens the visible legs; it does not invent side/back artwork.
  var studioLegs = [
    {hip:[395,1032],knee:[360,1167],ankle:[345,1346],side:-1},
    {hip:[628,1032],knee:[670,1171],ankle:[676,1346],side:1}
  ];
  var STRIDE=18;
  function meshFor(name, face, studio) {
    var key=name+(face?'-face':'')+(studio?'-studio':'');
    if(meshes[key]) return meshes[key];
    var stride=studio?STRIDE:12;
    var pose=poses[name],vertices=new Float32Array((COLS+1)*(ROWS+1)*stride),indices=new Uint16Array(COLS*ROWS*6),n=0,k=0;
    for(var row=0;row<=ROWS;row++) for(var col=0;col<=COLS;col++) {
      var x=col*W/COLS,y=row*H/ROWS;
      var head=face ? 1 : 1-smooth(contourY(pose.contour,x),contourY(pose.contour,x)+48,y);
      var left=face?0:regionWeight(pose.arms[0].region,x,y,72);
      var right=face?0:regionWeight(pose.arms[1].region,x,y,72);
      // Share the close head/hand contact smoothly; sharp weight changes can
      // fold a continuous surface even though there are no cutout edges.
      var headBlock=Math.max(left,right);
      head*=1-headBlock;
      var sum=head+left+right;
      if(sum>1) {head/=sum;left/=sum;right/=sum;}
      var body=face?0:1-smooth(1030,1336,y);
      var limbs=[];
      pose.arms.forEach(function(arm) {
        var hand=regionWeight(arm.palmRegion,x,y,48);
        var vx=arm.wrist[0]-arm.elbow[0],vy=arm.wrist[1]-arm.elbow[1],len=Math.hypot(vx,vy);
        var along=((x-arm.elbow[0])*vx+(y-arm.elbow[1])*vy)/len;
        var lower=Math.max(hand,regionWeight(arm.lowerRegion,x,y,48)*smooth(arm.jointFade[0],arm.jointFade[1],along));
        // At the elbow/wrist, share the rotation through the black joint.
        var wristDistance=Math.hypot(x-arm.wrist[0],y-arm.wrist[1]);
        hand*=smooth(0,38,wristDistance);
        limbs.push(lower,hand);
      });
      var e0=eyeWeight(pose.eyes[0],x,y),e1=eyeWeight(pose.eyes[1],x,y);
      var legs=[0,0,0,0,0,0];
      if(studio && !face && name==='thumbs') {
        var lowerBody=smooth(965,1050,y),split=smooth(460,565,x);
        // Stop the leg influence below the free hand, which overlaps in height.
        var handGuard=1-smooth(694,752,x)*(1-smooth(1135,1215,y));
        legs=[lowerBody*(1-split)*(1-left),lowerBody*split*handGuard*(1-right),
          smooth(1116,1212,y),smooth(1304,1368,y),smooth(1120,1216,y),smooth(1304,1368,y)];
      }
      var values=[x,y,head,left,right,body,limbs[0],limbs[1],limbs[2],limbs[3],Math.max(e0,e1),e0>e1?pose.eyes[0][1]:pose.eyes[1][1]];
      vertices.set(studio?values.concat(legs):values,n);
      n+=stride;
      if(row<ROWS && col<COLS) {
        var a=row*(COLS+1)+col,b=a+1,c=a+COLS+1,d=c+1;
        indices.set([a,c,b,b,c,d],k);k+=6;
      }
    }
    return meshes[key]={vertices:vertices,indices:indices,stride:stride};
  }

  var vertexSource = [
    'attribute vec2 a_position;',
    'attribute vec4 a_weights;',
    'attribute vec4 a_limbs;',
    'attribute vec2 a_eye;',
    'attribute vec2 a_legWeights;',
    'attribute vec4 a_legJoints;',
    'uniform mat3 u_body,u_head,u_left,u_leftLower,u_leftHand,u_right,u_rightLower,u_rightHand;',
    'uniform mat3 u_legLeft,u_legLeftLower,u_legLeftFoot,u_legRight,u_legRightLower,u_legRightFoot;',
    'uniform vec4 u_view;',
    'uniform float u_blink,u_legAmount;',
    'varying vec2 v_uv;',
    'void main(){',
    ' v_uv=a_position/vec2(1024.0,1536.0);',
    ' vec2 q=a_position;',
    ' q.y+=(a_eye.y-q.y)*('+BLINK_COMPRESSION.toFixed(2)+'*u_blink*a_eye.x);',
    ' vec3 p=vec3(q,1.0);',
    ' vec2 left=mix((u_left*p).xy,(u_leftLower*p).xy,a_limbs.x);',
    ' left=mix(left,(u_leftHand*p).xy,a_limbs.y);',
    ' vec2 right=mix((u_right*p).xy,(u_rightLower*p).xy,a_limbs.z);',
    ' right=mix(right,(u_rightHand*p).xy,a_limbs.w);',
    ' vec2 skinned=q*(1.0-a_weights.x-a_weights.y-a_weights.z)+(u_head*p).xy*a_weights.x+left*a_weights.y+right*a_weights.z;',
    ' skinned=mix(skinned,(u_body*vec3(skinned,1.0)).xy,a_weights.w);',
    ' vec2 legLeft=mix((u_legLeft*p).xy,(u_legLeftLower*p).xy,a_legJoints.x);',
    ' legLeft=mix(legLeft,(u_legLeftFoot*p).xy,a_legJoints.y);',
    ' vec2 legRight=mix((u_legRight*p).xy,(u_legRightLower*p).xy,a_legJoints.z);',
    ' legRight=mix(legRight,(u_legRightFoot*p).xy,a_legJoints.w);',
    ' vec2 legWeight=a_legWeights*u_legAmount;',
    ' skinned=skinned*(1.0-legWeight.x-legWeight.y)+legLeft*legWeight.x+legRight*legWeight.y;',
    ' vec2 clip=(skinned-u_view.xy)/u_view.zw;',
    ' gl_Position=vec4(clip.x*2.0-1.0,1.0-clip.y*2.0,0.0,1.0);',
    '}'
  ].join('\n');
  var fragmentSource = [
    'precision mediump float;',
    'uniform sampler2D u_art;',
    'uniform float u_face;',
    'varying vec2 v_uv;',
    'void main(){',
    ' vec4 color=texture2D(u_art,v_uv);',
    ' float headOnly=1.0-smoothstep(694.0,705.0,v_uv.y*1536.0);',
    ' gl_FragColor=color*mix(1.0,headOnly,u_face);',
    '}'
  ].join('\n');

  function matrix(pivot,angle,dx,dy,sx,sy) {
    var c=Math.cos(angle*DEG),s=Math.sin(angle*DEG),x=pivot[0],y=pivot[1];
    sx=sx==null?1:sx;sy=sy==null?1:sy;
    var a=c*sx,b=s*sx,d=-s*sy,e=c*sy;
    return new Float32Array([a,b,0,d,e,0,x-a*x-d*y+(dx||0),y-b*x-e*y+(dy||0),1]);
  }
  function multiply(a,b) {
    var result=new Float32Array(9);
    for(var col=0;col<3;col++) for(var row=0;row<3;row++) {
      result[col*3+row]=a[row]*b[col*3]+a[3+row]*b[col*3+1]+a[6+row]*b[col*3+2];
    }
    return result;
  }
  // A cue is sampled from absolute time, so studio seeking and every display
  // cadence produce the same pose. Variation changes timing, never the artwork.
  var ELBOW_LAG=.13, WRIST_LAG=.27;
  function variation(seed) {
    var value=Math.imul((seed|0)^0x45d9f3b,0x45d9f3b);
    value=Math.imul(value^(value>>>16),0x45d9f3b);
    return ((value^(value>>>16))>>>0)/4294967296;
  }
  function envelope(age,start,rise,hold,release) {
    var d=age-start;
    if(d<=0||d>=rise+hold+release)return 0;
    if(d<rise)return settle(d/rise);
    if(d<rise+hold)return 1;
    return 1-settle((d-rise-hold)/release);
  }
  function activityAt(time,phase) {
    if(time<0)return {roll:0,gesture:0,second:0,nod:0,wave:0,intent:'idle'};
    var welcome=envelope(time,.35,.9,.85,2.2);
    var welcomeHand=envelope(time,.63,.85,.8,1.9);
    var local=time-6.5,block=Math.floor(local/14.6),seed=block*19+Math.round(phase*31)+107;
    var age=local-block*14.6-(1.1+variation(seed)*3.2);
    var hold=.65+variation(seed+2)*1.45,release=1.65+variation(seed+3)*.8;
    var orient=local<0?0:envelope(age,0,.9,hold+.4,release+.35);
    var hand=local<0?0:envelope(age,.3,.85,hold,release);
    var direction=variation(seed+4)>.5?1:-1;
    var strength=.34+variation(seed+5)*.3;
    var guide=variation(seed+6)>.62;
    var settleBack=local<0?0:envelope(age,1.4+hold+release,.3,0,.75);
    var wave=local<0?0:Math.sin((age-1)*Math.PI*2/1.15)*envelope(age,1,.3,.4,.75);
    return {
      roll:2.15*welcome+direction*((1.25+variation(seed+7)*1.05)*orient-.13*settleBack),
      gesture:.7*welcomeHand+(guide?.2:strength)*hand,
      second:guide?strength*hand:0,
      nod:.26*envelope(time,1.05,.24,.05,.6)+.2*envelope(age,1.15,.26,0,.62)*(local>=0?1:0),
      wave:wave*.45+Math.sin((time-1.05)*Math.PI*2/1.2)*envelope(time,1.05,.3,.4,.75),
      intent:welcome>.001?'welcome':orient>.001?(hand>.1?'guide':'notice'):settleBack>.001?'settle':'idle'
    };
  }
  function responsePulse(age,delay) { return envelope(age,delay||0,.28,.12,1.15); }
  function blinkAt(t,start,width) {
    var d=(t-start)/(width||1);
    if(d<0||d>.24)return 0;
    if(d<.065)return settle(d/.065);
    if(d<.085)return 1;
    return 1-settle((d-.085)/.155);
  }
  function blinking(t,phase,responseAt) {
    var block=Math.floor(t/6.7),seed=Math.round(phase*79)+23,value=0,allowResponse=true;
    for(var i=block-1;i<=block+1;i++) {
      var at=i*6.7+1.25+variation(i*11+seed)*3.5;
      var width=.9+variation(i*11+seed+1)*.2;
      value=Math.max(value,blinkAt(t,at,width));
      if(Math.abs(at-responseAt)<.6)allowResponse=false;
      if(variation(i*11+seed+2)>.84) {
        value=Math.max(value,blinkAt(t,at+.34,width*.9));
        if(Math.abs(at+.34-responseAt)<.6)allowResponse=false;
      }
    }
    return allowResponse?Math.max(value,blinkAt(t,responseAt)):value;
  }
  // Exact critically damped response for a constant target during this frame.
  // Keeping velocity lets attention turn and settle without a sudden stop.
  function damp(value,velocity,target,frequency,delta) {
    var offset=value-target,coefficient=velocity+frequency*offset,decay=Math.exp(-frequency*delta);
    var position=target+(offset+coefficient*delta)*decay;
    var speed=(velocity-frequency*coefficient*delta)*decay;
    if(position<-1||position>1) {position=clamp(position,-1,1);speed=0;}
    return [position,speed];
  }
  function updateAttention(player,delta) {
    if(!(delta>0)||!Number.isFinite(delta))return;
    if(player.pointerRevision!==pointer.revision) {
      player.pointerRevision=pointer.revision;player.attentionAt=player.time;
    }
    var targetX=0,targetY=0,rect=player.bounds;
    if(player.lookAtPointer!==false&&pointer.active&&rect) {
      var fresh=1-smooth(2.2,4.8,player.time-player.attentionAt);
      var headX=rect.left+rect.width*.5,headY=rect.top+rect.height*(player.face?.5:.29);
      var x=clamp((pointer.x-headX)/Math.max(180,rect.width*1.1),-1,1);
      var y=clamp((pointer.y-headY)/Math.max(180,rect.height*.65),-1,1);
      targetX=x*smooth(.025,.13,Math.abs(x))*fresh;
      targetY=y*smooth(.025,.13,Math.abs(y))*fresh;
    }
    var previousX=player.lookX;
    var xState=damp(player.lookX,player.lookVX||0,targetX,8.5,delta);
    var yState=damp(player.lookY,player.lookVY||0,targetY,7.2,delta);
    player.lookX=xState[0];player.lookVX=xState[1];
    player.lookY=yState[0];player.lookVY=yState[1];
    var bodyState=damp(player.bodyLookX||0,player.bodyLookVX||0,(previousX+player.lookX)*.5,4.8,delta);
    player.bodyLookX=bodyState[0];player.bodyLookVX=bodyState[1];
  }
  function movement(player) {
    var t=player.time,pose=player.pose,life=Number.isFinite(player.lifeTime)?player.lifeTime:t;
    var lifeArrival=settle(life/1.6),arrival=player.mode==='idle'?lifeArrival:settle(t/1.6);
    var cueTime=player.mode==='idle'?life:player.mode==='explain'?t+8.2:t;
    var cue=activityAt(cueTime,pose.phase),bodyCue=activityAt(cueTime-.18,pose.phase);
    var elbowCue=activityAt(cueTime-ELBOW_LAG,pose.phase),wristCue=activityAt(cueTime-WRIST_LAG,pose.phase);
    var quiet=player.mode==='idle';
    var responseAge=typeof player.responseAt==='number'?t-player.responseAt:Infinity;
    var response=responsePulse(responseAge),hello=player.responseKind==='greet';
    var responding=responseAge>=0&&responseAge<1.9;
    var responseSign=(player.responseCount||0)%2?1:-1;
    var roll=(quiet?cue.roll*.22:cue.roll)*arrival+(player.lookX||0)*.9;
    roll=clamp(roll*(1-response*.55)+responseSign*response*(hello?.4:.26),-3.6,3.6);
    var nod=(quiet?0:cue.nod)*arrival+response*(hello?.66:.4);
    // A shorter inhale and a longer exhale, with a slowly varying phase.
    var breathPhase=(life/5.35+.035*Math.sin(life*.31))%1;
    var breathe=breathPhase<.39?settle(breathPhase/.39):1-settle((breathPhase-.39)/.61);
    var gesture=(quiet?0:cue.gesture)*arrival;
    var elbow=(quiet?0:elbowCue.gesture)*arrival,wrist=(quiet?0:wristCue.gesture)*arrival;
    var second=(quiet?0:cue.second)*arrival,secondElbow=(quiet?0:elbowCue.second)*arrival,secondWrist=(quiet?0:wristCue.second)*arrival;
    var beat=hello?.68:.16;
    gesture+=(Math.max(gesture,beat)-gesture)*responsePulse(responseAge,.12);
    elbow+=(Math.max(elbow,beat)-elbow)*responsePulse(responseAge,.12+ELBOW_LAG);
    wrist+=(Math.max(wrist,beat)-wrist)*responsePulse(responseAge,.12+WRIST_LAG);
    var waveEnvelope=envelope(responseAge,.48,.24,.25,.6);
    var responseWave=hello&&waveEnvelope>0?Math.sin((responseAge-.48)*Math.PI*2/1.1)*waveEnvelope:0;
    var wave=(quiet?0:wristCue.wave)*arrival+responseWave*.55;
    var responseBlink=!player.independentEyes&&(hello||(player.responseCount||0)%3===1)?life-responseAge+.16:Infinity;
    var blink=blinking(life,pose.phase+(player.face?.4:0),responseBlink);
    var drift=(.18*Math.sin(life*.37)+.08*Math.sin(life*.71))*lifeArrival;
    var bodyAngle=drift-(quiet?bodyCue.roll*.06:bodyCue.roll*.18)*arrival+(player.bodyLookX||0)*.14;
    var body=matrix(pose.hip,bodyAngle,(2.5*Math.sin(life*.23)+1.1*Math.sin(life*.51))*lifeArrival,-3.1*breathe,1,1+.0009*breathe);
    var head=matrix(player.face?[512,470]:pose.head,roll,(player.lookX||0)*3.4,nod*5.5+(player.lookY||0)*2.6,1-Math.abs(roll)*.0015,1-nod*.01);
    var leftAngles,rightAngles;
    if(player.name==='thumbs') {
      leftAngles=[2.6*gesture,6.4*elbow,3.1*wrist+1.4*wave];
      rightAngles=[-1.9*second+.18*Math.sin(life*.65)*lifeArrival,-3.5*secondElbow,2*secondWrist];
    } else if(player.name==='compare') {
      leftAngles=[3.6*gesture,7.2*elbow,-3*wrist];
      rightAngles=[-3.6*second,-7.2*secondElbow,3*secondWrist];
    } else {
      leftAngles=[1.8*gesture,3.5*elbow,5.4*wave];
      rightAngles=[-.6*second,-.9*secondElbow,0];
    }
    function armMatrices(arm,angles) {
      var upper=matrix(arm.shoulder,angles[0]),lower=multiply(upper,matrix(arm.elbow,angles[1]*.4));
      return [upper,lower,multiply(lower,matrix(arm.wrist,angles[2]*.4))];
    }
    if(player.face) {
      body=IDENTITY;
      head=matrix([512,470],roll,(player.lookX||0)*4.5,-1.8*breathe+nod*4.5+(player.lookY||0)*2.2,1-Math.abs(roll)*.002,1-nod*.009);
    }
    return {body:body,head:head,left:armMatrices(pose.arms[0],leftAngles),right:armMatrices(pose.arms[1],rightAngles),blink:blink,
      roll:roll,gesture:gesture,intent:responding?(hello?'greet':'acknowledge'):(quiet?'idle':cue.intent)};
  }

  function shader(gl,type,source) {
    var result=gl.createShader(type);
    gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)) {gl.deleteShader(result);throw new Error('Character shader unavailable');}
    return result;
  }
  function renderer(canvas,image,name,face,options) {
    options=options||{};
    var gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl) throw new Error('Character animation unavailable');
    var program=gl.createProgram(),vs=shader(gl,gl.VERTEX_SHADER,vertexSource),fs=shader(gl,gl.FRAGMENT_SHADER,fragmentSource);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Character animation unavailable');
    gl.useProgram(program);
    var mesh=meshFor(name,face,options.studio===true),buffer=gl.createBuffer(),index=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
    var attributes=[['a_position',2,0],['a_weights',4,2],['a_limbs',4,6],['a_eye',2,10]];
    if(options.studio)attributes.push(['a_legWeights',2,12],['a_legJoints',4,14]);
    else {
      var legWeightLocation=gl.getAttribLocation(program,'a_legWeights'),legJointLocation=gl.getAttribLocation(program,'a_legJoints');
      gl.disableVertexAttribArray(legWeightLocation);gl.vertexAttrib2f(legWeightLocation,0,0);
      gl.disableVertexAttribArray(legJointLocation);gl.vertexAttrib4f(legJointLocation,0,0,0,0);
    }
    attributes.forEach(function(a) {
      var location=gl.getAttribLocation(program,a[0]);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,a[1],gl.FLOAT,false,mesh.stride*4,a[2]*4);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
    var texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    var uniforms={};
    ['body','head','left','leftLower','leftHand','right','rightLower','rightHand','legLeft','legLeftLower','legLeftFoot','legRight','legRightLower','legRightFoot','legAmount','blink','view','face','art'].forEach(function(key){uniforms[key]=gl.getUniformLocation(program,'u_'+key);});
    gl.uniform1i(uniforms.art,0);gl.uniform1f(uniforms.face,face?1:0);
    gl.uniform4fv(uniforms.view,face?[80,86,864,676]:[0,0,W,H]);
    function resize() {
      var rect=options.fixedSize?options.fixedSize:canvas.getBoundingClientRect(),ratio=options.fixedSize?1:Math.min(window.devicePixelRatio||1,2);
      var width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
      if(canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
    }
    function draw(state) {
      gl.uniformMatrix3fv(uniforms.body,false,state.body);gl.uniformMatrix3fv(uniforms.head,false,state.head);
      gl.uniformMatrix3fv(uniforms.left,false,state.left[0]);gl.uniformMatrix3fv(uniforms.leftLower,false,state.left[1]);gl.uniformMatrix3fv(uniforms.leftHand,false,state.left[2]);
      gl.uniformMatrix3fv(uniforms.right,false,state.right[0]);gl.uniformMatrix3fv(uniforms.rightLower,false,state.right[1]);gl.uniformMatrix3fv(uniforms.rightHand,false,state.right[2]);
      if(options.studio) {
        var legs=state.legs||stillLegs;
        gl.uniformMatrix3fv(uniforms.legLeft,false,legs[0][0]);gl.uniformMatrix3fv(uniforms.legLeftLower,false,legs[0][1]);gl.uniformMatrix3fv(uniforms.legLeftFoot,false,legs[0][2]);
        gl.uniformMatrix3fv(uniforms.legRight,false,legs[1][0]);gl.uniformMatrix3fv(uniforms.legRightLower,false,legs[1][1]);gl.uniformMatrix3fv(uniforms.legRightFoot,false,legs[1][2]);
        gl.uniform1f(uniforms.legAmount,state.legAmount||0);
      }
      gl.uniform1f(uniforms.blink,state.blink);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
    }
    function dispose() {gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteBuffer(index);gl.deleteProgram(program);}
    return {resize:resize,draw:draw,dispose:dispose};
  }

  var stillLegs=[[IDENTITY,IDENTITY,IDENTITY],[IDENTITY,IDENTITY,IDENTITY]];
  var neutral={body:IDENTITY,head:IDENTITY,left:[IDENTITY,IDENTITY,IDENTITY],right:[IDENTITY,IDENTITY,IDENTITY],blink:0};
  function visible(element) {
    var r=element.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<window.innerHeight&&r.left<window.innerWidth;
  }
  function tick(now) {
    frame=0;
    var active=false;
    if(boundsDirty) {
      players.forEach(function(player){if(player.visible)player.bounds=player.canvas.getBoundingClientRect();});
      boundsDirty=false;
    }
    players.forEach(function(player) {
      if(!player.canvas.isConnected) {player.rollback();return;}
      if(document.hidden||reduced.matches||!player.visible||player.paused) {player.last=0;return;}
      active=true;
      var delta=player.last?(now-player.last)/1000:0;
      // A stalled/background frame must not teleport the actor. Normal low
      // frame rates still advance in real time instead of slowing the acting.
      if(delta>.2)delta=1/30;
      player.time+=delta;
      player.last=now;
      try {
        updateAttention(player,delta);
        var state=movement(player);
        player.render.draw(state);
        if(player.canvas.dataset.motionIntent!==state.intent)player.canvas.dataset.motionIntent=state.intent;
      } catch(error) {player.rollback();}
    });
    if(active) requestFrame();
  }
  function requestFrame() {if(!frame&&!document.hidden&&!reduced.matches) frame=requestAnimationFrame(tick);}
  function sync(player) {
    player.last=0;
    if(player.visible) {player.render.resize();player.bounds=player.canvas.getBoundingClientRect();}
    player.canvas.dataset.motionState=reduced.matches?'reduced':(document.hidden||!player.visible||player.paused?'paused':'playing');
    if(reduced.matches) {
      player.time=0;player.responseAt=-Infinity;player.responseKind='';player.lookX=player.lookY=player.bodyLookX=0;
      player.lookVX=player.lookVY=player.bodyLookVX=0;
      player.attentionAt=-Infinity;player.pointerRevision=pointer.revision;
      player.render.draw(neutral);
    }
    else if(player.visible&&!document.hidden&&!player.paused) requestFrame();
  }
  function syncAll() {players.forEach(sync);}
  function respond(player,kind) {
    if(reduced.matches||document.hidden||player.paused||!player.visible||player.time-player.responseAt<2.1)return false;
    player.responseAt=player.time;player.responseKind=kind;
    player.responseCount+=1;
    player.canvas.dataset.motionResponse=kind;
    requestFrame();return true;
  }
  function attach(image,original,name,face,options,owner) {
    options=options||{};
    var canvas=document.createElement('canvas'),restored=false;
    canvas.className=(original.getAttribute('class')||'')+' clo02-motion'+(face?' clo02-motion--face':'');
    canvas.dataset.clo02Pose=name;canvas.dataset.motionVersion='natural-v5';
    canvas.dataset.motionParts=face?'head,eyes':'head,shoulders,torso,arms,wrists,eyes';
    canvas.width=face?184:640;canvas.height=face?144:960;
    ['id','style','aria-describedby'].forEach(function(key){if(original.hasAttribute(key))canvas.setAttribute(key,original.getAttribute(key));});
    if(face) canvas.setAttribute('aria-hidden','true');
    else {
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',original.alt||'착한거래 AI 상담사 클로이');
    }
    var render;
    try {render=renderer(canvas,image,name,face);} catch(error) {return null;}
    var player={canvas:canvas,pose:poses[name],name:name,face:face,render:render,time:0,last:0,visible:false,lookX:0,lookY:0,bodyLookX:0,lookVX:0,lookVY:0,bodyLookVX:0,
      lookAtPointer:options.lookAtPointer!==false,paused:options.autoplay===false,responseAt:-Infinity,responseKind:'',responseCount:0,
      pointerRevision:pointer.revision,attentionAt:0,bounds:null};
    function rollback() {
      if(restored)return;restored=true;players.delete(player);
      if(observer)observer.unobserve(canvas);if(resizeObserver)resizeObserver.unobserve(canvas);
      if(canvas.isConnected)canvas.replaceWith(original);
      mounts.delete(owner);mounts.delete(original);mounts.delete(canvas);
      render.dispose();
    }
    player.rollback=rollback;
    canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();rollback();},{once:true});
    original.replaceWith(canvas);
    render.resize();render.draw(neutral);
    player.visible=visible(canvas);players.add(player);
    if(observer)observer.observe(canvas);if(resizeObserver)resizeObserver.observe(canvas);
    sync(player);
    var controller={
      element:canvas,
      play:function(){if(restored)return;player.paused=false;sync(player);},
      pause:function(){if(restored)return;player.paused=true;sync(player);},
      greet:function(){return !restored&&respond(player,'greet');},
      acknowledge:function(){return !restored&&respond(player,'acknowledge');},
      destroy:rollback
    };
    mounts.set(canvas,Promise.resolve(controller));
    return controller;
  }
  function loaded(image) {
    return new Promise(function(resolve,reject) {
      function success(){if(!image.naturalWidth){reject();return;} if(image.decode)image.decode().catch(function(){}).then(function(){resolve(image);});else resolve(image);}
      if(image.complete){if(image.naturalWidth)success();else reject();}
      else {image.addEventListener('load',success,{once:true});image.addEventListener('error',reject,{once:true});}
    });
  }
  function setup() {
    if(started)return;started=true;
    if('IntersectionObserver' in window) observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){players.forEach(function(player){if(player.canvas===entry.target){player.visible=entry.isIntersecting&&entry.intersectionRatio>0;sync(player);}});});
    },{threshold:[0,.01]});
    if('ResizeObserver' in window) resizeObserver=new ResizeObserver(function(entries){
      entries.forEach(function(entry){players.forEach(function(player){if(player.canvas===entry.target){player.render.resize();player.bounds=player.canvas.getBoundingClientRect();player.render.draw(reduced.matches?neutral:movement(player));}});});
    });
    function check(){players.forEach(function(player){player.render.resize();player.visible=visible(player.canvas);sync(player);});}
    window.addEventListener('resize',check,{passive:true});
    if(!observer)window.addEventListener('scroll',check,{passive:true});
    document.addEventListener('visibilitychange',function(){if(document.hidden)releaseAttention();syncAll();});
    if(reduced.addEventListener)reduced.addEventListener('change',syncAll);else reduced.addListener(syncAll);
    window.addEventListener('pointermove',function(event){
      if(!finePointer.matches||event.pointerType==='touch')return;
      if(pointer.active&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)<2)return;
      pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;pointer.revision+=1;
    },{passive:true});
    function releaseAttention(){pointer.active=false;pointer.revision+=1;}
    window.addEventListener('blur',releaseAttention);
    document.addEventListener('pointerleave',releaseAttention,{passive:true});
    window.addEventListener('scroll',function(){boundsDirty=true;},{passive:true,capture:true});
  }
  function mount(target,options) {
    options=options||{};
    if(typeof target==='string')target=document.querySelector(target);
    if(!target||!target.tagName)return Promise.resolve(null);
    if(mounts.has(target))return mounts.get(target);
    setup();
    var isImage=target.tagName.toLowerCase()==='img';
    var face=options.faceOnly===true||target.hasAttribute('data-chloe-face')||target.classList.contains('fab-face');
    var name=options.pose||target.getAttribute('data-chloe-pose')||(face?'compare':
      target.classList.contains('clo02-compare')?'compare':target.classList.contains('clo02-consultation')?'consultation':'thumbs');
    if(!Object.prototype.hasOwnProperty.call(poses,name))return Promise.resolve(null);
    var original=isImage?target:target.querySelector('svg,img');
    if(!original)return Promise.resolve(null);
    var image=isImage?target:new Image();
    if(!isImage) {
      var source=target.getAttribute('data-chloe-src')||target.getAttribute('data-clo02-src');
      if(!source)return Promise.resolve(null);
      image.src=source;
    }
    var promise=loaded(image).then(function(){
      if(!original.isConnected)return null;
      return attach(image,original,name,face,options,target);
    }).catch(function(){return null;});
    mounts.set(target,promise);
    promise.then(function(controller){if(!controller&&mounts.get(target)===promise)mounts.delete(target);});
    return promise;
  }
  function mountAll(root) {
    root=root||document;
    var elements=root.querySelectorAll('img.clo02-mascot,img[data-chloe-pose],.fab-face[data-clo02-src],[data-chloe-face][data-chloe-src]');
    return Promise.all(Array.prototype.map.call(elements,function(element){return mount(element);}));
  }

  var studioActions=Object.freeze(['idle','greet','explain','nod','walk','run']);
  function safeNumber(value,fallback,min,max) {
    value=Number(value);
    return Number.isFinite(value)?clamp(value,min,max):fallback;
  }
  function point(matrixValue,p) {
    return [matrixValue[0]*p[0]+matrixValue[3]*p[1]+matrixValue[6],matrixValue[1]*p[0]+matrixValue[4]*p[1]+matrixValue[7]];
  }
  // Map the two ends of a leg segment to their target joints while keeping its
  // width. Small length changes represent foreshortening in the front artwork.
  function segmentMatrix(a,b,nextA,nextB) {
    var x=b[0]-a[0],y=b[1]-a[1],length=Math.hypot(x,y),ux=x/length,uy=y/length;
    var tx=nextB[0]-nextA[0],ty=nextB[1]-nextA[1],targetLength=Math.hypot(tx,ty);
    var vx=tx/targetLength,vy=ty/targetLength,scale=targetLength/length;
    var aa=vx*scale*ux+vy*uy,bb=vy*scale*ux-vx*uy;
    var cc=vx*scale*uy-vy*ux,dd=vy*scale*uy+vx*ux;
    return new Float32Array([aa,bb,0,cc,dd,0,nextA[0]-aa*a[0]-cc*a[1],nextA[1]-bb*a[0]-dd*a[1],1]);
  }
  function studioArm(arm,angles) {
    var upper=matrix(arm.shoulder,angles[0]),lower=multiply(upper,matrix(arm.elbow,angles[1]*.4));
    return [upper,lower,multiply(lower,matrix(arm.wrist,angles[2]*.4))];
  }
  function mixMatrix(a,b,amount) {
    var result=new Float32Array(9);
    for(var i=0;i<9;i++)result[i]=a[i]+(b[i]-a[i])*amount;
    return result;
  }
  function copyPose(state) {
    return {
      body:new Float32Array(state.body),head:new Float32Array(state.head),
      left:state.left.map(function(m){return new Float32Array(m);}),
      right:state.right.map(function(m){return new Float32Array(m);}),
      legs:(state.legs||stillLegs).map(function(leg){return leg.map(function(m){return new Float32Array(m);});}),
      legAmount:state.legAmount||0,blink:state.blink,pose:state.pose,action:state.action
    };
  }
  function validPose(state,name) {
    if(!state||state.pose&&state.pose!==name||!Number.isFinite(state.blink))return false;
    function validMatrix(m){return m&&m.length===9&&Array.prototype.every.call(m,Number.isFinite);}
    return validMatrix(state.body)&&validMatrix(state.head)&&['left','right'].every(function(side){
      return Array.isArray(state[side])&&state[side].length===3&&state[side].every(validMatrix);
    })&&(!state.legs||(Array.isArray(state.legs)&&state.legs.length===2&&state.legs.every(function(leg){return Array.isArray(leg)&&leg.length===3&&leg.every(validMatrix);})))
      &&(state.legAmount==null||Number.isFinite(state.legAmount)&&state.legAmount>=0&&state.legAmount<=1);
  }
  function poseVelocity(previous,current,delta) {
    if(!previous||!Number.isFinite(delta)||delta<.0001||delta>.1)return null;
    function rate(a,b) {
      var out=new Float32Array(9);
      for(var i=0;i<9;i++)out[i]=(b[i]-a[i])/delta;
      return out;
    }
    var pl=previous.legs||stillLegs,cl=current.legs||stillLegs;
    return {
      body:rate(previous.body,current.body),head:rate(previous.head,current.head),
      left:previous.left.map(function(m,i){return rate(m,current.left[i]);}),
      right:previous.right.map(function(m,i){return rate(m,current.right[i]);}),
      legs:pl.map(function(leg,i){return leg.map(function(m,j){return rate(m,cl[i][j]);});}),
      legAmount:((current.legAmount||0)-(previous.legAmount||0))/delta,blink:0
    };
  }
  function validVelocity(velocity) {
    return !!velocity&&Array.isArray(velocity.legs)&&Number.isFinite(velocity.legAmount)&&validPose({
      body:velocity.body,head:velocity.head,left:velocity.left,right:velocity.right,legs:velocity.legs,legAmount:0,blink:0
    });
  }
  function inertiaTau(name,pose,velocity) {
    if(!validVelocity(velocity))return 0;
    var tau=.06,maximumSpeed=0;
    var matrices=[velocity.body,velocity.head].concat(velocity.left,velocity.right,velocity.legs[0],velocity.legs[1]);
    // A single carry time keeps every connected pivot together. The corners
    // bound displacement anywhere in the source image to twelve source pixels.
    matrices.forEach(function(m){[[0,0],[W,0],[0,H],[W,H]].forEach(function(p){
      var speed=point(m,p);maximumSpeed=Math.max(maximumSpeed,Math.hypot(speed[0],speed[1]));
    });});
    if(maximumSpeed>0)tau=Math.min(tau,12/maximumSpeed);
    var amount=pose.legAmount||0,amountRate=velocity.legAmount;
    if(amountRate>0)tau=Math.min(tau,(1-amount)/amountRate);
    else if(amountRate<0)tau=Math.min(tau,-amount/amountRate);
    if(name==='thumbs'&&(amount>0||amountRate>0)) {
      var legs=pose.legs||stillLegs;
      studioLegs.forEach(function(leg,i){
        // Contact is measured against each original sole location. An outgoing
        // downward foot can settle onto that floor, never continue through it.
        [[0,leg.ankle[1]],[W,leg.ankle[1]],[0,H],[W,H]].forEach(function(p){
          var current=point(legs[i][2],p),speed=point(velocity.legs[i][2],p);
          if(speed[1]>0)tau=Math.min(tau,Math.max(0,p[1]+.001-current[1])/speed[1]);
        });
      });
    }
    return Math.max(0,tau);
  }
  function projectPose(pose,elapsed) {
    var out=copyPose(pose),velocity=pose.velocity;
    if(!(elapsed>0)||!Number.isFinite(elapsed)||!validVelocity(velocity)||!(pose.carryTime>0))return out;
    var tau=Math.min(pose.carryTime,inertiaTau(pose.pose||'thumbs',pose,velocity));
    if(!(tau>0))return out;
    var carry=-tau*Math.expm1(-elapsed/tau);
    function project(m,v) {for(var i=0;i<9;i++)m[i]+=v[i]*carry;}
    project(out.body,velocity.body);project(out.head,velocity.head);
    ['left','right'].forEach(function(side){out[side].forEach(function(m,i){project(m,velocity[side][i]);});});
    out.legs.forEach(function(leg,i){leg.forEach(function(m,j){project(m,velocity.legs[i][j]);});});
    out.legAmount=clamp(out.legAmount+velocity.legAmount*carry,0,1);
    return out;
  }
  function samePose(a,b) {
    if(a.blink!==b.blink||(a.legAmount||0)!==(b.legAmount||0))return false;
    var am=[a.body,a.head].concat(a.left,a.right,(a.legs||stillLegs)[0],(a.legs||stillLegs)[1]);
    var bm=[b.body,b.head].concat(b.left,b.right,(b.legs||stillLegs)[0],(b.legs||stillLegs)[1]);
    return am.every(function(m,i){return m.every(function(v,j){return v===bm[i][j];});});
  }
  function mixStudioStates(a,b,amount) {
    if(amount<=0)return copyPose(a);
    if(amount>=1)return copyPose(b);
    var al=a.legs||stillLegs,bl=b.legs||stillLegs;
    var la=a.legAmount||0,lb=b.legAmount||0,legAmount=la+(lb-la)*amount;
    // A leg entering from rest must blend once. Interpolating both its matrix
    // and its influence by the same amount delayed the feet behind the body.
    var legBlend=legAmount>0?lb*amount/legAmount:amount;
    return {
      body:mixMatrix(a.body,b.body,amount),head:mixMatrix(a.head,b.head,amount),
      left:a.left.map(function(m,i){return mixMatrix(m,b.left[i],amount);}),
      right:a.right.map(function(m,i){return mixMatrix(m,b.right[i],amount);}),
      legs:al.map(function(leg,i){return leg.map(function(m,j){return mixMatrix(m,bl[i][j],legBlend);});}),
      legAmount:legAmount,
      blink:a.blink+(b.blink-a.blink)*amount
    };
  }
  function studioPose(name,time,action,intensity,clock) {
    var pose=poses[name];
    var player={name:name,pose:pose,time:time,face:false,lookX:0,lookY:0,lookAtPointer:false,
      responseAt:-Infinity,responseKind:'',responseCount:1,mode:action==='explain'?'explain':'idle',lifeTime:clock,independentEyes:Number.isFinite(clock)};
    if(action==='greet') {player.responseAt=time-time%6.4;player.responseKind='greet';}
    if(action==='explain') {player.responseAt=time-time%4.9;player.responseKind='acknowledge';player.responseCount=Math.floor(time/4.9)+1;}
    var state=movement(player);
    if(action==='nod') {
      var nod=Math.pow(Math.max(0,Math.sin(time*Math.PI*2/2.8)),2);
      state.head=matrix(pose.head,.5*Math.sin(time*.9),0,7*nod,1,1-.012*nod);
    }
    if(name!=='thumbs'||(action!=='walk'&&action!=='run')) {
      var stillState=mixStudioStates(neutral,state,intensity);
      if(Number.isFinite(clock))stillState.blink=state.blink;
      return stillState;
    }

    var running=action==='run',cycle=running?.72:1.18,phase=(time/cycle)%1;
    var sway=Math.sin(phase*Math.PI*2),rebound=.5-.5*Math.cos((phase-(running?.19:0))*Math.PI*4);
    state.body=matrix(pose.hip,.38*sway*intensity,3.5*sway*intensity,-(running?15:5)*rebound*intensity);
    state.head=matrix(pose.head,-.7*sway*intensity,0,1.4*rebound*intensity,1,1);
    state.left=studioArm(pose.arms[0],[1.25*sway*intensity,2.5*sway*intensity,.6*sway*intensity]);
    state.right=studioArm(pose.arms[1],[-1.7*sway*intensity,-3.4*sway*intensity,-.8*sway*intensity]);
    state.legAmount=1;
    state.legs=studioLegs.map(function(leg,index) {
      var p=(phase+index*.5)%1,stance=running?.38:.56;
      var swing=p>stance?(p-stance)/(1-stance):0;
      var lift=swing?Math.pow(Math.sin(Math.PI*swing),2):0;
      var height=(running?60:32)*lift*intensity;
      var hip=point(state.body,leg.hip),bodyKnee=point(state.body,leg.knee);
      var ankle=[leg.ankle[0]+leg.side*4*lift*intensity,leg.ankle[1]-height];
      var knee=[bodyKnee[0]+leg.side*5*lift*intensity,bodyKnee[1]-height*.4];
      // A stance ankle remains at its original floor position. The rigid foot
      // follows that ankle; only the airborne foot tilts by a small amount.
      return [segmentMatrix(leg.hip,leg.knee,hip,knee),segmentMatrix(leg.knee,leg.ankle,knee,ankle),
        matrix(leg.ankle,leg.side*1.4*lift*intensity,ankle[0]-leg.ankle[0],ankle[1]-leg.ankle[1])];
    });
    return state;
  }
  function sampleStudio(name,time,options) {
    options=options||{};
    var action=studioActions.indexOf(options.action)>=0?options.action:'idle';
    var intensity=safeNumber(options.intensity,.75,0,1),speed=safeNumber(options.speed,1,.2,2.5);
    var t=safeNumber(time,0,0,86400)*speed;
    var hasClock=options.clock!=null&&Number.isFinite(Number(options.clock));
    var clock=hasClock?safeNumber(options.clock,0,0,86400):undefined;
    if(name!=='thumbs'&&(action==='walk'||action==='run'))action='idle';
    var current=studioPose(name,t,action,intensity,clock),expressionBlink=current.blink;
    var blend=safeNumber(options.blend,1,0,1);
    if(blend<1&&validPose(options.fromPose,name)) {
      var duration=safeNumber(options.transitionDuration,.55,.1,2);
      current=mixStudioStates(projectPose(options.fromPose,blend*duration),current,settle(blend));
    } else if(blend<1&&options.fromAction&&studioActions.indexOf(options.fromAction)>=0) {
      var from=options.fromAction;
      if(name!=='thumbs'&&(from==='walk'||from==='run'))from='idle';
      // An action switch can freeze the outgoing pose at its actual elapsed
      // time, while the new action starts from its own time zero.
      var fromTime=safeNumber(options.fromTime,t/speed,0,86400)*speed;
      current=mixStudioStates(studioPose(name,fromTime,from,intensity,clock),current,settle(blend));
    }
    // A shared playback clock keeps a blink moving even while the body changes
    // action or speed. Body intensity does not hold the eyes half closed.
    if(hasClock)current.blink=expressionBlink;
    current.action=action;
    return current;
  }
  function createActor(options) {
    options=options||{};
    var name=options.pose||'thumbs';
    if(!poses[name]||typeof options.src!=='string'||!options.src)return Promise.resolve(null);
    var image=new Image();image.crossOrigin='anonymous';image.src=options.src;
    return loaded(image).then(function() {
      var canvas=document.createElement('canvas'),render,disposed=false,lastPose=neutral;
      var previousPose=null,lastClock=null,previousClock=0,inheritedVelocity=null;
      var width=Math.round(safeNumber(options.width,640,64,2048)),height=Math.round(safeNumber(options.height,960,64,3072));
      canvas.width=width;canvas.height=height;
      canvas.dataset.clo02Pose=name;canvas.dataset.motionVersion='studio-v3';
      try {render=renderer(canvas,image,name,false,{studio:true,fixedSize:{width:width,height:height}});}
      catch(error) {return null;}
      function destroy() {if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',contextLost);render.dispose();}
      function contextLost(event) {event.preventDefault();destroy();}
      canvas.addEventListener('webglcontextlost',contextLost);
      render.resize();render.draw(neutral);
      return {
        canvas:canvas,
        supportedActions:Object.freeze(name==='thumbs'?studioActions.slice():studioActions.slice(0,4)),
        capturePose:function(captureOptions){
          if(disposed)return null;
          var pose=copyPose(lastPose);pose.pose=name;
          if(!captureOptions||captureOptions.momentum!==false) {
            var velocity=previousPose?poseVelocity(previousPose,lastPose,lastClock-previousClock):inheritedVelocity;
            if(validVelocity(velocity)) {pose.velocity=copyPose(velocity);pose.carryTime=inertiaTau(name,pose,velocity);}
          }
          return pose;
        },
        draw:function(time,drawOptions) {
          if(disposed)return false;
          try {
            drawOptions=drawOptions||{};
            var state=sampleStudio(name,time,drawOptions);
            var clock=drawOptions.clock!=null&&Number.isFinite(Number(drawOptions.clock))?
              safeNumber(drawOptions.clock,0,0,86400):safeNumber(time,0,0,86400);
            var delta=lastClock==null?0:clock-lastClock;
            if(delta>=.0001&&delta<=.1) {previousPose=lastPose;previousClock=lastClock;inheritedVelocity=null;}
            else if(delta!==0||!samePose(lastPose,state)) {
              previousPose=null;inheritedVelocity=null;
              if(validPose(drawOptions.fromPose,name)&&samePose(drawOptions.fromPose,state)&&validVelocity(drawOptions.fromPose.velocity))
                inheritedVelocity=copyPose(drawOptions.fromPose.velocity);
            }
            render.draw(state);lastPose=state;lastClock=clock;canvas.dataset.motionAction=state.action;return true;
          } catch(error) {destroy();return false;}
        },
        destroy:destroy
      };
    }).catch(function(){return null;});
  }
  window.ChloeMotion=Object.freeze({version:'1.5.0',mount:mount,mountAll:mountAll,createActor:createActor,actions:studioActions});
  function start(){setup();mountAll(document);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
