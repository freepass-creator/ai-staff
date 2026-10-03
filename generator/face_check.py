"""단일 생성물은 얼굴 하나만 통과. 시트 보고서는 검출 얼굴별로 기록."""
import argparse
from pathlib import Path
import cv2
import numpy as np
try:
    from .common import ROOT, config, character, digest, write_json
except ImportError:
    from common import ROOT, config, character, digest, write_json

def read_image(path):
    image = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f'이미지 읽기 실패: {path}')
    return image

class FaceChecker:
    def __init__(self, cfg=None):
        self.cfg = cfg or config()
        m = self.cfg['models']
        self.detector = cv2.FaceDetectorYN.create(m['yunet'], '', (320,320), 0.8, 0.3, 5000)
        self.recognizer = cv2.FaceRecognizerSF.create(m['sface'], '')

    def faces(self, image):
        self.detector.setInputSize((image.shape[1], image.shape[0]))
        _, faces = self.detector.detect(image)
        return [] if faces is None else sorted(faces, key=lambda f:(float(f[1]), float(f[0])))

    def feature(self, image, face):
        return self.recognizer.feature(self.recognizer.alignCrop(image, face))

    def reference(self, image):
        faces = self.faces(image)
        if len(faces) != 1:
            raise ValueError(f'기준 사진 얼굴은 1개여야 합니다: {len(faces)}')
        self.ref = self.feature(image, faces[0])
        x,y,w,h = faces[0][:4]
        margin = self.cfg['face_crop_margin']
        x0,y0 = max(0,int(x-w*margin)),max(0,int(y-h*margin))
        x1,y1 = min(image.shape[1],int(x+w*(1+margin))),min(image.shape[0],int(y+h*(1+margin)))
        return image[y0:y1,x0:x1]

    def check(self, image, sheet=False):
        faces = self.faces(image)
        scores = []
        for f in faces:
            score = float(self.recognizer.match(self.ref, self.feature(image,f), cv2.FaceRecognizerSF_FR_COSINE))
            scores.append({'box': [float(v) for v in f[:4]], 'score': score, 'passed': score >= self.cfg['face_threshold']})
        return {'face_count':len(faces), 'faces':scores, 'threshold':self.cfg['face_threshold'],
                'passed':bool(scores) and (sheet or len(scores)==1) and all(s['passed'] for s in scores)}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('images', nargs='*')
    p.add_argument('--char'); p.add_argument('--dir', type=Path)
    a=p.parse_args()
    if bool(a.char) != bool(a.dir): p.error('--char와 --dir를 함께 지정하세요')
    if a.char:
        character(a.char)
        ref=ROOT/'characters'/a.char/'refs/front.png'
        paths=sorted(x for x in a.dir.iterdir() if x.suffix.lower() in ('.png','.jpg','.jpeg','.webp'))
    else:
        if len(a.images)<2: p.error('기준 사진과 검사할 이미지를 지정하세요')
        ref=Path(a.images[0]); paths=list(map(Path,a.images[1:]))
    checker=FaceChecker(); checker.reference(read_image(ref))
    report={'reference':str(ref), 'reference_sha256':digest(ref), 'mode':'sheet' if a.char else 'single', 'images':[]}
    for path in paths:
        report['images'].append({'file':str(path), 'sha256':digest(path), **checker.check(read_image(path),sheet=bool(a.char))})
    report['passed']=bool(paths) and all(r['passed'] for r in report['images'])
    if a.dir: write_json(a.dir/'face-report.json',report)
    import json
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['passed'] else 1

if __name__=='__main__': raise SystemExit(main())
