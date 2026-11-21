import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateCurrentAssets,createCanonicalAssets,validateProfilePolicy} from './current-api.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),site=path.join(root,'public-release/site');
const out=path.resolve(process.argv[2]||path.join(root,'public-site'));
try{if((await readdir(out)).length)throw Error('OUTPUT_NOT_EMPTY');}catch(e){if(e.code!=='ENOENT')throw e;await mkdir(out,{recursive:true});}
for(const name of ['index.html','styles.css','app.js','AI-START-HERE.md','CHARACTER-API.md','NEW-GENERATION.md','character-client.mjs','prepare-generation.mjs'])await cp(path.join(site,name),path.join(out,name));
await mkdir(path.join(out,'fonts'));for(const name of ['SUITE-Heavy.woff2','NotoSansKR-400.woff2','NotoSansKR-700.woff2','LICENSE-SUITE.txt','LICENSE-NOTO.txt'])await cp(path.join(site,'fonts',name),path.join(out,'fonts',name));
for(const name of ['SUITE-Heavy-UI.woff2','NotoSansKR-400-UI.woff2','NotoSansKR-700-UI.woff2'])await cp(path.join(site,'fonts',name),path.join(out,'fonts',name));
await cp(path.join(root,'asset-library/chakhan-ci/chakhan-ci-on-light.svg'),path.join(out,'brand.svg'));
const c=JSON.parse(await readFile(path.join(site,'catalog.json'),'utf8'));
for(const file of ['index.html','chakhan/index.html']){
 const location=file==='index.html'?'':'chakhan/',title=file==='index.html'?'AI Staff · 클로이·클로아 VER1.0':'착한거래 · 클로이 VER1.0 활용 이미지';
 const image=c.assets.find(a=>a.id==='canonical-chakhan-white-v1').png_url;
 let html=await readFile(path.join(out,file),'utf8').catch(()=>readFile(path.join(site,file),'utf8'));
 html=html.replace('</head>',`<meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="같은 캐릭터를 유지하는 최신 정본과 활용 PNG"><meta property="og:image" content="${image}"><meta property="og:url" content="https://ai-staff-two.vercel.app/${location}"></head>`);
 for(const [id,asset]of [['hero-robot','canonical-basic-purple-v1'],['hero-human','human-10-navy-present']])html=html.replace(new RegExp(`id="${id}"`),`id="${id}" src="${c.assets.find(a=>a.id===asset).thumbnail}"`);
 if(file==='index.html')await writeFile(path.join(out,file),html);
 else c.chakhan_page_metadata=html;
}
const profiles=JSON.parse(await readFile(path.join(root,'asset-library/kakao-profiles/library.json'),'utf8'));
validateProfilePolicy(profiles);
await writeFile(path.join(out,'profiles.json'),JSON.stringify(profiles,null,2)+'\n');c.profile_catalog='profiles.json';
const chakhan=JSON.parse(await readFile(path.join(site,'chakhan-use-cuts.json'),'utf8'));
const ci=chakhan.runtime_assets?.find(a=>a.file==='assets/brand/ci-current.svg');
if(!ci||ci.sha256!==createHash('sha256').update(await readFile(path.join(root,'asset-library/chakhan-ci/chakhan-ci-on-light.svg'))).digest('hex')||chakhan.runtime_assets.some(a=>a.file.endsWith('ci-P2.svg')))throw Error('CURRENT_CI_REFERENCE_DRIFT');
if(chakhan.brand!=='착한거래'||!Array.isArray(chakhan.assets)||chakhan.assets.length<3||chakhan.assets.some(a=>a.brand!=='착한거래'||a.nameplate!=='착한거래'||a.emission_color!=='yellow'||!a.transparent_background||a.profile_usable!==false||!/^https:\/\/github\.com\/freepass-creator\/ai-staff\/releases\/download\//.test(a.png_url)||!/^[a-f0-9]{64}$/.test(a.sha256)))throw Error('INVALID_CHAKHAN_CUTS');
const chakhanText=JSON.stringify(chakhan,null,2)+'\n';if(/(?:["\s])[A-Za-z]:[/\\]|source_thread|incoming-pc1|PRIVATE KEY/.test(chakhanText))throw Error('NON_PUBLIC_CHAKHAN_METADATA');
if((chakhan.covers||[]).some(a=>a.platform_version!=='VER1.0'))throw Error('LEGACY_COVERS_NOT_CURRENT_PLATFORM');
for(const cover of chakhan.covers||[]){if(cover.width!==1200||cover.height!==1200||!chakhan.assets.some(a=>a.id===cover.pose_id&&a.sha256===cover.character_source_sha256)||!cover.png_url.startsWith('https://github.com/freepass-creator/ai-staff/releases/download/'))throw Error('INVALID_CHAKHAN_COVER');}
await cp(path.join(root,'robots/hand-grip-policy.json'),path.join(out,'hand-grip-policy.json'));
const hands=JSON.parse(await readFile(path.join(root,'robots/hand-masters.json'),'utf8'));
if(hands.topology.digits_per_hand!==5||hands.topology.long_fingers!==4||hands.topology.thumbs!==1||hands.assets.length!==3)throw Error('INVALID_HAND_MASTER_TOPOLOGY');
await writeFile(path.join(out,'hand-masters.json'),JSON.stringify(hands,null,2)+'\n');
await writeFile(path.join(out,'chakhan-use-cuts.json'),chakhanText);c.chakhan_use_cuts_catalog='chakhan-use-cuts.json';
await mkdir(path.join(out,'chakhan','thumbs'),{recursive:true});for(const name of ['index.html','app.js'])await cp(path.join(site,'chakhan',name),path.join(out,'chakhan',name));
await writeFile(path.join(out,'chakhan/index.html'),c.chakhan_page_metadata);delete c.chakhan_page_metadata;
for(const a of [...chakhan.assets,...(chakhan.covers||[])]){if(!/^chakhan\/thumbs\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/.test(a.thumbnail))throw Error('INVALID_CHAKHAN_THUMB');await cp(path.join(site,a.thumbnail),path.join(out,a.thumbnail));}
c.site_commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const retired=JSON.parse(await readFile(path.join(root,'robots/retired-public-assets.json'),'utf8'));
const seen=new Set();for(const a of c.assets){if(retired.asset_ids.includes(a.id)||retired.retired_asset_sha256?.includes(a.png_sha256))throw Error('RETIRED_ASSET_REINTRODUCED');if(seen.has(a.id))throw Error('DUPLICATE_ASSET');seen.add(a.id);if(!/^[a-f0-9]{64}$/.test(a.png_sha256)||!a.png_url.startsWith('https://github.com/freepass-creator/ai-staff/releases/download/')||! /^(thumbs|chakhan\/thumbs)\//.test(a.thumbnail))throw Error('INVALID_ASSET_RECORD');if(a.status==='design_proposal'&&a.production_usable)throw Error('PROPOSAL_PROMOTED');}
await mkdir(path.join(out,'thumbs'));for(const a of c.assets){if(!/^(thumbs|chakhan\/thumbs)\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/.test(a.thumbnail))throw Error('INVALID_THUMBNAIL');await cp(path.join(site,a.thumbnail),path.join(out,a.thumbnail));}
const encoded=JSON.stringify(c,null,2)+'\n';if(/(?:["\s])[A-Za-z]:[/\\]|source_thread|incoming-pc1|source\.bundle|PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{25}/.test(encoded))throw Error('NON_PUBLIC_METADATA');
await writeFile(path.join(out,'catalog.json'),encoded);await mkdir(path.join(out,'api'),{recursive:true});await writeFile(path.join(out,'api/assets.json'),encoded);
const current=JSON.parse(await readFile(path.join(root,'robots/current.json'),'utf8'));
for(const a of chakhan.assets)if(a.platform_version!=='VER1.0'||a.canonical_reference_sha256!==current.variants['chakhan-white-v1'].assets.png.sha256)throw Error('POSE_PLATFORM_DRIFT');
await cp(path.join(root,'robots/platform-ver1.json'),path.join(out,'platform-ver1.json'));
const apiAssets=createCanonicalAssets(c.assets,current);
apiAssets.push(...chakhan.assets.map(a=>({id:a.id,character_id:'CLO-02',kind:'pose',platform_version:'VER1.0',variant:a.variant,brand:a.brand,label:a.label,usage:a.usage,tags:a.tags,sha256:a.sha256,upstream_url:a.png_url,width:a.width,height:a.height})));
apiAssets.push(...c.assets.filter(a=>a.category==='human'&&a.production_usable).map(a=>({id:a.id,character_id:'HUMAN-CHLOE',kind:'human_pose',variant:'human-chloe-v1',brand:'착한거래',label:a.title,usage:a.usage,tags:a.tags,sha256:a.png_sha256,upstream_url:a.png_url,width:a.width,height:a.height})));
for(const a of hands.assets){if(!c.assets.some(g=>g.id===a.id&&g.png_sha256===a.sha256)||a.total_digits!==5||a.long_fingers!==4||a.thumbs!==1)throw Error('HAND_MASTER_CATALOG_DRIFT');apiAssets.push({id:a.id,character_id:'ROBOT-HAND-V1',kind:'hand_master',variant:hands.revision,label:a.label,usage:a.usage,side:a.side,surface:a.surface,topology:hands.topology,master_revision:hands.revision,scope:hands.scope,sha256:a.sha256,upstream_url:a.png_url,width:a.width,height:a.height});}
if(apiAssets.filter(a=>a.kind==='human_pose').length!==12)throw Error('HUMAN_API_CATALOG_INCOMPLETE');
for(const a of chakhan.assets)if(!c.assets.some(g=>g.id===a.id&&g.png_sha256===a.sha256))throw Error('POSE_CATALOG_DRIFT');

const shoulder=JSON.parse(await readFile(path.join(root,'robots/shoulder-master.json'),'utf8')),detail=shoulder.asset;apiAssets.push({...detail,character_id:'SHARED-ROBOT-SHOULDER',variant:shoulder.revision,upstream_url:detail.png_url});delete apiAssets.at(-1).png_url;
await writeFile(path.join(out,'shoulder-master.json'),JSON.stringify(shoulder,null,2)+'\n');
validateCurrentAssets(apiAssets,{ids:retired.asset_ids,sha256:retired.retired_asset_sha256||[]});
const revision=createHash('sha256').update(JSON.stringify(apiAssets)).digest('hex');
if(apiAssets.length!==26||apiAssets.filter(a=>a.kind==='pose').length!==7||apiAssets.some(a=>a.kind==='profile'))throw Error('PLATFORM_API_CATALOG_INCOMPLETE');
const apiData={platform_version:'VER1.0',revision,assets:apiAssets,hand_master_revision:hands.revision,shoulder_master_revision:shoulder.revision,retired_ids:retired.asset_ids,retired_sha256:retired.retired_asset_sha256||[],aliases:{착한클로이:'canonical-chakhan-white-v1',착한거래클로이:'canonical-chakhan-white-v1',기본클로이:'canonical-basic-purple-v1',보라색클로이:'canonical-basic-purple-v1',클로아:'canonical-cloa-amber-v1',clo04:'canonical-cloa-amber-v1',사람형클로이:'human-01-front-welcome',사람클로이:'human-01-front-welcome',인간형클로이:'human-01-front-welcome',왼손바닥:'hand-left-palm-v1',오른손바닥:'hand-right-palm-v1'}};
await mkdir(path.join(out,'runtime'));await cp(path.join(root,'public-release/current-api.mjs'),path.join(out,'runtime/current-api.mjs'));
await cp(path.join(root,'public-release/generation.mjs'),path.join(out,'runtime/generation.mjs'));
await writeFile(path.join(out,'api/character.mjs'),`import {createCharacterApi} from '../runtime/current-api.mjs';\nexport default createCharacterApi(${JSON.stringify(apiData)});\n`);
await writeFile(path.join(out,'package.json'),JSON.stringify({private:true,type:'module',engines:{node:'24.x'}}));
await writeFile(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://ai-staff-two.vercel.app/sitemap.xml\n');
await writeFile(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://ai-staff-two.vercel.app/</loc></url><url><loc>https://ai-staff-two.vercel.app/chakhan/</loc></url></urlset>');
await writeFile(path.join(out,'vercel.json'),JSON.stringify({version:2,cleanUrls:false,rewrites:[{source:'/api/characters/:path*',destination:'/api/character?__route=:path*'}],headers:[{source:'/(.*)',headers:[{key:'Cache-Control',value:'no-store'},{key:'Access-Control-Allow-Origin',value:'*'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' https://github.com https://*.githubusercontent.com data:; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'"},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}]},null,2)+'\n');
console.log(JSON.stringify({status:'READY',output:out,assets:c.assets.length,source_commit:c.source_commit}));
