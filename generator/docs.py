"""정본만 읽어 Markdown 문서를 다시 생성합니다."""
import argparse
try:
    from .common import ROOT, character
except ImportError:
    from common import ROOT, character

REAL={'프리패스모빌리티','팀제이피케이'}   # 실제 회사 — 가상 표기를 붙이지 않는다
LABELS={'education':'학력','career':'경력','certificates':'자격','skills':'역량','growth':'성장 과정','how_i_work':'일하는 방식','promise':'약속'}

def value(v):
    if v in (None,'',[],{}): return '작성 전'
    if isinstance(v,list): return '\n'.join('- '+value(x) for x in v)
    if isinstance(v,dict): return ' · '.join(value(x) for x in v.values())
    return str(v)

def render(c):
    header=f"<!-- character.json 자동 생성: 직접 수정하지 마세요 -->\n# {c['name']}"
    resume=header+' 이력서\n\n가상 인물의 설정 자료입니다.\n\n'+value(c['role'])+'\n\n'
    for key in ('education','career','certificates','skills'):
        entries=c['resume'].get(key)
        if key in ('education','career') and entries:
            entries=[dict(x) for x in entries]
            field='school' if key=='education' else 'company'
            for x in entries:
                if x.get(field) and '가상' not in x[field] and x[field] not in REAL: x[field]+='(가상)'
        resume+=f'## {LABELS[key]}\n\n{value(entries)}\n\n'
    cover=header+' 자기소개서\n\n'
    for key in ('growth','how_i_work','promise'):
        cover+=f"## {LABELS[key]}\n\n{value(c['cover_letter'].get(key))}\n\n"
    profile=header+' 프로필\n\n'+ '\n\n'.join(f'## {label}\n\n{value(c.get(key))}' for key,label in [('role','직무'),('basic','기본 정보'),('appearance','외모'),('personality','성격'),('speech','말투'),('outfits','복장'),('expressions','표정')])+'\n'
    return {'이력서.md':resume,'자기소개서.md':cover,'profile.md':profile}

def main():
    p=argparse.ArgumentParser(); p.add_argument('--char',required=True); a=p.parse_args()
    for name,text in render(character(a.char)).items():
        path=ROOT/'characters'/a.char/name; path.write_text(text,encoding='utf-8'); print(path)

if __name__=='__main__': main()
