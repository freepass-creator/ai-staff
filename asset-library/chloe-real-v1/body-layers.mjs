import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [pack, mode = '--report', ...extra] = process.argv.slice(2);
if (!pack || !['--report', '--html'].includes(mode) || extra.length) {
  throw new Error('Usage: node body-layers.mjs <extracted pack> [--report|--html]');
}

const design = JSON.parse(readFileSync(new URL('./body-layers.json', import.meta.url)));
const componentBlueprint = JSON.parse(readFileSync(new URL('./blueprint.json', import.meta.url)));
const resolver = fileURLToPath(new URL('./resolve.mjs', import.meta.url));
const registry = JSON.parse(execFileSync(process.execPath, [resolver, pack, 'all'], { encoding: 'utf8' }));
if (registry.character_id !== design.character_id || registry.revision !== design.identity_revision) {
  throw new Error('The design and reference pack use different identity revisions.');
}

function assertPixel(point, width, height, label) {
  const [x, y] = point;
  if (![x, y].every(Number.isInteger) || x < 0 || y < 0 || x >= width || y >= height) {
    throw new Error(`Out-of-bounds source coordinate: ${label}`);
  }
}

const views = design.views.map(view => {
  if (view.status === 'unobserved' && view.source === null) return view;
  const asset = registry.assets.find(candidate => candidate.role === view.source);
  if (!asset) throw new Error(`Missing verified source: ${view.id}`);
  const png = readFileSync(asset.path);
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Expected PNG dimensions: ${view.id}`);
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (view.roi) {
    const [x, y, cropWidth, cropHeight] = view.roi;
    assertPixel([x, y], width, height, view.id);
    assertPixel([x + cropWidth - 1, y + cropHeight - 1], width, height, view.id);
  }
  if (view.crownFloor) {
    const [crown, floor] = view.crownFloor;
    assertPixel([0, crown], width, height, view.id);
    assertPixel([0, floor], width, height, view.id);
    if (floor <= crown) throw new Error(`Invalid normalization baseline: ${view.id}`);
  }
  return { ...view, width, height, sha256: asset.sha256 };
});

const front = views.find(view => view.id === 'front');
const { body } = componentBlueprint;
if (componentBlueprint.identity_revision !== registry.revision || front.source !== body.primary ||
    front.crownFloor[0] !== body.crown_y_px || front.crownFloor[1] !== body.shoe_floor_y_px) {
  throw new Error('The frontal assembly and component blueprint use different baselines.');
}
const frontLandmarks = Object.fromEntries(Object.entries(body.landmarks).map(([id, value]) => {
  const points = Array.isArray(value[0]) ? value : [value];
  for (const point of points) assertPixel(point, front.width, front.height, id);
  return [id, points];
}));

const observations = design.observations.map(item => {
  if (item.status === 'unobserved' && item.value === null) return item;
  const view = views.find(candidate => candidate.id === item.view);
  if (!view?.crownFloor || !['x', 'y'].includes(item.axis)) {
    throw new Error(`Missing measurement axis or baseline: ${item.id}`);
  }
  assertPixel(item.from, view.width, view.height, item.id);
  assertPixel(item.to, view.width, view.height, item.id);
  const axis = item.axis === 'x' ? 0 : 1;
  const pixels = Math.abs(item.to[axis] - item.from[axis]);
  const baseline = view.crownFloor[1] - view.crownFloor[0];
  return { ...item, status: 'projected', pixels, baseline, percent: Number((100 * pixels / baseline).toFixed(2)) };
});

const report = { ...design, views, observations, frontLandmarks };
if (mode === '--report') console.log(JSON.stringify(report, null, 2));
else console.log(html(report));

function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function html({ layers, geometry, views, observations, frontLandmarks }) {
  const labels = {
    'approved-photo': '정본 사진',
    'support-photo': '방향 보조 사진',
    'sheet-support-only': '보조 시트',
    unobserved: '자료 없음',
  };
  const overlays = layers.map(layer => `<g id="layer-${layer.id}">${geometry[layer.id].map(path => `<path d="${escape(path)}"/>`).join('')}</g>`).join('');
  const marks = Object.values(frontLandmarks).flat().map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('');
  const viewList = views.map(view => `<li><strong>${escape(view.label)}</strong><span>${labels[view.status]}</span></li>`).join('');
  const rows = observations.map(item => {
    const view = views.find(candidate => candidate.id === item.view);
    const result = item.status === 'projected' ? `${item.pixels} px · ${item.percent.toFixed(2)}%` : '미확정';
    return `<tr><th scope="row">${escape(item.label)}</th><td>${view.label}</td><td>${result}</td><td>${escape(item.scope ?? item.reason)}</td></tr>`;
  }).join('\n');
  return `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>클로이 몸체 설계도</title>
<style>
:root{font-family:system-ui,sans-serif;color:#172944;background:#f3f6fb;line-height:1.5}body{margin:0;padding:clamp(1rem,4vw,3rem)}main{max-width:1100px;margin:auto}h1{font-size:clamp(1.8rem,4vw,2.65rem);margin:0}h2{font-size:1.2rem;margin:0 0 .7rem}header p,.caption{color:#465976;margin:.4rem 0 1rem}.layout{display:grid;grid-template-columns:minmax(235px,.7fr) minmax(0,1.65fr);gap:1rem}.panel{background:white;border:1px solid #cdd8e6;border-radius:14px;padding:1rem}fieldset{border:0;margin:0;padding:0}legend{font-weight:650;margin-bottom:.5rem}label{display:inline-block;margin-right:.6rem}input{accent-color:#214a82}.figure{display:block;width:100%;height:min(65vh,620px);min-height:360px;margin:.4rem auto 0;background:#f3f8ff;border-radius:8px}.grid{stroke:#b6c9e0;stroke-width:3;stroke-dasharray:9 7}#layer-base{fill:#9bb6d6;stroke:#486d99;stroke-width:3}#layer-wear{fill:#263a56;stroke:#527397;stroke-width:4}#layer-shoe{fill:#111c29;stroke:#6585a2;stroke-width:3}fieldset:has(#wear:not(:checked)) #layer-wear,fieldset:has(#shoe:not(:checked)) #layer-shoe,fieldset:has(#guides:not(:checked)) #layer-guides{display:none}.views{list-style:none;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin:0 0 1.1rem}.views li{display:grid;border:1px solid #d0dce9;border-radius:7px;padding:.45rem .6rem}.views span,.caption,td:last-child{font-size:.87rem;color:#465976}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;text-align:left;font-size:.92rem}th,td{padding:.47rem .35rem;border-bottom:1px solid #dce5ef}td:nth-child(2),td:nth-child(3){white-space:nowrap}thead{background:#e9f0fa}p:last-child{margin-bottom:0}@media(max-width:740px){.layout{grid-template-columns:1fr}.figure{height:430px}.views{grid-template-columns:repeat(2,1fr)}}
</style>
<main>
<header><h1>클로이 몸체 설계도</h1><p>CLO-02 · 정본 ${escape(design.identity_revision)} · ${escape(design.design_revision)}</p></header>
<div class="layout">
<section class="panel" aria-label="정면 레이어 도식">
<fieldset><legend>정면 도식 레이어</legend><label><input id="wear" type="checkbox" checked> 의상</label><label><input id="shoe" type="checkbox" checked> 구두</label><label><input id="guides" type="checkbox" checked> 기준점</label>
<svg class="figure" viewBox="${geometry.viewBox.join(' ')}" role="img" aria-label="기본 몸체·의상·구두의 정면 조립 도식">
${overlays}
<g id="layer-guides"><path class="grid" d="M 315 25 H 770 M 315 683 H 770 M 315 1417 H 770 M 542 25 V 1417" fill="none"/>
<g fill="#f4fbff" stroke="#214a82" stroke-width="3">${marks}</g></g>
</svg>
</fieldset>
<p class="caption">정수리·골반 비교선·구두 바닥선을 표시했습니다. 기본 몸체는 가려진 윤곽을 포함한 구조 도식입니다. 구두를 끄면 구두 레이어만 숨겨집니다.</p>
</section>
<section class="panel"><h2>6방향 참조 상태</h2><ul class="views">${viewList}</ul>
<h2>정본 사진의 투영 치수</h2><p class="caption">각 사진에서 정수리부터 구두가 닿는 바닥까지의 세로 픽셀을 100%로 둡니다. 방향별 원근과 자세가 투영 치수에 영향을 줍니다.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">기준</th><th scope="col">방향</th><th scope="col">측정</th><th scope="col">어디까지 확인했나</th></tr></thead><tbody>
${rows}
</tbody></table></div>
<p class="caption">신체·의상·구두는 같은 좌표에 놓입니다. 확대와 축소는 세 레이어에 같은 배율로 적용합니다.</p>
</section></div></main></html>`;
}
