"""Reproduce a verified current PNG as lossless, fixed-view SVG paths.

This is a pixel-grid representation, not a semantic illustration or an animation rig.
Writes new files only. Catalog promotion happens separately after render verification.
"""
import argparse
from collections import defaultdict
from pathlib import Path
import hashlib
import html
import json
from PIL import Image


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def rebuild(catalog, output):
    catalog_path = Path(catalog)
    data = json.loads(catalog_path.read_text(encoding='utf-8'))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    receipt = {'representation': 'lossless native-resolution pixel-grid SVG paths',
               'semantic_parts': False, 'rig': False, 'variants': {}}
    for key, variant in data['variants'].items():
        source = Path(variant['assets']['png']['file'])
        source_sha = sha(source)
        if source_sha != variant['assets']['png']['sha256']:
            raise ValueError('SOURCE_HASH_MISMATCH: ' + key)
        image = Image.open(source).convert('RGBA')
        width, height = image.size
        pixels = image.load()
        runs = defaultdict(list)
        for y in range(height):
            x = 0
            while x < width:
                rgba = pixels[x, y]
                end = x + 1
                while end < width and pixels[end, y] == rgba:
                    end += 1
                if rgba[3]:
                    runs[rgba].append(f'M{x} {y}h{end-x}v1h-{end-x}z')
                x = end
        metadata = {
            'character_id': variant['character_id'], 'variant_id': key,
            'appearance_revision': variant['appearance_revision'],
            'source_png_sha256': source_sha, 'source_dimensions': [width, height],
            'representation': receipt['representation'],
            'semantic_parts': False, 'rig': False,
            'hand_materials': data['material_policy']['hand_materials'],
            'scope': 'Fixed front. Source pixels preserved including lighting and texture. No inferred palm geometry.',
        }
        target = output / (key + '-source-matched.svg')
        if target.exists():
            raise FileExistsError(target)
        with target.open('w', encoding='utf-8', newline='\n') as file:
            file.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">\n')
            file.write('<title>' + html.escape(variant['display_name'] + ' V1 — 원본 대조 SVG') + '</title>\n')
            file.write('<metadata>' + html.escape(json.dumps(metadata, ensure_ascii=False)) + '</metadata>\n')
            file.write('<g id="source-pixel-paths" shape-rendering="crispEdges">\n')
            for (r, g, b, alpha), paths in sorted(runs.items()):
                opacity = '' if alpha == 255 else f' fill-opacity="{alpha/255:.12f}"'
                file.write(f'<path fill="#{r:02x}{g:02x}{b:02x}"{opacity} d="' + ''.join(paths) + '"/>\n')
            file.write('</g>\n</svg>\n')
        receipt['variants'][key] = {'source_png': str(source), 'source_sha256': source_sha,
            'svg_file': str(target), 'svg_sha256': sha(target), 'dimensions': [width, height],
            'color_paths': len(runs), 'bytes': target.stat().st_size}
    (output / 'build-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'status': 'BUILT_NOT_YET_VERIFIED', 'variants': list(receipt['variants'])}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', default=str(Path(__file__).with_name('current.json')))
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    rebuild(args.catalog, args.output)
