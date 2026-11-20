import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const registry = readJson(new URL('./current.json', import.meta.url));
const geometry = readJson(new URL('./geometry.json', import.meta.url));

function loadSource(pack) {
  if (registry.revision !== geometry.identity_revision) throw new Error('GEOMETRY_REVISION_MISMATCH');
  const source = registry.files[geometry.source_role];
  const image = readFileSync(resolve(pack, source.path));
  if (createHash('sha256').update(image).digest('hex') !== source.sha256) {
    throw new Error('APPROVED_BODY_SOURCE_CHANGED');
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== geometry.source_width || height !== geometry.source_height) {
    throw new Error('BODY_DIMENSIONS_MISMATCH');
  }
  return { image, width, height, sha256: source.sha256 };
}

function imageRatios() {
  const names = ['head_top', 'shoulder_line', 'waist_jacket', 'knee_center', 'ankle', 'shoe_tip'];
  const points = names.map(name => geometry.landmarks_y_px[name]);
  if (points.some((y, i) => !Number.isFinite(y) || y < 0 ||
      y >= geometry.source_height || (i > 0 && y <= points[i - 1]))) {
    throw new Error('INVALID_BODY_LANDMARKS');
  }
  const top = points[0];
  const span = points.at(-1) - top;
  return Object.fromEntries(names.slice(1, -1).map(name => [name, (geometry.landmarks_y_px[name] - top) / span]));
}

function compose(source, request) {
  if (request?.mode !== 'approved-front') {
    throw new Error('APPROVED_ARTICULATED_GEOMETRY_REQUIRED: new pose or camera angle');
  }
  const keys = ['mode', 'width', 'height', 'x', 'y', 'scale', 'background'];
  if (Object.keys(request).some(key => !keys.includes(key))) {
    throw new Error('ONLY_POSITION_UNIFORM_SCALE_AND_CANVAS_ARE_ALLOWED');
  }
  const { width, height, x, y, scale, background } = request;
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 8192) ||
      ![x, y, scale].every(Number.isFinite) || x < 0 || y < 0 || scale <= 0 ||
      typeof background !== 'string' || !/^#[0-9a-f]{6}$/i.test(background)) {
    throw new Error('INVALID_CANVAS_OR_PLACEMENT');
  }
  const frameWidth = source.width * scale;
  const frameHeight = source.height * scale;
  if (frameWidth > width - x || frameHeight > height - y) throw new Error('APPROVED_FRAME_WOULD_BE_CROPPED');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${background}"/>`,
    `<image x="${x}" y="${y}" width="${frameWidth}" height="${frameHeight}" href="data:image/png;base64,${source.image.toString('base64')}"/>`,
    '</svg>',
  ].join('\n');
}

try {
  const [command, pack, request, output] = process.argv.slice(2);
  if (!pack || !['measure', 'compose'].includes(command)) {
    throw new Error('Usage: node geometry.mjs measure <pack> | compose <pack> <request.json> <output.svg>');
  }
  const source = loadSource(pack);
  if (command === 'measure') {
    console.log(JSON.stringify({
      identity_revision: registry.revision,
      geometry_revision: geometry.geometry_revision,
      source_sha256: source.sha256,
      basis: geometry.coordinate_basis,
      landmarks_y_px: geometry.landmarks_y_px,
      normalized_y_between_head_and_shoe: imageRatios(),
      articulated_geometry: 'unapproved',
    }, null, 2));
  } else {
    if (!request || !output) throw new Error('Both request.json and output.svg are required.');
    writeFileSync(output, compose(source, readJson(request)), { flag: 'wx' });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
