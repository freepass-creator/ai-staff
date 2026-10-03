import copy
import json
import subprocess
import sys
import tempfile
import unittest
import warnings
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image, ImageDraw
from generator.common import ROOT, character, config, validate
from generator.gen import plan, prompts, token_check, local_tokenizers, run, preflight, Backend
from generator.docs import render
from generator.poses import POINTS, draw_pose
from generator.face_check import FaceChecker
from generator.compose_scale import compose, validate_casting
from generator import upload

class GeneratorTests(unittest.TestCase):
    def setUp(self):
        self.c=character('클로이'); self.cfg=config()

    def test_characters(self):
        for name in ('클로이','클로아'): validate(character(name))
        bad=copy.deepcopy(self.c); del bad['basic']['height_cm']
        with self.assertRaises(ValueError): validate(bad)

    def test_duplicate_ids(self):
        bad=copy.deepcopy(self.c); bad['outfits'].append(bad['outfits'][0])
        with self.assertRaises(ValueError): validate(bad)

    def test_prompt_order(self):
        positive,negative=prompts(self.c,'full body side view','white shirt',self.cfg)
        self.assertTrue(positive.startswith('full body side view, white shirt'))
        self.assertIn(self.c['generation']['prompt_core'],positive)
        self.assertTrue(negative.startswith(self.c['generation']['negative_core']))

    def test_token_warning(self):
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            counts=token_check('hello '*100,local_tokenizers(self.cfg))
        self.assertTrue(all(x>77 for x in counts)); self.assertTrue(caught)

    def test_poses(self):
        for view,points in POINTS.items():
            self.assertEqual(len(points),18)
            image=draw_pose(view)
            self.assertEqual(image.shape,(1536,1024,3)); self.assertGreater(image.sum(),0)
        self.assertIsNone(POINTS['back'][0])

    def test_no_face_real_yunet(self):
        # 작은 ONNX 검출기만 사용합니다. SDXL·CLIP 비전 모델은 로딩하지 않습니다.
        checker=FaceChecker(self.cfg)
        result=checker.check(np.zeros((320,320,3),dtype=np.uint8))
        self.assertEqual(result['face_count'],0); self.assertFalse(result['passed'])

    def test_multiple_faces_rejected_but_reported(self):
        checker=FaceChecker.__new__(FaceChecker); checker.cfg=self.cfg; checker.ref='reference'
        from unittest.mock import Mock
        checker.recognizer=Mock(); checker.recognizer.match.return_value=0.8
        with patch.object(checker,'faces',return_value=[np.zeros(15),np.zeros(15)]),patch.object(checker,'feature',return_value='feature'):
            self.assertFalse(checker.check(None)['passed'])
            result=checker.check(None,sheet=True)
            self.assertTrue(result['passed']); self.assertEqual(len(result['faces']),2)

    def test_docs(self):
        docs=render(self.c)
        self.assertIn(self.c['cover_letter']['promise'],docs['자기소개서.md'])
        self.assertIn(self.c['resume']['education'][0]['school'],docs['이력서.md'])
        self.assertIn(self.c['role']['title'],docs['profile.md'])
        self.assertNotIn('프리패스모빌리티(가상)',docs['이력서.md'])
        empty=copy.deepcopy(character('클로아')); empty['resume']={}; empty['cover_letter']={}
        self.assertIn('작성 전',render(empty)['이력서.md'])
        self.assertIn('작성 전',render(empty)['자기소개서.md'])
        self.assertIn('프리패스모빌리티 ·',render(character('클로아'))['이력서.md'])   # 실제 회사에는 (가상)을 붙이지 않는다
        self.assertNotIn('프리패스모빌리티(가상)',render(character('클로아'))['이력서.md'])

    def test_plan(self):
        self.assertEqual(len(plan(self.c,'turnaround',1,self.cfg)['jobs']),4)
        self.assertEqual(len(plan(self.c,'expressions',1,self.cfg)['jobs']),8)
        self.assertEqual(len(plan(self.c,'outfits',1,self.cfg)['jobs']),5)
        p=plan(self.c,'all',1,self.cfg)
        self.assertEqual(len(p['sheet_files']),8)
        self.assertEqual(p['duo_partner'],'클로아')
        self.assertFalse(next(x for x in p['jobs'] if x['id']=='back')['face_check'])
        with self.assertRaises(ValueError): plan(self.c,'face',99,self.cfg)

    def test_dry_run(self):
        result=subprocess.run([sys.executable,'generator/gen.py','--char','클로이','--set','turnaround','--n','2','--dry-run'],cwd=ROOT,capture_output=True,encoding='utf-8')
        self.assertEqual(result.returncode,0,result.stderr)
        data=json.loads(result.stdout); self.assertEqual(len(data['jobs']),8)
        self.assertNotEqual(data['jobs'][0]['seeds'],data['jobs'][1]['seeds'])

    def test_scale_geometry(self):
        source=Image.new('RGB',(500,1000),'white'); ImageDraw.Draw(source).rectangle((150,50,350,950),fill='black')
        page,records=compose([source]*3,self.c,boxes=[[150,50,351,951]]*3)
        self.assertEqual(page.size,(2400,3200))
        for r in records:
            h=self.c['basic']['height_cm']*10   # 1cm = 10px (casting v2)
            self.assertEqual(r['destination_box'][1],2410-h)
            self.assertEqual(r['destination_box'][3],2410)
            self.assertEqual(r['body_height_px'],h)
        with tempfile.TemporaryDirectory() as folder:
            data=validate_casting(self.c,folder)
            self.assertEqual(data['grid_top_y_px'],410)

    def test_bbox_uncertainty(self):
        source=Image.new('RGB',(500,1000),'white'); ImageDraw.Draw(source).rectangle((150,50,350,950),fill='black')
        _,records=compose([source]*3,self.c)
        self.assertTrue(records[0]['review_required'])
        self.assertIsNone(records[0]['anatomical_error_px'])

    def test_upload_pagination(self):
        with patch.object(upload,'call',side_effect=[{'files':[{'name':'a'}],'nextPageToken':'next'},{'files':[{'name':'b'}]}]) as call:
            self.assertEqual(len(upload.children('folder')),2)
            self.assertEqual(json.loads(call.call_args_list[1].args[0][2])['pageToken'],'next')

    def test_retry_and_manifest(self):
        from unittest.mock import Mock
        cfg=copy.deepcopy(self.cfg)
        p=plan(self.c,'expressions',1,cfg); p['jobs']=p['jobs'][:1]; p['requested']=[]
        backend=Mock(); backend.generate.return_value=Image.new('RGB',(64,64),'white')
        checker=Mock(); checker.reference.return_value=np.zeros((32,32,3),np.uint8)
        checker.check.side_effect=[{'passed':False,'face_count':0},{'passed':True,'face_count':1}]
        with tempfile.TemporaryDirectory() as folder,patch('generator.face_check.FaceChecker',return_value=checker),patch('generator.face_check.read_image',return_value=np.zeros((32,32,3),np.uint8)),patch('generator.gen.digest',return_value='test-hash'):
            cfg['output_root']=folder; cfg['models']={}
            accepted,failures=run(self.c,p,cfg,backend)
            self.assertFalse(failures); self.assertEqual(backend.generate.call_count,2)
            self.assertIn(('expressions','neutral',0),accepted)
            manifest=json.loads((Path(folder)/'클로이/expressions/manifest.json').read_text(encoding='utf-8'))
            self.assertEqual([r['seed'] for r in manifest['runs'][0]['attempts']],[10301,10302])

    def test_retry_exhausted(self):
        from unittest.mock import Mock
        cfg=copy.deepcopy(self.cfg)
        p=plan(self.c,'expressions',1,cfg); p['jobs']=p['jobs'][:1]; p['requested']=[]
        backend=Mock(); backend.generate.return_value=Image.new('RGB',(64,64),'white')
        checker=Mock(); checker.reference.return_value=np.zeros((32,32,3),np.uint8)
        checker.check.return_value={'passed':False,'face_count':0}
        with tempfile.TemporaryDirectory() as folder,patch('generator.face_check.FaceChecker',return_value=checker),patch('generator.face_check.read_image',return_value=np.zeros((32,32,3),np.uint8)),patch('generator.gen.digest',return_value='test-hash'):
            cfg['output_root']=folder; cfg['models']={}
            accepted,failures=run(self.c,p,cfg,backend)
            self.assertFalse(accepted); self.assertEqual(len(failures),1)
            self.assertEqual(backend.generate.call_count,3)

    def test_existing_sheet_preflight(self):
        with tempfile.TemporaryDirectory() as folder:
            cfg=copy.deepcopy(self.cfg); cfg['output_root']=folder
            target=Path(folder)/'클로이/세트/03-턴어라운드.png'
            target.parent.mkdir(parents=True); target.write_bytes(b'original')
            problems=preflight(plan(self.c,'turnaround',1,cfg),cfg)
            self.assertTrue(any('기존 시트 보존' in x for x in problems))
            self.assertEqual(target.read_bytes(),b'original')

    def test_scenes_override(self):
        c=copy.deepcopy(self.c); c['scenes']=[{'id':'custom','name':'정본 장면','desc':'custom action'}]
        result=plan(c,'scenes',1,self.cfg)
        self.assertEqual(len(result['jobs']),1)
        self.assertIn('custom action',result['jobs'][0]['prompt'])

    def test_upload_skip_and_cwd(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); (root/'old.png').write_bytes(b'old'); (root/'new.png').write_bytes(b'new')
            with patch.object(sys,'argv',['upload','--char','클로이','--set','세트','--dir',folder]),patch.object(upload,'folder',return_value='folder'),patch.object(upload,'children',return_value=[{'name':'old.png'}]),patch.object(upload,'call',return_value={'id':'uploaded'}) as call:
                upload.main()
                self.assertEqual(call.call_count,1)
                self.assertEqual(call.call_args.kwargs['cwd'],root.resolve())
                self.assertEqual(call.call_args.args[0][-1],'new.png')

    def test_duo_masks_without_model_loading(self):
        from unittest.mock import Mock
        import torch
        backend=Backend.__new__(Backend)
        backend.cfg=self.cfg; backend.torch=torch; backend.control=None; backend.pipe=Mock()
        backend.pipe.return_value.images=['result']
        backend.pipe.tokenizer=lambda text,**kw:{'input_ids':[1,2]}
        backend.pipe.tokenizer_2=backend.pipe.tokenizer
        result=backend.generate_duo(self.c,character('클로아'),['left','right'],10301)
        self.assertEqual(result,'result')
        args=backend.pipe.call_args.kwargs
        masks=args['cross_attention_kwargs']['ip_adapter_masks']
        self.assertEqual(len(masks),2)
        self.assertEqual(tuple(masks[0].shape),(1,1,1536,1024))
        self.assertEqual(float((masks[0]*masks[1]).sum()),0)
        self.assertTrue(torch.all(masks[0]+masks[1]==1))
        self.assertEqual(args['ip_adapter_image'],['left','right'])
        self.assertEqual(backend.pipe.load_ip_adapter.call_args.kwargs['image_encoder_folder'],None)

if __name__=='__main__': unittest.main()
