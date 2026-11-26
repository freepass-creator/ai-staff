import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const registry = JSON.parse(readFileSync(new URL('./current.json', import.meta.url), 'utf8'));
const source = registry.files['face-master'];
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const [frameArg, resultArg] = process.argv.slice(2);

try {
  if (!frameArg || !resultArg) throw new Error('Usage: node review.mjs <frame.png> <actor-kit face_gate JSON>');
  const frame = resolve(frameArg);
  const result = JSON.parse(readFileSync(resultArg, 'utf8').replace(/^\uFEFF/, ''));
  if (!isAbsolute(result.master) || digest(result.master) !== source.sha256 || result.threshold !== 0.6) {
    throw new Error('Run the face check with the absolute path of the approved face master and the default 0.600 threshold.');
  }
  const accepted = result.results.find(row => isAbsolute(row.file) && resolve(row.file) === frame);
  if (!accepted || accepted.verdict !== '통과' || !Number.isFinite(accepted.score) ||
      accepted.score < 0.6 || accepted.score > 1 ||
      !Number.isInteger(accepted.faceWidth) || accepted.faceWidth < 120) {
    throw new Error('A passing face result for this exact frame is required.');
  }
  console.log(JSON.stringify({
    schema: 'ai-staff/chloe-shot-review/v1',
    identity_revision: registry.revision,
    frame_sha256: digest(frame),
    master_sha256: source.sha256,
    face_score: accepted.score,
    face_width_px: accepted.faceWidth,
    verdict: 'pass',
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
