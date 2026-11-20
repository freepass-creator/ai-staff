import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const registryBytes = readFileSync(new URL('./current.json', import.meta.url));
const registry = JSON.parse(registryBytes);
const [directory, group = 'full'] = process.argv.slice(2);
const angleGroup = group === 'face-45';
const roles = group === 'all' ? Object.keys(registry.files) :
  angleGroup ? ['face-master'] : Object.hasOwn(registry.sets, group) ? registry.sets[group] : null;

function verifiedAsset(role, localPath, sha256) {
  const digest = createHash('sha256').update(readFileSync(localPath)).digest('hex');
  if (digest !== sha256) throw new Error('Asset SHA-256 mismatch: ' + role);
  return { role, path: localPath, sha256: digest };
}

try {
  if (!directory || !roles) {
    throw new Error('Usage: node resolve.mjs <extracted pack directory> [face|face-45|full|fitting|all]');
  }
  if (!readFileSync(resolve(directory, 'current.json')).equals(registryBytes)) {
    // Git checkouts may normalize line endings. Compare the parsed documents.
    const packRegistry = JSON.parse(readFileSync(resolve(directory, 'current.json'), 'utf8'));
    if (JSON.stringify(packRegistry) !== JSON.stringify(registry)) {
      throw new Error('The pack registry differs from the AI Staff revision.');
    }
  }
  const assets = roles.map(role => {
    const entry = registry.files[role];
    return verifiedAsset(role, resolve(directory, entry.path), entry.sha256);
  });
  if (angleGroup) {
    const angle = JSON.parse(readFileSync(new URL('./face-angle-45.json', import.meta.url), 'utf8'));
    if (angle.base_revision !== registry.revision || angle.gate.verdict !== 'pass' ||
        angle.scope !== 'face only') throw new Error('Unapproved face angle extension.');
    const path = resolve(directory, 'angles', angle.extension_revision, angle.source);
    assets.push(verifiedAsset('face-angle-45-support', path, angle.sha256));
  }
  console.log(JSON.stringify({
    character_id: registry.character_id,
    variant: registry.variant,
    revision: registry.revision,
    assets,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
