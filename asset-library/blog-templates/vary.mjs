import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const light=['peach','sky','sage','lilac','paper'];
const portraits=['human/02-tablet-consultation','human/10-navy-present','human/11-cardigan-notebook'];
const owns=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
export function varyJobs(jobs,{offset=0}={}){
 let coverIndex=offset;
 return jobs.map((input,i)=>{
  const j=structuredClone(input);
  if(!owns(j,'theme'))j.theme=j.template==='caution'?'ink':light[(i+offset)%light.length];
  if(!owns(j,'character')&&!j.scene){
   j.character=j.template==='cover'?portraits[coverIndex++%portraits.length]:j.template==='caution'?null:j.template==='process'||j.template==='faq'?'human/04-phone-consultation':'human/02-tablet-consultation';
  }
  return j;
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output,offset='0']=process.argv.slice(2);
 if(!input||!output||!Number.isInteger(Number(offset))||Number(offset)<0)throw Error('USAGE: node vary.mjs input.json new-output.json [offset]');
 try{await access(output);}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(output,JSON.stringify(varyJobs(JSON.parse(await readFile(input,'utf8')),{offset:Number(offset)}),null,2)+'\n');process.exit(0);}
 throw Error('OUTPUT_EXISTS');
}
