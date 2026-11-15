export const formats={hero:{width:1200,height:675},square:{width:1080,height:1080}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCard(asset,format='hero'){
 if(!formats[format])throw Error('UNKNOWN_FORMAT');
 const {width,height}=formats[format];
 const pointing=asset.id==='02-compare'&&format==='hero';
 const scene=asset.composition==='scene';
 const titles=asset.copy.title.split('\n').map(esc).join('<br>');
 return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
 @font-face{font-family:SUITE;src:url('/brand/SUITE-Heavy.woff2');font-weight:900;font-display:block}
 *{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
 body{font-family:SUITE,system-ui;color:#182323;background:${asset.copy.bg}}
 .canvas{width:100%;height:100%;position:relative;overflow:hidden}
 .orb{position:absolute;width:590px;height:590px;border-radius:50%;background:${asset.copy.accent};right:-200px;top:110px;opacity:.45}
 .brand{position:absolute;top:44px;left:52px;width:182px;height:54px;object-fit:contain;object-position:left}
 .copy{position:absolute;left:${pointing?500:58}px;top:${format==='hero'?160:140}px;width:${format==='hero'?(scene?535:650):900}px;z-index:2}
 .kicker{font-size:20px;letter-spacing:1px;margin:0 0 20px;color:#476056}
 h1{font-size:${format==='hero'?62:64}px;line-height:1.17;letter-spacing:-2px;margin:0;word-break:keep-all}
 .desc{font:400 ${format==='hero'?25:28}px/1.55 system-ui;max-width:${format==='hero'?560:830}px;margin-top:26px;white-space:pre-line;color:#46554c}
 .pill{display:inline-block;margin-top:22px;font-size:19px;background:white;border:1px solid #22332922;padding:10px 17px;border-radius:10px}
 .pose{position:absolute;${pointing?'left:12px':'right:'+(format==='hero'?12:40)+'px'};bottom:36px;width:${scene?(format==='hero'?580:900):(format==='hero'?430:420)}px;height:${scene?(format==='hero'?430:440):(format==='hero'?540:420)}px;object-fit:contain;object-position:center bottom}
 .points{position:absolute;left:58px;top:660px;width:500px;font-size:27px;line-height:1.8;padding:0;list-style:none;color:#334c3d}.points li{margin-bottom:13px}.points li::before{content:'✓';margin-right:16px;color:#49745c}
 .footer{position:absolute;left:58px;bottom:36px;font:400 16px system-ui;color:#607266;max-width:${format==='hero'?650:520}px}
 </style><div class="canvas"><div class="orb"></div><img class="brand" src="/brand/ci-P2.svg" alt="착한거래"><section class="copy"><p class="kicker">착한거래 AI · 장기렌터카 비교견적</p><h1>${titles}</h1><p class="desc">${esc(asset.copy.subtitle)}</p><span class="pill">${esc(asset.copy.tag)}</span></section>${format==='square'&&!scene?'<ul class="points">'+(asset.copy.points||[]).map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':''}<img class="pose" src="/poses/${esc(asset.id)}.png" alt="${esc(asset.alt)}"><div class="footer">${esc(asset.copy.footer)}</div></div></html>`;
}
