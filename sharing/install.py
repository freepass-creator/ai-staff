"""Install a verified private handoff into a new folder; preserve existing work."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import zipfile

sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def unpack(archive, target):
    if target.exists():
        raise FileExistsError(target)
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            p = (target / entry.filename).resolve()
            if not p.is_relative_to(target.resolve()) or (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('Unsafe ZIP entry')
        z.extractall(target)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True)
    parser.add_argument('--destination', required=True)
    parser.add_argument('--reference-repo', required=True)
    parser.add_argument('--set-current', action='store_true')
    args = parser.parse_args()
    archive, dest, reference = [Path(p).resolve() for p in [args.archive, args.destination, args.reference_repo]]
    if dest.exists() or len(dest.parts) < 3 or dest.is_relative_to(reference):
        raise ValueError('Use a new destination outside the existing checkout')
    dest.mkdir(parents=True)
    distribution = dest / 'distribution'
    unpack(archive, distribution)
    manifest = json.loads((distribution / 'manifest.json').read_text(encoding='utf-8'))
    for f in manifest['files']:
        p = (distribution / f['file']).resolve()
        if not p.is_relative_to(distribution) or sha(p) != f['sha256']:
            raise ValueError('Manifest hash/path mismatch')
    share = json.loads((distribution / 'share.json').read_text(encoding='utf-8'))
    data = dest / 'data'
    data.mkdir()
    for item in share['packages']:
        if item['id'] in ['robot-blog', 'human-poses', 'poster-templates', 'robot-svg', 'renderer-runtime']:
            unpack(distribution / item['file'], data / item['id'])
    source = dest / 'source'
    def git(*cmd):
        return subprocess.check_output(['git', *map(str, cmd)], text=True, encoding='utf-8').strip()
    git('clone', '--no-hardlinks', '--no-checkout', reference, source)
    git('-C', source, 'bundle', 'verify', distribution / share['source_bundle'])
    ref = 'refs/heads/' + share['branch']
    imported = 'refs/ai-staff-import/' + share['revision']
    git('-C', source, 'fetch', distribution / share['source_bundle'], ref + ':' + imported)
    git('-C', source, 'checkout', '--detach', imported)
    if git('-C', source, 'rev-parse', 'HEAD') != share['revision']:
        raise ValueError('Source revision mismatch')
    by_hash = {}
    for tree in [data, distribution, source / 'characters/클로이/refs']:
        for p in tree.rglob('*'):
            if p.is_file():
                by_hash.setdefault(sha(p), str(p))
    changed, unresolved = [], []
    def rewrite(obj, context=''):
        if isinstance(obj, list):
            return [rewrite(v, context) for v in obj]
        if not isinstance(obj, dict):
            return obj
        result = {k: rewrite(v, context + '/' + k) for k, v in obj.items()}
        for key, value in list(result.items()):
            if not isinstance(value, str) or not re.match(r'^[A-Za-z]:[/\\]', value):
                continue
            digest = result.get('sha256') if key == 'file' else result.get('source_sha256') if key in ['source_png', 'source_file'] else result.get(key[:-5] + '_sha256') if key.endswith('_file') else None
            if digest in by_hash:
                result[key] = by_hash[digest]
            elif digest:
                unresolved.append(context + '/' + key)
        return result
    files = ['robots/current.json', 'robots/svg-release.json', 'motion-lab/gestures/spec.json',
             'characters/클로이/assets.json', 'characters/클로이/svg-library.json', 'characters/클로이/wardrobe-library.json',
             'asset-library/chloe-blog/library.json', 'asset-library/chloe-human/library.json', 'asset-library/blog-templates/library.json']
    for rel in files:
        p = source / rel
        obj = rewrite(json.loads(p.read_text(encoding='utf-8')), rel)
        if rel.startswith('asset-library/'):
            kind = 'robot-blog' if '/chloe-blog/' in rel else 'human-poses' if '/chloe-human/' in rel else 'poster-templates'
            obj['library_root'] = str(data / kind)
            for key, filename in [('manifest', 'manifest.json'), ('viewer', 'index.html'), ('offline_viewer', 'index.html'), ('usage_index', 'usage-index.json'), ('ai_usage_guide', 'AI-WRITER-USAGE.md')]:
                if key in obj:
                    obj[key] = str(data / kind / filename)
            if kind == 'robot-blog':
                obj['portable_bundle'] = str(distribution / 'robot-blog.zip')
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        changed.append(rel)
    subprocess.run(['node', str(source / 'sharing/check.mjs'), str(source)], check=True)
    receipt = {'status': 'PASS', 'source_revision': share['revision'], 'source': str(source), 'data': str(data),
               'archive_sha256': sha(archive), 'files_verified': len(manifest['files']), 'configured_files': changed,
               'unresolved_history_or_regeneration_references': unresolved, 'existing_checkout_modified': False,
               'persistent_server_started': False}
    (dest / 'install-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if args.set_current:
        pointer_path = Path('D:/dev-artifacts/ai-staff/shared/current.json')
        pointer_path.parent.mkdir(parents=True, exist_ok=True)
        if pointer_path.exists() and json.loads(pointer_path.read_text(encoding='utf-8')).get('publisher') != 'ai-staff-sharing-tool':
            raise ValueError('Different current pointer publisher; receipt saved, pointer preserved')
        pointer_path.write_text(json.dumps({'publisher': 'ai-staff-sharing-tool', 'revision': share['revision'], 'library_root': str(distribution), 'package': {'file': str(archive), 'sha256': sha(archive), 'bytes': archive.stat().st_size}, 'installed_source': str(source), 'install_receipt': str(dest / 'install-receipt.json')}, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == '__main__':
    main()
