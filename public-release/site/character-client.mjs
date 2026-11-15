// Node 24+ / modern browser. Every output starts from the online current allowlist.
export async function loadCharacter(id,{base='https://ai-staff-two.vercel.app',fetchImpl=fetch}={}){
 const r=await fetchImpl(new URL('/api/characters/current',base),{cache:'no-store'});if(!r.ok)throw Error('CURRENT_CATALOG_UNAVAILABLE');
 const catalog=await r.json(),asset=catalog.assets.find(a=>a.id===id);if(!asset)throw Error('NOT_A_CURRENT_CHARACTER');
 const url=new URL(asset.url,base);url.searchParams.set('revision',asset.revision);
 const image=await fetchImpl(url,{cache:'no-store'});if(!image.ok)throw Error('CURRENT_CHARACTER_UNAVAILABLE_'+image.status);
 const bytes=await image.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==asset.sha256)throw Error('CHARACTER_SHA_MISMATCH');return {asset,bytes};
}
