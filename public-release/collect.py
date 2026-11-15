"""Collect only current, explicitly registered assets for public release."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import zipfile
import subprocess
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text(encoding='utf-8'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--tag', default='ai-staff-r1-20261115')
    args = parser.parse_args()
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    uploads = out / 'uploads'
    uploads.mkdir()
    assets_dir = out / 'AI-Staff-Assets'
    assets_dir.mkdir()
    site = ROOT / 'public-release/site'
    (site / 'thumbs').mkdir(parents=True, exist_ok=True)
    records = []
    release_url = 'https://github.com/freepass-creator/ai-staff/releases/download/' + args.tag + '/'

    def add(source, key, title, category, expected, *, status='usage', production=True, usage='', tags=None, vector=None, extra=None):
        source = Path(source)
        if sha(source) != expected:
            raise ValueError('Source SHA mismatch: ' + key)
        filename = key + '.png'
        shutil.copy2(source, uploads / filename)
        (assets_dir / 'png').mkdir(exist_ok=True)
        shutil.copy2(source, assets_dir / 'png' / filename)
        image = Image.open(source).convert('RGBA')
        thumb = Image.new('RGBA', (420, 360), '#F1F2EC')
        small = image.copy()
        small.thumbnail((400, 340), Image.Resampling.LANCZOS)
        thumb.alpha_composite(small, ((420 - small.width) // 2, (360 - small.height) // 2))
        thumb_name = key + '-' + expected[:10] + '.webp'
        thumb.convert('RGB').save(site / 'thumbs' / thumb_name, quality=82, method=6)
        record = {'id': key, 'title': title, 'category': category, 'status': status,
                  'production_usable': production, 'usage': usage, 'tags': tags or [],
                  'png_url': release_url + filename, 'png_sha256': expected,
                  'png_file': 'png/' + filename, 'width': image.width, 'height': image.height,
                  'thumbnail': 'thumbs/' + thumb_name}
        if vector:
            src, vector_sha = vector
            if sha(Path(src)) != vector_sha:
                raise ValueError('Vector source mismatch')
            data = Path(src).read_text(encoding='utf-8')
            data = re.sub(r'<metadata\b[^>]*>.*?</metadata>', '', data, flags=re.S)
            if re.search(r'(?<![A-Za-z0-9])[A-Za-z]:[/\\]', data):
                raise ValueError('Local path remains in public vector')
            target = assets_dir / 'vectors' / (key + '.svg')
            target.parent.mkdir(exist_ok=True)
            target.write_text(data, encoding='utf-8')
            record['vector'] = {'file': 'vectors/' + target.name, 'sha256': sha(target), 'kind': 'fixed-view native-resolution pixel paths; no semantic rig'}
        if extra:
            record.update(extra)
        records.append(record)

    current = read(ROOT / 'robots/current.json')
    for key, v in current['variants'].items():
        add(v['assets']['png']['file'], 'canonical-' + key, v['display_name'], 'canonical', v['assets']['png']['sha256'],
            status='canonical', usage='CLO-02 최신 정면 디자인 참조', tags=['CLO-02', '정본', v['variant']],
            vector=(v['assets']['svg']['file'], v['assets']['svg']['sha256']))
    human = read(ROOT / 'characters/클로이/svg-library.json')
    for p in human['poses']:
        add(p['source_png'], 'human-' + p['id'], p['label'], 'human', p['source_sha256'], usage=p['usage'],
            tags=[p['camera_angle'], p['framing'], '흰 수트'], vector=(p['svg_file'], p['svg_sha256']), extra={'form': 'human', 'character_id': 'CLO-02'})
    wardrobe = read(ROOT / 'characters/클로이/wardrobe-library.json')
    for p in wardrobe['poses']:
        add(p['source_png'], 'human-' + p['id'], p['label'], 'human', p['source_sha256'], usage=p['usage'],
            tags=[p['camera_angle'], p['framing'], p['outfit']], vector=(p['svg_file'], p['svg_sha256']), extra={'form': 'human', 'character_id': 'CLO-02'})
    robot = read(ROOT / 'asset-library/chloe-blog/library.json')
    library = Path(robot['library_root'])
    for p in read(library / 'manifest.json')['assets']:
        if p.get('production_usable') is False:
            continue
        add(library / p['file'], 'robot-' + p['id'], p['title'], 'robot', p['sha256'], usage=p['usage'], tags=[p.get('camera_angle', ''), p.get('action', ''), p.get('target', '')], extra={'form': 'robot', 'character_id': 'CLO-02'})
    templates = read(ROOT / 'asset-library/blog-templates/library.json')
    package = Path(templates['library_root'])
    jobs = read(package / 'examples.json')
    for job in jobs:
        p = package / (job['id'] + '.png')
        expected = next(a['png_sha256'] for a in read(package / 'render-receipt.json')['jobs'] if a['id'] == job['id'])
        add(p, 'poster-' + job['id'], job['title'].replace('\n', ' '), 'template', expected, usage=job['template'], tags=[job['template'], job.get('theme', ''), job.get('character', '')])
    for p in read(ROOT / 'robots/revisions/current.json')['proposals']:
        if p.get('camera_angle') != 'front' or not p.get('public_eligible'):
            raise ValueError('Only the corrected frontal R1 may be collected')
        add(p['source_png'], 'revision-' + p['character_id'].lower() + '-r1', (p.get('name_ko') or p['character_id']) + ' · R1 제안', 'revision', p['source_sha256'],
            status='design_proposal', production=False, usage=p['plate_design'], tags=[p['character_id'], p['proposed_emission_color'], '견갑'], extra={'character_id': p['character_id'], 'plate_design': p['plate_design']})
    scene_link = ROOT / 'public-release/scenes.json'
    if scene_link.exists():
        for p in read(scene_link)['scenes']:
            add(p['file'], p['id'], p['title'], 'scene', p['sha256'], usage=p['usage'], tags=[p['environment'], p['framing'], p['outfit']],
                extra={'character_id': 'CLO-02', 'character_source_sha256': p['character_sha256'], 'background_sha256': p['background_sha256'], 'image_kind': 'fixed character composited on a fictional generated environment'})
    backgrounds = []
    composition = ROOT / 'public-release/composition-inputs.json'
    if composition.exists():
        recipe = read(composition)
        for bg in recipe['backgrounds']:
            src = Path(bg['file'])
            if sha(src) != bg['sha256']:
                raise ValueError('Background source mismatch')
            target = assets_dir / 'backgrounds' / (bg['id'] + '.png')
            target.parent.mkdir(exist_ok=True)
            shutil.copy2(src, target)
            filename = 'background-' + bg['id'] + '.png'
            shutil.copy2(src, uploads / filename)
            backgrounds.append({'id': bg['id'], 'title': bg['label'], 'png_file': 'backgrounds/' + bg['id'] + '.png', 'png_url': release_url + filename, 'sha256': bg['sha256']})
            bg['file'] = 'backgrounds/' + bg['id'] + '.png'
        for actor in recipe['characters']:
            actor['file'] = 'png/human-' + actor['id'] + '.png'
        (assets_dir / 'composition-inputs.json').write_text(json.dumps(recipe, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        shutil.copy2(ROOT / 'public-release/compose.mjs', assets_dir / 'compose.mjs')
        (assets_dir / 'package.json').write_text(json.dumps({'private': True, 'type': 'module', 'dependencies': {'@resvg/resvg-js': '2.6.2'}}, indent=2) + '\n', encoding='utf-8')
    catalog = {'schema': 'ai-staff/public-assets/v1', 'release_tag': args.tag, 'source_commit': subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip(),
               'identity_policy': 'Reuse registered PNG bytes. No character generation at render time. New poses are reviewed derivatives, not identical 3D geometry.',
               'downloads': {'assets': release_url + 'AI-Staff-Assets.zip', 'templates': release_url + 'Chakhan-Poster-Templates.zip'}, 'assets': records, 'backgrounds': backgrounds}
    (site / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (assets_dir / 'catalog.json').write_text(json.dumps({k: v for k, v in catalog.items() if k != 'downloads'}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    ref_dir = assets_dir / 'references'
    ref_dir.mkdir()
    ref = ROOT / 'characters/클로이/refs/proportion-options-owner-selected-B.png'
    shutil.copy2(ref, ref_dir / 'human-selected-B-sheet.png')
    (assets_dir / 'AI-START-HERE.md').write_text('''# AI Staff 공개 자산\n\n카탈로그에서 문단의 행동·대상·구도에 맞는 PNG를 고른다. production_usable=false인 CLO-01/03/04 R1 제안은 검토용이며 업무용 정본으로 자동 선택하지 않는다. CLO-02 정본 두 종은 canonical, 그 외 승인된 활용 컷은 usage다. 장면 합성은 고정된 캐릭터 픽셀을 배경 위에 배치했으며 실제 차량·직원·계약 증빙 사진이 아니다.\n\n캐릭터를 출력마다 다시 그리지 않는다. 선택한 PNG의 SHA256를 확인하고 문구·배경·배치만 바꾼다. 새 포즈 후보는 기준 얼굴·체형·장갑·소재·브랜드를 대조 후 고정 등록한다. 같은 참조로 생성해도 매번 동일 기하구조가 보장되는 것은 아니다. 사람형 기준 시트는 references/human-selected-B-sheet.png의 가운데 B안이다.\n\n벡터 폴더의 SVG는 원본 해상도 픽셀 경로다. PNG를 내장하지 않지만 의미별 곡선 벡터/3D/관절 리그가 아니며 용량이 크다. 일반 블로그/웹에는 PNG를 쓴다. SVG의 비표시 제작 metadata만 제거했으며 경로는 보존했다. 폰트·CI·조판 엔진은 별도 포스터 키트에 있다.\n''', encoding='utf-8')
    self_manifest = {'files': [{'file': p.relative_to(assets_dir).as_posix(), 'sha256': sha(p), 'bytes': p.stat().st_size} for p in assets_dir.rglob('*') if p.is_file()]}
    (assets_dir / 'manifest.json').write_text(json.dumps(self_manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with zipfile.ZipFile(uploads / 'AI-Staff-Assets.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for p in assets_dir.rglob('*'):
            if p.is_file():
                z.write(p, p.relative_to(assets_dir))
    # Template runtime is a portable subset. Private receipts and local handoff notes are not included.
    kit = out / 'Chakhan-Poster-Templates'
    kit.mkdir()
    for name in ['layouts.mjs', 'render.mjs', 'vary.mjs', 'content.schema.json', 'design-tokens.json', 'examples.json']:
        shutil.copy2(ROOT / 'asset-library/blog-templates' / name, kit / name)
    asset_map = read(package / 'assets.json')
    for f in asset_map['files']:
        if sha(package / f['file']) != f['sha256']:
            raise ValueError('Template asset changed: ' + f['file'])
        target = kit / f['file']
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.suffix == '.svg':
            data = (package / f['file']).read_text(encoding='utf-8')
            data = re.sub(r'<metadata\b[^>]*>.*?</metadata>', '', data, flags=re.S)
            target.write_text(data, encoding='utf-8')
        else:
            shutil.copy2(package / f['file'], target)
        f['sha256'], f['bytes'] = sha(target), target.stat().st_size
    (kit / 'assets.json').write_text(json.dumps(asset_map, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (kit / 'package.json').write_text(json.dumps({'name': 'ai-staff-public-poster-kit', 'private': True, 'type': 'module', 'dependencies': {'playwright': '1.58.2'}}, indent=2) + '\n', encoding='utf-8')
    (kit / 'README.md').write_text('''# 착한거래 포스터 키트\n\n6형식·6배경·11예시. 문구는 examples.json/content.schema.json을 따른다. P2 CI 원본, SUITE Heavy 제목, Noto Sans KR 본문을 유지한다. 폰트 라이선스는 assets/fonts/에 있다.\n\nWindows에서 Node·Playwright1.58.2·Microsoft Edge를 준비하고 `node vary.mjs draft.json jobs.json 0`, `node render.mjs --input jobs.json --bundle . --output 빈새폴더`를 실행한다. 다른 환경은 설치된 Playwright 브라우저를 AI_STAFF_BROWSER_CHANNEL로 지정한다. 글자 넘침/폰트 누락/인물 겹침은 실패하며 기존 출력은 덮지 않는다.\n\n출력은 등록 PNG·폰트·CI·B안 참조 SHA를 검증해 재사용한다. 얼굴/몸을 매번 재생성하지 않는다. 의상은 흰 수트·네이비 수트·카디건·동그란 안경의 무릎 위 스커트/펌프스 비서형을 문맥에 맞게 선택한다. 상반신·사선·전신을 섞고 같은 테마/복장을 연속 반복하지 않는다. 실제 수치·조건·출처는 게시자가 확인한다. 자동 게시는 없다.\n''', encoding='utf-8')
    with zipfile.ZipFile(uploads / 'Chakhan-Poster-Templates.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for p in kit.rglob('*'):
            if p.is_file():
                z.write(p, p.relative_to(kit))
    for key, name in [('assets', 'AI-Staff-Assets.zip'), ('templates', 'Chakhan-Poster-Templates.zip')]:
        catalog['downloads'][key] = {'url': release_url + name, 'sha256': sha(uploads / name), 'bytes': (uploads / name).stat().st_size}
    (site / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (out / 'receipt.json').write_text(json.dumps({'status': 'PASS', 'assets': len(records), 'uploads': len(list(uploads.iterdir())), 'tag': args.tag}, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'COLLECTED', 'assets': len(records), 'uploads': len(list(uploads.iterdir()))}))


if __name__ == '__main__':
    main()
