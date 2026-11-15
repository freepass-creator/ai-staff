from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parents[1]
p=root/'robots/revisions/current.json'
d=json.loads(p.read_text(encoding='utf-8'))
d['comparison_policy']={'view':'front','pose':'standing, arms relaxed','display':'common subject height and foot baseline; source images remain unchanged','related_pair':['CLO-02','CLO-04'],'eyes':'shared Chloe screen-expression language; not measured identical geometry','canonical_CLO02':'unchanged','CLO04_shoulders':'compact, reduced projection'}
for a in d['proposals']:
    source=Path('D:/large/ai-staff/robot-family-r1-front-20261115')/(a['character_id']+'-R1-front.png')
    a.update(source_png=str(source),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),revision='R1-front-proposal',camera_angle='front',public_eligible=True)
    if a['character_id']=='CLO-04':a['plate_design']='작고 절제된 2피스 견갑 · 좁은 이중 V 흉갑'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Updated three corrected front pointers; CLO-02 unchanged')
