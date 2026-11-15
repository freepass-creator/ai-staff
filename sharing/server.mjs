// Old mixed download contains retired robot designs and is no longer served.
export async function serveShare({res}){res.writeHead(410,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'RETIRED_MIXED_CHARACTER_BUNDLE',current:'https://ai-staff-two.vercel.app/api/characters/current'}));}
