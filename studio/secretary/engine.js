/* AI Staff Secretary Avatar Engine v1 — uses original raster turnarounds inside a reusable SVG-backed sprite.
 * Does not create new faces, perform 3D rotation or animate independent joints.
 * Public API: const actor = new AIStaffSecretary.Actor(root, {source}); actor.setView('front'); ...
 */
(function (global) {
  'use strict';

  const VIEWS = Object.freeze(['front', 'left_three_quarter', 'left_side', 'back', 'right_side', 'right_three_quarter']);
  const MOTIONS = Object.freeze(['idle', 'greet', 'present', 'nod', 'still']);
  const DEFAULT_SOURCE = '../../characters/secretary-skirt-01/refs/turnaround-preview.svg';
  const LABELS = Object.freeze({front:'정면',left_three_quarter:'좌측 45°',left_side:'좌측면',back:'후면',right_side:'우측면',right_three_quarter:'우측 45°'});
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CELL_WIDTH = 1448 / 6;
  const SPRITE_HEIGHT = 950;
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, String(value));
    return el;
  }
  function requireValue(input, allowed, name) {
    if (!allowed.includes(input)) throw new TypeError('알 수 없는 ' + name + ': ' + input);
  }

  class Actor {
    constructor(root, options) {
      if (!(root instanceof Element)) throw new TypeError('캐릭터를 표시할 요소가 필요합니다.');
      const config = options || {};
      this.root = root;
      this.source = config.source || DEFAULT_SOURCE;
      this.view = 'front';
      this.motion = 'idle';
      this.speed = 1;
      this.paused = false;
      this.ready = false;
      this.container = document.createElement('div');
      this.container.className = 'secretary-character';
      this.container.dataset.motion = this.motion;
      this.container.dataset.paused = 'false';
      this.svg = svgEl('svg', {'viewBox':'0 0 ' + CELL_WIDTH + ' ' + SPRITE_HEIGHT, 'role':'img', 'aria-label':'치마 정장 AI 비서 정면', 'preserveAspectRatio':'xMidYMid meet'});
      this.image = svgEl('image', {x:'0', y:'0', width:'1448', height:SPRITE_HEIGHT, 'preserveAspectRatio':'none'});
      this.image.setAttribute('href', this.source);
      this.svg.append(this.image);
      this.container.append(this.svg);
      this.root.replaceChildren(this.container);
      this.loader = new Image();
      this.loader.onload = () => {this.ready = true; this.container.dataset.loading = 'false'; this.container.dispatchEvent(new CustomEvent('secretary:ready', {bubbles:true}));};
      this.loader.onerror = () => {this.ready = false; this.container.dataset.loading = 'error'; this.container.dispatchEvent(new CustomEvent('secretary:error', {bubbles:true}));};
      this.container.dataset.loading = 'true';
      this.loader.src = this.source;
    }
    setView(view) {
      requireValue(view, VIEWS, '방향');
      this.view = view;
      this.image.setAttribute('x', String(-VIEWS.indexOf(view) * CELL_WIDTH));
      this.svg.setAttribute('aria-label', '치마 정장 AI 비서 ' + LABELS[view]);
      return this;
    }
    setMotion(motion) {
      requireValue(motion, MOTIONS, '동작');
      this.motion = motion;
      this.container.dataset.motion = motion;
      return this;
    }
    setSpeed(speed) {
      const n = Number(speed);
      if (!Number.isFinite(n) || n < 0.5 || n > 2) throw new RangeError('속도는 0.5~2배 범위입니다.');
      this.speed = n;
      this.container.style.setProperty('--animation-scale', String(1/n));
      return this;
    }
    pause() {this.paused = true; this.container.dataset.paused = 'true'; return this;}
    play() {this.paused = false; this.container.dataset.paused = 'false'; return this;}
    getState() {return {view:this.view,motion:this.motion,speed:this.speed,paused:this.paused,ready:this.ready,source:this.source};}
    async exportPng(options) {
      if (!this.ready) throw new Error('이미지가 로드되지 않아 저장할 수 없습니다.');
      const opts=options || {};const width=Number(opts.width)||1080;const height=Number(opts.height)||1920;
      if(width < 200 || height < 200 || width>4096 || height>4096) throw new RangeError('이미지 크기 범위: 200~4096px');
      const canvas=document.createElement('canvas'); canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d'); if(!ctx)throw new Error('캔버스를 사용할 수 없습니다.');
      ctx.fillStyle=opts.background||'#ffffff';ctx.fillRect(0,0,width,height);
      const scale=Math.min((width*.86)/CELL_WIDTH,(height*.9)/SPRITE_HEIGHT);
      const dw=CELL_WIDTH*scale,dh=SPRITE_HEIGHT*scale;
      ctx.drawImage(this.loader, VIEWS.indexOf(this.view)*CELL_WIDTH, 0, CELL_WIDTH, SPRITE_HEIGHT, (width-dw)/2, height-dh-(height*.035), dw, dh);
      return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG 내보내기 실패')),'image/png'));
    }
    destroy(){this.loader.onload=null;this.loader.onerror=null;this.root.replaceChildren();this.ready=false;}
  }
  global.AIStaffSecretary=Object.freeze({Actor,views:VIEWS,motions:MOTIONS,labels:LABELS,version:'1.0.0'});
})(window);
