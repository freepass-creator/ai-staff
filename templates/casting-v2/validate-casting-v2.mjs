import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('사용법: node validate-casting-v2.mjs 작품/characters/candidates/후보코드/casting.json');
  process.exit(2);
}

const file = resolve(input);
const base = dirname(file);
const data = JSON.parse(await readFile(file, 'utf8'));
const errors = [];
const expect = (ok, message) => { if (!ok) errors.push(message); };

expect(data.template === 'CASTING-ABS-v2.0', 'template은 CASTING-ABS-v2.0이어야 합니다.');
expect(Array.isArray(data.canvas_px) && data.canvas_px[0] === 2400 && data.canvas_px[1] === 3200, 'canvas_px는 [2400, 3200]이어야 합니다.');
expect(data.scale_px_per_cm === 10, 'scale_px_per_cm은 10이어야 합니다.');
expect(data.grid_top_y_px === 410, 'grid_top_y_px는 410이어야 합니다.');
expect(data.floor_y_px === 2410, 'floor_y_px는 2410이어야 합니다.');
expect(Number.isFinite(data.adult_age) && data.adult_age >= 18, 'adult_age는 18 이상이어야 합니다.');
expect(Number.isFinite(data.height_cm), 'height_cm이 필요합니다.');
expect(data.body_height_px === data.height_cm * 10, 'body_height_px는 height_cm × 10과 같아야 합니다.');
expect(JSON.stringify(data.views) === JSON.stringify(['front', 'exact-profile', 'back']), 'views는 front, exact-profile, back 순서여야 합니다.');

const pageFiles = [
  ['01_overview', 'casting-profile.jpg'],
  ['02_body_scale', 'body-turnaround.jpg'],
  ['03_face_expression', 'expression-test.jpg'],
  ['04_costume', 'costume-test.jpg'],
  ['05_movement', 'pose-test.jpg'],
  ['06_chemistry', 'chemistry-test.jpg'],
];

for (const [key, name] of pageFiles) {
  const status = data.pages?.[key];
  expect(status, `pages.${key} 상태가 필요합니다.`);
  if (['review', 'revision', 'passed', 'locked'].includes(status)) {
    try { await access(resolve(base, name)); }
    catch { errors.push(`${name} 파일이 없습니다.`); }
  }
}

if (errors.length) {
  console.error(`검증 실패: ${errors.length}건`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`검증 통과: ${data.candidate_code} · ${data.display_name}`);
