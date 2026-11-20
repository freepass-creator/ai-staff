import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const revision = '2026-11-20.1';
const schema = 'ai-staff/chloe-shot/v1';
const closeups = ['full', 'knee-up', 'waist-up', 'bust', 'face'];
const views = ['front', 'right45', 'left45', 'side', 'back'];
const levels = ['eye', 'high', 'low'];

function readRequest(args) {
  const [pack, text, ...flags] = args;
  if (!pack || !text?.trim() || flags.length % 2) {
    throw new Error('Usage: node shot.mjs <character pack> "<촬영 지시>" [--from <shot.json> --frame <accepted image>]');
  }
  const opts = new Map();
  for (let i = 0; i < flags.length; i += 2) {
    const [flag, value] = flags.slice(i, i + 2);
    if (!['--from', '--frame'].includes(flag) || opts.has(flag) || !value || value.startsWith('--')) {
      throw new Error('Unknown or repeated option: ' + flag);
    }
    opts.set(flag, value);
  }
  if (opts.has('--from') !== opts.has('--frame')) throw new Error('이전 촬영 기록과 실제 컷 파일을 함께 지정하세요.');
  return { pack: resolve(pack), text: text.trim(), opts };
}

function pick(text, pairs, kind) {
  const matches = pairs.filter(([, re]) => re.test(text)).map(([value]) => value);
  if (matches.length > 1) throw new Error(kind + ' 지시가 두 가지입니다. 한 컷에 하나만 지정하세요.');
  return matches[0];
}

function parseCamera(text, prior) {
  const pickView = pick(text, [
    ['right45', /오른쪽\s*45|우측\s*45|오른쪽\s*사선/],
    ['left45', /왼쪽\s*45|좌측\s*45|왼쪽\s*사선/],
    ['front', /정면/],
    ['side', /측면|옆모습|옆에서/],
    ['back', /후면|뒤에서|뒷모습/],
  ], '각도');
  const view = pickView || (/45(?:도|°)|사선/.test(text) ? 'right45' : prior?.view || 'front');
  const height = pick(text, [
    ['eye', /눈\s*높이|아이\s*레벨/],
    ['high', /높은\s*각도|위에서|내려다/],
    ['low', /낮은\s*각도|아래에서|올려다/],
  ], '카메라 높이') || prior?.height || 'eye';
  let framing = pick(text, [
    ['full', /전신|머리부터\s*발끝/],
    ['knee-up', /무릎\s*까지|니\s*샷/],
    ['waist-up', /허리\s*까지|웨이스트\s*샷/],
    ['bust', /가슴\s*까지|바스트\s*샷|상반신/],
    ['face', /얼굴만|얼굴\s*확대|얼굴\s*클로즈업/],
  ], '화면 범위');
  const move = pick(text, [['closer', /가까이|당겨|타이트/], ['farther', /멀리|넓게|물러/]], '카메라 이동');
  if (framing && move) throw new Error('화면 범위와 상대 이동 중 하나만 지정하세요.');
  if (move) {
    if (!prior) throw new Error('가까이/멀리는 비교할 이전 컷이 필요합니다.');
    const index = closeups.indexOf(prior.framing) + (move === 'closer' ? 1 : -1);
    if (index < 0 || index >= closeups.length) throw new Error('현재 컷에서 더 이동할 수 없습니다.');
    framing = closeups[index];
  }
  return { view, height, framing: framing || prior?.framing || 'full' };
}

function parsePose(text) {
  const specific = pick(text, [
    ['sit-legs-crossed', /다리\s*(꼬|포개)/],
    ['kneel', /무릎\s*꿇/],
  ], '자세');
  return specific || pick(text, [
    ['sit-front', /(?:앉[아은고으]|앉혀|앉아서)/],
    ['stand-neutral', /(?:서\s*있|세워|선\s*자세|서서)/],
  ], '자세');
}

function readPrior(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const { scene, camera } = data;
  if (data.schema !== schema || data.character_id !== 'CLO-02' || data.identity_revision !== revision ||
      !scene || !/^[a-z-]+$/.test(scene.pose || '') || typeof scene.brief !== 'string' ||
      !views.includes(camera?.view) || !levels.includes(camera?.height) || !closeups.includes(camera?.framing)) {
    throw new Error('클로이의 동일 리비전 촬영 기록이 필요합니다.');
  }
  return data;
}

function approvedRefs(pack, group) {
  const loader = fileURLToPath(new URL('./resolve.mjs', import.meta.url));
  const info = JSON.parse(execFileSync(process.execPath, [loader, pack, group], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  if (info.revision !== revision || info.character_id !== 'CLO-02') throw new Error('정본 버전이 다릅니다.');
  return info.assets;
}

function poseRef(pack, pose) {
  const data = JSON.parse(readFileSync(resolve(pack, 'character.json'), 'utf8'));
  if (data.identity_revision !== revision || data.character_id !== 'CLO-02') throw new Error('포즈 팩 버전이 다릅니다.');
  const entry = data.poses.find(item => item.id === pose);
  if (!entry || !/^poses\/[a-z-]+\.png$/.test(entry.file)) throw new Error('포즈 참조 사진이 없습니다.');
  const path = resolve(pack, entry.file);
  const rel = relative(pack, path);
  if (!rel.startsWith('poses' + sep)) throw new Error('포즈 사진의 경로가 올바르지 않습니다.');
  const verified = withDigest({ role: 'pose_reference_only', path });
  if (verified.sha256 !== entry.sha256) throw new Error('포즈 파일의 해시가 다릅니다.');
  return verified;
}

function withDigest(asset) {
  if (!isAbsolute(asset.path)) throw new Error('참조에는 절대 경로가 필요합니다.');
  return { ...asset, sha256: createHash('sha256').update(readFileSync(asset.path)).digest('hex') };
}

const cameraViews = {
  front: 'directly front-on',
  right45: 'camera on the character’s right at a front three-quarter angle of about 45 degrees',
  left45: 'camera on the character’s left at a front three-quarter angle of about 45 degrees',
  side: 'strict side profile',
  back: 'directly from behind, face not visible',
};
const heightWords = { eye: 'eye level', high: 'slightly above eye level, looking down', low: 'below eye level, looking up' };
const framingWords = {
  full: 'crown to feet, both feet within frame', 'knee-up': 'crown to knees, both knees visible',
  'waist-up': 'crown to natural waist, lower frame edge across the waistline; crop out the lap, legs, knees and chair completely',
  bust: 'crown to chest, no waist or legs', face: 'tight portrait including the complete face and crown',
};
const poseLabels = {
  'stand-neutral':'neutral standing posture', 'sit-front':'seated upright, knees and shoulders relaxed',
  'sit-legs-crossed':'seated with one leg crossed', kneel:'neutral kneeling posture',
};

try {
  const { pack, text, opts } = readRequest(process.argv.slice(2));
  const prior = opts.has('--from') ? readPrior(opts.get('--from')) : null;
  const requestedPose = parsePose(text);
  if (prior && requestedPose && requestedPose !== prior.scene.pose) {
    throw new Error('이전 컷에서는 카메라만 바꿀 수 있습니다. 자세가 바뀌면 새 촬영으로 시작하세요.');
  }
  if (prior && /갈아입|배경\s*(바꿔|변경)|의상\s*(바꿔|변경)|장소\s*(바꿔|변경)/.test(text)) {
    throw new Error('이전 컷의 의상과 장소는 잠겨 있습니다. 새 촬영으로 시작하세요.');
  }
  const camera = parseCamera(text, prior?.camera);
  if (prior && Object.keys(camera).every(key => camera[key] === prior.camera[key])) {
    throw new Error('이전 컷에서 바꿀 카메라 항목을 지정하세요.');
  }
  const scene = prior?.scene || { pose: requestedPose || 'stand-neutral', brief: text };
  const broad = approvedRefs(pack, 'full');
  const master = broad.find(a => a.role === 'face-master');
  const face = camera.view === 'right45' ?
    approvedRefs(pack, 'face-45').find(a => a.role === 'face-angle-45-support') :
    broad.find(a => a.role === 'face-front');
  const body = broad.find(a => a.role === 'suit-body-front');
  const inputs = [master, face, body];
  const detailMetadata = JSON.parse(readFileSync(new URL('./face-detail-v1.json', import.meta.url), 'utf8'));
  const detailPath = resolve(pack, 'details', detailMetadata.extension_revision, detailMetadata.source);
  const detail = ['face', 'bust'].includes(camera.framing) && ['front', 'right45', 'left45'].includes(camera.view) &&
    existsSync(detailPath) ? approvedRefs(pack, 'face-detail').find(a => a.role === 'face-detail-support') : null;
  if (detail) inputs.push(detail);
  const fallback = camera.view === 'side' ? 'suit-side' : camera.view === 'back' ? 'suit-back' : null;
  if (fallback && !prior) inputs.push(broad.find(a => a.role === fallback));
  if (prior) inputs.push(withDigest({ role: 'previous-accepted-shot', path: resolve(opts.get('--frame')) }));
  else inputs.push(poseRef(pack, scene.pose));

  const directions = [
    'Create a photorealistic character image, like a still taken by a physical camera. Use image references, not any 3D asset.',
    'Image 1 is the sole identity master. Image 2 supports facial angle or frontal facial detail only.',
    'Image 3 locks body proportions. Preserve face shape, hair, torso and leg proportions, and the shape of the black closed-toe pumps when in frame.',
    ...(detail ? ['Image 4 supplies skin, hair and eye texture only; preserve identity from image 1 and the face angle from image 2.'] : []),
    'For close shots, retain realistic pores, mild localized skin sheen, fine facial hair and individual hair strands. Preserve iris color and shape, distinct pupil, real-looking eyelash detail and a small catchlight consistent with the lighting. Avoid plastic skin, smoothing, harsh sharpening and artificial glow. Scale texture to the framing.',
    ...(fallback && !prior ? ['Image 4 supplies the silhouette and angle only.'] : []),
    prior ? 'Edit the last accepted frame as the continuity reference. Change only camera position or framing. Preserve pose, expression, outfit, lighting, surroundings and props.' :
      'The last reference supplies posture only; ignore its face, body shape, outfit and camera position. Use the approved charcoal suit and neutral studio unless the scene specifies another outfit or location.',
    `Camera: ${cameraViews[camera.view]}; ${heightWords[camera.height]}; ${framingWords[camera.framing]}.`,
    `Pose: ${poseLabels[scene.pose] || scene.pose}.`,
    prior ? 'Keep the subject from the last image and frame strictly as directed above. Do not reproduce the previous crop.' : `Scene briefing: ${scene.brief}`,
  ].filter(Boolean);
  console.log(JSON.stringify({
    schema, character_id: 'CLO-02', identity_revision: revision, status: 'awaiting_image_generation_and_review',
    scene, camera, mode: prior ? 'camera-only' : 'new-shot', references: inputs,
    imagegen: { referenced_image_paths: inputs.map(input => input.path), prompt: directions.join('\n') },
    review_required: ['face identity when visible', 'projected proportions and pose', 'framing and continuity', 'skin, eyes and hair detail in close shots'],
  }, null, 2));
} catch (error) {
  console.error(error.stderr?.trim() || error.message);
  process.exitCode = 1;
}
