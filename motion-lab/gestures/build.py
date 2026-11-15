"""Source-bound planar SVG rig. Never promotes a generated pose to canonical."""
from pathlib import Path
from collections import defaultdict
import hashlib,json,html,base64,io,argparse
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--source')
parser.add_argument('--source-sha')
parser.add_argument('--output',required=True)
parser.add_argument('--channel-step',type=int,default=1)
parser.add_argument('--palm-reference',default=str(Path(__file__).with_name('palm-reference.json')))
parser.add_argument('--spec-output',default=str(Path(__file__).with_name('spec.json')))
parser.add_argument('--waist-detail',required=True)
parser.add_argument('--waist-detail-sha',required=True)
args=parser.parse_args()
OUT=Path(args.output)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if args.source:
    source=Path(args.source).resolve()
    assert args.source_sha and sha(source)==args.source_sha,'EXPLICIT_SOURCE_HASH_REQUIRED'
    source_id='chloe-closeout-fullbody'
else:
    link=json.loads((ROOT/'asset-library/chloe-blog/library.json').read_text(encoding='utf-8'))
    library=Path(link['library_root']);manifest=json.loads((library/'manifest.json').read_text(encoding='utf-8'))
    asset=next(a for a in manifest['assets'] if a['id']=='01-welcome')
    assert asset.get('production_usable') is not False,'REJECTED_POSE_SOURCE'
    source=library/asset['file'];assert sha(source)==asset['sha256'];source_id=asset['id']
reference_json=Path(args.palm_reference).resolve()
palm_reference=json.loads(reference_json.read_text(encoding='utf-8'))
reference_file=Path(palm_reference['reference_file'])
if not reference_file.is_absolute():reference_file=reference_json.parent/reference_file
assert sha(reference_file)==palm_reference['reference_sha256']
image=Image.open(source).convert('RGBA');w,h=image.size;assert (w,h)==(1024,1536)
assert args.channel_step in [1,4,8,16]
original_pixels=np.asarray(image)
waist_source=Path(args.waist_detail).resolve()
assert sha(waist_source)==args.waist_detail_sha,'WAIST_DETAIL_HASH_MISMATCH'
waist_image=Image.open(waist_source).convert('RGBA').resize((204,177),Image.Resampling.LANCZOS)
if args.channel_step>1:
    values=np.minimum(255,np.floor(original_pixels.astype('float32')/args.channel_step+.5)*args.channel_step).astype('uint8')
    image=Image.fromarray(values)
ownership=np.zeros((h,w),dtype=np.uint8)
parts=[{'id':'body','parent':None,'pivot':[512,1460]}]
def add(name,parent,pivot,polygon):
    mask=Image.new('1',(w,h));ImageDraw.Draw(mask).polygon(polygon,fill=1)
    ownership[np.asarray(mask,dtype=bool)]=len(parts)
    parts.append({'id':name,'parent':parent,'pivot':pivot})
add('head','body',[512,506],[(240,130),(780,130),(793,420),(697,500),(332,500),(230,421)])
add('upper-arm','body',[319,581],[(255,510),(371,510),(397,588),(347,633),(302,677),(235,723),(191,668),(220,602)])
add('forearm','upper-arm',[248,697],[(134,538),(226,538),(251,595),(292,659),(288,687),(251,722),(203,731),(157,689)])
add('palm','forearm',[187,552],[(78,332),(240,332),(241,427),(295,427),(298,466),(237,535),(220,567),(135,572),(94,494)])
digits={
 'little':{'poly':[(78,385),(125,385),(145,480),(117,492),(83,448)],'pivots':[[128,475],[119,449],[111,427]],'cuts':[449,427]},
 'ring':{'poly':[(119,350),(159,350),(172,474),(143,483),(124,434)],'pivots':[[155,468],[149,431],[141,399]],'cuts':[431,399]},
 'middle':{'poly':[(155,332),(198,332),(198,474),(166,483),(157,415)],'pivots':[[181,468],[178,427],[176,389]],'cuts':[427,389]},
 'index':{'poly':[(195,345),(241,345),(239,415),(227,477),(198,483)],'pivots':[[212,465],[214,426],[214,391]],'cuts':[426,391]},
 'thumb':{'poly':[(220,487),(248,431),(274,421),(298,440),(298,466),(264,509),(236,527)],'pivots':[[235,506],[253,481],[270,455]],'cuts':[481,458]},
}
for digit,d in digits.items():
    mask=Image.new('1',(w,h));ImageDraw.Draw(mask).polygon(d['poly'],fill=1);region=np.asarray(mask,dtype=bool)
    yy=np.arange(h)[:,None];parent='palm'
    for j in range(3):
        name=f'{digit}-{j+1}';selected=region.copy()
        if j==0:selected &= yy>=d['cuts'][0]
        elif j==1:selected &= (yy<d['cuts'][0])&(yy>=d['cuts'][1])
        else:selected &= yy<d['cuts'][1]
        ownership[selected]=len(parts);parts.append({'id':name,'parent':parent,'pivot':d['pivots'][j]});parent=name

rgba=np.asarray(image);groups=[defaultdict(list) for _ in parts]
for y in range(h):
    x=0
    while x<w:
        color=tuple(int(v) for v in rgba[y,x]);owner=int(ownership[y,x]);end=x+1
        while end<w and int(ownership[y,end])==owner and np.array_equal(rgba[y,end],rgba[y,x]):end+=1
        if color[3]:groups[owner][color].append(f'M{x} {y}h{end-x}v1h-{end-x}z')
        x=end
OUT.mkdir(parents=True,exist_ok=True)
spec={'schema_version':1,'status':'limited_2d_svg_release','production_usable':True,
 'production_scope':'Fixed-front subtle 2D gestures, strength <= 0.45; no 3D or full finger grasp',
 'max_supported_strength':0.45,
 'color_optimization':{'channel_step':args.channel_step,'max_source_rgba_channel_error':int(np.abs(original_pixels.astype('int16')-np.asarray(image).astype('int16')).max()),'scope':'Motion asset only. Exact canonical SVGs are unchanged.'},
 'vector_palm':'Native gradient paths replace the prior flat palm, preserving source fingers and thumb; practical owner closeout',
 'waist_hand':{'long_fingers':4,'thumb':1,'digits':5,'detail_source':str(waist_source),'detail_sha256':sha(waist_source),'placement':[548,748,204,177],'control':'Static corrected detail moves with body; not separately articulated waist fingers','correction':'Four visible long curled fingers and a separate shorter thumb, local material-preserving edit'},
 'source_asset_id':source_id,'source_png':str(source),'source_sha256':sha(source),'dimensions':[w,h],
 'canonical_catalog':'robots/current.json','canonical_modified':False,'parts':parts,
 'hand_materials':{'palm':'deep graphite gray','back':'white','leds':False},
 'palm_structure_reference':palm_reference,
 'capabilities':{'hierarchical_2d_joints':True,'small_head_arm_wrist_gestures':True,'finger_planar_rotation_and_foreshortening':'experimental','full_fist':False,'hand_front_back_turn':False,'blink':'not_included_requires_screen_layers','3d':False},
 'limits':'Small front-view motions only. Hidden surfaces and joint fillers are illustrative. Finger foreshortening is a 2D approximation, not depth-correct grasping.',
 'representation':'20 articulated SVG path subdocuments plus one static waist-hand correction SVG; no PNG inside SVG',
 'svg_file':str(OUT/'chloe-jointed.svg'),'path_master_file':str(OUT/'chloe-jointed-paths.svg'),'loop_seconds':6}
spec['fast_svg_file']=str(OUT/'chloe-web-jointed.svg')
spec['fast_representation']='Web playback: 20 original-pixel PNG textures plus one static waist-hand correction texture inside SVG joints; native vector palm. Pure path versions are separate.'
header=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
 '<title>클로이 작은 SVG 관절 제스처 — 시험용</title>',
 '<metadata>'+html.escape(json.dumps(spec,ensure_ascii=False))+'</metadata>',
 '<defs><radialGradient id="joint"><stop stop-color="#46494d"/><stop offset="1" stop-color="#101214"/></radialGradient><radialGradient id="palm-surface" cx=".42" cy=".33" r=".8"><stop stop-color="#3d4044"/><stop offset=".55" stop-color="#292c30"/><stop offset="1" stop-color="#141619"/></radialGradient><radialGradient id="thumb-volume" cx=".64" cy=".25" r=".85"><stop stop-color="#5a5e62"/><stop offset=".32" stop-color="#404449"/><stop offset=".75" stop-color="#26292d"/><stop offset="1" stop-color="#1a1d21"/></radialGradient></defs>']
waist_alpha=defaultdict(list)
for y in range(177):
    x=0
    while x<204:
        a=int(original_pixels[y+748,x+548,3]);end=x+1
        while end<204 and int(original_pixels[y+748,end+548,3])==a:end+=1
        if a:waist_alpha[a].append(f'M{x+548} {y+748}h{end-x}v1h-{end-x}z')
        x=end
coverage=''.join(f'<path fill="white" fill-opacity="{a/255:.12f}" d="'+''.join(runs)+'"/>' for a,runs in waist_alpha.items())
header.append('<defs><mask id="waist-coverage" maskUnits="userSpaceOnUse" x="548" y="748" width="204" height="177">'+coverage+'</mask><filter id="waist-edge-feather" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4"/></filter><mask id="waist-feather" maskUnits="userSpaceOnUse" x="548" y="748" width="204" height="177"><rect x="552" y="752" width="196" height="169" fill="white" filter="url(#waist-edge-feather)"/></mask></defs>')
waist_rgba=np.asarray(waist_image)
waist_groups=defaultdict(list)
for y in range(177):
    x=0
    while x<204:
        color=tuple(int(v) for v in waist_rgba[y,x]);end=x+1
        while end<204 and np.array_equal(waist_rgba[y,end],waist_rgba[y,x]):end+=1
        waist_groups[color].append(f'M{x} {y}h{end-x}v1h-{end-x}z');x=end
waist_paths=''.join(f'<path fill="#{r:02x}{g:02x}{b:02x}" fill-opacity="{a/255:.12f}" d="'+''.join(runs)+'"/>' for (r,g,b,a),runs in waist_groups.items())
waist_svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="204" height="177" viewBox="0 0 204 177"><g shape-rendering="crispEdges">{waist_paths}</g></svg>'
waist_vector_data=base64.b64encode(waist_svg.encode()).decode('ascii')
waist_stream=io.BytesIO();waist_image.save(waist_stream,format='PNG');waist_png_data=base64.b64encode(waist_stream.getvalue()).decode('ascii')

def waist_hand():
    content=(f'<g transform="translate(548 748)">{waist_paths}</g>' if path_mode else f'<image x="548" y="748" width="204" height="177" href="data:{"image/png" if mode=="web" else "image/svg+xml"};base64,{waist_png_data if mode=="web" else waist_vector_data}"/>')
    return '<g id="waist-hand" data-long-fingers="4" data-thumbs="1" mask="url(#waist-coverage)"><g mask="url(#waist-feather)">'+content+'</g></g>'
vector_parts={};fast_parts={}
for i,p in enumerate(parts):
    ys,xs=np.nonzero((ownership==i)&(original_pixels[:,:,3]>0));x0,x1=int(xs.min()),int(xs.max())+1;y0,y1=int(ys.min()),int(ys.max())+1
    cw,ch=x1-x0,y1-y0
    sub=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{cw}" height="{ch}" viewBox="{x0} {y0} {cw} {ch}"><defs><filter id="sampling" x="-1%" y="-1%" width="102%" height="102%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0.55"/></filter></defs><g shape-rendering="crispEdges" filter="url(#sampling)">']
    for (r,g,b,a),runs in sorted(groups[i].items()):
        opacity='' if a==255 else f' fill-opacity="{a/255:.12f}"'
        sub.append(f'<path fill="#{r:02x}{g:02x}{b:02x}"{opacity} d="'+''.join(runs)+'"/>')
    sub.append('</g></svg>')
    data=base64.b64encode(''.join(sub).encode('utf-8')).decode('ascii')
    vector_parts[i]=(x0,y0,cw,ch,data)
    crop=original_pixels[y0:y1,x0:x1].copy();crop[ownership[y0:y1,x0:x1]!=i]=0
    stream=io.BytesIO();Image.fromarray(crop).save(stream,format='PNG')
    fast_parts[i]=(x0,y0,cw,ch,base64.b64encode(stream.getvalue()).decode('ascii'))
text=[];path_mode=False
def render(index):
    p=parts[index];name=p['id'];px,py=p['pivot']
    text.append(f'<g id="{name}" transform="rotate(0 {px} {py})"><g transform="translate({px} {py})"><g id="{name}-scale" transform="scale(1 1)"><g transform="translate({-px} {-py})">')
    # Extra surfaces stay hidden in neutral; they are not source geometry.
    if name in ['upper-arm','forearm','palm']:
        radius={'upper-arm':27,'forearm':26,'palm':23}[name]
        text.append(f'<circle id="{name}-filler" cx="{px}" cy="{py}" r="{radius}" fill="url(#joint)" opacity="0"/>')
    # Digits first; palm material occludes their roots as projection shortens them.
    children=[i for i,v in enumerate(parts) if v['parent']==name]
    if name=='palm':
        for child in children:render(child)
    text.append(f'<g id="{name}-art">')
    if path_mode:
        for (r,g,b,a),runs in sorted(groups[index].items()):
            opacity='' if a==255 else f' fill-opacity="{a/255:.12f}"'
            text.append(f'<path shape-rendering="crispEdges" fill="#{r:02x}{g:02x}{b:02x}"{opacity} d="'+''.join(runs)+'"/>')
    else:
        x,y,cw,ch,data=(fast_parts if mode=='web' else vector_parts)[index]
        mime='image/png' if mode=='web' else 'image/svg+xml'
        text.append(f'<image x="{x}" y="{y}" width="{cw}" height="{ch}" href="data:{mime};base64,{data}"/>')
    text.append('</g>')
    if name=='body':text.append(waist_hand())
    if name=='palm':
        text.append('<g id="palm-native-vector-detail"><path d="M126 480 Q151 474 180 477 L216 474 Q220 487 235 498 L231 522 Q225 542 207 548 Q172 557 147 544 Q130 531 126 480Z" fill="url(#palm-surface)"/><path d="M231 498 Q217 485 204 492 Q190 504 191 523 Q192 537 204 543 Q223 537 229 519Z" fill="url(#thumb-volume)"/><path d="M205 492 Q188 505 191 524" fill="none" stroke="#14171a" stroke-width="1.7" stroke-linecap="round" opacity=".5"/><path d="M139 484 Q156 490 173 485" fill="none" stroke="#696d71" stroke-width="1" stroke-linecap="round" opacity=".28"/></g>')
    if name!='palm':
        for child in children:render(child)
    text.append('</g></g></g></g>')
for mode in ['paths','svg','web']:
    path_mode=mode=='paths'
    text=header.copy()
    if mode=='web':
        web_metadata={**spec,'representation':spec['fast_representation'],'color_optimization':None}
        text[2]='<metadata>'+html.escape(json.dumps(web_metadata,ensure_ascii=False))+'</metadata>'
    elif mode=='paths':
        path_metadata={**spec,'representation':'All original-color paths inline in hierarchical groups, with static waist-hand correction; no PNG or SVG image subdocuments'}
        text[2]='<metadata>'+html.escape(json.dumps(path_metadata,ensure_ascii=False))+'</metadata>'
    render(0);text.append('</svg>')
    target=Path(spec['path_master_file'] if path_mode else spec['fast_svg_file'] if mode=='web' else spec['svg_file']);target.write_text('\n'.join(text),encoding='utf-8')
spec['svg_sha256']=sha(Path(spec['svg_file']));spec['path_master_sha256']=sha(Path(spec['path_master_file']))
spec['fast_svg_sha256']=sha(Path(spec['fast_svg_file']))
spec_output=Path(args.spec_output);spec_output.parent.mkdir(parents=True,exist_ok=True)
spec_output.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'BUILT','parts':len(parts),'bytes':target.stat().st_size,'source_sha256':sha(source)}))
