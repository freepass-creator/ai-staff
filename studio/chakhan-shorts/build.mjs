// 착한거래 쇼츠 스튜디오 빌드 — 템플릿에 CI 정본 SVG와 글꼴(SUITE Heavy, Pretendard)을 넣어
// 더블클릭만으로 열리는 단일 HTML(chakhan-shorts-studio.html)을 만든다.
// file:// 로 연 페이지는 옆 폴더의 글꼴을 못 읽으므로 글꼴은 base64 로 넣는다.
// 실행: node studio/chakhan-shorts/build.mjs  (저장소 루트에서)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const read = p => readFileSync(join(root, p));

const fonts = [
  { family: 'SUITE', weight: '100 1000', file: 'public-release/site/fonts/SUITE-Heavy.woff2' },
  { family: 'Pretendard', weight: '100 550', file: 'blog/fonts/Pretendard-Medium.woff2' },
  { family: 'Pretendard', weight: '551 1000', file: 'blog/fonts/Pretendard-Bold.woff2' },
];
const ciFile = 'asset-library/chakhan-ci/chakhan-ci-on-dark.svg';

const faces = fonts.map(f =>
  `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-display:block;src:url(data:font/woff2;base64,${read(f.file).toString('base64')}) format('woff2')}`
).join('\n');

const ci = read(ciFile).toString('utf8').trim();

// AI 스태프: tools/fetch_staff.py 가 현재 API에서 SHA 대조 후 만든 staff/ 를 넣는다
const staffDir = join(here, 'staff');
const staffMeta = JSON.parse(readFileSync(join(staffDir, 'staff.json'), 'utf8'));
const staff = staffMeta.staff.map(s => ({
  id: s.id, label: s.label, usage: s.usage, emotion: s.emotion, source_sha256: s.source_sha256,
  data: `data:image/webp;base64,${readFileSync(join(staffDir, s.file)).toString('base64')}`,
}));

let html = readFileSync(join(here, 'src', 'studio.template.html'), 'utf8');
for (const mark of ['/*__FONT_FACES__*/', '"__CI_DARK_SVG__"', '"__STAFF__"'])
  if (!html.includes(mark)) throw new Error(`템플릿 자리표시가 없습니다: ${mark}`);
html = html.replace('/*__FONT_FACES__*/', () => faces)
  .replace('"__CI_DARK_SVG__"', () => JSON.stringify(ci))
  .replace('"__STAFF__"', () => JSON.stringify(staff));

const out = join(here, 'chakhan-shorts-studio.html');
writeFileSync(out, html);
const sha = p => createHash('sha256').update(read(p)).digest('hex').slice(0, 12);
console.log(`built ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  CI ${ciFile} sha256:${sha(ciFile)}`);
for (const f of fonts) console.log(`  ${f.family} ${f.weight} ${f.file} sha256:${sha(f.file)}`);
console.log(`  AI 스태프 ${staff.length}컷 (API revision ${staffMeta.api_revision.slice(0, 12)})`);
