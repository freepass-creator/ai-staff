// Retired 2026-11-16 by owner instruction; old local files are never selected or served.
export async function selectLibrary(){throw Error('RETIRED_CHARACTER_LIBRARY_USE_ONLINE_CURRENT_API');}
export async function serveLibrary({res}){res.writeHead(410,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'RETIRED_CHARACTER_LIBRARY',current:'https://ai-staff-two.vercel.app/api/characters/current'}));}
