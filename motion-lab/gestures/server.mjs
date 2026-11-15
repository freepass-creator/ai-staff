// Retired gesture prototype; source history is not a production source.
export async function serveGestures({res}){res.writeHead(410,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'RETIRED_GESTURE_DESIGN',current:'https://ai-staff-two.vercel.app/api/characters/current'}));}
