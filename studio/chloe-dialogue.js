/* Chloe Dialogue 1.2.0 — readable, gently moving speech for Chloe Motion.
   Plain text only. No service calls, dependencies, audio, or live chat simulation. */
(function () {
  'use strict';
  if (window.ChloeDialogue) return;

  var mounts = new WeakMap();
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var positions = [[0, 0], [-.8, -.75], [.4, .2], [-.45, .7], [.15, -.4], [.65, -.15]];

  function number(value, fallback, min, max) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }
  function message(value) {
    if (typeof value === 'string') return { title: value, body: '' };
    return { title: String(value && value.title || ''), body: String(value && value.body || '') };
  }
  function find(value) {
    if (typeof value === 'function') value = value();
    return typeof value === 'string' ? document.querySelector(value) : value;
  }
  function visible(element) {
    if (!element.isConnected) return false;
    var box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 &&
      box.top < window.innerHeight && box.left < window.innerWidth &&
      window.getComputedStyle(element).visibility !== 'hidden';
  }
  function icon(button, paused) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    path.setAttribute('d', paused ? 'M5 3.2 12 8l-7 4.8Z' : 'M4 3h3v10H4zm5 0h3v10H9z');
    svg.appendChild(path);
    button.replaceChildren(svg);
  }

  function mount(target, options) {
    options = options || {};
    var bubble;
    try { bubble = find(target); } catch (_) { return null; }
    if (!bubble || !bubble.tagName) return null;
    if (mounts.has(bubble)) return mounts.get(bubble);

    var messages = (Array.isArray(options.messages) ? options.messages : []).map(message)
      .filter(function (item) { return item.title || item.body; });
    if (!messages.length) return null;
    var interval = number(options.interval, 7600, 3500, 60000);
    var firstDelay = options.initialDelay == null ? interval : number(options.initialDelay, interval, 2500, 60000);
    var offsetX = number(options.offsetX, 5, 0, 20), offsetY = number(options.offsetY, 7, 0, 20);
    var originals = Array.prototype.slice.call(bubble.childNodes);
    var attributes = {};
    ['class', 'style', 'aria-live', 'aria-hidden', 'data-dialogue-version', 'data-dialogue-state', 'data-dialogue-index'].forEach(function (name) {
      attributes[name] = bubble.getAttribute(name);
    });
    var rows = [], index = 0, playlistIndex = 0, turn = 0;
    var timer = 0, transitionTimer = 0, destroyed = false;
    var paused = options.autoplay === false, hovered = false, focused = false;
    var onScreen = visible(bubble), initial = true, observer;
    var deck = document.createElement('span');
    deck.className = 'chloe-dialogue-deck';
    function addRow(item) {
      var row = document.createElement('span');
      var title = document.createElement('strong');
      var body = document.createElement('span');
      row.className = 'chloe-dialogue-copy';
      row.setAttribute('aria-hidden', 'true');
      title.className = 'chloe-dialogue-title'; title.textContent = item.title;
      body.className = 'chloe-dialogue-body'; body.textContent = item.body;
      title.hidden = !item.title; body.hidden = !item.body;
      row.append(title, body); deck.appendChild(row); rows.push(row);
      return rows.length - 1;
    }
    messages.forEach(addRow);
    var toggle = document.createElement('button');
    toggle.className = 'chloe-dialogue-toggle';
    toggle.type = 'button';
    bubble.classList.add('chloe-dialogue');
    if (window.getComputedStyle(bubble).position === 'static') bubble.style.position = 'relative';
    bubble.dataset.dialogueVersion = '1.2.0';
    bubble.setAttribute('aria-live', 'off');
    bubble.removeAttribute('aria-hidden');
    bubble.replaceChildren(deck, toggle);

    function canRun() {
      return !destroyed && !paused && !reduced.matches && !document.hidden && onScreen && !hovered && !focused;
    }
    function emit(name, detail) {
      bubble.dispatchEvent(new CustomEvent(name, { detail: detail }));
    }
    function state() {
      return paused ? 'paused' : reduced.matches ? 'reduced' : document.hidden ? 'hidden' :
        !onScreen ? 'offscreen' : hovered || focused ? 'reading' : 'playing';
    }
    function updateState() {
      var value = state(), changed = bubble.dataset.dialogueState !== value;
      bubble.dataset.dialogueState = value;
      var stopped = paused || reduced.matches;
      var label = reduced.matches ? '동작 줄이기 설정으로 자동 넘김 정지' : stopped ? '말풍선 자동 넘김 재생' : '말풍선 자동 넘김 멈추기';
      toggle.setAttribute('aria-label', label); toggle.title = label;
      toggle.disabled = reduced.matches;
      toggle.setAttribute('aria-pressed', String(paused));
      icon(toggle, stopped);
      if (changed) emit('chloe:dialogue-state', { paused: paused, state: value });
    }
    function schedule(delay) {
      window.clearTimeout(timer); timer = 0;
      if (canRun()) timer = window.setTimeout(function () { advance(false); }, delay == null ? interval : delay);
    }
    function position() {
      var point = reduced.matches ? positions[0] : positions[turn % positions.length];
      bubble.style.setProperty('--chloe-dialogue-x', (point[0] * offsetX).toFixed(2) + 'px');
      bubble.style.setProperty('--chloe-dialogue-y', (point[1] * offsetY).toFixed(2) + 'px');
    }
    function speak(item, manual) {
      try {
        var character = find(options.character);
        if (character && window.ChloeMotion) {
          window.ChloeMotion.mount(character).then(function (controller) {
            if (!destroyed && controller && onScreen && !document.hidden) {
              if (typeof controller.acknowledge === 'function') controller.acknowledge();
              else controller.greet();
            }
          }).catch(function () {});
        }
      } catch (_) { /* A missing character still leaves a useful speech bubble. */ }
      if (typeof options.onSpeak === 'function') {
        try { options.onSpeak(item, controller); } catch (_) { /* Host callbacks cannot interrupt the reader. */ }
      }
      emit('chloe:utterance', { message: item, index: index, manual: manual });
    }
    function show(nextIndex, manual, animate) {
      if (destroyed) return false;
      window.clearTimeout(timer); window.clearTimeout(transitionTimer);
      rows.forEach(function (row) { row.classList.remove('is-leaving'); });
      function commit() {
        if (destroyed) return;
        transitionTimer = 0;
        rows.forEach(function (row, rowIndex) {
          var active = rowIndex === nextIndex;
          row.classList.toggle('is-active', active);
          row.classList.remove('is-leaving');
          row.setAttribute('aria-hidden', String(!active));
        });
        index = nextIndex; bubble.dataset.dialogueIndex = String(index);
        if (animate) { turn += 1; initial = false; }
        position();
        if (animate) speak(messages[index], manual);
        updateState(); schedule(initial ? firstDelay : interval);
      }
      if (animate && !reduced.matches && rows[index] && rows[index] !== rows[nextIndex]) {
        rows[index].classList.add('is-leaving');
        transitionTimer = window.setTimeout(commit, 160);
      } else commit();
      return true;
    }
    function advance(manual) {
      if (destroyed) return false;
      if (!manual && !canRun()) { sync(); return false; }
      playlistIndex = (playlistIndex + 1) % playlistLength;
      return show(playlistIndex, manual, true);
    }
    function sync() {
      if (destroyed) return;
      onScreen = visible(bubble);
      position(); updateState(); schedule(initial ? firstDelay : interval);
    }
    function enter() { hovered = true; sync(); }
    function leave() { hovered = false; sync(); }
    function focusIn() { focused = true; sync(); }
    function focusOut(event) {
      if (event.relatedTarget && bubble.contains(event.relatedTarget)) return;
      focused = false; sync();
    }
    function toggleClick(event) {
      event.preventDefault(); event.stopPropagation();
      if (paused) controller.play(); else controller.pause();
      // Pointer clicks should not leave a keyboard reading hold behind.
      // Keyboard activation keeps focus so its user can continue using the control.
      if (event.detail > 0) toggle.blur();
    }
    var playlistLength = messages.length;
    var controller = {
      element: bubble,
      play: function () { if (destroyed) return; paused = false; sync(); },
      pause: function () {
        if (destroyed) return;
        paused = true;
        window.clearTimeout(transitionTimer); transitionTimer = 0;
        rows.forEach(function (row) { row.classList.remove('is-leaving'); });
        sync();
      },
      next: function () { return advance(true); },
      say: function (value) {
        if (destroyed) return false;
        var item = message(value);
        if (!item.title && !item.body) return false;
        var targetIndex = messages.findIndex(function (entry) { return entry.title === item.title && entry.body === item.body; });
        if (targetIndex < 0) { targetIndex = messages.length; messages.push(item); addRow(item); }
        return show(targetIndex, true, true);
      },
      destroy: function () {
        if (destroyed) return; destroyed = true;
        window.clearTimeout(timer); window.clearTimeout(transitionTimer);
        if (observer) observer.disconnect();
        document.removeEventListener('visibilitychange', sync);
        window.removeEventListener('resize', sync);
        window.removeEventListener('scroll', sync);
        if (reduced.removeEventListener) reduced.removeEventListener('change', sync); else reduced.removeListener(sync);
        bubble.removeEventListener('pointerenter', enter); bubble.removeEventListener('pointerleave', leave);
        bubble.removeEventListener('focusin', focusIn); bubble.removeEventListener('focusout', focusOut);
        toggle.removeEventListener('click', toggleClick);
        bubble.replaceChildren.apply(bubble, originals);
        Object.keys(attributes).forEach(function (name) {
          if (attributes[name] == null) bubble.removeAttribute(name); else bubble.setAttribute(name, attributes[name]);
        });
        mounts.delete(bubble);
      }
    };
    mounts.set(bubble, controller);
    bubble.addEventListener('pointerenter', enter, { passive: true });
    bubble.addEventListener('pointerleave', leave, { passive: true });
    bubble.addEventListener('focusin', focusIn); bubble.addEventListener('focusout', focusOut);
    toggle.addEventListener('click', toggleClick);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', sync, { passive: true });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(sync, { threshold: [0, .01] }); observer.observe(bubble);
    } else window.addEventListener('scroll', sync, { passive: true });
    if (reduced.addEventListener) reduced.addEventListener('change', sync); else reduced.addListener(sync);
    show(0, false, false);
    return controller;
  }
  window.ChloeDialogue = Object.freeze({ version: '1.3.0', mount: mount });
}());
