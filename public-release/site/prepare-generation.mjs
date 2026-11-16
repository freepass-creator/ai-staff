import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {prepareCharacterGeneration,assertGenerationPacketCurrent} from './character-client.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),json=d=>JSON.stringify(d,null,2)+'\n';
export async function writeGenerationRequest({id,brief,output,base}){
 const out=path.resolve(output);try{await mkdir(out);}catch(e){if(e.code!=='EEXIST')throw e;}if((await readdir(out)).length)throw Error('OUTPUT_NOT_EMPTY');await writeFile(path.join(out,'PREPARING.lock'),'Reference preparation only, not production approval.\n',{flag:'wx'});
 try{const {packet,references}=await prepareCharacterGeneration({id,brief},{base}),files=[];
  for(const [i,a]of references.entries()){if(!/^[a-z0-9-]+$/.test(a.id))throw Error('INVALID_REFERENCE_ID');const file=`reference-${i+1}-${a.id}.png`;await writeFile(path.join(out,file),Buffer.from(a.bytes),{flag:'wx'});files.push({id:a.id,file,sha256:a.sha256});}
  const request={prompt:packet.prompt,referenced_image_paths:files.map(a=>path.join(out,a.file)),transparent_background:packet.transparent_background},requestText=json(request),packetText=json({...packet,files});
  await writeFile(path.join(out,'generation-packet.json'),packetText,{flag:'wx'});await writeFile(path.join(out,'imagegen-request.json'),requestText,{flag:'wx'});await writeFile(path.join(out,'REVIEW.json'),json(packet.review_template),{flag:'wx'});await assertGenerationPacketCurrent(packet,{base});
  await writeFile(path.join(out,'READY.json'),json({status:'REFERENCES_VERIFIED_READY_FOR_GENERATION',packet_sha256:sha(packetText),request_sha256:sha(requestText),production_usable:false,visual_review_required:true}),{flag:'wx'});return {output:out,references:files.length,actor_id:packet.actor_id,production_usable:false};
 }catch(e){await writeFile(path.join(out,'FAILED.json'),json({status:'PREPARATION_FAILED',error:e.message,production_usable:false}),{flag:'wx'}).catch(()=>{});throw e;}
}
export async function checkGenerationRequest(output,{base}={}){
 const out=path.resolve(output),ready=JSON.parse(await readFile(path.join(out,'READY.json'),'utf8')),packetBytes=await readFile(path.join(out,'generation-packet.json')),requestBytes=await readFile(path.join(out,'imagegen-request.json'));
 if(sha(packetBytes)!==ready.packet_sha256||sha(requestBytes)!==ready.request_sha256)throw Error('GENERATION_REQUEST_CHANGED');const packet=JSON.parse(packetBytes);for(const a of packet.files){if(!/^reference-\d+-[a-z0-9-]+\.png$/.test(a.file)||sha(await readFile(path.join(out,a.file)))!==a.sha256)throw Error('LOCAL_REFERENCE_CHANGED');}
 const request=JSON.parse(requestBytes),expected=packet.files.map(a=>path.join(out,a.file));if(JSON.stringify(request.referenced_image_paths)!==JSON.stringify(expected))throw Error('RELOCATED_REQUEST_REPREPARE');if(request.prompt!==packet.prompt||request.transparent_background!==packet.transparent_background||packet.files.length!==packet.references.length||packet.files.some((a,i)=>a.id!==packet.references[i].id||a.sha256!==packet.references[i].sha256))throw Error('GENERATION_REQUEST_CHANGED');
 await assertGenerationPacketCurrent(packet,{base});return {status:'CURRENT_REFERENCE_REQUEST_VERIFIED',visual_review_required:true,production_usable:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];if(args.includes('--check'))console.log(JSON.stringify(await checkGenerationRequest(get('--check'))));else{if(!['--id','--brief','--output'].every(k=>args.includes(k)&&get(k)))throw Error('Use --id current-id --brief scene-description --output new-empty-folder OR --check prepared-folder');console.log(JSON.stringify(await writeGenerationRequest({id:get('--id'),brief:get('--brief'),output:get('--output')})));}}catch(e){console.error(e.message);process.exitCode=1;}
}
