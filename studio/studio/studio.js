/* Chloe Motion Studio: one composited canvas for preview and silent recording. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('stage-canvas'), ctx = canvas.getContext('2d', { alpha: false });
  var POSES = {
    thumbs: { file: 'clo02-thumbs-up-master.webp', pose: 'thumbs' },
    compare: { file: 'clo02-compare-640.webp', pose: 'compare' },
    consultation: { file: 'clo02-consultation-640.webp', pose: 'consultation' },
    front: { file: 'clo02-front.png', pose: null, archived: true },
    point: { file: 'clo02-point.png', pose: null, archived: true },
    phone: { file: 'clo02-phone.png', pose: null, archived: true },
    surprise: { file: 'clo02-surprise.png', pose: null, archived: true },
    thumbsup: { file: 'clo02-thumbsup.png', pose: null, archived: true },
    'view-front': { file: 'chloe-front.webp', pose: null, archived: true, reference: 'front' },
    'view-front-left': { file: 'chloe-front-left.webp', pose: null, archived: true, reference: 'front-left' },
    'view-left': { file: 'chloe-left.webp', pose: null, archived: true, reference: 'left' },
    'view-back-left': { file: 'chloe-back-left.webp', pose: null, archived: true, reference: 'back-left' },
    'view-back': { file: 'chloe-back.webp', pose: null, archived: true, reference: 'back' },
    'view-back-right': { file: 'chloe-back-right.webp', pose: null, archived: true, reference: 'back-right' },
    'view-right': { file: 'chloe-right.webp', pose: null, archived: true, reference: 'right' },
    'view-front-right': { file: 'chloe-front-right.webp', pose: null, archived: true, reference: 'front-right' },
    'view-top': { file: 'chloe-top.webp', pose: null, archived: true, reference: 'top' },
    'view-bottom': { file: 'chloe-bottom.webp', pose: null, archived: true, reference: 'bottom' }
  };
  var selectedPose = 'view-front', poseRequest = 0; // 착한거래 정본: 기존 다각도 10장만 기본 선택
  var assetBase = new URL('../assets/', document.currentScript.src);
  var archiveBase = new URL('../../robots/CLO-02/chakhan-sales/marketing/assets/character/', document.currentScript.src);
  var referenceBase = new URL('../../robots/CLO-02/chakhan-sales/motion-3d/assets/', document.currentScript.src);
  var source = new URL(POSES['view-front'].file, referenceBase).href;
  var image = new Image(), actor = null, recorder = null, downloadURL = '', raf = 0;
  var lastNow = 0, lastSecond = -1, lastPhrase = -1, lastScene = null;
  var TRANSITION_SECONDS = .55;
  var SPEED_SETTLE_SECONDS = .22, INTENSITY_SETTLE_SECONDS = .18;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var names = { idle: '대기', greet: '인사', explain: '설명', nod: '끄덕이기', walk: '제자리 걷기', run: '제자리 뛰기' };
  var state = {
    ratio: 'portrait', action: 'idle', resolvedAction: 'idle', previousAction: 'idle', previousTime: 0, previousPose: null,
    time: 0, lifeTime: 0, motionTime: 0, actionMotionStart: 0, transitionStart: 0, playing: !reduced.matches,
    speed: 1, appliedSpeed: 1, intensity: .7, appliedIntensity: .7, size: 1, x: 50, background: 'paper', demo: false,
    speech: true, text: $('speech-text').value, ready: false, recording: false
  };
  // Source-space contact line and visible helmet margin of the approved master.
  var art = { width: 1024, height: 1536, top: 145, bottom: 1455, left: 65, right: 960 };
  var cues = [
    { at: 0, action: 'greet' }, { at: 2, action: 'walk' }, { at: 5, action: 'explain' },
    { at: 7, action: 'run' }, { at: 10, action: 'idle' }
  ];

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function ease(value) { value = clamp(value, 0, 1); return value * value * (3 - 2 * value); }
  function selected(attribute, value) {
    document.querySelectorAll('button[' + attribute + ']').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === value));
    });
  }
  function rounded(x, y, width, height, radius) {
    radius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath(); ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath();
  }
  function formatTime(seconds) {
    var whole = Math.max(0, Math.floor(seconds));
    return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
  }
  function phrases() {
    return state.text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean).slice(0, 6);
  }
  function wrapText(text, width, maximumLines) {
    var lines = [], line = '';
    // Character-aware wrapping also works when a Korean line has no spaces.
    Array.from(text).forEach(function (char) {
      if (line && ctx.measureText(line + char).width > width) { lines.push(line.trim()); line = char; }
      else line += char;
    });
    if (line) lines.push(line.trim());
    if (lines.length > maximumLines) {
      lines = lines.slice(0, maximumLines);
      while (lines[maximumLines - 1] && ctx.measureText(lines[maximumLines - 1] + '…').width > width) {
        lines[maximumLines - 1] = Array.from(lines[maximumLines - 1]).slice(0, -1).join('');
      }
      lines[maximumLines - 1] += '…';
    }
    return lines;
  }
  function currentScene() {
    var seconds = Math.max(0, state.motionTime - state.actionMotionStart);
    if (!state.demo) return { action: state.action, seconds: seconds };
    var cycle = state.time % 12, cue = cues[0];
    cues.forEach(function (entry) { if (cycle >= entry.at) cue = entry; });
    return { action: cue.action, seconds: seconds };
  }
  function advanceTime(delta) {
    // Integrate the changing speed, rather than multiplying the entire action
    // clock by a newly selected speed. Changing a slider cannot rewind a step.
    var decay = Math.exp(-delta / SPEED_SETTLE_SECONDS);
    state.motionTime += state.speed * delta + (state.appliedSpeed - state.speed) * SPEED_SETTLE_SECONDS * (1 - decay);
    state.appliedSpeed = state.speed + (state.appliedSpeed - state.speed) * decay;
    state.appliedIntensity += (state.intensity - state.appliedIntensity) * (1 - Math.exp(-delta / INTENSITY_SETTLE_SECONDS));
    state.time += delta;
    state.lifeTime += delta;
  }
  function setPlayback(playing) {
    state.playing = playing; lastNow = performance.now();
    $('play-toggle').textContent = playing ? '일시정지' : '재생';
    canvas.dataset.playback = playing ? 'playing' : 'paused';
  }
  function captureTransition() {
    var previous = lastScene || currentScene();
    state.previousAction = previous.action; state.previousTime = previous.seconds;
    state.previousPose = actor && typeof actor.capturePose === 'function' ? actor.capturePose({ momentum: state.playing }) : null;
  }
  function restart(hardReset) {
    var firstAction = state.demo ? cues[0].action : state.action;
    if (hardReset === true) {
      // Recording starts at a repeatable pose, independent of the live preview.
      state.previousPose = null; state.previousAction = firstAction; state.previousTime = 0;
      state.lifeTime = 0;
    } else captureTransition();
    state.time = state.motionTime = state.actionMotionStart = 0;
    state.appliedSpeed = state.speed; state.appliedIntensity = state.intensity;
    state.transitionStart = hardReset === true ? -TRANSITION_SECONDS : 0;
    state.resolvedAction = firstAction;
    lastPhrase = -1; lastNow = performance.now();
    selected('data-action', state.resolvedAction); draw();
  }
  function changeAction(action) {
    if (!Object.prototype.hasOwnProperty.call(names, action)) return false;
    captureTransition();
    state.action = state.resolvedAction = action; state.demo = false; $('demo-toggle').checked = false;
    state.actionMotionStart = state.motionTime; state.transitionStart = state.time;
    selected('data-action', action); canvas.dataset.action = action;
    if (actor) $('studio-status').textContent = names[action] + ' 동작을 연출하고 있어요.';
    draw(); return true;
  }
  function setRatio(ratio) {
    if (state.recording || (ratio !== 'portrait' && ratio !== 'landscape')) return false;
    state.ratio = ratio; canvas.width = ratio === 'portrait' ? 1080 : 1920;
    canvas.height = ratio === 'portrait' ? 1920 : 1080;
    $('stage-wrap').dataset.ratio = ratio; selected('data-ratio', ratio); draw(); return true;
  }
  function layout() {
    var w = canvas.width, h = canvas.height, portrait = state.ratio === 'portrait';
    var hasSpeech = state.speech && phrases().length > 0;
    var ground = h * .89, top = hasSpeech && portrait ? h * .27 : h * .12;
    var availableWidth = portrait ? w * .84 : w * .46;
    var height = Math.min((ground - top) * art.height / (art.bottom - art.top), availableWidth * art.width / (art.right - art.left) * 1.5) * .87 * state.size;
    var width = height / 1.5, margin = w * .045;
    var center = clamp(w * state.x / 100, margin + width * .5, w - margin - width * .5);
    return { x: center - width / 2, y: ground - height * art.bottom / art.height, width: width, height: height, center: center, ground: ground };
  }
  function background(w, h) {
    var colors = { paper: '#ffffff', yellow: '#f6fd00', ink: '#0b0b0c', green: '#00dd45' };
    ctx.fillStyle = colors[state.background]; ctx.fillRect(0, 0, w, h);
    if (state.background === 'paper') {
      var halo = ctx.createRadialGradient(w * .52, h * .53, 0, w * .52, h * .53, Math.max(w, h) * .46);
      halo.addColorStop(0, 'rgba(246,253,0,.13)'); halo.addColorStop(1, 'rgba(246,253,0,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    }
    if (state.background !== 'green') {
      var size = state.ratio === 'portrait' ? 46 : 40;
      ctx.font = '900 ' + size + 'px "Pretendard", "Noto Sans KR", sans-serif';
      ctx.fillStyle = state.background === 'ink' ? '#ffffff' : '#0b0b0c';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('착한거래', w * .065, h * .055);
      ctx.font = '500 ' + Math.round(size * .48) + 'px "Pretendard", "Noto Sans KR", sans-serif';
      ctx.fillStyle = state.background === 'ink' ? '#c9cbc0' : '#55594f';
      ctx.fillText('AI 상담사 클로이', w * .065, h * .055 + size * .92);
    }
  }
  function speech(rect) {
    var lines = phrases(); if (!state.speech || !lines.length) return;
    var index = Math.floor(state.time / 4.6) % lines.length;
    if (lastPhrase !== index) { lastPhrase = index; canvas.dataset.utterance = String(index); }
    var w = canvas.width, h = canvas.height, portrait = state.ratio === 'portrait';
    var phase = state.time % 4.6;
    var alpha = lines.length < 2 || state.time < .24 ? 1 : Math.min(1, phase / .24, (4.6 - phase) / .18);
    var offsets = [[0, 0], [-7, 6], [5, -4], [-3, -5], [4, 3], [0, 2]];
    var previous = offsets[(index + lines.length - 1) % offsets.length], next = offsets[index % offsets.length];
    var blend = ease(phase / .55), dx = previous[0] + (next[0] - previous[0]) * blend;
    var dy = previous[1] + (next[1] - previous[1]) * blend;
    if (reduced.matches) { dx = dy = 0; }
    var fontSize = portrait ? 42 : 37, boxW = portrait ? w * .76 : w * .32;
    var pad = fontSize * .8;
    ctx.font = '700 ' + fontSize + 'px "Pretendard", "Noto Sans KR", sans-serif';
    var wrapped = wrapText(lines[index], boxW - pad * 2, 3);
    var boxH = Math.max(fontSize * 2.4, wrapped.length * fontSize * 1.42 + pad * 2);
    var x = portrait ? (w - boxW) / 2 : rect.center >= w * .48 ? w * .055 : w - boxW - w * .055;
    var y = portrait ? h * .135 : h * .31;
    x += dx; y += dy;
    ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#e9ef37'; rounded(x, y + 8, boxW, boxH, 25); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0b0b0c'; ctx.lineWidth = 2.5;
    rounded(x, y, boxW, boxH, 25); ctx.fill(); ctx.stroke();
    if (portrait) {
      var tail = clamp(rect.center - x, 35, boxW - 35);
      ctx.beginPath(); ctx.moveTo(x + tail - 11, y + boxH - 1); ctx.lineTo(x + tail, y + boxH + 17); ctx.lineTo(x + tail + 11, y + boxH - 1); ctx.fill(); ctx.stroke();
    } else {
      var towardRight = rect.center > x + boxW;
      var edge = towardRight ? x + boxW : x, tip = edge + (towardRight ? 17 : -17);
      ctx.beginPath(); ctx.moveTo(edge, y + 40); ctx.lineTo(tip, y + 53); ctx.lineTo(edge, y + 66); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#0b0b0c'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    wrapped.forEach(function (line, n) { ctx.fillText(line, x + pad, y + pad + n * fontSize * 1.42); });
    ctx.restore();
  }
  function draw() {
    if (!ctx) return;
    var w = canvas.width, h = canvas.height, scene = currentScene();
    if (scene.action !== state.resolvedAction) {
      captureTransition();
      state.resolvedAction = scene.action; state.transitionStart = state.time;
      state.actionMotionStart = state.motionTime; scene.seconds = 0;
      selected('data-action', scene.action);
    }
    canvas.dataset.action = scene.action;
    background(w, h);
    var rect = layout();
    if (state.background !== 'green') {
      ctx.save(); ctx.globalAlpha = state.background === 'ink' ? .24 : .13;
      ctx.fillStyle = state.background === 'ink' ? '#f6fd00' : '#6e7400';
      ctx.beginPath(); ctx.ellipse(rect.center, rect.ground + 5, rect.width * .32, rect.width * .038, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (state.ready) {
      var drawable = image;
      if (actor) {
        var ok = actor.draw(scene.seconds, {
          action: scene.action, speed: 1, intensity: state.appliedIntensity, clock: state.lifeTime,
          fromAction: state.previousAction, fromTime: state.previousTime, fromPose: state.previousPose,
          blend: (state.time - state.transitionStart) / TRANSITION_SECONDS, transitionDuration: TRANSITION_SECONDS
        });
        if (ok !== false) drawable = actor.canvas;
        else {
          actor.destroy(); actor = null;
          if (recorder && recorder.state.busy) recorder.stop();
          unsupported();
        }
      }
      if (POSES[selectedPose].archived && image.naturalWidth && image.naturalHeight) {
        // Archive images may have a different aspect ratio from the rig master.
        var fit = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        var dw = image.naturalWidth * fit, dh = image.naturalHeight * fit;
        ctx.drawImage(image, rect.center - dw / 2, rect.y + rect.height - dh, dw, dh);
      } else {
        ctx.drawImage(drawable, rect.x, rect.y, rect.width, rect.height);
      }
    }
    speech(rect);
    lastScene = { action: scene.action, seconds: scene.seconds };
    if (Math.floor(state.time) !== lastSecond) {
      lastSecond = Math.floor(state.time); $('elapsed-time').textContent = formatTime(state.time);
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var delta = lastNow ? Math.max(0, (now - lastNow) / 1000) : 0; lastNow = now;
    if (document.hidden || !state.playing) return;
    advanceTime(delta);
    // Preview follows display refresh; recording samples the canvas at 30 fps.
    draw();
  }
  function unsupported() {
    canvas.dataset.renderer = 'static';
    $('studio-status').textContent = '이 브라우저에서는 정지 이미지로 보여요. 캐릭터 동작은 그래픽 기능을 지원하는 브라우저에서 사용할 수 있어요.';
    document.querySelectorAll('[data-action]').forEach(function (button) { button.disabled = true; });
    $('demo-toggle').disabled = true;
    $('record-button').disabled = true;
    $('capture-status').textContent = '움직이는 클로이가 준비된 브라우저에서 녹화할 수 있어요.';
  }
  function captureState(info) {
    state.recording = info.busy;
    $('record-button').dataset.recording = String(info.busy);
    $('record-button').textContent = info.busy ? '녹화 끝내기' : '영상 녹화';
    $('record-button').disabled = !actor || !POSES[selectedPose].reference || !info.supported || info.status === 'stopping'; // 구형 포즈로 브랜드 영상 출력 금지
    $('record-progress').hidden = !info.busy;
    $('record-progress').max = info.targetDurationMs || 1;
    $('record-progress').value = info.elapsedMs;
    $('capture-status').textContent = info.message + (info.recording ? ' ' + (info.elapsedMs / 1000).toFixed(1) + '초' : '');
    document.querySelectorAll('button[data-ratio]').forEach(function (button) { button.disabled = info.busy; });
    ['play-toggle', 'restart', 'record-duration'].forEach(function (id) { $(id).disabled = info.busy; });
    canvas.dataset.capture = info.status;
  }
  function completed(result) {
    if (downloadURL) URL.revokeObjectURL(downloadURL);
    downloadURL = URL.createObjectURL(result.blob);
    var link = $('download-link'); link.href = downloadURL;
    link.download = 'chloe-' + state.ratio + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.' + result.extension;
    link.hidden = false; link.textContent = result.extension.toUpperCase() + ' 영상 내려받기 ↓';
    link.dataset.duration = String(result.durationMs); link.dataset.bytes = String(result.blob.size);
    link.dataset.format = result.extension;
  }
  function initializeRecording() {
    if (!window.ChloeRecorder) { $('capture-status').textContent = '녹화 도구를 불러오지 못했어요. 새로고침해 주세요.'; return; }
    recorder = window.ChloeRecorder.create(canvas, {
      fps: 30, maxDurationMs: 30000, onState: captureState, onComplete: completed,
      onError: function (error) { $('capture-status').textContent = error.message; }
    });
    captureState(recorder.state);
  }

  document.querySelectorAll('button[data-action]').forEach(function (button) {
    button.disabled = true;
    button.addEventListener('click', function () { changeAction(button.dataset.action); });
  });
  document.querySelectorAll('button[data-ratio]').forEach(function (button) {
    button.addEventListener('click', function () { setRatio(button.dataset.ratio); });
  });
  document.querySelectorAll('button[data-background]').forEach(function (button) {
    button.addEventListener('click', function () { state.background = button.dataset.background; selected('data-background', state.background); draw(); });
  });
  [
    ['speed', 'speed', function (value) { return value.toFixed(2) + '×'; }],
    ['intensity', 'intensity', function (value) { return Math.round(value * 100) + '%'; }],
    ['actor-size', 'size', function (value) { return Math.round(value * 100) + '%'; }],
    ['actor-x', 'x', function (value) { return value === 50 ? '가운데' : Math.round(value) + '%'; }]
  ].forEach(function (setting) {
    $(setting[0]).addEventListener('input', function (event) {
      var value = Number(event.target.value);
      if (!Number.isFinite(value)) return;
      state[setting[1]] = value;
      if (!state.playing) {
        // A paused frame stays directly editable; playback eases live changes.
        if (setting[1] === 'speed') state.appliedSpeed = value;
        if (setting[1] === 'intensity') state.appliedIntensity = value;
      }
      $(setting[0] + '-value').textContent = setting[2](state[setting[1]]); draw();
    });
  });
  $('speech-text').addEventListener('input', function (event) { state.text = event.target.value.slice(0, 90); lastPhrase = -1; draw(); });
  $('speech-toggle').addEventListener('change', function (event) { state.speech = event.target.checked; draw(); });
  $('demo-toggle').addEventListener('change', function (event) { state.demo = event.target.checked; restart(); });
  $('play-toggle').addEventListener('click', function () { setPlayback(!state.playing); });
  $('restart').addEventListener('click', restart);
  $('record-button').addEventListener('click', function () {
    if (!recorder) return;
    if (recorder.state.busy) { recorder.stop(); return; }
    if (!actor || !POSES[selectedPose].reference) {
      $('capture-status').textContent = '착한거래 영상은 기존 10방향 기준 외형을 유지한 모션 검증 후에만 출력합니다.';
      return;
    }
    restart(true); setPlayback(true); draw();
    recorder.start({ durationMs: Number($('record-duration').value) * 1000 });
  });
  document.addEventListener('visibilitychange', function () { lastNow = performance.now(); });
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) return;
    cancelAnimationFrame(raf); if (recorder) recorder.destroy(); if (actor) actor.destroy();
    if (downloadURL) URL.revokeObjectURL(downloadURL);
  });

  // Small public directing API: scripts can reuse the same controls as the UI.
  window.ChloeStudio = Object.freeze({
    version: '1.3.0',
    kits: Object.freeze(['homepage', 'compare', 'consult', 'shorts', 'energetic', 'reaction']),
    useKit: applyMotionKit,
    act: changeAction,
    say: function (text) { state.text = String(text).slice(0, 90); $('speech-text').value = state.text; lastPhrase = -1; draw(); },
    play: function () { setPlayback(true); }, pause: function () { setPlayback(false); }, restart: restart,
    captureFrame: function () { if (!POSES[selectedPose].reference || !state.ready || !image.naturalWidth || !image.naturalHeight) return false; draw(); return true; },
    useReferenceView: function (angle) {
      if (!Object.prototype.hasOwnProperty.call(POSES, 'view-' + angle)) return false;
      var button = document.querySelector('[data-chloe-source="view-' + angle + '"]');
      if (!button || (recorder && recorder.state.busy)) return false;
      button.click(); return true;
    },
    getState: function () { return { action: currentScene().action, time: state.time, playing: state.playing, ratio: state.ratio, ready: !!actor, imageReady: state.ready, source: selectedPose, motionReady: !!actor, referenceView: POSES[selectedPose].reference || null, brandApprovedReference: !!POSES[selectedPose].reference }; }
  });
  setPlayback(state.playing); setRatio('portrait'); raf = requestAnimationFrame(frame);

  // Reusable direction presets, using the existing verified ChloeMotion rig.
  var MOTION_KITS = Object.freeze({
    homepage: { label: '홈페이지 환영', action: 'greet', speed: .8, intensity: .45, background: 'paper', ratio: 'portrait', speech: '안녕하세요!\\n계약 전, 비교부터 해 보세요.' },
    compare: { label: '비교 설명', action: 'explain', speed: .7, intensity: .58, background: 'paper', ratio: 'landscape', speech: '같은 차도 조건에 따라 대여료가 달라요.\\n차근차근 비교해 드릴게요.' },
    consult: { label: '상담 유도', action: 'nod', speed: .65, intensity: .38, background: 'paper', ratio: 'portrait', speech: '계약하지 않으셔도 괜찮아요.\\n먼저 알아만 보세요.' },
    shorts: { label: '쇼츠 PT', action: 'explain', speed: 1.05, intensity: .8, background: 'yellow', ratio: 'portrait', speech: '장기렌트, 어디가 저렴할까요?\\n조건을 비교하면 보입니다.' },
    energetic: { label: '활기찬 등장', action: 'walk', speed: 1.15, intensity: .75, background: 'paper', ratio: 'portrait', speech: '오늘의 차량 비교, 시작해 볼까요?' },
    reaction: { label: '리액션', action: 'nod', speed: .9, intensity: .5, background: 'paper', ratio: 'portrait', speech: '맞아요!\\n이 조건도 꼭 확인하세요.' }
  });
  var selectedMotionKit = null, pendingMotionKit = null;
  function applyMotionKit(id) {
    var kit = MOTION_KITS[id];
    if (!kit || (recorder && recorder.state.busy)) return false;
    selectedMotionKit = id;
    state.speed = state.appliedSpeed = kit.speed;
    state.intensity = state.appliedIntensity = kit.intensity;
    state.background = kit.background;
    state.text = kit.speech;
    state.speech = true;
    state.demo = false;
    $('demo-toggle').checked = false;
    $('speech-toggle').checked = true;
    $('speech-text').value = kit.speech;
    $('speed').value = String(kit.speed);
    $('speed-value').textContent = kit.speed.toFixed(2) + '×';
    $('intensity').value = String(kit.intensity);
    $('intensity-value').textContent = Math.round(kit.intensity * 100) + '%';
    selected('data-background', kit.background);
    setRatio(kit.ratio);
    state.previousPose = null;
    state.transitionStart = -TRANSITION_SECONDS;
    state.action = state.resolvedAction = kit.action;
    state.actionMotionStart = state.motionTime = state.time = 0;
    selected('data-action', kit.action);
    setPlayback(true);
    lastPhrase = -1;
    document.querySelectorAll('[data-motion-kit]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.motionKit === id));
    });
    $('motion-kit-status').textContent = kit.label + ' 키트를 적용했습니다. 기존 버튼으로 세부 동작을 조정할 수 있습니다.';
    draw();
    return true;
  }

  var STILL_PRESETS = {
    front: { source: 'view-front', label: '정면 소개 · 착한거래 기준' },
    greeting: { source: 'thumbs', action: 'greet', second: 1.05, label: '손 흔들기' },
    point: { source: 'point', label: '가리키기' },
    proposal: { source: 'compare', action: 'explain', second: 1.1, label: '제안하기' },
    phone: { source: 'phone', label: '휴대폰 안내' },
    surprise: { source: 'surprise', label: '놀란 표정' },
    thumb: { source: 'thumbsup', label: '엄지척' },
    walk: { source: 'thumbs', action: 'walk', second: .72, label: '걷는 장면' },
    run: { source: 'thumbs', action: 'run', second: .55, label: '뛰는 장면' },
    nod: { source: 'thumbs', action: 'nod', second: .86, label: '끄덕이기' }
  };
  var pendingStill = null, currentStill = null;
  function showStill(preset, id) {
    if (!preset || (recorder && recorder.state.busy)) return;
    currentStill = id;
    setPlayback(false);
    state.demo = false; $('demo-toggle').checked = false;
    state.speech = false; $('speech-toggle').checked = false;
    state.previousPose = null; state.previousAction = preset.action || 'idle';
    state.action = state.resolvedAction = preset.action || 'idle';
    state.actionMotionStart = 0;
    state.motionTime = state.time = Math.max(0, preset.second || 0);
    state.lifeTime = state.time;
    state.transitionStart = -TRANSITION_SECONDS - 1;
    state.appliedIntensity = state.intensity;
    selected('data-action', state.action);
    document.querySelectorAll('[data-still-preset]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.stillPreset === id));
    });
    $('blog-still-status').textContent = preset.label + ' 정지 포즈를 선택했습니다. 아래 PNG 저장 버튼을 사용하세요.';
    draw();
  }


  // Deep links from the motion-kit gallery use only known preset identifiers.
  // No untrusted query values are interpreted as image paths or executable actions.
  var initialRoute = (function () {
    var parameters = new URLSearchParams(window.location.search);
    if (MOTION_KITS && Object.prototype.hasOwnProperty.call(MOTION_KITS, parameters.get('kit'))) {
      return { kind: 'kit', id: parameters.get('kit') };
    }
    if (Object.prototype.hasOwnProperty.call(STILL_PRESETS, parameters.get('still'))) {
      return { kind: 'still', id: parameters.get('still') };
    }
    if (Object.prototype.hasOwnProperty.call(POSES, 'view-' + parameters.get('angle'))) {
      return { kind: 'pose', id: 'view-' + parameters.get('angle') };
    }
    if (Object.prototype.hasOwnProperty.call(POSES, parameters.get('pose'))) {
      return { kind: 'pose', id: parameters.get('pose') };
    }
    return null;
  }());
  function applyInitialRoute() {
    if (!initialRoute) return false;
    var route = initialRoute;
    initialRoute = null; // exactly once; image source changes may trigger another onload
    if (route.kind === 'kit') {
      var kitButton = document.querySelector('[data-motion-kit="' + route.id + '"]');
      if (kitButton) { kitButton.click(); return true; }
    } else if (route.kind === 'still') {
      var stillButton = document.querySelector('[data-still-preset="' + route.id + '"]');
      if (stillButton) { stillButton.click(); return true; }
    } else if (route.kind === 'pose') {
      var poseButton = document.querySelector('[data-chloe-source="' + route.id + '"]');
      if (poseButton) { poseButton.click(); return true; }
    }
    return false;
  }

  image.onload = function () {
    var request = poseRequest;
    state.ready = true;
    var creation = POSES[selectedPose].pose && window.ChloeMotion && window.ChloeMotion.createActor
      ? window.ChloeMotion.createActor({ src: source, pose: POSES[selectedPose].pose, width: 1024, height: 1536 })
      : Promise.resolve(null);
    creation.then(function (created) {
      if (request !== poseRequest) { if (created) created.destroy(); return; }
      if (actor) actor.destroy();
      actor = created; if (!recorder) initializeRecording();
      if (!actor && POSES[selectedPose].archived) {
        canvas.dataset.renderer = POSES[selectedPose].reference ? 'reference-angle' : 'original-still';
        setPlayback(false);
        $('play-toggle').disabled = true;
        $('restart').disabled = true;
        document.querySelectorAll('[data-action]').forEach(function (item) { item.disabled = true; });
        $('demo-toggle').disabled = true;
        $('record-button').disabled = true;
        $('studio-status').textContent = POSES[selectedPose].reference ? '기존 착한거래 클로이의 다각도 정지 사진입니다. 실제 3D 관절 모션과 구분합니다.' : '아카이브 원본 이미지입니다. 정지 포즈로 확인하며, 관절 모션은 지원하지 않습니다.';
        $('capture-status').textContent = '이 포즈는 PNG 정지 이미지로 내보내세요.';
        if (POSES[selectedPose].reference) {
          var original = $('chloe-angle-download');
          original.href = source; original.download = POSES[selectedPose].file;
          original.hidden = false;
          var choice = document.querySelector('[data-chloe-source="' + selectedPose + '"]');
          $('chloe-angle-status').textContent = (choice ? choice.textContent.trim() : '선택한 각도') + ' · 기존 원본을 불러왔습니다. PNG 촬영 또는 WebP 원본 저장을 이용하세요.';
        }
        if (applyInitialRoute()) return;
        if (pendingStill) { var queuedStill = pendingStill; pendingStill = null; showStill(STILL_PRESETS[queuedStill], queuedStill); }
        else draw();
        return;
      }
      if (!actor) { unsupported(); return; }
      $('play-toggle').disabled = false;
      $('restart').disabled = false;
      if (recorder) captureState(recorder.state);
      $('demo-toggle').disabled = false;
      canvas.dataset.renderer = 'connected-rig';
      document.querySelectorAll('button[data-action]').forEach(function (button) { button.disabled = actor.supportedActions.indexOf(button.dataset.action) < 0; });
      $('studio-status').textContent = reduced.matches ? '동작 줄이기 설정에 따라 멈춰 있어요. 재생을 누르면 연출할 수 있어요.' : '준비됐어요. 동작을 골라 클로이를 움직여 보세요.';
      if (applyInitialRoute()) return;
      if (pendingMotionKit) { var queuedKit = pendingMotionKit; pendingMotionKit = null; applyMotionKit(queuedKit); }
      else if (pendingStill) { var queuedStill = pendingStill; pendingStill = null; showStill(STILL_PRESETS[queuedStill], queuedStill); }
      else draw();
    }).catch(function () { unsupported(); draw(); });
  };
  image.onerror = function () {
    $('studio-status').textContent = '클로이 원본을 불러오지 못했습니다. 원본 경로를 확인해 주세요.';
    $('chloe-angle-download').hidden = true;
    if (POSES[selectedPose].reference) $('chloe-angle-status').textContent = '원본 로드 실패: ' + POSES[selectedPose].file;
  };
  document.querySelectorAll('[data-motion-kit]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (recorder && recorder.state.busy) return;
      if (selectedPose !== 'thumbs' || !actor) {
        pendingMotionKit = button.dataset.motionKit;
        if (selectedPose !== 'thumbs') {
          var buttonForOriginal = document.querySelector('[data-chloe-source="thumbs"]');
          if (buttonForOriginal) buttonForOriginal.click();
        } else {
          $('motion-kit-status').textContent = '모션 원본을 준비하는 중입니다.';
        }
        return;
      }
      applyMotionKit(button.dataset.motionKit);
    });
  });
  document.querySelectorAll('[data-still-preset]').forEach(function (button) {
    button.addEventListener('click', function () {
      var id = button.dataset.stillPreset, preset = STILL_PRESETS[id];
      if (!preset || (recorder && recorder.state.busy)) return;
      if (selectedPose !== preset.source) {
        pendingStill = id;
        var sourceButton = document.querySelector('[data-chloe-source="' + preset.source + '"]');
        if (sourceButton) sourceButton.click();
      } else if (state.ready) showStill(preset, id);
    });
  });
  $('blog-still-save').addEventListener('click', function () { $('still-button').click(); });
  document.querySelectorAll('[data-chloe-source]').forEach(function (button) {
    button.addEventListener('click', function () {
      var next = button.dataset.chloeSource;
      if (!POSES[next] || selectedPose === next || (recorder && recorder.state.busy)) return;
      selectedPose = next; poseRequest += 1;
      state.ready = false;
      // A source switch is not ready to record or export until the new image loads.
      $('record-button').disabled = true;
      $('play-toggle').disabled = true;
      $('restart').disabled = true;
      state.previousPose = null;
      state.action = 'idle'; state.resolvedAction = 'idle';
      state.time = 0; state.lifeTime = 0;
      if (POSES[next].reference) {
        setPlayback(false);
        state.demo = false; $('demo-toggle').checked = false;
        state.speech = false; $('speech-toggle').checked = false;
        $('chloe-angle-status').textContent = '다각도 ' + POSES[next].reference + ' 원본을 불러오는 중입니다.';
      }
      $('chloe-angle-download').hidden = true;
      document.querySelectorAll('[data-chloe-source]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      document.querySelectorAll('[data-action]').forEach(function (item) { item.disabled = true; });
      $('studio-status').textContent = '선택한 원본 포즈를 불러오는 중입니다.';
      source = new URL(POSES[next].file, POSES[next].reference ? referenceBase : (POSES[next].archived ? archiveBase : assetBase)).href;
      image.src = source;
    });
  });
  image.src = source;
}());
