import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,access,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();

async function runServer(handler,fn){
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fn('http://127.0.0.1:'+server.address().port);}
 finally{await new Promise(resolve=>server.close(resolve));}
}

test('Git build emits only curated static assets and a separate current API function',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'ai-staff-vercel-build-test-'));
 const out=path.join(temp,'output');
 try{
  execFileSync(process.execPath,[path.join(root,'public-release/build-vercel.mjs'),out],
    {cwd:root,encoding:'utf8',timeout:180000});
  const manifest=JSON.parse(await readFile(path.join(out,'config.json'),'utf8'));
  const catalog=JSON.parse(await readFile(path.join(out,'static','catalog.json'),'utf8'));
  const func=path.join(out,'functions','api','character.func');
  const cfg=JSON.parse(await readFile(path.join(func,'.vc-config.json'),'utf8'));
  assert.equal(manifest.version,3);
  assert.ok(manifest.routes.some(r=>r.src==='/api/characters/(.*)'&&
    r.dest==='/api/character?__route=$1'));
  assert.ok(manifest.routes.some(r=>r.handle==='filesystem'));
  assert.equal(cfg.runtime,'nodejs24.x');
  assert.equal(cfg.handler,'index.mjs');
  assert.equal(catalog.site_commit,sha);
  assert.ok((await stat(path.join(out,'static','index.html'))).isFile());
  assert.ok((await stat(path.join(out,'static','chakhan','index.html'))).isFile());
  assert.ok((await stat(path.join(func,'runtime','current-api.mjs'))).isFile());
  // Internal source and generated API handler cannot leak as static files.
  for(const unavailable of [
    'static/api/character.mjs','static/runtime','static/package.json',
    'static/vercel.json','static/robots','static/AGENTS.md','static/generator'
  ])await assert.rejects(access(path.join(out,unavailable)),{code:'ENOENT'});
  // Import the packaged function with its real relative runtime dependencies.
  const {default:handler}=await import(pathToFileURL(path.join(func,'index.mjs')));
  await runServer(handler,async url=>{
    const current=await fetch(url+'/api/character?__route=current');
    assert.equal(current.status,200);
    const data=await current.json();
    assert.equal(data.assets.length,26);
    assert.equal(data.assets.filter(a=>a.kind==='hand_master').length,3);
    assert.equal(data.assets.filter(a=>a.kind==='detail_master').length,1);
    assert.equal((await fetch(url+'/api/character?__route=resolve&id=robot-33-think-choice')).status,410);
    assert.equal((await fetch(url+'/api/character?__route=current&kind=unapproved')).status,400);
  });
 }finally{await rm(temp,{recursive:true,force:true});}
});
