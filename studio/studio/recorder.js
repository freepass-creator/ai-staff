/*
 * Chloe Motion Studio — silent, real-time canvas recording.
 * The host owns composition, playback, download URLs and the resulting Blob.
 * No camera, microphone, audio track or network access is requested here.
 */
(function (global) {
  'use strict';

  var MAX_DURATION_MS = 30000;
  var MAX_BYTES = 50 * 1024 * 1024;
  var STOP_AT_BYTES = 45 * 1024 * 1024;
  var MIME_TYPES = [
    'video/mp4;codecs=avc1.42E028',
    'video/mp4;codecs=avc1.4D4028',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  function boundedNumber(value, fallback, minimum, maximum) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0
      ? Math.min(maximum, Math.max(minimum, number))
      : fallback;
  }

  function createError(code, message, cause) {
    var error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function create(canvas, options) {
    options = options || {};
    var callbacks = {
      onState: options.onState,
      onComplete: options.onComplete,
      onError: options.onError
    };
    var fps = boundedNumber(options.fps, 30, 1, 60);
    var maxDurationMs = boundedNumber(options.maxDurationMs, MAX_DURATION_MS, 100, MAX_DURATION_MS);
    var document = global.document;
    var Recorder = global.MediaRecorder;
    var mimeTypes = [];
    if (typeof Recorder === 'function' && typeof Recorder.isTypeSupported === 'function') {
      mimeTypes = MIME_TYPES.filter(function (type) {
        try { return Recorder.isTypeSupported(type); } catch (_) { return false; }
      });
    }
    var supported = Boolean(
      canvas && typeof canvas.captureStream === 'function' &&
      typeof global.Blob === 'function' && mimeTypes.length
    );
    var phase = supported ? 'idle' : 'unsupported';
    var current = null;
    var destroyed = false;
    var lastError = null;

    function now() {
      return global.performance && typeof global.performance.now === 'function'
        ? global.performance.now() : Date.now();
    }

    // A host callback must not interrupt cleanup or corrupt recorder state.
    function notify(name, value) {
      if (typeof callbacks[name] !== 'function') return;
      try { callbacks[name](value); } catch (error) {
        if (global.console && typeof global.console.error === 'function') {
          global.console.error('[ChloeRecorder] ' + name + ' callback failed:', error);
        }
      }
    }

    function active(session) {
      return !destroyed && current === session && !session.settled;
    }

    function elapsed(session) {
      if (!session || session.startedAt === null) return 0;
      return Math.max(0, Math.round((session.endedAt === null ? now() : session.endedAt) - session.startedAt));
    }

    function message() {
      if (phase === 'unsupported') return '이 브라우저에서는 영상 녹화를 지원하지 않아요.';
      if (phase === 'starting') return '녹화를 준비하고 있어요.';
      if (phase === 'recording') return '무음 영상을 녹화하고 있어요.';
      if (phase === 'stopping') return '녹화를 마무리하고 있어요.';
      if (phase === 'error') return lastError ? lastError.message : '녹화를 완료하지 못했어요.';
      if (phase === 'destroyed') return '녹화 도구를 종료했어요.';
      if (phase === 'complete') {
        if (current.reason === 'hidden') return '화면이 보이지 않아 녹화를 마쳤어요. 여기까지의 영상을 저장할 수 있어요.';
        if (current.reason === 'memory') return '메모리 사용을 줄이기 위해 녹화를 마쳤어요. 여기까지의 영상을 저장할 수 있어요.';
        if (current.reason === 'stream-ended') return '영상 스트림이 끝나 녹화를 마쳤어요. 여기까지의 영상을 저장할 수 있어요.';
        return '녹화를 마쳤어요. 영상을 저장할 수 있어요.';
      }
      return '녹화할 준비가 됐어요.';
    }

    function snapshot() {
      var duration = elapsed(current);
      return Object.freeze({
        status: phase,
        supported: supported && !destroyed,
        recording: phase === 'recording',
        busy: phase === 'starting' || phase === 'recording' || phase === 'stopping',
        elapsedMs: duration,
        durationMs: duration,
        targetDurationMs: current ? current.targetDurationMs : 0,
        maxDurationMs: maxDurationMs,
        mimeType: current ? current.mimeType : '',
        bytes: current ? current.bytes : 0,
        reason: current ? current.reason : '',
        message: message()
      });
    }

    function emitState() { notify('onState', snapshot()); }

    function clearTimers(session) {
      global.clearTimeout(session.durationTimer);
      global.clearTimeout(session.stopTimer);
      global.clearInterval(session.stateTimer);
      session.durationTimer = session.stopTimer = session.stateTimer = null;
    }

    function detachRecorder(recorder) {
      if (!recorder) return;
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
    }

    function cleanup(session, stopRecorder) {
      clearTimers(session);
      if (document && session.visibilityListener) {
        document.removeEventListener('visibilitychange', session.visibilityListener);
        session.visibilityListener = null;
      }
      var recorder = session.recorder;
      detachRecorder(recorder);
      if (stopRecorder && recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch (_) { /* Already stopped or failed. */ }
      }
      if (session.stream) {
        session.stream.getTracks().forEach(function (track) {
          if (session.trackEndedListener && typeof track.removeEventListener === 'function') {
            track.removeEventListener('ended', session.trackEndedListener);
          }
          try { track.stop(); } catch (_) { /* Continue releasing other tracks. */ }
        });
      }
      session.recorder = session.stream = session.trackEndedListener = null;
      session.chunks = [];
    }

    function fail(session, error) {
      if (!active(session)) return;
      session.settled = true;
      if (session.endedAt === null) session.endedAt = now();
      session.reason = error.code || 'error';
      lastError = error;
      cleanup(session, true);
      phase = 'error';
      emitState();
      notify('onError', error);
    }

    function stopSession(session, reason) {
      if (!active(session) || phase === 'stopping' || !session.recorder) return false;
      session.reason = reason;
      session.endedAt = now();
      clearTimers(session);
      phase = 'stopping';
      // Stop is asynchronous: final dataavailable must arrive before completion.
      session.stopTimer = global.setTimeout(function () {
        fail(session, createError('stop-timeout', '브라우저가 녹화를 마무리하지 못했어요. 짧게 다시 녹화해 주세요.'));
      }, 6000);
      emitState();
      if (!active(session)) return false;
      try {
        if (session.recorder.state !== 'inactive') session.recorder.stop();
      } catch (error) {
        fail(session, createError('stop-failed', '녹화를 마무리하지 못했어요. 다시 시도해 주세요.', error));
        return false;
      }
      return true;
    }

    function finish(session, recorder) {
      if (!active(session) || session.recorder !== recorder) return;
      if (session.endedAt === null) session.endedAt = now();
      if (!session.reason) session.reason = 'stream-ended';
      if (!session.bytes || !session.chunks.length) {
        fail(session, createError('empty-recording', '영상 프레임이 저장되지 않았어요. 화면을 켜 둔 상태에서 다시 녹화해 주세요.'));
        return;
      }
      var blob;
      try {
        // Use the actual format chosen by the recorder, not a requested suffix.
        session.mimeType = recorder.mimeType || session.mimeType || session.chunks[0].type;
        blob = new global.Blob(session.chunks, { type: session.mimeType });
      } catch (error) {
        fail(session, createError('blob-failed', '녹화한 영상을 저장할 준비를 하지 못했어요.', error));
        return;
      }
      var result = {
        blob: blob,
        mimeType: blob.type || session.mimeType,
        extension: /^video\/mp4(?:;|$)/i.test(session.mimeType) ? 'mp4' :
          (/^video\/webm(?:;|$)/i.test(session.mimeType) ? 'webm' : 'bin'),
        durationMs: elapsed(session),
        reason: session.reason
      };
      // Mark settled before any callback can stop, restart or destroy this run.
      session.settled = true;
      cleanup(session, false);
      phase = 'complete';
      emitState();
      notify('onComplete', result);
    }

    function collect(session, recorder, event) {
      if (!active(session) || session.recorder !== recorder) return;
      try {
        var chunk = event.data;
        if (!chunk || !chunk.size) return;
        // The soft stop leaves room for the recorder's final chunk. A browser
        // may deliver a larger chunk after a stall; never retain beyond 50 MiB.
        if (session.bytes + chunk.size > MAX_BYTES) {
          fail(session, createError('memory-limit', '영상 데이터가 너무 커서 녹화를 중단했어요. 더 짧은 길이나 작은 화면 크기로 다시 녹화해 주세요.'));
          return;
        }
        session.chunks.push(chunk);
        session.bytes += chunk.size;
        session.mimeType = recorder.mimeType || chunk.type || session.mimeType;
        if (session.bytes >= STOP_AT_BYTES) stopSession(session, 'memory');
      } catch (error) {
        fail(session, createError('chunk-failed', '녹화 데이터를 처리하지 못했어요. 다시 시도해 주세요.', error));
      }
    }

    function start(startOptions) {
      if (destroyed) return false;
      if (current && !current.settled) return false;
      if (!supported) {
        notify('onError', createError('unsupported', '이 브라우저에서는 영상 녹화를 지원하지 않아요. 다른 최신 브라우저에서 시도해 주세요.'));
        return false;
      }
      startOptions = startOptions || {};
      lastError = null;
      var session = {
        settled: false,
        recorder: null,
        stream: null,
        chunks: [],
        bytes: 0,
        mimeType: '',
        reason: '',
        startedAt: null,
        endedAt: null,
        targetDurationMs: boundedNumber(startOptions.durationMs, Math.min(8000, maxDurationMs), 100, maxDurationMs),
        durationTimer: null,
        stopTimer: null,
        stateTimer: null,
        visibilityListener: null,
        trackEndedListener: null
      };
      current = session;
      phase = 'starting';
      emitState();
      if (!active(session)) return false;
      if (document && document.hidden) {
        fail(session, createError('page-hidden', '화면이 열려 있을 때 녹화를 시작해 주세요.'));
        return false;
      }
      if (!(canvas.width > 0 && canvas.height > 0)) {
        fail(session, createError('empty-canvas', '녹화할 화면이 준비되지 않았어요.'));
        return false;
      }
      try {
        session.stream = canvas.captureStream(fps);
        if (!session.stream || !session.stream.getVideoTracks().length) {
          throw new Error('Canvas did not provide a video track.');
        }
      } catch (error) {
        fail(session, createError('capture-failed', '화면을 녹화할 수 없어요. 이미지가 모두 로드됐는지 확인해 주세요.', error));
        return false;
      }
      var bitrate = Math.round(Math.min(8000000, Math.max(2000000, canvas.width * canvas.height * fps * 0.1)));
      var lastStartError = null;
      for (var i = 0; i < mimeTypes.length; i += 1) {
        var recorder = null;
        try {
          recorder = new Recorder(session.stream, { mimeType: mimeTypes[i], videoBitsPerSecond: bitrate });
          session.recorder = recorder;
          session.mimeType = recorder.mimeType || mimeTypes[i];
          (function (candidate) {
            candidate.ondataavailable = function (event) { collect(session, candidate, event); };
            candidate.onstop = function () { finish(session, candidate); };
            candidate.onerror = function (event) {
              if (!active(session) || session.recorder !== candidate) return;
              fail(session, createError('encoding-failed', '브라우저가 영상을 녹화하지 못했어요. 짧게 다시 시도해 주세요.', event.error || event));
            };
          })(recorder);
          session.startedAt = now();
          recorder.start(250);
          break;
        } catch (error) {
          lastStartError = error;
          detachRecorder(recorder);
          if (recorder && recorder.state !== 'inactive') {
            try { recorder.stop(); } catch (_) { /* Try the next supported format. */ }
          }
          session.recorder = null;
          session.startedAt = null;
        }
      }
      if (!active(session)) return false;
      if (!session.recorder) {
        fail(session, createError('start-failed', '이 환경에서는 영상 녹화를 시작할 수 없어요. 다른 브라우저에서 시도해 주세요.', lastStartError));
        return false;
      }
      phase = 'recording';
      session.durationTimer = global.setTimeout(function () { stopSession(session, 'duration'); }, session.targetDurationMs);
      session.stateTimer = global.setInterval(function () { if (active(session)) emitState(); }, 100);
      session.visibilityListener = function () {
        if (document.hidden) stopSession(session, 'hidden');
      };
      if (document) document.addEventListener('visibilitychange', session.visibilityListener);
      session.trackEndedListener = function () { stopSession(session, 'stream-ended'); };
      session.stream.getVideoTracks().forEach(function (track) {
        if (typeof track.addEventListener === 'function') track.addEventListener('ended', session.trackEndedListener);
      });
      emitState();
      return true;
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (current && !current.settled) {
        current.settled = true;
        current.endedAt = now();
        current.reason = 'destroyed';
        cleanup(current, true);
      }
      phase = 'destroyed';
      emitState();
      callbacks = {};
    }

    var controller = {
      start: start,
      stop: function () { return current ? stopSession(current, 'manual') : false; },
      destroy: destroy,
      supported: supported
    };
    Object.defineProperty(controller, 'state', { enumerable: true, get: snapshot });
    emitState();
    return Object.freeze(controller);
  }

  global.ChloeRecorder = Object.freeze({ create: create });
})(window);
