"""정본 기반 로컬 생성기. --dry-run은 모델/GPU/출력 파일을 사용하지 않습니다."""
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import warnings
try:
    from .common import ROOT, character, config, read_json, write_json, digest
except ImportError:
    from common import ROOT, character, config, read_json, write_json, digest

SHEETS={'profile':'01-대표프로필','scale':'02-키눈금-프로필','turnaround':'03-턴어라운드','face':'04-얼굴기준','expressions':'05-표정','outfits':'06-복장','poses':'07-동작','duo':'08-합'}
VIEWS={'front':'front view','three_quarter':'three quarter view','side':'exact side profile view','back':'back view, facing away, no face visible'}

def prompts(c, instruction, detail, cfg):
    return (', '.join(x for x in (instruction, detail, c['generation']['prompt_core']) if x),
            c['generation']['negative_core']+', '+cfg['negative_common'])

def token_check(text, tokenizers):
    counts=[len(t(text,truncation=False,add_special_tokens=True)['input_ids']) for t in tokenizers]
    if any(n>77 for n in counts): warnings.warn(f'SDXL 77토큰 초과: {counts}; 뒤쪽 내용이 잘립니다',UserWarning)
    return counts

def local_tokenizers(cfg):
    from transformers import CLIPTokenizer
    return [CLIPTokenizer.from_pretrained(str(Path(cfg['models']['config'])/name),local_files_only=True) for name in ('tokenizer','tokenizer_2')]

def items(c, kind):
    if kind in ('turnaround','scale'):
        return [{'id':v,'name':v,'desc':VIEWS[v]+', white t-shirt, white shorts, white sneakers, standing straight, full body, feet visible, plain light background','view':v} for v in VIEWS]
    if kind=='face':
        return [{'id':v,'name':v,'desc':VIEWS[v]+', neutral expression, face closeup','view':None} for v in ('front','three_quarter','side')]
    if kind in ('expressions','outfits'):
        return [{**x,'view':'front' if kind=='outfits' else None} for x in c[kind]]
    scenes=c.get('scenes')
    if scenes is None: scenes=read_json(ROOT/'generator/scenes.json').get(c['name'],[])
    if kind in ('scenes','poses'):
        values=c.get('poses',scenes) if kind=='poses' else scenes
        if not values: raise ValueError(f"{c['name']}: {kind} 설정 없음")
        for x in values:
            if not x.get('id') or Path(x['id']).name!=x['id'] or x['id'] in ('.','..') or not x.get('name'):
                raise ValueError('장면·동작에는 안전한 id와 name이 필요합니다')
        if len({x['id'] for x in values})!=len(values): raise ValueError('장면·동작 id 중복')
        return [{**x,'view':None} for x in values]
    raise ValueError(kind)

def plan(c, selected, n, cfg):
    if cfg['sampler']!='DPM++ 2M Karras': raise ValueError('지원하지 않는 샘플러')
    if n<1 or n*cfg['max_attempts']>len(cfg['seeds']): raise ValueError('n × max_attempts 만큼 고정 시드가 필요합니다')
    requested=list(SHEETS) if selected=='all' else [selected]
    deps=[]
    for kind in requested:
        for dep in ({'profile':['turnaround','face','expressions','outfits'], 'scale':['scale','face'], 'duo':['turnaround']}.get(kind,[kind])):
            if dep not in deps: deps.append(dep)
    jobs=[]
    for kind in deps:
        for item in items(c,kind):
            prefix={'expressions':'upper body closeup, '+item['id']+' expression','outfits':'front view, standing straight, full body, feet visible, plain light background'}.get(kind,'single person photograph')
            prompt,negative=prompts(c,prefix,item.get('desc',item['name']),cfg)
            for variant in range(n):
                jobs.append({'set':kind,'id':item['id'],'name':item['name'],'view':item['view'],'prompt':prompt,'negative':negative,
                             'variant':variant,'seeds':cfg['seeds'][variant*cfg['max_attempts']:(variant+1)*cfg['max_attempts']],
                             'resolution':cfg['sets'][kind]['resolution'],'ip_scale':cfg['sets'][kind]['ip_scale'],
                             'face_check':item.get('view')!='back'})
    result={'character':c['name'],'requested':requested,'jobs':jobs,'sheet_files':[SHEETS[k]+'.png' for k in requested if k in SHEETS]}
    if 'duo' in requested:
        others=[x.parent.name for x in (ROOT/'characters').glob('*/character.json') if x.parent.name!=c['name']]
        if len(others)!=1: raise ValueError('합 시트 상대 캐릭터는 정확히 하나 필요합니다')
        result['duo_partner']=others[0]
        result['duo_note']='상대의 turnaround를 별도 얼굴 참조로 생성; 공동 장면은 두 IP-Adapter 영역 마스크와 두 얼굴 검증 사용'
        result['duo_job']={'set':'duo','id':'together','seeds':cfg['seeds'][:cfg['max_attempts']], 'resolution':cfg['sets']['duo']['resolution'],'ip_scale':cfg['sets']['duo']['ip_scale'],'expected_faces':2}
    return result

def preflight(p,cfg):
    problems=[]
    names=[p['character']]+([p['duo_partner']] if 'duo_partner' in p else [])
    for name in names:
        if not (ROOT/'characters'/name/'refs/front.png').is_file(): problems.append(f'{name}: refs/front.png 없음')
    for key,value in cfg['models'].items():
        path=Path(cfg['models']['ip_adapter'])/value if key=='ip_weight' else Path(value)
        if not path.exists(): problems.append(f'모델 경로 없음: {path}')
    root=Path(cfg['output_root'])/p['character']
    for name in p['sheet_files']:
        if (root/'세트'/name).exists(): problems.append(f'기존 시트 보존: {root / "세트" / name}; 별도 output_root 사용')
    for job in p['jobs']:
        for seed in job['seeds']:
            path=root/job['set']/f"{job['id']}-{seed}.png"
            if path.exists(): problems.append(f'기존 개별 이미지 보존: {path}; 별도 output_root 사용')
    if 'duo_partner' in p:
        partner=plan(character(p['duo_partner']),'turnaround',1,cfg)
        partner['sheet_files']=[]
        problems.extend(preflight(partner,cfg))
        for seed in p['duo_job']['seeds']:
            path=root/'duo'/f'together-{seed}.png'
            if path.exists(): problems.append(f'기존 합 이미지 보존: {path}')
    return list(dict.fromkeys(problems))

class Backend:
    def __init__(self,cfg):
        # 강제 오프라인: 캐시 누락 시 다운로드 대신 오류를 냅니다.
        os.environ['HF_HUB_OFFLINE']='1'; os.environ['TRANSFORMERS_OFFLINE']='1'
        import torch
        from diffusers import StableDiffusionXLPipeline, AutoencoderKL, DPMSolverMultistepScheduler
        from transformers import CLIPVisionModelWithProjection
        self.torch=torch; self.cfg=cfg
        if not torch.cuda.is_available(): raise RuntimeError('CUDA GPU가 없습니다. 계획은 --dry-run 사용')
        m=cfg['models']
        encoder=CLIPVisionModelWithProjection.from_pretrained(m['image_encoder'],torch_dtype=torch.float16,local_files_only=True)
        vae=AutoencoderKL.from_pretrained(m['vae'],torch_dtype=torch.float16,local_files_only=True)
        self.pipe=StableDiffusionXLPipeline.from_single_file(m['checkpoint'],config=m['config'],vae=vae,image_encoder=encoder,torch_dtype=torch.float16,local_files_only=True)
        self.pipe.scheduler=DPMSolverMultistepScheduler.from_config(self.pipe.scheduler.config,algorithm_type='dpmsolver++',solver_order=2,use_karras_sigmas=True)
        weight=Path(m['ip_weight'])
        self.pipe.load_ip_adapter(m['ip_adapter'],subfolder=weight.parent.as_posix(),weight_name=weight.name,image_encoder_folder=None,local_files_only=True)
        self.pipe.enable_model_cpu_offload(); self.pipe.enable_vae_slicing(); self.pipe.enable_vae_tiling()
        torch.backends.cudnn.benchmark=False
        torch.backends.cuda.matmul.allow_tf32=False
        self.control=None

    def generate_duo(self,c,other,faces,seed):
        # 좌우 영역에 서로 다른 얼굴 어댑터를 적용합니다.
        if self.control is not None: self.control.remove_all_hooks()
        self.pipe.remove_all_hooks()
        if not getattr(self,'dual_loaded',False):
            m=self.cfg['models']; weight=Path(m['ip_weight'])
            self.pipe.load_ip_adapter([m['ip_adapter']]*2,subfolder=[weight.parent.as_posix()]*2,
                                     weight_name=[weight.name]*2,image_encoder_folder=None,local_files_only=True)
            self.dual_loaded=True
        self.pipe.enable_model_cpu_offload()
        strength=self.cfg['sets']['duo']['ip_scale']; self.pipe.set_ip_adapter_scale([strength,strength])
        width,height=self.cfg['sets']['duo']['resolution']
        masks=[]
        for left,right in ((0,width//2),(width//2,width)):
            mask=self.torch.zeros((1,1,height,width),dtype=self.torch.float16)
            mask[:,:,:,left:right]=1; masks.append(mask)
        instruction='two Korean coworkers sitting together at one office desk, reviewing a report together, left woman and right woman, both faces visible'
        prompt=instruction+', '+c['generation']['prompt_core']
        prompt2=instruction+', '+other['generation']['prompt_core']
        negative=c['generation']['negative_core']+', '+other['generation']['negative_core']+', third person, extra limbs, watermark'
        token_check(prompt,[self.pipe.tokenizer]); token_check(prompt2,[self.pipe.tokenizer_2])
        return self.pipe(prompt=prompt,prompt_2=prompt2,negative_prompt=negative,ip_adapter_image=faces,
                         cross_attention_kwargs={'ip_adapter_masks':masks},width=width,height=height,
                         num_inference_steps=self.cfg['steps'],guidance_scale=self.cfg['cfg'],
                         generator=self.torch.Generator(device='cpu').manual_seed(seed)).images[0]

    def generate(self,job,seed,face):
        from PIL import Image
        try:
            from .poses import draw_pose
        except ImportError:
            from poses import draw_pose
        pipe=self.pipe; extra={}
        if job['view']:
            if self.control is None:
                from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel
                control=ControlNetModel.from_pretrained(self.cfg['models']['controlnet'],torch_dtype=self.torch.float16,local_files_only=True)
                # 구성 요소 공유 시 기존 오프로딩 훅을 제거한 뒤 다시 설치합니다.
                self.pipe.remove_all_hooks()
                self.control=StableDiffusionXLControlNetPipeline(**self.pipe.components,controlnet=control)
                self.control.enable_model_cpu_offload()
            pipe=self.control
            extra={'image':Image.fromarray(draw_pose(job['view'],tuple(job['resolution']))),'controlnet_conditioning_scale':self.cfg['controlnet_conditioning_scale']}
        elif self.control is not None:
            self.control.remove_all_hooks(); self.pipe.enable_model_cpu_offload()
        if job['view'] and self.control is not None:
            self.pipe.remove_all_hooks(); self.control.enable_model_cpu_offload()
        pipe.set_ip_adapter_scale(job['ip_scale'])
        return pipe(prompt=job['prompt'],negative_prompt=job['negative'],ip_adapter_image=face,
                    width=job['resolution'][0],height=job['resolution'][1],num_inference_steps=self.cfg['steps'],guidance_scale=self.cfg['cfg'],
                    generator=self.torch.Generator(device='cpu').manual_seed(seed),**extra).images[0]

def grid(c, entries, title, columns=3):
    from PIL import Image,ImageDraw,ImageOps
    try:
        from .compose_scale import font
    except ImportError:
        from compose_scale import font
    page=Image.new('RGB',(2400,3200),'#F4F1EA'); d=ImageDraw.Draw(page)
    d.text((90,55),f"{c['name']} · {title}",font=font(56),fill='black')
    d.text((90,140),f"{c['role']['title']} · {c['basic']['age']}세 · {c['basic']['height_cm']}cm · {c['basic']['weight_kg']}kg",font=font(30),fill='black')
    rows=(len(entries)+columns-1)//columns; w=2220//columns; h=2650//max(1,rows)
    for i,(label,path) in enumerate(entries):
        x=90+i%columns*w; y=260+i//columns*h
        image=ImageOps.contain(Image.open(path).convert('RGB'),(w-30,h-80))
        page.paste(image,(x+(w-image.width)//2,y)); d.text((x+15,y+h-65),label,font=font(25),fill='black')
    examples=c.get('speech',{}).get('examples',[])
    # 정본 예문을 약한 기울기·기준선 변화로 필기 느낌으로 조판합니다.
    phrase=examples[0] if examples else '작성 전'
    x=90
    for i,char in enumerate(phrase):
        tile=Image.new('RGBA',(48,58),(0,0,0,0))
        ImageDraw.Draw(tile).text((4,3),char,font=font(28),fill='#252525')
        tile=tile.rotate((-2,1,0,2,-1)[i%5],resample=Image.Resampling.BICUBIC)
        page.paste(tile,(x,2980+(i%3-1)*2),tile)
        x+=int(font(28).getlength(char))+1
    return page

def run(c,p,cfg,backend=None):
    from PIL import Image
    import cv2
    import numpy as np
    try:
        from .face_check import FaceChecker,read_image
        from .compose_scale import compose,validate_casting
    except ImportError:
        from face_check import FaceChecker,read_image
        from compose_scale import compose,validate_casting
    reference=ROOT/'characters'/c['name']/'refs/front.png'
    checker=FaceChecker(cfg); crop=checker.reference(read_image(reference))
    face=Image.fromarray(cv2.cvtColor(crop,cv2.COLOR_BGR2RGB))
    backend=backend or Backend(cfg)
    root=Path(cfg['output_root'])/c['name']; accepted={}; failures=[]
    inputs={str(path.relative_to(ROOT)):digest(path) for path in [ROOT/'characters'/c['name']/'character.json',reference,*sorted((ROOT/'generator').glob('*.py')),ROOT/'generator/config.json',ROOT/'generator/scenes.json']}
    model_paths=set()
    for key,value in cfg['models'].items():
        if key=='ip_weight': continue
        path=Path(value)
        if path.is_file(): model_paths.add(path)
        elif path.is_dir(): model_paths.update(x for x in path.rglob('*') if x.is_file())
    provenance={'inputs_sha256':inputs,'config':cfg,'packages':{x:importlib.metadata.version(x) for x in ('torch','diffusers','transformers')},'model_sha256':{str(x):digest(x) for x in sorted(model_paths)},
                'template_sha256':{str(x):digest(x) for x in [ROOT/'templates/casting-v2/casting-dossier-v2-02-body-scale.png',ROOT/'templates/casting-v2/casting-v2-template.json',ROOT/'templates/casting-v2/validate-casting-v2.mjs',Path(cfg['font'])]}}
    manifests={}
    for job in p['jobs']:
        folder=root/job['set']; folder.mkdir(parents=True,exist_ok=True)
        path=folder/'manifest.json'
        if job['set'] not in manifests:
            manifests[job['set']]=read_json(path) if path.exists() else {'runs':[]}
            manifests[job['set']]['runs'].append({**provenance,'attempts':[]})
        current=manifests[job['set']]['runs'][-1]
        for seed in job['seeds']:
            record={'job':job,'seed':seed}
            try:
                image=backend.generate(job,seed,face)
                check=checker.check(cv2.cvtColor(np.asarray(image),cv2.COLOR_RGB2BGR)) if job['face_check'] else {'passed':True,'skipped':'뒷면은 얼굴 검사 제외'}
                output=folder/f"{job['id']}-{seed}.png"
                # 같은 입력·시드라도 기존 파일을 조용히 덮어쓰지 않습니다.
                if output.exists(): raise FileExistsError(f'기존 파일 보존: {output}')
                image.save(output); record.update(file=str(output),sha256=digest(output),face=check)
                if check['passed']: accepted[(job['set'],job['id'],job['variant'])]=output
            except Exception as exc:
                record.update(error=str(exc),face={'passed':False})
                current['attempts'].append(record); write_json(path,manifests[job['set']]); raise
            current['attempts'].append(record); write_json(path,manifests[job['set']])
            if record['face']['passed']: break
        else: failures.append(f"{job['set']}/{job['id']}/{job['variant']}")
    sheet_dir=root/'세트'; sheet_dir.mkdir(parents=True,exist_ok=True)
    sheet_manifest={'inputs':provenance,'sheets':[],'failed_items':failures}
    def entries(kind,limit=None):
        return [(x['name'],accepted[(kind,x['id'],0)]) for x in items(c,kind)[:limit]]
    for kind in p['requested']:
        if kind not in SHEETS or kind=='duo': continue
        record={'set':kind,'file':SHEETS[kind]+'.png'}
        try:
            if kind in ('scale','turnaround'):
                paths=[accepted[(kind,v,0)] for v in ('front','side','back')]
                page,geometry=compose([Image.open(x) for x in paths],c)
                record['geometry']=geometry; record['casting']=validate_casting(c,sheet_dir)
                if kind=='scale':
                    from PIL import ImageOps
                    for i,(_,path) in enumerate(entries('face')):
                        tile=ImageOps.contain(Image.open(path),(350,400)); page.paste(tile,(450+i*650,2550))
            else:
                selection=entries('turnaround')[:1]+entries('turnaround')[2:]+entries('face')+entries('expressions',1)+entries('outfits',4) if kind=='profile' else entries(kind,{'expressions':6,'outfits':4,'poses':6}.get(kind))
                page=grid(c,selection,SHEETS[kind],columns=4 if kind=='profile' else (2 if kind=='outfits' else 3))
            output=sheet_dir/record['file']
            if output.exists(): raise FileExistsError(f'기존 시트 보존: {output}')
            page.save(output); record.update(status='REVIEW',sha256=digest(output))
        except (KeyError,ValueError) as exc:
            record.update(status='HOLD',reason=str(exc)); failures.append('sheet/'+kind)
        sheet_manifest['sheets'].append(record)
    # duo는 두 정본을 각각 생성하고 합성하여 얼굴 참조가 서로 섞이지 않게 합니다.
    if 'duo' in p['requested']:
        other_names=[x.parent.name for x in (ROOT/'characters').glob('*/character.json') if x.parent.name!=c['name']]
        if len(other_names)!=1: raise ValueError('합 시트에는 상대 캐릭터가 정확히 하나 필요합니다')
        other=character(other_names[0]); other_plan=plan(other,'duo',1,cfg)
        other_plan['requested']=[]
        other_accepted,other_failures=run(other,other_plan,cfg,backend)
        needed=[accepted.get(('turnaround','front',0)),other_accepted.get(('turnaround','front',0))]
        record={'set':'duo','file':SHEETS['duo']+'.png','other_character_sha256':digest(ROOT/'characters'/other['name']/'character.json')}
        partner_ref=ROOT/'characters'/other['name']/'refs/front.png'
        partner_checker=FaceChecker(cfg); partner_crop=partner_checker.reference(read_image(partner_ref))
        partner_face=Image.fromarray(cv2.cvtColor(partner_crop,cv2.COLOR_BGR2RGB))
        attempts=[]; together=None
        duo_folder=root/'duo'; duo_folder.mkdir(parents=True,exist_ok=True)
        for seed in cfg['seeds'][:cfg['max_attempts']]:
            picture=backend.generate_duo(c,other,[face,partner_face],seed)
            bgr=cv2.cvtColor(np.asarray(picture),cv2.COLOR_RGB2BGR)
            detected=sorted(checker.faces(bgr),key=lambda f:float(f[0]))
            scores=[]
            if len(detected)==2:
                for fc,det in zip((checker,partner_checker),detected):
                    score=float(fc.recognizer.match(fc.ref,fc.feature(bgr,det),cv2.FaceRecognizerSF_FR_COSINE))
                    scores.append(score)
            passed=len(scores)==2 and all(s>=cfg['face_threshold'] for s in scores)
            output=duo_folder/f'together-{seed}.png'
            if output.exists(): raise FileExistsError(f'기존 이미지 보존: {output}')
            picture.save(output)
            attempts.append({'seed':seed,'face_count':len(detected),'scores_left_right':scores,'threshold':cfg['face_threshold'],'passed':passed,'file':str(output),'sha256':digest(output)})
            write_json(duo_folder/'manifest.json',{'inputs':provenance,'partner_reference_sha256':digest(partner_ref),'partner_character_sha256':record['other_character_sha256'],'attempts':attempts})
            if passed: together=picture; break
        if all(needed) and together is not None:
            page,geo=compose([Image.open(needed[0])],c,centers=[750])
            other_page,other_geo=compose([Image.open(needed[1])],other,centers=[1650])
            box=other_geo[0]['destination_box']; page.paste(other_page.crop(box),(box[0],box[1]))
            from PIL import ImageOps,ImageDraw
            from importlib import import_module
            font=import_module('generator.compose_scale' if __package__ else 'compose_scale').font
            d=ImageDraw.Draw(page); d.text((1300,255),f"{other['name']} · {other['basic']['height_cm']}cm",font=font(30),fill='white')
            work=ImageOps.contain(together,(1700,580)); page.paste(work,((2400-work.width)//2,2490))
            output=sheet_dir/record['file']
            if output.exists(): raise FileExistsError(f'기존 시트 보존: {output}')
            page.save(output); record.update(status='REVIEW',geometry=geo+other_geo,sha256=digest(output),together_attempts=attempts)
        else:
            record.update(status='HOLD',reason='두 직원의 통과 이미지 부족'); failures.append('sheet/duo')
        sheet_manifest['sheets'].append(record); failures.extend(other_failures)
    manifest_path=sheet_dir/'manifest.json'
    previous=read_json(manifest_path) if manifest_path.exists() else {'runs':[]}
    previous['runs'].append(sheet_manifest); write_json(manifest_path,previous)
    return accepted,failures

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--char',required=True)
    p.add_argument('--set',required=True,choices=[*SHEETS,'scenes','all']); p.add_argument('--n',type=int,default=1)
    p.add_argument('--dry-run',action='store_true'); a=p.parse_args()
    cfg=config(); c=character(a.char); result=plan(c,a.set,a.n,cfg)
    result['blockers']=preflight(result,cfg)
    tokenizers=local_tokenizers(cfg)
    for job in result['jobs']:
        job['tokens']=token_check(job['prompt'],tokenizers); job['negative_tokens']=token_check(job['negative'],tokenizers)
    if a.dry_run:
        print(json.dumps(result,ensure_ascii=False,indent=2)); return 0
    if result['blockers']:
        print('HOLD: '+'; '.join(result['blockers'])); return 1
    _,failures=run(c,result,cfg)
    if failures: print('HOLD: '+', '.join(failures)); return 1
    return 0

if __name__=='__main__': raise SystemExit(main())
