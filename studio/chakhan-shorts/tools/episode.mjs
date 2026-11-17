// 에피소드 JSON 을 스튜디오 페이지에 넘길 모양으로 바꾼다.
// 이미지 칸(staffKP·staffEnd)은 등록된 스태프 id 이거나, 에피소드 파일 기준 상대/절대 경로의 이미지 파일이다.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, basename, extname } from 'node:path';

export const TEXT_FIELDS = ['title', 'subtitle', 'kicker', 'leftTitle', 'rightTitle', 'leftDesc', 'rightDesc', 'point', 'leftBar', 'rightBar', 'closing', 'closingSub'];
export const IMAGE_SLOTS = ['staffKP', 'staffEnd'];
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const isPath = v => typeof v === 'string' && (/[\\/]/.test(v) || Object.keys(MIME).includes(extname(v).toLowerCase()));

export function episodeForPage(ep, baseDir) {
  const warnings = [], images = [], sources = {};
  const page = { resolution: '1080' };
  for (const k of TEXT_FIELDS) {
    if (ep[k] == null || String(ep[k]).trim() === '') throw new Error(`${k}: 비어 있음`);
    page[k] = String(ep[k]);
  }
  if (ep.duration != null && ep.duration !== 'auto') page.duration = String(ep.duration);
  for (const slot of IMAGE_SLOTS) {
    const v = ep[slot];
    if (v == null) continue;
    if (v === '' || v === false || v === 'none') { page[slot] = ''; continue; }
    if (!isPath(v)) { page[slot] = v; sources[slot] = { id: v }; continue; } // 등록 스태프 id
    const file = resolve(baseDir, v);
    if (!existsSync(file)) throw new Error(`${slot}: 이미지 파일이 없음 ${file}`);
    const ext = extname(file).toLowerCase();
    if (!MIME[ext]) throw new Error(`${slot}: PNG/WebP/JPG 만 됩니다 (${ext})`);
    if (ext === '.jpg' || ext === '.jpeg') warnings.push(`${slot}: JPG는 배경이 투명하지 않습니다 — 누끼(투명 배경) PNG/WebP 권장`);
    const buf = readFileSync(file);
    const sha = createHash('sha256').update(buf).digest('hex');
    const id = `file:${sha.slice(0, 12)}`;
    if (!images.some(i => i.id === id)) images.push({ id, label: basename(file), data: `data:${MIME[ext]};base64,${buf.toString('base64')}` });
    page[slot] = id;
    sources[slot] = { file, sha256: sha };
  }
  page.images = images;
  return { page, warnings, sources };
}
