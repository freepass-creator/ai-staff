"""Build a private, committed-code plus SHA-bound asset handoff. No network."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True, encoding='utf-8').strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-root', default='D:/dev-artifacts/ai-staff/shared')
    args = parser.parse_args()
    revision = git('rev-parse', 'HEAD')
    branch = git('branch', '--show-current')
    base = git('merge-base', 'HEAD', 'origin/main')
    if not branch or revision == base:
        raise ValueError('Commit the release changes on a working branch first')
    output = Path(args.output_root).resolve()
    catalog = output / 'revisions' / revision[:12]
    catalog.mkdir(parents=True, exist_ok=False)
    entries = []
    def add(src, name, kind):
        target = catalog / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)
        entries.append({'id': kind, 'file': name, 'sha256': sha(target), 'bytes': target.stat().st_size})
    descriptors = [('robot-blog', 'asset-library/chloe-blog/library.json'),
                   ('human-poses', 'asset-library/chloe-human/library.json'),
                   ('poster-templates', 'asset-library/blog-templates/library.json'),
                   ('robot-svg', 'robots/svg-release.json')]
    for kind, rel in descriptors:
        data = json.loads((ROOT / rel).read_text(encoding='utf-8'))
        committed = json.loads(git('show', 'HEAD:' + rel))
        if data != committed:
            raise ValueError('Uncommitted catalog: ' + rel)
        if kind == 'robot-blog':
            src, expected = Path(data['portable_bundle']), data['portable_bundle_sha256']
        else:
            package = data['bundle'] if kind == 'robot-svg' else data['package']
            src, expected = Path(package['file']), package['sha256']
        if sha(src) != expected:
            raise ValueError('Package hash mismatch: ' + kind)
        add(src, kind + '.zip', kind)
        if kind == 'poster-templates':
            runtime = data['runtime']
            if sha(Path(runtime['file'])) != runtime['sha256']:
                raise ValueError('Runtime hash mismatch')
            add(Path(runtime['file']), 'renderer-runtime.zip', 'renderer-runtime')
    current = json.loads((ROOT / 'robots/current.json').read_text(encoding='utf-8'))
    for name, variant in current['variants'].items():
        for kind, asset in variant['assets'].items():
            if kind not in ['png', 'svg']:
                src = Path(asset['file'])
                if sha(src) != asset['sha256']:
                    raise ValueError('Canonical metadata mismatch')
                add(src, 'canonical-meta/' + name + '-' + kind + src.suffix, 'canonical-meta')
    subprocess.run(['git', '-C', str(ROOT), 'bundle', 'create', str(catalog / 'source.bundle'), branch, '^' + base], check=True)
    subprocess.run(['git', '-C', str(ROOT), 'bundle', 'verify', str(catalog / 'source.bundle')], check=True, capture_output=True)
    entries.append({'id': 'source', 'file': 'source.bundle', 'sha256': sha(catalog / 'source.bundle'), 'bytes': (catalog / 'source.bundle').stat().st_size})
    for name in ['install.py', 'README.md']:
        add(ROOT / 'sharing' / name, name, 'instructions')
    share = {'schema': 'ai-staff/private-share/v1', 'revision': revision, 'branch': branch,
             'base_commit': base, 'visibility': 'local/private handoff, no public push or deployment',
             'source_bundle': 'source.bundle', 'packages': entries,
             'identity_policy': 'Reuse registered character pixels; never regenerate on output'}
    (catalog / 'share.json').write_text(json.dumps(share, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    cards = ''.join(f'<li><a href="{e["file"]}">{e["id"]}</a> · {e["bytes"]:,} bytes · SHA256 <code>{e["sha256"]}</code></li>' for e in entries if e['id'] != 'canonical-meta')
    (catalog / 'index.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AI Staff 최신 공유</title><style>body{font:16px/1.7 system-ui;max-width:1000px;margin:40px auto;padding:20px}li{margin:16px 0}code{word-break:break-all;font-size:12px}</style><h1>AI Staff · 최신 자산 가져가기</h1><p>코드 커밋 ' + revision[:12] + '. 캐릭터는 등록된 픽셀을 재사용하고 문구·배경·배치를 바꿉니다.</p><p><a href="download.zip">전체 패키지</a> · <a href="share.json">AI용 목록·해시</a> · <a href="README.md">설치·사용 안내</a></p><ul>' + cards + '</ul></html>', encoding='utf-8')
    manifest = {'files': [{'file': p.relative_to(catalog).as_posix(), 'sha256': sha(p), 'bytes': p.stat().st_size} for p in catalog.rglob('*') if p.is_file()]}
    (catalog / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    archive = output / ('AI-Staff-Current-' + revision[:12] + '.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_STORED) as z:
        for p in catalog.rglob('*'):
            if p.is_file():
                z.write(p, p.relative_to(catalog))
    pointer = {'publisher': 'ai-staff-sharing-tool', 'revision': revision, 'library_root': str(catalog),
               'package': {'file': str(archive), 'sha256': sha(archive), 'bytes': archive.stat().st_size}}
    current_file = output / 'current.json'
    if current_file.exists():
        previous = json.loads(current_file.read_text(encoding='utf-8'))
        if previous.get('publisher') != pointer['publisher']:
            raise ValueError('Existing current pointer belongs to a different publisher')
    current_file.write_text(json.dumps(pointer, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'PASS', **pointer}, ensure_ascii=False))


if __name__ == '__main__':
    main()
