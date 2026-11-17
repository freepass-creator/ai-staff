// 에피소드 JSON → 쇼츠 MP4(1080×1920, H.264, 30fps). 실시간 녹화가 아니라 프레임을 하나씩 정확히 그려 ffmpeg 로 묶는다.
// 실행: node studio/chakhan-shorts/render.mjs <episode.json> [out.mp4] [--fps 30] [--force]
//  - 글자가 자리를 넘치면 멈춘다(--force 로 무시 가능, 권장하지 않음).
//  - voice 가 있고 duration 이 없거나 "auto" 이면 음성 길이 + 1초로 맞춘다.
//  - 결과 옆에 <out>.render.json(입력·이미지 SHA·스튜디오 SHA) 을 남긴다.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStudio } from './tools/browser.mjs';
import { episodeForPage } from './tools/episode.mjs';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const force = args.includes('--force'); if (force) args.splice(args.indexOf('--force'), 1);
const fps = Number(flag('--fps') || 30);
const [epArg, outArg] = args;
if (!epArg) { console.error('사용법: node studio/chakhan-shorts/render.mjs <episode.json> [out.mp4] [--fps 30] [--force]'); process.exit(2); }

const epFile = resolve(epArg), baseDir = dirname(epFile);
const ep = JSON.parse(readFileSync(epFile, 'utf8'));
// 기본 저장 위치: 영상은 git 에 넣지 않는다 → D:/large/ai-staff/chakhan-shorts (없으면 에피소드 옆, .gitignore 대상)
const LARGE = process.env.CHAKHAN_SHORTS_OUT || 'D:/large/ai-staff/chakhan-shorts';
const outDefault = existsSync(dirname(LARGE)) ? (mkdirSync(LARGE, { recursive: true }), join(LARGE, basename(epFile).replace(/\.json$/i, '') + '.mp4'))
  : epFile.replace(/\.json$/i, '') + '.mp4';
const out = resolve(outArg || outDefault);
const sha = buf => createHash('sha256').update(buf).digest('hex');

// 음성
let voice = null, duration = ep.duration === 'auto' ? null : (ep.duration != null ? Number(ep.duration) : null);
if (ep.voice) {
  voice = resolve(baseDir, ep.voice);
  if (!existsSync(voice)) throw new Error(`voice 파일이 없음: ${voice}`);
  const len = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voice]).toString().trim());
  if (duration == null) duration = Math.ceil(len + 1);
  if (len > duration) console.warn(`주의: 음성(${len.toFixed(1)}초)이 영상(${duration}초)보다 깁니다 — 음성이 잘립니다`);
}
duration = Math.max(8, Math.min(60, duration ?? 12));

const { page, warnings, sources } = episodeForPage({ ...ep, duration }, baseDir);
warnings.forEach(w => console.warn('주의:', w));

const { ev, close } = await openStudio();
try {
  const problems = await ev(`chakhanStudio.loadWithImages(${JSON.stringify(page)})`);
  if (problems.length) {
    problems.forEach(p => console.error('문제:', p));
    if (!force) throw new Error(`글자·이미지 문제 ${problems.length}건 — 고친 뒤 다시 실행하세요 (--force 로 무시)`);
  }
  const total = Math.round(duration * fps);
  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (voice) ffArgs.push('-i', voice);
  ffArgs.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps));
  if (voice) ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-af', `apad`, '-t', String(duration));
  ffArgs.push('-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((ok, no) => ff.on('close', c => c === 0 ? ok() : no(new Error(`ffmpeg 종료 코드 ${c}`))));
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const data = await ev(`(chakhanStudio.seek(${(i / fps).toFixed(5)}), document.getElementById('canvas').toDataURL('image/png'))`);
    if (!ff.stdin.write(Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r프레임 ${i}/${total}`);
  }
  ff.stdin.end(); await ffDone;
  process.stdout.write(`\r프레임 ${total}/${total} — ${((Date.now() - t0) / 1000).toFixed(0)}초\n`);

  const studio = join(dirname(fileURLToPath(import.meta.url)), 'chakhan-shorts-studio.html');
  const log = {
    schema: 'chakhan-shorts/render-log/v1', rendered_at: new Date().toISOString(),
    output: basename(out), output_sha256: sha(readFileSync(out)), size: '1080x1920', fps, duration,
    episode: basename(epFile), episode_sha256: sha(readFileSync(epFile)),
    studio_sha256: sha(readFileSync(studio)), images: sources,
    voice: voice ? { file: voice, sha256: sha(readFileSync(voice)) } : null,
    forced_problems: force ? problems : [],
  };
  writeFileSync(out + '.render.json', JSON.stringify(log, null, 2));
  console.log(`완성: ${out}`);
} finally { close(); }
