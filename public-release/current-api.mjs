import {createHash} from 'node:crypto';
import {createGenerationPacket,GENERATION_RULES_REVISION} from './generation.mjs';
export const PLATFORM_VERSION='VER1.0';
export const ROBOT_VARIANTS=Object.freeze({'chakhan-white-v1':'CLO-02','basic-purple-v1':'CLO-02','cloa-amber-v1':'CLO-04'});
export function validateCurrentCiReference(assets,text){
 const matches=assets?.filter(a=>a.file==='assets/brand/ci-current.svg')||[],lf=text.replace(/\r\n/g,'\n');
 if(matches.length!==1||assets.some(a=>a.file.endsWith('ci-P2.svg'))||![lf,lf.replace(/\n/g,'\r\n')].some(s=>createHash('sha256').update(s).digest('hex')===matches[0].sha256))throw Error('CURRENT_CI_REFERENCE_DRIFT');
}
export function validateProfilePolicy(profiles){if(!Array.isArray(profiles.profiles)||profiles.profiles.length!==0||profiles.selection_policy?.fallback_allowed!==false)throw Error('PROFILES_ARCHIVED_NO_FALLBACK');}
export function createCanonicalAssets(assets,current){
 const canonical=assets.filter(a=>a.category==='canonical');
 if(canonical.length!==3||new Set(canonical.map(a=>a.id)).size!==3)throw Error('CANONICAL_PLATFORM_INCOMPLETE');
 return canonical.map(a=>{const variant=a.id.replace(/^canonical-/,''),character_id=ROBOT_VARIANTS[variant],v=current.variants[variant];
 if(!character_id||a.id!==`canonical-${variant}`||!v||v.character_id!==character_id||v.status!=='canonical'||v.production_usable!==true||v.assets?.png?.sha256!==a.png_sha256||(a.character_id&&a.character_id!==character_id))throw Error('CANONICAL_DRIFT');
 return {id:a.id,character_id,kind:'canonical',platform_version:PLATFORM_VERSION,variant,label:a.title,sha256:a.png_sha256,upstream_url:a.png_url,width:a.width,height:a.height};});
}
const normalize=s=>String(s).normalize('NFKC').replace(/[\s_·-]/g,'').toLowerCase();
export function validateCurrentAssets(assets,{ids=[],sha256=[]}={}){
 const seen=new Set();for(const a of assets){if(ids.includes(a.id)||sha256.includes(a.sha256))throw Error('RETIRED_ASSET_REINTRODUCED');if(seen.has(a.id))throw Error('DUPLICATE_CURRENT_ASSET');seen.add(a.id);if(!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('INVALID_CURRENT_ASSET_HASH');}return assets;
}
export function createCharacterApi(data,{fetchAsset=fetch}={}){
 validateCurrentAssets(data.assets,{ids:data.retired_ids,sha256:data.retired_sha256||[]});
 const byId=new Map(data.assets.map(a=>[a.id,a])),retired=new Set(data.retired_ids);
 const publicAsset=a=>{const {upstream_url,...safe}=a;return {...safe,url:`/api/characters/assets/${a.id}`,revision:a.sha256,...(['canonical','pose','human_pose'].includes(a.kind)?{generation_url:`/api/characters/generation?id=${a.id}`}:{})};};
 return async function handler(req,res){
  for(const [k,v]of Object.entries({'Cache-Control':'no-store','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'X-Asset-SHA256, X-Character-Revision','X-Content-Type-Options':'nosniff'}))res.setHeader(k,v);
  const json=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(req.method==='HEAD'?undefined:JSON.stringify(value));};
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
  if(!['GET','HEAD'].includes(req.method))return json(405,{error:'READ_ONLY'});
  try{
   const u=new URL(req.url,'https://ai-staff-two.vercel.app'),route=(u.searchParams.get('__route')||u.pathname.replace(/^\/api\/characters\/?/,'')).replace(/\/$/,'');
   if(route==='current'){
    const kind=u.searchParams.get('kind');if(kind&&!['canonical','pose','human_pose','hand_master','detail_master','profile'].includes(kind))return json(400,{error:'UNKNOWN_ASSET_KIND'});
    return json(200,{schema:'ai-staff/current-api/v1',platform_version:data.platform_version||null,revision:data.revision,policy:'CURRENT_ALLOWLIST_ONLY_NO_FALLBACK',generation_rules_revision:GENERATION_RULES_REVISION,new_generation:'/api/characters/generation',generation_guide:'/NEW-GENERATION.md',generation_preparer:'/prepare-generation.mjs',generation_client:'/character-client.mjs',generation_required_parameters:['id','brief'],existing_assets:'REUSE_UNCHANGED',hand_policy:'/hand-grip-policy.json',hand_master_revision:data.hand_master_revision||null,hand_master_catalog:'/hand-masters.json',shoulder_master_revision:data.shoulder_master_revision||null,assets:data.assets.filter(a=>!kind||a.kind===kind).map(publicAsset)});
   }
   if(route==='generation'){try{return json(200,createGenerationPacket(data,u.searchParams.get('id'),u.searchParams.get('brief')));}catch(e){return json(e.code==='RETIRED_CHARACTER_ASSET'?410:e.code==='UNKNOWN_CURRENT_ASSET'?404:e.code==='GENERATION_REFERENCE_MISSING'?409:400,{error:e.code||'GENERATION_PACKET_FAILED'});}}
   if(route==='resolve'){
    let id=u.searchParams.get('id');if(!id){const q=normalize(u.searchParams.get('q')||'');if(['클로이','clo02','chloe'].includes(q))return json(409,{error:'VARIANT_REQUIRED',examples:['착한클로이','기본클로이']});id=data.aliases[q];}
    if(retired.has(id))return json(410,{error:'RETIRED_CHARACTER_ASSET',current:'/api/characters/current'});
    const a=byId.get(id);if(!a)return json(404,{error:'UNKNOWN_CURRENT_ASSET',current:'/api/characters/current'});
    if(u.searchParams.has('revision')&&u.searchParams.get('revision')!==a.sha256)return json(410,{error:'RETIRED_ASSET_REVISION',current:publicAsset(a)});
    return json(200,publicAsset(a));
   }
   if(route.startsWith('assets/')){
    const id=decodeURIComponent(route.slice(7));if(retired.has(id))return json(410,{error:'RETIRED_CHARACTER_ASSET',current:'/api/characters/current'});
    const a=byId.get(id);if(!a)return json(404,{error:'UNKNOWN_CURRENT_ASSET'});
    const requested=u.searchParams.get('revision')||u.searchParams.get('sha');if(requested&&requested!==a.sha256)return json(410,{error:'RETIRED_ASSET_REVISION',current:publicAsset(a)});
    const upstream=await fetchAsset(a.upstream_url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!upstream.ok)return json(502,{error:'CURRENT_ASSET_UNAVAILABLE'});
    const bytes=Buffer.from(await upstream.arrayBuffer());if(bytes.length>4000000||createHash('sha256').update(bytes).digest('hex')!==a.sha256)return json(502,{error:'ASSET_INTEGRITY_FAILED'});
    res.statusCode=200;res.setHeader('Content-Type','image/png');res.setHeader('Content-Length',bytes.length);res.setHeader('X-Asset-SHA256',a.sha256);res.setHeader('X-Character-Revision',data.revision);return res.end(req.method==='HEAD'?undefined:bytes);
   }
   return json(404,{error:'UNKNOWN_CHARACTER_ENDPOINT',current:'/api/characters/current'});
  }catch{return json(502,{error:'CURRENT_ASSET_UNAVAILABLE'});}
 };
}
