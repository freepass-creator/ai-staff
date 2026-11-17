// 검수용: 지정한 시각의 화면을 PNG 로 저장한다. 에피소드 JSON 을 주면 그 내용으로 그린다.
// 실행: node studio/chakhan-shorts/tools/frames.mjs <출력폴더> [초,초,...] [episode.json]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { openStudio } from './browser.mjs';
import { episodeForPage } from './episode.mjs';

const outDir = resolve(process.argv[2] || join(tmpdir(), 'chakhan-frames'));
const times = (process.argv[3] || '0.6,1.6,2.4,3.4,4.6,6.2,8.0,9.2,11.5').split(',').map(Number);
mkdirSync(outDir, { recursive: true });
const { ev, close } = await openStudio();
try {
  if (process.argv[4]) {
    const file = resolve(process.argv[4]);
    const { page, warnings } = episodeForPage(JSON.parse(readFileSync(file, 'utf8')), dirname(file));
    warnings.forEach(w => console.warn('주의:', w));
    const problems = await ev(`chakhanStudio.loadWithImages(${JSON.stringify(page)})`);
    problems.forEach(p => console.warn('넘침:', p));
  }
  for (const s of times) {
    const data = await ev(`(chakhanStudio.seek(${s}), document.getElementById('canvas').toDataURL('image/png'))`);
    const file = join(outDir, `frame-${String(s).replace('.', '_')}s.png`);
    writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file);
  }
} finally { close(); }
