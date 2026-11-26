import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const blueprint = JSON.parse(readFileSync(new URL('./blueprint.json', import.meta.url), 'utf8'));
const loader = fileURLToPath(new URL('./resolve.mjs', import.meta.url));
const views = ['front', 'right45', 'side', 'back'];
const [pack, ...args] = process.argv.slice(2);

function readGroup(group) {
  const data = JSON.parse(execFileSync(process.execPath, [loader, resolve(pack), group], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }));
  if (data.character_id !== blueprint.character_id || data.revision !== blueprint.identity_revision) {
    throw new Error('Blueprint and reference identity revisions differ.');
  }
  return data.assets;
}

function dimensions(asset) {
  const data = readFileSync(asset.path);
  if (createHash('sha256').update(data).digest('hex') !== asset.sha256 ||
      !data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    throw new Error('Reference is not the pinned PNG: ' + asset.role);
  }
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

function normalize(body, value) {
  if (Array.isArray(value[0])) return value.map(item => normalize(body, item));
  const [x, y] = value;
  const h = body.shoe_floor_y_px - body.crown_y_px;
  return {
    pixel: [x, y],
    x_from_crown_as_percent_of_height: Number(((x - body.landmarks.crown[0]) / h * 100).toFixed(3)),
    y_from_crown_as_percent_of_height: Number(((y - body.crown_y_px) / h * 100).toFixed(3)),
  };
}

try {
  if (!pack) throw new Error('Usage: node blueprint.mjs <character pack> [--view=front|right45|side|back] [part-id ...]');
  const flags = args.filter(arg => arg.startsWith('--'));
  if (flags.length > 1 || flags.some(flag => !flag.startsWith('--view='))) throw new Error('Only one --view is accepted.');
  const angle = flags[0]?.slice(7) || 'front';
  if (!views.includes(angle)) throw new Error('Unknown view: ' + angle);
  const requested = args.filter(arg => !arg.startsWith('--'));
  const ids = [...new Set(requested)];
  const byId = new Map(blueprint.parts.map(part => [part.id, part]));
  const parts = ids.length ? ids.map(id => {
    const part = byId.get(id);
    if (!part) throw new Error('Unknown part: ' + id);
    return part;
  }) : blueprint.parts;
  const sources = new Map(readGroup('full').map(asset => [asset.role, asset]));
  if (parts.some(part => part.source === 'face-detail')) {
    sources.set('face-detail', readGroup('face-detail').find(asset => asset.role === 'face-detail-support'));
  }
  if (angle === 'right45') sources.set('angle-face', readGroup('face-45').find(asset => asset.role === 'face-angle-45-support'));
  const referenceKeys = ['face-master', angle === 'right45' ? 'angle-face' : 'face-front', 'suit-body-front'];
  if (angle === 'side' || angle === 'back') referenceKeys.push('suit-' + angle);
  const uniqueKeys = [...new Set([...referenceKeys, ...parts.map(part => part.source)])];
  const verified = new Map(uniqueKeys.map(key => {
    const asset = sources.get(key);
    if (!asset) throw new Error('Missing component source: ' + key);
    return [key, { ...asset, dimensions: dimensions(asset) }];
  }));
  const components = parts.map(part => {
    const [onX, onY, width, height] = part.rect;
    const [sourceWidth, sourceHeight] = verified.get(part.source).dimensions;
    if (![onX, onY, width, height].every(Number.isInteger) || onX < 0 || onY < 0 ||
        width <= 0 || height <= 0 || onX + width > sourceWidth || onY + height > sourceHeight) {
      throw new Error('Component box outside source photo: ' + part.id);
    }
    return part;
  });
  console.log(JSON.stringify({
    ...blueprint,
    view: angle,
    mode: 'reference-recipe-only',
    full_frame_references_in_order: referenceKeys.map(key => verified.get(key)),
    part_sources: Object.fromEntries(verified),
    parts: components,
    standing_landmarks: Object.fromEntries(Object.entries(blueprint.body.landmarks).map(([key, value]) => [key, normalize(blueprint.body, value)])),
  }, null, 2));
} catch (error) {
  console.error(error.stderr?.trim() || error.message);
  process.exitCode = 1;
}
