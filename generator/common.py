import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, 'reconfigure'):
        stream.reconfigure(encoding='utf-8')

def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def config():
    return read_json(ROOT / 'generator/config.json')

def character(name):
    if Path(name).name != name or name in ('.', '..'):
        raise ValueError('캐릭터 이름에 경로를 넣을 수 없습니다')
    data = read_json(ROOT / 'characters' / name / 'character.json')
    validate(data)
    return data

def validate(c):
    for key in ('id', 'name', 'role', 'basic', 'appearance', 'generation', 'outfits', 'expressions', 'resume', 'cover_letter'):
        if key not in c:
            raise ValueError(f'필수 필드 없음: {key}')
    for group, keys in {'role': ['title'], 'basic': ['age', 'height_cm', 'weight_kg'], 'generation': ['prompt_core', 'negative_core']}.items():
        for key in keys:
            if key not in c[group] or c[group][key] in (None, ''):
                raise ValueError(f'필수 필드 없음: {group}.{key}')
    if not 0 < c['basic']['height_cm'] <= 200 or c['basic']['age'] < 18:
        raise ValueError('성인 및 200cm 이하 캐스팅 규격 필요')
    for group in ('outfits', 'expressions'):
        if not isinstance(c[group], list) or not c[group]:
            raise ValueError(f'{group}: 비어 있지 않은 배열 필요')
        ids = []
        for item in c[group]:
            if not item.get('id') or not item.get('name') or Path(item['id']).name != item['id'] or item['id'] in ('.', '..'):
                raise ValueError(f'{group}: 안전한 id와 name 필요')
            ids.append(item['id'])
        if len(set(ids)) != len(ids):
            raise ValueError(f'{group}: 중복 id')
