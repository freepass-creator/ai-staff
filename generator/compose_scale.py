"""casting-v2 원본 위에 불투명 사각 크롭을 합성합니다. 배경 제거 없음."""
import argparse
import subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
try:
    from .common import ROOT, character, config, read_json, write_json
except ImportError:
    from common import ROOT, character, config, read_json, write_json

def font(size):
    return ImageFont.truetype(config()['font'], size)

def person_box(image):
    # 단색 배경과 다른 중앙 연결 성분을 사람 경계로 근사합니다.
    rgb=np.asarray(image.convert('RGB'))
    border=np.concatenate((rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]))
    bg=np.median(border,axis=0)
    mask=(np.linalg.norm(rgb.astype(float)-bg,axis=2)>35).astype('uint8')*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    count,_,stats,_=cv2.connectedComponentsWithStats(mask)
    candidates=[s for s in stats[1:] if s[4]>rgb.shape[0]*rgb.shape[1]*0.02]
    if not candidates: raise ValueError('사람 영역을 추정할 수 없습니다. --boxes로 경계 지정 필요')
    x,y,w,h,_=max(candidates,key=lambda s:s[4])
    if h < image.height*0.5: raise ValueError('전신 경계가 너무 작습니다. 수동 경계 확인 필요')
    return [int(x),int(y),int(x+w),int(y+h)]

def compose(images, c, boxes=None, centers=None):
    page=Image.open(ROOT/'templates/casting-v2/casting-dossier-v2-02-body-scale.png').convert('RGB')
    if page.size!=(2400,3200): raise ValueError('casting-v2 캔버스 불일치')
    draw=ImageDraw.Draw(page)
    # 견본 인물·설정값을 지우고 동일 좌표의 눈금을 다시 그립니다.
    draw.rectangle((90,330,2310,3070),fill='#F4F1EA')
    for cm in range(201):
        y=2410-cm*10
        draw.line((180,y,2290,y),fill='#AFA79A' if cm%10==0 else '#D8D1C6',width=2 if cm%10==0 else 1)
        if cm%10==0: draw.text((95,y-13),str(cm),font=font(20),fill='#181916')
    draw.rectangle((0,0,2400,320),fill='#191A17')
    draw.text((140,100),f"{c['name']} · {c['role']['title']}",font=font(58),fill='white')
    draw.text((140,195),f"{c['basic']['height_cm']}cm · {c['basic']['weight_kg']}kg · {c['basic']['age']}세",font=font(32),fill='white')
    centers=centers or ([600,1250,1900] if len(images)==3 else [760,1640])
    if len(centers)!=len(images): raise ValueError('인물 수와 배치 좌표 불일치')
    records=[]
    for i,image in enumerate(images):
        box=boxes[i] if boxes else person_box(image)
        x0,y0,x1,y1=box
        if not (0<=x0<x1<=image.width and 0<=y0<y1<=image.height): raise ValueError('잘못된 사람 경계')
        crop=image.crop(box)
        height=round(c['basic']['height_cm']*10)
        width=round(crop.width*height/crop.height)
        if width>620: raise ValueError('사람 크롭이 배치 폭을 넘습니다. 전신 경계 확인 필요')
        left=round(centers[i]-width/2); top=2410-height
        page.paste(crop.resize((width,height),Image.Resampling.LANCZOS),(left,top))
        records.append({'source_box':box,'destination_box':[left,top,left+width,2410], 'body_height_px':height,
                        'floor_error_px':0,'height_rounding_error_px':height-c['basic']['height_cm']*10,
                        'boundary_method':'manual' if boxes else 'background_difference_bbox',
                        'anatomical_error_px':None,'review_required':not bool(boxes),
                        'note':'머리카락·신발 포함 경계 근사. 해부학적 정수리·발바닥 오차 미측정'})
    return page,records

def validate_casting(c, folder):
    data=read_json(ROOT/'templates/casting-v2/casting-v2-template.json')
    data.update(candidate_code=c['id'],display_name=c['name'],role=c['role']['title'],adult_age=c['basic']['age'],height_cm=c['basic']['height_cm'],body_height_px=c['basic']['height_cm']*10)
    path=Path(folder)/'casting.json'; write_json(path,data)
    subprocess.run(['node',str(ROOT/'templates/casting-v2/validate-casting-v2.mjs'),str(path)],check=True)
    return data

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--char',required=True)
    p.add_argument('--images',nargs=3,required=True,type=Path); p.add_argument('--output',required=True,type=Path)
    p.add_argument('--boxes',type=Path,help='세 이미지의 [left,top,right,bottom] 배열 JSON')
    a=p.parse_args(); c=character(a.char)
    page,records=compose([Image.open(x).convert('RGB') for x in a.images],c,read_json(a.boxes) if a.boxes else None)
    a.output.parent.mkdir(parents=True,exist_ok=True); page.save(a.output)
    write_json(a.output.with_suffix('.geometry.json'),records); validate_casting(c,a.output.parent)

if __name__=='__main__': main()
