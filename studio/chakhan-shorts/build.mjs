// 착한거래 쇼츠 스튜디오 빌드 — 템플릿에 CI 정본 SVG와 글꼴(SUITE Heavy, Pretendard)을 넣어
// 더블클릭만으로 열리는 단일 HTML(chakhan-shorts-studio.html)을 만든다.
// file:// 로 연 페이지는 옆 폴더의 글꼴을 못 읽으므로 글꼴은 base64 로 넣는다.
// 실행: node studio/chakhan-shorts/build.mjs  (저장소 루트에서)
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
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
// 로컬 작업 폴더(git 밖): 스튜디오 HTML · episodes\ · images\ · output\ · 영상만들기.bat
// 여기서 대본을 고치고 영상을 뽑아 바로 올린다. 저장소 위치가 바뀌면 다시 빌드하면 bat 가 새 경로를 가리킨다.
const LARGE = process.env.CHAKHAN_SHORTS_OUT || 'D:/large/ai-staff/chakhan-shorts';
if (existsSync(dirname(LARGE))) {
  for (const d of ['', 'episodes', 'images', 'output']) mkdirSync(join(LARGE, d), { recursive: true });
  writeFileSync(join(LARGE, 'chakhan-shorts-studio.html'), html);
  copyFileSync(join(here, 'convert_to_mp4.bat'), join(LARGE, 'convert_to_mp4.bat'));
  for (const f of readdirSync(join(here, 'episodes')))
    if (!existsSync(join(LARGE, 'episodes', f))) copyFileSync(join(here, 'episodes', f), join(LARGE, 'episodes', f));
  const render = join(here, 'render.mjs');
  writeFileSync(join(LARGE, '영상만들기.bat'), [
    '@echo off', 'chcp 65001 >nul', 'cd /d "%~dp0"',
    'rem episodes\\*.json 을 모두 영상으로 만든다. json 하나를 이 파일에 끌어다 놓으면 그것만 만든다.',
    `set RENDER=${render.replaceAll('/', '\\')}`,
    'if not exist "%RENDER%" (echo 렌더러를 찾지 못했습니다: %RENDER% & echo 저장소에서 node studio\\chakhan-shorts\\build.mjs 를 다시 실행하세요. & pause & exit /b 1)',
    'if not "%~1"=="" (node "%RENDER%" "%~1" "output\\%~n1.mp4" & goto done)',
    'for %%f in (episodes\\*.json) do node "%RENDER%" "%%f" "output\\%%~nf.mp4"',
    ':done', 'echo.', 'echo 완성된 영상: %~dp0output', 'pause', '',
  ].join('\r\n'));
  writeFileSync(join(LARGE, '사용법.txt'), [
    '착한거래 쇼츠 — 로컬 작업 폴더', '',
    '1. episodes\\ 의 json 을 메모장으로 고치거나 새로 만든다(예시: ep001). 규격은 저장소 studio/chakhan-shorts/EPISODE.md.',
    '   스튜디오(chakhan-shorts-studio.html)를 열어 미리 보며 고치고 「에피소드 JSON 저장」으로 받아 episodes\\ 에 넣어도 된다.',
    '2. 받은 이미지(투명 배경 PNG)는 images\\ 에 넣고 json 에 "staffKP": "../images/파일.png" 처럼 적는다.',
    '   등록 컷은 id 로: cover-think, cover-aha, cover-dejected, cover-confident, phone, tablet, guide-right',
    '3. 음성은 images\\ 옆 아무 곳에 두고 "voice": "../voice/파일.wav", "duration": "auto".',
    '4. 영상만들기.bat 더블클릭(또는 json 하나를 끌어다 놓기) → output\\ 에 MP4(1080×1920).',
    '   글자가 넘치거나 이미지 배경이 투명하지 않으면 「문제:」를 보여 주고 멈춘다. 고친 뒤 다시 실행.',
    '5. output\\ 의 MP4 를 확인하고 유튜브 쇼츠에 올린다.', '',
  ].join('\r\n'));
  console.log(`local workspace → ${LARGE}`);
}
const sha = p => createHash('sha256').update(read(p)).digest('hex').slice(0, 12);
console.log(`built ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  CI ${ciFile} sha256:${sha(ciFile)}`);
for (const f of fonts) console.log(`  ${f.family} ${f.weight} ${f.file} sha256:${sha(f.file)}`);
console.log(`  AI 스태프 ${staff.length}컷 (API revision ${staffMeta.api_revision.slice(0, 12)})`);
