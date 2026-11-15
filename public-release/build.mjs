import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),site=path.join(root,'public-release/site');
const out=path.resolve(process.argv[2]||path.join(root,'public-site'));
try{if((await readdir(out)).length)throw Error('OUTPUT_NOT_EMPTY');}catch(e){if(e.code!=='ENOENT')throw e;await mkdir(out,{recursive:true});}
for(const name of ['index.html','styles.css','app.js','AI-START-HERE.md'])await cp(path.join(site,name),path.join(out,name));
await mkdir(path.join(out,'fonts'));for(const name of ['SUITE-Heavy.woff2','NotoSansKR-400.woff2','NotoSansKR-700.woff2','LICENSE-SUITE.txt','LICENSE-NOTO.txt'])await cp(path.join(site,'fonts',name),path.join(out,'fonts',name));
const c=JSON.parse(await readFile(path.join(site,'catalog.json'),'utf8'));
const profiles=JSON.parse(await readFile(path.join(root,'asset-library/kakao-profiles/library.json'),'utf8'));
if(profiles.profiles.length!==1||profiles.profiles[0].number!=='02'||profiles.profiles[0].sha256!=='49b6f9ae899afc64271aac75e0705b192316053d32ff85c6c316f20d02774352'||profiles.selection_policy.fallback_allowed!==false)throw Error('ONLY_OWNER_SELECTED_PROFILE_ALLOWED');
await writeFile(path.join(out,'profiles.json'),JSON.stringify(profiles,null,2)+'\n');c.profile_catalog='profiles.json';
const chakhan=JSON.parse(await readFile(path.join(site,'chakhan-use-cuts.json'),'utf8'));
if(chakhan.brand!=='착한거래'||!Array.isArray(chakhan.assets)||chakhan.assets.length<3||chakhan.assets.some(a=>a.brand!=='착한거래'||a.nameplate!=='착한거래'||a.emission_color!=='yellow'||!a.transparent_background||a.profile_usable!==false||!/^https:\/\/github\.com\/freepass-creator\/ai-staff\/releases\/download\//.test(a.png_url)||!/^[a-f0-9]{64}$/.test(a.sha256)))throw Error('INVALID_CHAKHAN_CUTS');
const chakhanText=JSON.stringify(chakhan,null,2)+'\n';if(/(?:["\s])[A-Za-z]:[/\\]|source_thread|incoming-pc1|PRIVATE KEY/.test(chakhanText))throw Error('NON_PUBLIC_CHAKHAN_METADATA');
for(const cover of chakhan.covers||[]){if(cover.width!==1200||cover.height!==1200||!chakhan.assets.some(a=>a.id===cover.pose_id&&a.sha256===cover.character_source_sha256)||!cover.png_url.startsWith('https://github.com/freepass-creator/ai-staff/releases/download/'))throw Error('INVALID_CHAKHAN_COVER');}
await cp(path.join(root,'robots/hand-grip-policy.json'),path.join(out,'hand-grip-policy.json'));
await writeFile(path.join(out,'chakhan-use-cuts.json'),chakhanText);c.chakhan_use_cuts_catalog='chakhan-use-cuts.json';
await mkdir(path.join(out,'chakhan','thumbs'),{recursive:true});for(const name of ['index.html','app.js'])await cp(path.join(site,'chakhan',name),path.join(out,'chakhan',name));
for(const a of [...chakhan.assets,...(chakhan.covers||[])]){if(!/^chakhan\/thumbs\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/.test(a.thumbnail))throw Error('INVALID_CHAKHAN_THUMB');await cp(path.join(site,a.thumbnail),path.join(out,a.thumbnail));}
c.site_commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const seen=new Set();for(const a of c.assets){if(seen.has(a.id))throw Error('DUPLICATE_ASSET');seen.add(a.id);if(!/^[a-f0-9]{64}$/.test(a.png_sha256)||!a.png_url.startsWith('https://github.com/freepass-creator/ai-staff/releases/download/')||!a.thumbnail.startsWith('thumbs/'))throw Error('INVALID_ASSET_RECORD');if(a.status==='design_proposal'&&a.production_usable)throw Error('PROPOSAL_PROMOTED');}
await mkdir(path.join(out,'thumbs'));for(const a of c.assets){if(!/^thumbs\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/.test(a.thumbnail))throw Error('INVALID_THUMBNAIL');await cp(path.join(site,a.thumbnail),path.join(out,a.thumbnail));}
const encoded=JSON.stringify(c,null,2)+'\n';if(/(?:["\s])[A-Za-z]:[/\\]|source_thread|incoming-pc1|source\.bundle|PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{25}/.test(encoded))throw Error('NON_PUBLIC_METADATA');
await writeFile(path.join(out,'catalog.json'),encoded);await mkdir(path.join(out,'api'),{recursive:true});await writeFile(path.join(out,'api/assets.json'),encoded);
await writeFile(path.join(out,'vercel.json'),JSON.stringify({version:2,cleanUrls:false,headers:[{source:'/catalog.json',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'},{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/chakhan-use-cuts.json',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'},{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/hand-grip-policy.json',headers:[{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/profiles.json',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'},{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/api/assets.json',headers:[{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'}]}]},null,2)+'\n');
console.log(JSON.stringify({status:'READY',output:out,assets:c.assets.length,source_commit:c.source_commit}));
