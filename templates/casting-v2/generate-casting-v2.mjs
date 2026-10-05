import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const W = 2400;
const H = 3200;

const C = {
  ink: '#181916',
  ink2: '#2D2F2A',
  paper: '#F4F1EA',
  paper2: '#E9E4DA',
  line: '#C9C1B4',
  muted: '#777267',
  wine: '#7D3038',
  wine2: '#A65A5E',
  white: '#FFFDF9',
  skin: '#C8B2A2',
};

const esc = (s) => String(s).replace(/[&<>\"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const t = (x, y, value, cls = 'body', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${esc(value)}</text>`;
const rect = (x, y, w, h, attrs = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrs}/>`;
const line = (x1, y1, x2, y2, attrs = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;

function pageStart(title, subtitle, pageNo, section) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${esc(title)}</title>
  <desc>웹툰 스튜디오 공통 배우 캐스팅 표준 v2.0 편집 템플릿</desc>
  <defs>
    <linearGradient id="photo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DDD7CC"/><stop offset="1" stop-color="#BEB6A9"/></linearGradient>
    <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#191A17"/><stop offset="1" stop-color="#30312D"/></linearGradient>
    <pattern id="minorGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 0 0 H 2040" fill="none" stroke="#D8D1C6" stroke-width="1" opacity=".42"/></pattern>
    <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 0 0 H 2040" fill="none" stroke="#AFA79A" stroke-width="2" opacity=".62"/></pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".10"/></filter>
    <style>
      @font-face { font-family: '캐스팅고딕'; src: url('fonts/NotoSansKR-400.woff2') format('woff2'); font-weight: 400; }
      @font-face { font-family: '캐스팅고딕'; src: url('fonts/NotoSansKR-700.woff2') format('woff2'); font-weight: 700; }
      text { font-family: '캐스팅고딕', 'Noto Sans KR Thin', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; fill: ${C.ink}; }
      .title { font-size: 76px; font-weight: 700; letter-spacing: -3px; }
      .sub { font-size: 29px; font-weight: 400; letter-spacing: -.6px; }
      .section { font-size: 34px; font-weight: 700; letter-spacing: -1px; }
      .label { font-size: 25px; font-weight: 700; }
      .body { font-size: 25px; font-weight: 400; }
      .small { font-size: 20px; font-weight: 400; fill: ${C.muted}; }
      .tiny { font-size: 17px; font-weight: 400; fill: ${C.muted}; }
      .number { font-size: 23px; font-weight: 700; font-variant-numeric: tabular-nums; }
      .white { fill: ${C.white}; }
      .wine { fill: ${C.wine}; }
    </style>
  </defs>
  ${rect(0, 0, W, H, `fill="${C.paper}"`)}
  ${rect(0, 0, W, 320, 'fill="url(#dark)"')}
  ${rect(90, 72, 12, 154, `rx="6" fill="${C.wine2}"`)}
  ${t(140, 145, title, 'title white')}
  ${t(142, 214, subtitle, 'sub white')}
  ${rect(2070, 82, 238, 86, `rx="43" fill="${C.wine}"`)}
  ${t(2189, 139, `${pageNo} / 06`, 'number white', 'text-anchor="middle"')}
  ${t(2308, 228, section, 'small white', 'text-anchor="end" opacity=".72"')}
`;
}

function pageEnd(note = '사진 교체 뒤에도 캔버스·기준선·표기 위치를 바꾸지 않습니다.') {
  return `${line(90, 3090, 2310, 3090, `stroke="${C.line}" stroke-width="2"`)}
  ${t(90, 3135, '웹툰 스튜디오 공통 캐스팅 표준 v2.0', 'tiny')}
  ${t(2310, 3135, note, 'tiny', 'text-anchor="end"')}
</svg>`;
}

function corners(x, y, w, h, color = C.wine) {
  const d = 26;
  return `<g fill="none" stroke="${color}" stroke-width="4" opacity=".9">
    <path d="M ${x} ${y + d} V ${y} H ${x + d}"/><path d="M ${x + w - d} ${y} H ${x + w} V ${y + d}"/>
    <path d="M ${x} ${y + h - d} V ${y + h} H ${x + d}"/><path d="M ${x + w - d} ${y + h} H ${x + w} V ${y + h - d}"/>
  </g>`;
}

function bodyFigure(cx, floor, height = 980, view = 'front', color = C.ink2, opacity = .27) {
  const u = height / 980;
  const headY = floor - height + 74 * u;
  const headRx = (view === 'side' ? 42 : 55) * u;
  const shoulder = (view === 'side' ? 55 : 105) * u;
  const hip = (view === 'side' ? 47 : 74) * u;
  const top = floor - height + 150 * u;
  const waistY = floor - height + 470 * u;
  const hipY = floor - height + 555 * u;
  const kneeY = floor - height + 790 * u;
  const g = `<g fill="${color}" opacity="${opacity}">
    <ellipse cx="${cx}" cy="${headY}" rx="${headRx}" ry="${72 * u}"/>
    <path d="M ${cx - shoulder * .72} ${top} Q ${cx - shoulder} ${top + 45 * u} ${cx - 80 * u} ${waistY} Q ${cx - hip} ${hipY} ${cx - 55 * u} ${hipY + 55 * u} L ${cx - 22 * u} ${hipY + 80 * u} L ${cx + 22 * u} ${hipY + 80 * u} L ${cx + 55 * u} ${hipY + 55 * u} Q ${cx + hip} ${hipY} ${cx + 80 * u} ${waistY} Q ${cx + shoulder} ${top + 45 * u} ${cx + shoulder * .72} ${top} Z"/>
    <path d="M ${cx - shoulder * .68} ${top + 35 * u} Q ${cx - 140 * u} ${top + 230 * u} ${cx - 120 * u} ${hipY + 10 * u} Q ${cx - 108 * u} ${hipY + 35 * u} ${cx - 96 * u} ${hipY + 8 * u} L ${cx - 72 * u} ${top + 100 * u} Z"/>
    <path d="M ${cx + shoulder * .68} ${top + 35 * u} Q ${cx + 140 * u} ${top + 230 * u} ${cx + 120 * u} ${hipY + 10 * u} Q ${cx + 108 * u} ${hipY + 35 * u} ${cx + 96 * u} ${hipY + 8 * u} L ${cx + 72 * u} ${top + 100 * u} Z"/>
    <path d="M ${cx - 59 * u} ${hipY + 55 * u} Q ${cx - 67 * u} ${kneeY} ${cx - 48 * u} ${floor - 28 * u} Q ${cx - 28 * u} ${floor + 2 * u} ${cx - 5 * u} ${floor - 6 * u} L ${cx - 17 * u} ${kneeY} L ${cx - 4 * u} ${hipY + 80 * u} Z"/>
    <path d="M ${cx + 59 * u} ${hipY + 55 * u} Q ${cx + 67 * u} ${kneeY} ${cx + 48 * u} ${floor - 28 * u} Q ${cx + 28 * u} ${floor + 2 * u} ${cx + 5 * u} ${floor - 6 * u} L ${cx + 17 * u} ${kneeY} L ${cx + 4 * u} ${hipY + 80 * u} Z"/>
  </g>`;
  if (view !== 'back') return g;
  return `${g}<path d="M ${cx - 65 * u} ${top + 20 * u} Q ${cx} ${top + 70 * u} ${cx + 65 * u} ${top + 20 * u}" fill="none" stroke="${C.paper}" stroke-width="${5 * u}" opacity=".58"/>`;
}

function bustFigure(cx, cy, size = 1, mood = 'neutral') {
  const brow = mood === 'anger' ? 8 : mood === 'sad' ? -6 : 0;
  const smile = mood === 'smile' ? 12 : mood === 'sad' ? -9 : 2;
  return `<g opacity=".34" fill="${C.ink2}" stroke="${C.ink2}" stroke-width="${4 * size}" stroke-linecap="round">
    <path d="M ${cx - 115 * size} ${cy + 180 * size} Q ${cx} ${cy + 90 * size} ${cx + 115 * size} ${cy + 180 * size} L ${cx + 148 * size} ${cy + 240 * size} H ${cx - 148 * size} Z" fill="${C.ink2}" stroke="none"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${92 * size}" ry="${116 * size}" fill="${C.skin}" stroke="none"/>
    <path d="M ${cx - 90 * size} ${cy - 15 * size} Q ${cx - 76 * size} ${cy - 132 * size} ${cx + 10 * size} ${cy - 118 * size} Q ${cx + 102 * size} ${cy - 105 * size} ${cx + 91 * size} ${cy + 17 * size} Q ${cx + 54 * size} ${cy - 78 * size} ${cx - 90 * size} ${cy - 15 * size} Z" stroke="none"/>
    <path d="M ${cx - 56 * size} ${cy - 12 * size + brow} h ${38 * size}" fill="none"/>
    <path d="M ${cx + 18 * size} ${cy - 12 * size - brow} h ${38 * size}" fill="none"/>
    <circle cx="${cx - 36 * size}" cy="${cy + 8 * size}" r="${6 * size}" stroke="none"/>
    <circle cx="${cx + 36 * size}" cy="${cy + 8 * size}" r="${6 * size}" stroke="none"/>
    <path d="M ${cx - 30 * size} ${cy + 63 * size} Q ${cx} ${cy + 63 * size + smile} ${cx + 30 * size} ${cy + 63 * size}" fill="none"/>
  </g>`;
}

function photoFrame(x, y, w, h, label, kind = 'body', options = {}) {
  const footer = options.footer ?? 64;
  let figure = '';
  if (kind === 'body') figure = bodyFigure(x + w / 2, y + h - footer - 30, Math.min(h - footer - 90, w * 2.15), options.view || 'front');
  if (kind === 'bust') figure = bustFigure(x + w / 2, y + (h - footer) * .46, Math.min(w / 420, h / 520), options.mood);
  if (kind === 'pair') figure = `${bodyFigure(x + w * .39, y + h - footer - 26, (h - footer) * .70, 'front', C.ink2, .23)}${bodyFigure(x + w * .61, y + h - footer - 26, (h - footer) * .78, 'front', C.wine, .25)}`;
  return `<g>
    ${rect(x, y, w, h, `rx="8" fill="url(#photo)" stroke="${C.line}" stroke-width="2"`)}
    ${rect(x + 24, y + 24, w - 48, h - footer - 40, `rx="4" fill="none" stroke="${C.white}" stroke-width="2" stroke-dasharray="12 13" opacity=".72"`)}
    ${corners(x + 24, y + 24, w - 48, h - footer - 40)}
    ${figure}
    ${rect(x, y + h - footer, w, footer, `fill="${C.white}" opacity=".94"`)}
    ${t(x + w / 2, y + h - footer / 2 + 9, label, 'label', 'text-anchor="middle"')}
  </g>`;
}

function metricCard(x, y, w, title, value, hint = '') {
  return `<g filter="url(#shadow)">${rect(x, y, w, 220, `rx="10" fill="${C.white}"`)}
    ${rect(x, y, 9, 220, `rx="4" fill="${C.wine}"`)}
    ${t(x + 34, y + 54, title, 'small')}
    ${t(x + 34, y + 118, value, 'section')}
    ${t(x + 34, y + 174, hint, 'tiny')}
  </g>`;
}

function overviewPage() {
  let s = pageStart('배우 캐스팅 파일', '한 장에서 정체성·체형·인상·의상 가능성을 판독합니다.', '01', '전체 프로필');
  s += t(90, 390, '후보 코드  ＿＿＿＿＿＿', 'label');
  s += t(1520, 390, '배역  ＿＿＿＿＿＿', 'label');
  s += rect(2078, 340, 230, 70, `rx="35" fill="${C.wine}"`);
  s += t(2193, 386, '검토 중', 'label white', 'text-anchor="middle"');
  const labels = [['정면 전신', 'front'], ['정확한 측면', 'side'], ['후면 전신', 'back']];
  labels.forEach(([label, view], i) => { s += photoFrame(90 + i * 505, 440, 480, 1800, label, 'body', { view }); });
  ['기본 인상', '핵심 감정', '극중 온도'].forEach((label, i) => { s += photoFrame(1625, 440 + i * 600, 685, 570, label, 'bust', { mood: i === 1 ? 'sad' : i === 2 ? 'smile' : 'neutral' }); });
  s += rect(90, 2300, 1110, 700, `rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="2"`);
  s += t(130, 2365, '기본 정보', 'section');
  const fields = [
    ['이름', '＿＿＿＿＿＿'], ['나이', '＿＿세'], ['키', '＿＿＿cm'], ['체중', '＿＿＿kg'],
    ['체형', '＿＿＿＿＿＿＿＿'], ['얼굴', '＿＿＿＿＿＿＿＿'], ['인상', '＿＿＿＿＿＿＿＿'], ['특이점', '＿＿＿＿＿＿＿＿'],
  ];
  fields.forEach(([k, v], i) => {
    const col = i % 2; const row = Math.floor(i / 2); const x = 130 + col * 520; const y = 2440 + row * 92;
    s += t(x, y, k, 'small'); s += t(x + 105, y, v, 'body');
    s += line(x, y + 25, x + 460, y + 25, `stroke="${C.line}" stroke-width="1"`);
  });
  s += t(130, 2870, '배역 한 줄', 'small');
  s += t(270, 2870, '＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿', 'body');
  s += t(1235, 2365, '의상 가능성', 'section');
  ['기본 의상', '주요 의상', '대비 의상', '극중 변주'].forEach((label, i) => {
    const x = 1235 + i * 270;
    s += photoFrame(x, 2410, 245, 470, label, 'body', { footer: 58, view: 'front' });
  });
  s += t(1235, 2945, '이 페이지는 요약본입니다. 판정은 02~06 상세 보드를 함께 확인합니다.', 'tiny');
  return s + pageEnd();
}

function scaleAxis(x, top, floor, width, right = false) {
  let s = rect(x, top, width, floor - top, 'fill="url(#minorGrid)"');
  s += rect(x, top, width, floor - top, 'fill="url(#majorGrid)"');
  for (let cm = 0; cm <= 200; cm += 10) {
    const y = floor - cm * 10;
    const major = cm % 50 === 0;
    s += line(x, y, x + width, y, `stroke="${major ? C.wine : C.line}" stroke-width="${major ? 4 : 2}" opacity="${major ? .58 : .65}"`);
    s += t(right ? x + width - 12 : x + 12, y - 10, `${cm}`, major ? 'number wine' : 'tiny', right ? 'text-anchor="end"' : '');
  }
  s += t(x + 12, top - 22, '센티미터', 'tiny');
  s += line(x, floor, x + width, floor, `stroke="${C.ink}" stroke-width="6"`);
  return s;
}

function bodyPage() {
  const top = 410, floor = 2410;
  let s = pageStart('절대척도 체형', '0~200cm 실측 눈금 위에서 정면·정확한 측면·후면을 같은 배율로 비교합니다.', '02', '신장·비례');
  s += scaleAxis(180, top, floor, 2040);
  [1, 2].forEach((i) => { s += line(180 + i * 680, top, 180 + i * 680, floor, `stroke="${C.ink}" stroke-width="3" opacity=".22"`); });
  const entries = [['정면', 'front'], ['정확한 측면', 'side'], ['후면', 'back']];
  entries.forEach(([label, view], i) => {
    const cx = 520 + i * 680;
    s += rect(cx - 230, top + 60, 460, 1540, `rx="6" fill="${C.white}" opacity=".18" stroke="${C.white}" stroke-width="2" stroke-dasharray="14 14"`);
    s += bodyFigure(cx, floor, 1650, view, i === 1 ? C.wine : C.ink2, .30);
    s += rect(cx - 140, floor + 30, 280, 62, `rx="31" fill="${C.ink}"`);
    s += t(cx, floor + 72, label, 'label white', 'text-anchor="middle"');
  });
  const sampleY = floor - 1650;
  s += line(180, sampleY, 2220, sampleY, `stroke="${C.wine}" stroke-width="6" stroke-dasharray="20 14"`);
  s += rect(1860, sampleY - 72, 360, 62, `rx="31" fill="${C.wine}"`);
  s += t(2040, sampleY - 31, '샘플 기준 165cm', 'label white', 'text-anchor="middle"');
  s += metricCard(90, 2520, 520, '실제 키', '＿＿＿ cm', '정수리~발바닥 실측값');
  s += metricCard(650, 2520, 520, '인물 높이', '＿＿＿＿ px', '키 × 10픽셀');
  s += metricCard(1210, 2520, 520, '발바닥 기준', '0 cm', '세 컷 모두 같은 바닥선');
  s += metricCard(1770, 2520, 540, '촬영 조건', '70~85 mm', '수평·무왜곡·맨발');
  return s + pageEnd('생성 이미지의 눈금은 쓰지 않고, 편집 단계에서 1cm=10픽셀로 맞춥니다.');
}

function expressionPage() {
  let s = pageStart('얼굴·표정 기준', '동일 얼굴·동일 렌즈·동일 조명에서 시선과 표정만 바꾸어 비교합니다.', '03', '정체성·감정');
  ['정면 기준', '45도 기준', '정확한 측면'].forEach((label, i) => { s += photoFrame(90 + i * 750, 430, 720, 720, label, 'bust'); });
  s += rect(90, 1190, 2220, 68, `rx="34" fill="${C.ink}"`);
  s += t(1200, 1235, '얼굴형·헤어·피부톤·눈동자색 고정  ·  표정 강도만 변화', 'label white', 'text-anchor="middle"');
  const moods = [
    ['무표정', 'neutral'], ['옅은 미소', 'smile'], ['기쁨', 'smile'],
    ['경계', 'anger'], ['불안', 'sad'], ['분노', 'anger'],
    ['슬픔', 'sad'], ['유혹', 'smile'], ['결심', 'neutral'],
  ];
  moods.forEach(([label, mood], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 90 + col * 750, y = 1300 + row * 550;
    s += photoFrame(x, y, 720, 510, label, 'bust', { mood, footer: 64 });
    s += rect(x + 18, y + 18, 68, 40, `rx="20" fill="${C.wine}"`);
    s += t(x + 52, y + 47, String(i + 1).padStart(2, '0'), 'tiny white', 'text-anchor="middle"');
  });
  s += t(90, 3000, '판정 기록  ＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿', 'body');
  return s + pageEnd('표정 프롬프트보다 얼굴 정체성 유지가 우선입니다.');
}

function costumePage() {
  let s = pageStart('의상·실루엣 시험', '같은 배우를 같은 절대척도에 두고 의상만 교체해 배역의 시대감과 실루엣을 판정합니다.', '04', '의상·세계관');
  const labels = ['기본 의상', '주요 의상', '대비 의상', '극중 변주'];
  labels.forEach((label, i) => {
    const x = 90 + i * 555;
    const top = 410, floor = 2410;
    s += rect(x, 390, 525, 2560, `rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="2"`);
    s += rect(x + 25, top, 475, floor - top, `rx="6" fill="url(#photo)"`);
    for (let cm = 0; cm <= 200; cm += 20) {
      const y = floor - cm * 10;
      s += line(x + 25, y, x + 500, y, `stroke="${cm % 100 === 0 ? C.wine : C.white}" stroke-width="${cm % 100 === 0 ? 3 : 1}" opacity=".58"`);
      if (cm % 40 === 0) s += t(x + 38, y - 8, `${cm}`, 'tiny');
    }
    s += bodyFigure(x + 262, floor, 1650, 'front', i % 2 ? C.wine : C.ink2, .28);
    s += rect(x + 25, 2435, 475, 78, `rx="39" fill="${i === 1 ? C.wine : C.ink}"`);
    s += t(x + 262, 2487, label, 'label white', 'text-anchor="middle"');
    [['색', '＿＿＿＿'], ['재질', '＿＿＿＿'], ['시대', '＿＿＿＿'], ['판정', '보류 / 통과']].forEach(([k, v], j) => {
      const yy = 2600 + j * 69;
      s += t(x + 34, yy, k, 'tiny'); s += t(x + 108, yy, v, 'small');
    });
  });
  s += rect(90, 2980, 2220, 70, `rx="10" fill="${C.ink}"`);
  s += t(1200, 3026, '네 장 모두 얼굴·체형·키·카메라 고정  ·  의상만 교체', 'label white', 'text-anchor="middle"');
  return s + pageEnd('의상만 달라져야 하며 얼굴·체형·카메라·배율은 달라지지 않습니다.');
}

function movementIcon(cx, floor, type) {
  const base = bodyFigure(cx, floor, 500, 'front', type === 5 ? C.wine : C.ink2, .30);
  const arrows = [
    '',
    `<path d="M ${cx - 210} ${floor - 55} H ${cx + 210} l -28 -20 m 28 20 l -28 20" fill="none" stroke="${C.wine}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M ${cx - 170} ${floor - 160} Q ${cx} ${floor - 245} ${cx + 170} ${floor - 160}" fill="none" stroke="${C.wine}" stroke-width="8" stroke-dasharray="14 12"/>`,
    `<path d="M ${cx - 55} ${floor - 560} V ${floor - 200} l -20 -28 m 20 28 l 20 -28" fill="none" stroke="${C.wine}" stroke-width="8"/>`,
    `<path d="M ${cx - 210} ${floor - 110} Q ${cx - 70} ${floor - 20} ${cx + 90} ${floor - 100}" fill="none" stroke="${C.wine}" stroke-width="8"/>`,
    `<path d="M ${cx - 180} ${floor - 430} Q ${cx} ${floor - 570} ${cx + 180} ${floor - 430} l -38 -4 m 38 4 l -12 36" fill="none" stroke="${C.wine}" stroke-width="8"/>`,
  ];
  return `${base}${arrows[type]}`;
}

function movementPage() {
  let s = pageStart('동작·자세 시험', '신체 구조와 의상 움직임을 확인하도록 정지 자세와 전환 동작을 분리해 기록합니다.', '05', '연기·동선');
  const labels = ['바르게 서기', '자연스럽게 걷기', '앉기', '무릎 꿇기', '몸 숙여 집기', '뒤돌아보기'];
  labels.forEach((label, i) => {
    const col = i % 2, row = Math.floor(i / 2); const x = 90 + col * 1125, y = 430 + row * 795;
    s += rect(x, y, 1095, 735, `rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="2"`);
    s += rect(x + 24, y + 24, 1047, 610, `rx="6" fill="url(#photo)"`);
    s += line(x + 55, y + 585, x + 1040, y + 585, `stroke="${C.ink}" stroke-width="4" opacity=".45"`);
    s += movementIcon(x + 548, y + 585, i);
    s += rect(x + 24, y + 650, 1047, 60, `rx="30" fill="${i === 5 ? C.wine : C.ink}"`);
    s += t(x + 548, y + 691, `${String(i + 1).padStart(2, '0')}  ${label}`, 'label white', 'text-anchor="middle"');
  });
  s += rect(90, 2840, 2220, 150, `rx="10" fill="${C.paper2}" stroke="${C.line}" stroke-width="2"`);
  s += t(130, 2900, '관찰 항목', 'label wine');
  s += t(300, 2900, '무게중심  ·  팔·다리 겹침  ·  의상 주름 방향  ·  인물다운 습관  ·  장면 전환 가능성', 'body');
  s += t(130, 2955, '판정', 'label wine');
  s += t(300, 2955, '＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿', 'body');
  return s + pageEnd('기본 체형 비교는 02번, 연기 자세는 이 페이지에서 판정합니다.');
}

function chemistryPage() {
  let s = pageStart('상대역 합 시험', '두 배우의 실제 키 차이와 시선·거리·주도권을 한 보드에서 판정합니다.', '06', '관계·긴장');
  const top = 410, floor = 2410;
  s += rect(90, 390, 1460, 2050, `rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="2"`);
  s += scaleAxis(130, top, floor, 1380, true);
  s += bodyFigure(610, floor, 1680, 'front', C.ink2, .31);
  s += bodyFigure(1040, floor, 1800, 'front', C.wine, .32);
  s += line(825, top + 220, 825, floor, `stroke="${C.wine}" stroke-width="4" stroke-dasharray="18 14" opacity=".65"`);
  s += rect(390, 2288, 440, 72, `rx="36" fill="${C.ink}"`);
  s += t(610, 2336, '배우 가  ＿＿＿cm', 'label white', 'text-anchor="middle"');
  s += rect(840, 2288, 440, 72, `rx="36" fill="${C.wine}"`);
  s += t(1060, 2336, '배우 나  ＿＿＿cm', 'label white', 'text-anchor="middle"');
  s += rect(1590, 390, 720, 2050, `rx="10" fill="${C.ink}"`);
  s += t(1640, 480, '관계 판정', 'section white');
  const fields = [
    ['실제 키 차이', '＿＿＿cm'], ['눈높이 차이', '＿＿＿cm'], ['기본 거리', '＿＿＿cm'],
    ['먼저 다가감', '가 / 나'], ['시선 주도', '가 / 나'], ['긴장 단계', '1  2  3  4  5'],
    ['신뢰 단계', '1  2  3  4  5'], ['최종 판정', '보류 / 통과'],
  ];
  fields.forEach(([k, v], i) => {
    const y = 575 + i * 190;
    s += t(1640, y, k, 'small white');
    s += t(1640, y + 57, v, 'label white');
    s += line(1640, y + 85, 2260, y + 85, `stroke="${C.white}" stroke-width="1" opacity=".22"`);
  });
  const scenes = ['눈맞춤', '한 걸음 거리', '손을 뻗기 직전', '돌아서는 순간'];
  scenes.forEach((label, i) => {
    const x = 90 + i * 555;
    s += photoFrame(x, 2490, 525, 500, label, 'pair', { footer: 62 });
  });
  s += t(90, 3040, '판정 메모  ＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿', 'body');
  return s + pageEnd('상대역 합이 통과되어야 최종 캐스팅으로 이동합니다.');
}

const pages = [
  ['casting-dossier-v2-01-overview.svg', overviewPage()],
  ['casting-dossier-v2-02-body-scale.svg', bodyPage()],
  ['casting-dossier-v2-03-face-expression.svg', expressionPage()],
  ['casting-dossier-v2-04-costume.svg', costumePage()],
  ['casting-dossier-v2-05-movement.svg', movementPage()],
  ['casting-dossier-v2-06-chemistry.svg', chemistryPage()],
];

await mkdir(here, { recursive: true });
await Promise.all(pages.map(([name, content]) => writeFile(join(here, name), content, 'utf8')));
console.log(`생성 완료: ${pages.length}개 SVG`);
