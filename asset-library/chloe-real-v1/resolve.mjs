import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const registryBytes = readFileSync(new URL('./current.json', import.meta.url));
const registry = JSON.parse(registryBytes);
const [directory, group = 'full'] = process.argv.slice(2);
const roles = group === 'all' ? Object.keys(registry.files) : registry.sets[group];

try {
  if (!directory || !roles) {
    throw new Error('Usage: node resolve.mjs <extracted pack directory> [face|full|fitting|all]');
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
    const localPath = resolve(directory, entry.path);
    const digest = createHash('sha256').update(readFileSync(localPath)).digest('hex');
    if (digest !== entry.sha256) throw new Error('Asset SHA-256 mismatch: ' + role);
    return { role, path: localPath, sha256: digest };
  });
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