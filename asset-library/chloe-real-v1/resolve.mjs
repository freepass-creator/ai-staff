import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const registryBytes = readFileSync(new URL('./current.json', import.meta.url));
const registry = JSON.parse(registryBytes);
const [directory, group = 'full'] = process.argv.slice(2);
const extensions = {
  'face-45': { manifest: './face-angle-45.json', directory: 'angles', role: 'face-angle-45-support' },
  'face-detail': { manifest: './face-detail-v1.json', directory: 'details', role: 'face-detail-support' },
};
const extension = Object.hasOwn(extensions, group) ? extensions[group] : null;
const roles = group === 'all' ? Object.keys(registry.files) :
  extension ? ['face-master'] : Object.hasOwn(registry.sets, group) ? registry.sets[group] : null;

function verifiedAsset(role, localPath, sha256) {
  const digest = createHash('sha256').update(readFileSync(localPath)).digest('hex');
  if (digest !== sha256) throw new Error('Asset SHA-256 mismatch: ' + role);
  return { role, path: localPath, sha256: digest };
}

try {
  if (!directory || !roles) {
    throw new Error('Usage: node resolve.mjs <extracted pack directory> [face|face-45|face-detail|full|fitting|all]');
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
  if (extension) {
    const ref = JSON.parse(readFileSync(new URL(extension.manifest, import.meta.url), 'utf8'));
    if (ref.base_revision !== registry.revision || ref.gate.verdict !== 'pass' ||
        ref.scope !== 'face only') throw new Error('Unapproved face reference extension.');
    const path = resolve(directory, extension.directory, ref.extension_revision, ref.source);
    assets.push(verifiedAsset(extension.role, path, ref.sha256));
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
