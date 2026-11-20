import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [pack, mode = '--report', ...extra] = process.argv.slice(2);
if (!pack || !['--report', '--html', '--compare', '--photos', '--skin'].includes(mode) || extra.length) {
  throw new Error('Usage: node body-layers.mjs <extracted pack> [--report|--html|--compare|--photos|--skin]');
}

const design = JSON.parse(readFileSync(new URL('./body-layers.json', import.meta.url)));
const componentBlueprint = JSON.parse(readFileSync(new URL('./blueprint.json', import.meta.url)));
const profile = JSON.parse(readFileSync(new URL('./profile.json', import.meta.url)));
const resolver = fileURLToPath(new URL('./resolve.mjs', import.meta.url));
const registry = JSON.parse(execFileSync(process.execPath, [resolver, pack, 'all'], { encoding: 'utf8' }));
if (registry.character_id !== design.character_id || registry.revision !== design.identity_revision) {
  throw new Error('The design and reference pack use different identity revisions.');
}
if (profile.character_id !== registry.character_id || profile.identity_revision !== registry.revision) {
  throw new Error('The profile and reference pack use different identity revisions.');
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

const slices = design.frontLegSlices;
const right = views.find(view => view.id === 'right');
const rightSlices = design.rightLegSlices;
const back = views.find(view => view.id === 'back');
const backSlices = design.backLegSlices;
for (const [section, view, edgeCount] of [[slices, front, 4], [rightSlices, right, 2], [backSlices, back, 2]]) {
  if (section.source !== view.source || section.rows.length < 2) throw new Error('Missing leg reference rows.');
  for (const [index, row] of section.rows.entries()) {
    const [y, ...edges] = row;
    if (edges.length !== edgeCount || (index > 0 && y <= section.rows[index - 1][0]) ||
        edges.some((x, edge) => edge > 0 && x <= edges[edge - 1])) {
      throw new Error(`Invalid leg cross section at row ${index} of ${view.id}`);
    }
    for (const x of edges) assertPixel([x, y], view.width, view.height, section.source);
  }
}

const { legs, ...geometry } = design.geometry;
geometry.base = [...geometry.base, ...legs.map(leg => {
  const outer = slices.rows.map(row => `${row[leg.outside]} ${row[0]}`);
  const inner = slices.rows.map(row => `${row[leg.inside]} ${row[0]}`).reverse();
  return `${leg.upperOutside} ${outer[0]} L ${outer.slice(1).join(' ')} ${leg.foot} ${inner[0]} L ${inner.slice(1).join(' ')} ${leg.upperInside}`;
})];

const rightMeasurements = rightSlices.measurements.map(({ id, label, y }) => {
  const row = rightSlices.rows.find(([height]) => height === y);
  if (!row) throw new Error(`Missing source row for ${id}`);
  return { id, label, view: 'right', axis: 'x', from: [row[1], y], to: [row[2], y],
    scope: '오른쪽 보조 사진의 겹쳐 보이는 외곽 폭. 자세와 원근의 영향.' };
});
const observations = [...design.observations, ...rightMeasurements].map(item => {
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

const report = { ...design, profile, views, observations, frontLandmarks, geometry };
if (mode === '--report') console.log(JSON.stringify(report, null, 2));
else if (mode === '--photos') console.log(photoSheet());
else if (mode === '--skin') console.log(skinSheet());
else {
  const photos = mode === '--compare' ? Object.fromEntries([front, right].map(view => [view.id,
    readFileSync(registry.assets.find(asset => asset.role === view.source).path)])) : {};
  console.log(html(report, photos));
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function skinSheet() {
  const skin = JSON.parse(readFileSync(new URL('./skin-reference.json', import.meta.url)));
  if (skin.character_id !== registry.character_id || skin.identity_revision !== registry.revision ||
      skin.body_design_revision !== design.design_revision) throw new Error('Skin reference revision mismatch.');

  const detail = JSON.parse(execFileSync(process.execPath, [resolver, pack, 'face-detail'], { encoding: 'utf8' }));
  const sources = [registry.assets.find(asset => asset.role === front.source), detail.assets.find(asset => asset.role === 'face-detail-support')];
  const frames = new Map(sources.map((source, index) => {
    const bytes = readFileSync(source.path);
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error(`Expected a PNG skin source: ${source.role}`);
    }
    return [source.role, { id: `skin-source-${index}`, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), url: 'data:image/png;base64,' + bytes.toString('base64') }];
  }));
  const framesSvg = [...frames.values()].map(frame => `<image id="${frame.id}" width="${frame.width}" height="${frame.height}" href="${frame.url}"/>`).join('');
  const samples = skin.samples.map((sample, index) => {
    const frame = frames.get(sample.role);
    if (!frame || !/^#[0-9A-F]{6}$/.test(sample.sample_rgb)) throw new Error(`Invalid skin sample: ${sample.id}`);
    const [x, y, width, height] = sample.roi;
    if (width <= 0 || height <= 0) throw new Error(`Invalid skin crop: ${sample.id}`);
    assertPixel([x, y], frame.width, frame.height, sample.id);
    assertPixel([x + width - 1, y + height - 1], frame.width, frame.height, sample.id);
    return `<article><h3>${escape(sample.label)}</h3><svg viewBox="${sample.roi.join(' ')}" aria-label="${escape(sample.label)} 원본 확대" role="img"><clipPath id="sample-${index}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath><use href="#${frame.id}" clip-path="url(#sample-${index})"/></svg><p><span style="background:${sample.sample_rgb}"></span>${sample.sample_rgb}</p></article>`;
  }).join('');
  const bodyLayers = design.layers.map(layer => `<g id="skin-${layer.id}">${geometry[layer.id].map(path => `<path d="${escape(path)}"/>`).join('')}</g>`).join('');
  const tone = skin.samples.find(sample => sample.id === 'thigh').sample_rgb;
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>클로이 기본 몸체와 피부 참조</title><style>
:root{font-family:system-ui,sans-serif;color:#1a2432;background:#f4f2ef;line-height:1.45}body{margin:0;padding:clamp(1rem,4vw,2.5rem)}main{max-width:1090px;margin:auto}h1{margin:0;font-size:clamp(1.6rem,4vw,2.6rem)}h2{margin:0 0 .5rem;font-size:1.2rem}h3,p{margin:0}header p,.note{color:#516079;margin:.5rem 0 1rem}.layout{display:grid;grid-template-columns:minmax(220px,.75fr) minmax(0,1.6fr);gap:1rem}.panel{background:white;border:1px solid #d9d1c9;border-radius:12px;padding:1rem}fieldset{border:0;padding:0;margin:0}legend{font-weight:650;margin-bottom:.5rem}label{margin-right:.75rem;display:inline-block}input{accent-color:#295476}.figure{height:min(65vh,650px);min-height:365px;width:100%;margin-top:.6rem;background:#f4ede9;border-radius:8px}#skin-base{fill:${tone};stroke:#8f6152;stroke-width:3}#skin-wear{fill:#263a56;stroke:#527397;stroke-width:4}#skin-shoe{fill:#111c29;stroke:#6585a2;stroke-width:3}fieldset:has(#wear:not(:checked)) #skin-wear,fieldset:has(#shoe:not(:checked)) #skin-shoe{display:none}.samples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.samples article{border:1px solid #ded4cb;border-radius:8px;padding:.6rem}.samples h3{font-size:.96rem}.samples svg{width:100%;height:112px;background:#f4ede9;display:block;border-radius:4px;margin-top:.35rem}.samples p{font: .85rem system-ui;margin-top:.35rem}.samples span{display:inline-block;width:1.1rem;height:.8rem;margin-right:.4rem;border:1px solid #92786b;border-radius:2px}@media(max-width:650px){.layout{grid-template-columns:1fr}.samples{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${framesSvg}</defs></svg>
<main><header><h1>클로이 기본 몸체와 피부 참조</h1><p>CLO-02 · 사진 리비전 ${escape(registry.revision)} · ${escape(skin.skin_revision)}</p></header><div class="layout">
<section class="panel"><fieldset><legend>정면 몸체 도식</legend><label><input type="checkbox" id="wear"> 의상</label><label><input type="checkbox" id="shoe"> 구두</label>
<svg class="figure" viewBox="${geometry.viewBox.join(' ')}" role="img" aria-label="의상과 구두를 별개로 얹을 수 있는 정면 몸체 도식">${bodyLayers}</svg></fieldset>
<p class="note">기본 몸체에 사진의 대표 색을 적용한 도식입니다. 원본에서 가려진 윤곽과 피부 상태는 확인이 필요합니다.</p></section>
<section class="panel"><h2>정본 사진의 피부 디테일</h2><p class="note">확대 컷은 정본 사진의 픽셀입니다. 대표 색은 선택한 영역의 RGB 중앙값이며 조명에 따라 다르게 보일 수 있습니다.</p><div class="samples">${samples}</div></section>
</div></main></html>`;
}

function photoSheet() {
  const png = role => 'data:image/png;base64,' + readFileSync(registry.assets.find(asset => asset.role === role).path).toString('base64');
  const { bust, waist, hips } = profile.circumference_cm;
  const panels = [
    [front, slices, 542, '정면 전신', '전신 정본'],
    [right, rightSlices, 190, '오른쪽 전신', '방향 보조'],
    [back, backSlices, 190, '후면 전신', '방향 보조'],
  ].map(([view, section, center, title, status]) => {
    const [crown, floor] = view.crownFloor;
    const height = (floor - crown) * 1.04;
    const width = height * 0.29;
    const contours = Array.from({ length: section.columns.length - 1 }, (_, offset) => {
      const points = section.rows.map(row => `${row[offset + 1]},${row[0]}`).join(' ');
      return `<polyline points="${points}"/>`;
    }).join('');
    return `<article><h2>${title}</h2><p>${status}</p><svg viewBox="${center - width / 2} ${crown - height * 0.02} ${width} ${height}" role="img" aria-label="클로이 ${title}">
<image width="${view.width}" height="${view.height}" href="${png(view.source)}"/>
<g class="guides"><path d="M${center - width / 2},${crown}h${width} M${center - width / 2},${floor}h${width}"/>${contours}</g></svg></article>`;
  }).join('');
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>클로이 실사 모델 시트</title><style>
:root{font-family:system-ui,sans-serif;background:#edf0f3;color:#142238;line-height:1.4}body{margin:0;padding:clamp(1rem,3vw,2.5rem)}main{margin:auto;max-width:1250px}h1{margin:0;font-size:clamp(1.75rem,4vw,2.7rem)}p{margin:.25rem 0;color:#40536c}label{display:block;margin:.65rem 0 1rem;width:max-content}input{accent-color:#214a82}.gallery{display:grid;grid-template-columns:1.2fr repeat(3,1fr);gap:.75rem}article{background:#fff;border:1px solid #ccd7e5;border-radius:10px;padding:.75rem;min-width:0}h2{font-size:1.15rem;margin:0}img,svg{display:block;width:100%;margin-top:.65rem;border-radius:5px;background:#b3b2bc}img{height:auto}svg{height:min(63vh,630px)}.guides{display:none;fill:none;stroke:#5defff;stroke-width:3}main:has(#guides:checked) .guides{display:block}footer{margin-top:.8rem}footer p{font-size:.9rem}@media(max-width:670px){.gallery{grid-template-columns:repeat(2,1fr)}svg{height:auto}}
.portrait-front,.portrait:has(#portrait-front:checked) .portrait-master{display:none}.portrait:has(#portrait-front:checked) .portrait-front{display:block}.portrait label{font-size:.9rem;margin:.6rem 0 0;width:auto}
.specs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem;margin:.75rem 0 .3rem}.specs div{background:#fff;border:1px solid #ccd7e5;border-radius:7px;padding:.4rem .6rem}.specs dt{font-size:.8rem;color:#40536c}.specs dd{margin:0;font-weight:650}.spec-note{font-size:.85rem}@media(max-width:670px){.specs{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style><main><h1>클로이 실사 모델 시트</h1><p>CLO-02 · 사진 리비전 ${escape(design.identity_revision)} · 검수 ${escape(design.design_revision)}</p>
<dl class="specs"><div><dt>맨발 키</dt><dd>${profile.height_cm_barefoot} cm</dd></div><div><dt>체중</dt><dd>${profile.weight_kg} kg</dd></div><div><dt>가슴–허리–엉덩이 둘레</dt><dd>${bust}–${waist}–${hips} cm</dd></div><div><dt>신발</dt><dd>${profile.shoe_size_mm} mm</dd></div></dl>
<p class="spec-note">캐릭터 설정값입니다. 컷의 실루엣은 정면 전신 정본을 기준으로 검수합니다.</p>
<label><input type="checkbox" id="guides"> 전신 기준선과 다리 윤곽 보기</label>
<div class="gallery"><article class="portrait"><h2>얼굴 정본</h2><p>인물 식별 기준</p><img class="portrait-master" alt="클로이 얼굴 정본" src="${png('face-master')}"><img class="portrait-front" alt="클로이 정면 증명사진" src="${png('face-front')}"><label><input type="checkbox" id="portrait-front"> 정면 증명사진 보기</label></article>${panels}</div>
<footer><p>전신은 사진마다 정수리부터 구두 바닥까지 높이를 맞췄습니다. 후면 측정선은 양쪽 다리의 바깥 윤곽입니다.</p><p>전신 사선·왼쪽·위·아래는 정본 미확정입니다.</p></footer></main></html>`;
}

function html({ layers, geometry, views, observations, frontLandmarks, frontLegSlices, rightLegSlices }, photos) {
  const labels = {
    'approved-photo': '정본 사진',
    'support-photo': '방향 보조 사진',
    'sheet-support-only': '보조 시트',
    unobserved: '자료 없음',
  };
  const overlays = layers.map(layer => `<g id="layer-${layer.id}">${geometry[layer.id].map(path => `<path d="${escape(path)}"/>`).join('')}</g>`).join('');
  const marks = Object.values(frontLandmarks).flat().map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('');
  const frontView = views.find(view => view.id === 'front');
  const sideView = views.find(view => view.id === 'right');
  const photo = photos.front;
  const photoImage = photo ? `<image id="reference-photo" width="${frontView.width}" height="${frontView.height}" href="data:image/png;base64,${photo.toString('base64')}"/>` : '';
  const legLines = [1, 2, 3, 4].map(index => {
    const points = frontLegSlices.rows.map(row => `${row[index]},${row[0]}`).join(' ');
    return `<polyline points="${points}"/>`;
  }).join('');
  const sideLines = [1, 2].map(index => `<polyline points="${rightLegSlices.rows.map(row => `${row[index]},${row[0]}`).join(' ')}"/>`).join('');
  const sideWidths = observations.filter(item => item.id.startsWith('right-visible-')).map(item =>
    `<line x1="${item.from[0]}" x2="${item.to[0]}" y1="${item.from[1]}" y2="${item.to[1]}"/>`).join('');
  const sideCard = photos.right ? `<section class="panel side-panel"><h2>오른쪽 다리 윤곽 검수</h2>
<p class="caption">하늘색은 피부 외곽, 흰 선은 허벅지·종아리·발목 부근의 사진상 폭입니다.</p>
<svg viewBox="90 735 230 565" role="img" aria-label="오른쪽 보조 사진에서 측정한 다리 외곽과 세 구간의 폭">
<image width="${sideView.width}" height="${sideView.height}" href="data:image/png;base64,${photos.right.toString('base64')}"/>
<g fill="none" stroke="#65edff" stroke-width="2.75">${sideLines}</g>
<g stroke="white" stroke-width="2">${sideWidths}</g></svg></section>` : '';
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
<style>
fieldset:has(#photo:not(:checked)) #reference-photo,fieldset:has(#photo:checked) :is(#layer-base,#layer-wear,#layer-shoe),fieldset:has(#photo:not(:checked)) #reference-leg-lines{display:none}#reference-leg-lines{fill:none;stroke:#7feaff;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.side-panel{margin-top:1rem}.side-panel svg{display:block;width:min(100%,260px);border-radius:8px}
</style>
<main>
<header><h1>클로이 몸체 설계도</h1><p>CLO-02 · 정본 ${escape(design.identity_revision)} · ${escape(design.design_revision)}</p></header>
<div class="layout">
<section class="panel" aria-label="정면 레이어 도식">
<fieldset><legend>정면 도식 레이어</legend><label><input id="wear" type="checkbox" checked> 의상</label><label><input id="shoe" type="checkbox" checked> 구두</label><label><input id="guides" type="checkbox" checked> 기준점</label>${photo ? '<label><input id="photo" type="checkbox"> 원본과 다리 윤곽 비교</label>' : ''}
<svg class="figure" viewBox="${geometry.viewBox.join(' ')}" role="img" aria-label="기본 몸체·의상·구두의 정면 조립 도식">
${photoImage}
${overlays}
${photo ? `<g id="reference-leg-lines">${legLines}</g>` : ''}
<g id="layer-guides"><path class="grid" d="M 315 25 H 770 M 315 683 H 770 M 315 1417 H 770 M 542 25 V 1417" fill="none"/>
<g fill="#f4fbff" stroke="#214a82" stroke-width="3">${marks}</g></g>
</svg>
</fieldset>
<p class="caption">정수리·골반 비교선·구두 바닥선을 표시했습니다. 기본 몸체는 가려진 윤곽을 포함한 구조 도식입니다. 구두를 끄면 구두 레이어만 숨겨집니다.</p>
<p class="caption">다리는 정면 원본에서 확인한 양쪽 윤곽을 각각 20개 높이에서 연결했습니다. 치마와 구두에 가려진 부분은 도식입니다.</p>
</section>
<section class="panel"><h2>6방향 참조 상태</h2><ul class="views">${viewList}</ul>
<h2>정본 사진의 투영 치수</h2><p class="caption">각 사진에서 정수리부터 구두가 닿는 바닥까지의 세로 픽셀을 100%로 둡니다. 방향별 원근과 자세가 투영 치수에 영향을 줍니다.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">기준</th><th scope="col">방향</th><th scope="col">측정</th><th scope="col">어디까지 확인했나</th></tr></thead><tbody>
${rows}
</tbody></table></div>
<p class="caption">신체·의상·구두는 같은 좌표에 놓입니다. 확대와 축소는 세 레이어에 같은 배율로 적용합니다.</p>
</section></div>${sideCard}</main></html>`;
}
