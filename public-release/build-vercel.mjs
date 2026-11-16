#!/usr/bin/env node
// Git-connected Vercel deployments must publish ONLY the curated Build Output API
// files. This wraps the already-verified public-release/build.mjs; it does not
// generate or approve any new character artwork.
import {cp, mkdir, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]||path.join(root,'.vercel','output'));

async function emptyDirectory(dir){
  try {
    if((await readdir(dir)).length)throw Error('VERCEL_OUTPUT_NOT_EMPTY');
  }catch(e){
    if(e.code!=='ENOENT')throw e;
    await mkdir(dir,{recursive:true});
  }
}
async function requiredRegular(file){
  const info=await stat(file);
  if(!info.isFile())throw Error('VERCEL_OUTPUT_MISSING_'+path.basename(file));
}

await emptyDirectory(output);
const publicDir=path.join(output,'static');
await mkdir(publicDir);
const builder=path.join(root,'public-release','build.mjs');
execFileSync(process.execPath,[builder,publicDir],{
  cwd:root,encoding:'utf8',timeout:180000,stdio:['ignore','pipe','inherit']
});

const gitSha=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const catalog=JSON.parse(await readFile(path.join(publicDir,'catalog.json'),'utf8'));
if(catalog.site_commit!==gitSha)throw Error('VERCEL_SOURCE_COMMIT_MISMATCH');
await requiredRegular(path.join(publicDir,'api','character.mjs'));
await requiredRegular(path.join(publicDir,'runtime','current-api.mjs'));
await requiredRegular(path.join(publicDir,'runtime','generation.mjs'));

const func=path.join(output,'functions','api','character.func');
await mkdir(path.join(func,'api'),{recursive:true});
await mkdir(path.join(func,'runtime'),{recursive:true});
await cp(path.join(publicDir,'api','character.mjs'),path.join(func,'api','character.mjs'));
await cp(path.join(publicDir,'runtime','current-api.mjs'),path.join(func,'runtime','current-api.mjs'));
await cp(path.join(publicDir,'runtime','generation.mjs'),path.join(func,'runtime','generation.mjs'));
await writeFile(path.join(func,'index.mjs'),
  "export {default} from './api/character.mjs';\n");
await writeFile(path.join(func,'package.json'),
  JSON.stringify({private:true,type:'module'})+'\n');
await writeFile(path.join(func,'.vc-config.json'),
  JSON.stringify({runtime:'nodejs24.x',handler:'index.mjs',launcherType:'Nodejs',
    shouldAddHelpers:true,maxDuration:20},null,2)+'\n');

// The generated API implementation and Node internals are private function
// files, NOT public static assets. Keep the public /api/assets.json snapshot.
await rm(path.join(publicDir,'api','character.mjs'));
await rm(path.join(publicDir,'runtime'),{recursive:true});
await rm(path.join(publicDir,'vercel.json'));
await rm(path.join(publicDir,'package.json'));

const manifest={
  version:3,
  routes:[
    {src:'/(.*)',headers:{
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Access-Control-Allow-Origin':'*'
    },continue:true},
    {src:'/api/characters/(.*)',dest:'/api/character?__route=$1'},
    {handle:'filesystem'}
  ]
};
await writeFile(path.join(output,'config.json'),JSON.stringify(manifest,null,2)+'\n');
for(const file of [
  'static/index.html','static/catalog.json','static/chakhan/index.html',
  'functions/api/character.func/index.mjs',
  'functions/api/character.func/.vc-config.json'
])await requiredRegular(path.join(output,file));
console.log(JSON.stringify({status:'CURATED_VERCEL_BUILD_READY',commit:gitSha,
  output,staticAssets:catalog.assets.length}));
