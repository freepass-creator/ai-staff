// motion.html 의 CI 등장 모션을 프레임 단위로 그려 MP4(1080×1920, 30fps)로 만든다. 외부 패키지 없음(Edge/Chrome + ffmpeg).
// 실행: node asset-library/chakhan-ci/motion/render_motion.mjs [--word chakhan,freepass] [--format v,h,s] [--theme ...] [--scene ...] [--quote "말\n둘째 줄" --who "누가"]
// 결과: D:/large/ai-staff/chakhan-ci-motion/<낱말>-<비율>/<낱말>-motion-<비율>-<색>-<장면>.mp4 + compare-*.mp4. 영상은 git 에 넣지 않는다.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.CHAKHAN_CI_MOTION_OUT || 'D:/large/ai-staff/chakhan-ci-motion';
const FPS = 30, HOLD = 0.8;
const BROWSERS = [process.env.CHAKHAN_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (cmd, args) => new Promise((ok, no) => spawn(cmd, args, { stdio: 'inherit' }).on('close', c => c === 0 ? ok() : no(new Error(`${cmd} ${c}`))));

async function open(url) {
  const exe = BROWSERS.find(existsSync);
  if (!exe) throw new Error('Edge/Chrome 을 찾지 못했습니다');
  const profile = mkdtempSync(join(tmpdir(), 'chakhan-motion-'));
  const port = 9900 + Math.floor(Math.random() * 500);
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 75 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  if (!target) { proc.kill(); throw new Error('브라우저 연결 실패'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.addEventListener('open', ok); ws.addEventListener('error', no); });
  let id = 0; const wait = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const m = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text); return m.result?.result?.value; };
  await cdp('Page.enable'); await cdp('Page.navigate', { url });
  for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev('!!window.motion && motion.ready()')) break; } catch {} }
  return { ev, close: () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 1500); } };
}

mkdirSync(OUT, { recursive: true });
// 무엇을 뽑을지: 인자가 없으면 미리 만들어 둘 전체 세트. --word·--theme·--format·--scene 으로 좁히고(쉼표로 여러 개), --quote "말" --who "누가" 로 ⑥ 문구를 바꾼다.
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i < 0 ? null : argv[i + 1]; };
const pick = (k, all) => (opt(k) ? opt(k).split(',') : all);
const SETS = [
  { word: 'chakhan', themes: ['shorts', 'light', 'dark', 'green'], quote: true },   // 착한거래: 쇼츠 노랑 + 기본 CI 초록 3가지
  { word: 'freepass', themes: ['shorts', 'mono_light', 'mono_dark'], quote: false }, // 프리패스: 대표색 미정이라 쇼츠·검정·흰색
];
const { ev, close } = await open(pathToFileURL(join(HERE, 'motion.html')).href);
const made = {};
try {
  if (opt('quote')) await ev(`motion.quote(${JSON.stringify(opt('quote').replace(/\\n/g, '\n'))}, ${JSON.stringify(opt('who') || '')})`);
  const scenesAll = await ev('motion.list()');
  for (const set of SETS.filter(s => pick('word', SETS.map(x => x.word)).includes(s.word)))
    for (const format of pick('format', ['v', 'h', 's']))
      for (const theme of pick('theme', set.themes).filter(t => set.themes.includes(t) || opt('theme')))
        for (const id of pick('scene', scenesAll).filter(id => id !== 'quote' || set.quote)) {
          const dur = (await ev(`motion.set(${JSON.stringify(id)}, '${set.word}', '${theme}', '${format}')`)) + HOLD, total = Math.round(dur * FPS);
          const dir = join(OUT, `${set.word}-${format}`); mkdirSync(dir, { recursive: true });
          const file = join(dir, `${set.word}-motion-${format}-${theme}-${id}.mp4`);
          const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
          const done = new Promise((ok, no) => ff.on('close', c => c === 0 ? ok() : no(new Error('ffmpeg ' + c))));
          for (let i = 0; i < total; i++) {
            const data = await ev(`(motion.seek(${(i / FPS).toFixed(5)}), document.getElementById('canvas').toDataURL('image/png'))`);
            if (!ff.stdin.write(Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
          }
          ff.stdin.end(); await done; made[`${set.word}|${format}|${theme}|${id}`] = file; console.log('완성:', file);
        }
} finally { close(); }

// 나란히 비교(폰에서 한 번에 보기): 높이 640 으로 줄여 가로로 붙인다
async function compare(name, files) {
  files = files.filter(Boolean); if (files.length < 2) return;
  const inputs = files.flatMap(f => ['-i', f]);
  const scale = files.map((_, i) => `[${i}:v]scale=-2:640,tpad=stop_mode=clone:stop_duration=1[v${i}]`).join(';');
  const filter = `${scale};${files.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${files.length}:shortest=1[o]`;
  const out = join(OUT, `compare-${name}.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[o]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log('비교:', out);
}
const M = (w, f, t, s) => made[`${w}|${f}|${t}|${s}`];
const scenes = ['updown', 'stroke', 'stamp', 'pop', 'band', 'quote'];
await compare('chakhan-v-shorts-scenes', scenes.map(s => M('chakhan', 'v', 'shorts', s)));
await compare('chakhan-v-updown-themes', ['shorts', 'light', 'dark', 'green'].map(t => M('chakhan', 'v', t, 'updown')));
await compare('chakhan-quote-formats', ['v', 's', 'h'].map(f => M('chakhan', f, 'shorts', 'quote')));
await compare('freepass-v-shorts-scenes', scenes.map(s => M('freepass', 'v', 'shorts', s)));
