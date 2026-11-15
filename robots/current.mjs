import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const normalize=s=>String(s).normalize('NFKC').replace(/[\s_·-]/g,'').toLowerCase();
export async function loadCatalog(file){
 const c=JSON.parse(await readFile(file,'utf8'));
 if(c.schema_version!=='1.0'||!c.variants||!c.aliases)throw Error('invalid current catalog');
 for(const [id,v]of Object.entries(c.variants)){
  if(!/^[a-z0-9-]+$/.test(id)||v.character_id!=='CLO-02'||!['canonical','candidate_pending_owner_review'].includes(v.status)||typeof v.production_usable!=='boolean'||(v.status!=='canonical'&&v.production_usable))throw Error('invalid variant authority');
  for(const a of Object.values(v.assets)){if(typeof a.file!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('invalid asset reference');}
 }
 for(const id of Object.values(c.aliases))if(!c.variants[id])throw Error('alias target missing');
 return c;
}
export function resolve(c,query,{production=false}={}){
 const key=normalize(query),id=c.aliases[key];
 if(!id){const e=Error(c.ambiguous_aliases.includes(key)?'VARIANT_REQUIRED':'UNKNOWN_CHARACTER_ALIAS');e.code=e.message;throw e;}
 const v=c.variants[id];if(production&&!v.production_usable){const e=Error('CANDIDATE_NOT_PRODUCTION_APPROVED');e.code=e.message;throw e;}
 return {variant_id:id,...v,asset_urls:Object.fromEntries(Object.entries(v.assets).map(([kind,a])=>[kind,`/character-assets/${id}/${kind}?sha=${a.sha256}`]))};
}
export async function verifiedAsset(v,kind){
 const asset=v.assets[kind];if(!asset)throw Error('UNKNOWN_ASSET_KIND');
 const file=await realpath(asset.file),bytes=await readFile(file);if(hash(bytes)!==asset.sha256)throw Error('ASSET_HASH_MISMATCH');
 return {bytes,file,sha256:asset.sha256};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,q,...args]=process.argv.slice(2);if(cmd!=='resolve'||!q)throw Error('node robots/current.mjs resolve 착한클로이|기본클로이 [--production]');const c=await loadCatalog(path.resolve('robots/current.json'));const v=resolve(c,q,{production:args.includes('--production')});for(const kind of Object.keys(v.assets))await verifiedAsset(v,kind);console.log(JSON.stringify(v,null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
