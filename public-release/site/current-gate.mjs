// Public gallery: automatic-production links must come from the current API,
// never from a static catalog or a previously approved asset hash.
const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function buildApprovedMap(snapshot) {
  if (!snapshot || snapshot.schema !== 'ai-staff/current-api/v1' ||
      typeof snapshot.revision !== 'string' || !snapshot.revision ||
      !Array.isArray(snapshot.assets)) {
    throw Error('CURRENT_API_INVALID');
  }
  const approved = new Map();
  for (const item of snapshot.assets) {
    if (!item || typeof item.id !== 'string' || !ASSET_ID.test(item.id) ||
        !SHA256.test(item.sha256 || '') || item.revision !== item.sha256 ||
        item.url !== `/api/characters/assets/${item.id}` || approved.has(item.id)) {
      throw Error('CURRENT_ASSET_INVALID');
    }
    approved.set(item.id, item);
  }
  if (!approved.size) throw Error('CURRENT_API_EMPTY');
  return approved;
}

export function approvedUrl(catalogAsset, approved, baseUrl) {
  if (!catalogAsset || !(approved instanceof Map)) return null;
  const current = approved.get(catalogAsset.id);
  // The same ID with different bytes is NOT approved; do not use an old PNG.
  if (!current || catalogAsset.png_sha256 !== current.sha256) return null;
  const url = new URL(current.url, baseUrl);
  url.searchParams.set('revision', current.revision);
  return url.href;
}
