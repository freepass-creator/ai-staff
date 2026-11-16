// Node 24+ / modern browser. Every output starts from the online current allowlist.
export async function loadCharacter(id,{base='https://ai-staff-two.vercel.app',fetchImpl=fetch}={}){
 const r=await fetchImpl(new URL('/api/characters/current',base),{cache:'no-store'});if(!r.ok)throw Error('CURRENT_CATALOG_UNAVAILABLE');
 const catalog=await r.json(),asset=catalog.assets.find(a=>a.id===id);if(!asset)throw Error('NOT_A_CURRENT_CHARACTER');
 const url=new URL(asset.url,base);url.searchParams.set('revision',asset.revision);
 const image=await fetchImpl(url,{cache:'no-store'});if(!image.ok)throw Error('CURRENT_CHARACTER_UNAVAILABLE_'+image.status);
 const bytes=await image.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==asset.sha256)throw Error('CHARACTER_SHA_MISMATCH');return {asset,bytes};
}
export async function assertGenerationPacketCurrent(packet,{base='https://ai-staff-two.vercel.app',fetchImpl=fetch}={}){
 const r=await fetchImpl(new URL('/api/characters/current',base),{cache:'no-store'});if(!r.ok)throw Error('CURRENT_CATALOG_UNAVAILABLE');const c=await r.json();
 if(c.revision!==packet.catalog_revision||c.generation_rules_revision!==packet.rules_revision)throw Error('GENERATION_REFERENCES_CHANGED');
 if(!Array.isArray(packet.references)||!packet.references.length||packet.references.some(a=>!c.assets.some(b=>b.id===a.id&&b.sha256===a.sha256)))throw Error('GENERATION_REFERENCES_CHANGED');return c;
}
export async function prepareCharacterGeneration({id,brief},{base='https://ai-staff-two.vercel.app',fetchImpl=fetch}={}){
 if(typeof id!=='string'||typeof brief!=='string'||!brief.trim())throw Error('INVALID_GENERATION_INPUT');
 const url=new URL('/api/characters/generation',base);url.searchParams.set('id',id);url.searchParams.set('brief',brief);const r=await fetchImpl(url,{cache:'no-store'});if(!r.ok)throw Error('GENERATION_PACKET_UNAVAILABLE_'+r.status);const packet=await r.json();
 const current=await assertGenerationPacketCurrent(packet,{base,fetchImpl}),actor=current.assets.find(a=>a.id===packet.actor_id);
 if(!actor||!['canonical','pose','human_pose'].includes(actor.kind)||packet.production_usable!==false)throw Error('INVALID_GENERATION_PACKET');
 if(actor.kind==='human_pose'&&packet.references.some(a=>a.kind!=='human_pose'))throw Error('ROBOT_REFERENCE_IN_HUMAN_PACKET');
 if(actor.kind!=='human_pose'&&!['hand-left-palm-v1','hand-right-palm-v1','hand-left-back-v1'].every(id=>packet.references.some(a=>a.id===id)))throw Error('HAND_REFERENCE_MISSING');
 const references=[];for(const a of packet.references){const u=new URL(a.url,base);if(u.origin!==new URL(base).origin||u.pathname!==`/api/characters/assets/${a.id}`)throw Error('INVALID_GENERATION_REFERENCE_URL');const response=await fetchImpl(u,{cache:'no-store'});if(!response.ok)throw Error('GENERATION_REFERENCE_UNAVAILABLE_'+a.id);const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==a.sha256)throw Error('GENERATION_REFERENCE_HASH_CHANGED');references.push({...a,bytes});}
 await assertGenerationPacketCurrent(packet,{base,fetchImpl});return {packet,references};
}
