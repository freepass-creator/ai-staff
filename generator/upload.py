"""Google Drive 업로드. 같은 이름은 건너뛰고 파일 폴더에서 gws를 실행합니다."""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

PARENT='1UMKoanJFM6z6Co12kgiRFI915CMM2a_d'
if hasattr(sys.stdout,'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

def call(args,cwd=None):
    executable=shutil.which('gws')
    if not executable: raise RuntimeError('gws 실행 파일 없음')
    result=subprocess.run([executable,'drive','files',*args],cwd=cwd,capture_output=True,text=True,encoding='utf-8',check=True)
    return json.loads(result.stdout)

def quote(value):
    return value.replace('\\','\\\\').replace("'","\\'")

def children(parent):
    result=[]; token=None
    while True:
        params={'q':f"'{quote(parent)}' in parents and trashed = false",'fields':'files(id,name,mimeType),nextPageToken','pageSize':1000}
        if token: params['pageToken']=token
        data=call(['list','--params',json.dumps(params)])
        result.extend(data.get('files',[])); token=data.get('nextPageToken')
        if not token: return result

def folder(parent,name):
    matches=[x for x in children(parent) if x['name']==name]
    if len(matches)>1: raise ValueError(f'중복 폴더 이름: {name}')
    if matches:
        if matches[0]['mimeType']!='application/vnd.google-apps.folder': raise ValueError(f'폴더 이름 충돌: {name}')
        return matches[0]['id']
    return call(['create','--json',json.dumps({'name':name,'parents':[parent],'mimeType':'application/vnd.google-apps.folder'},ensure_ascii=False)])['id']

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--char',required=True); p.add_argument('--set',required=True)
    p.add_argument('--dir',required=True,type=Path); p.add_argument('--dry-run',action='store_true'); a=p.parse_args()
    files=sorted(x for x in a.dir.resolve().iterdir() if x.is_file() and x.suffix.lower() in ('.png','.jpg','.jpeg','.json'))
    if a.dry_run:
        print(json.dumps({'parent':PARENT,'folder':f'{a.char}/{a.set}','files':[x.name for x in files]},ensure_ascii=False,indent=2)); return
    parent=folder(folder(PARENT,a.char),a.set)
    names={x['name'] for x in children(parent)}
    for path in files:
        if path.name in names: print(f'건너뜀: {path.name}'); continue
        result=call(['create','--json',json.dumps({'name':path.name,'parents':[parent]},ensure_ascii=False),'--upload',path.name],cwd=path.parent)
        if not result.get('id'): raise RuntimeError(f'업로드 영수증 없음: {path.name}')
        names.add(path.name); print(f"업로드: {path.name} ({result['id']})")

if __name__=='__main__': main()
