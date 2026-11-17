// 헤드리스 Edge/Chrome 을 원격 디버깅(CDP)으로 띄워 스튜디오 페이지를 다룬다. 외부 패키지 없음.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const STUDIO = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'chakhan-shorts-studio.html')).href;
const BROWSERS = [
  process.env.CHAKHAN_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function openStudio() {
  const exe = BROWSERS.find(existsSync);
  if (!exe) throw new Error('Edge/Chrome 을 찾지 못했습니다 (CHAKHAN_BROWSER 로 경로 지정 가능)');
  const profile = mkdtempSync(join(tmpdir(), 'chakhan-studio-'));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 75 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  if (!target) { proc.kill(); throw new Error('브라우저 디버깅 연결 실패'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.addEventListener('open', ok); ws.addEventListener('error', no); });
  let id = 0; const wait = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => {
    const m = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    const ex = m.result?.exceptionDetails;
    if (ex) throw new Error(ex.exception?.description || ex.text);
    return m.result?.result?.value;
  };
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: STUDIO });
  for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev('!!window.chakhanStudio && chakhanStudio.ready()')) break; } catch {} }
  await sleep(200);
  const close = () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 1500); };
  return { ev, close };
}
