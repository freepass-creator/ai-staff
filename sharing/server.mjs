import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {serveHumanLibrary} from '../asset-library/chloe-human/library.mjs';
export async function serveShare({root,...request}){
 const pointer=JSON.parse(await readFile(path.join(root,'sharing/config.json'),'utf8'));
 const catalog=JSON.parse(await readFile(pointer.current_file,'utf8'));
 return serveHumanLibrary({root,...request,catalog,prefix:'/share/',downloadFilename:'AI-Staff-Current-Kit.zip'});
}
