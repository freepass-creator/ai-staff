"""Build fixed-view, native-resolution SVG paths from SHA-bound pose PNGs.

Preserves raster samples as horizontal runs; not semantic vector tracing or a rig.
The manifest and output directory must be explicit. Existing files are not replaced.
"""
import argparse
from collections import defaultdict
import hashlib
import html
import json
from pathlib import Path
from PIL import Image


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def build(manifest, output):
    manifest = Path(manifest).resolve()
    data = json.loads(manifest.read_text(encoding='utf-8'))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    receipt = {'representation': 'native-resolution pixel-grid SVG paths',
               'embedded_images': 0, 'semantic_parts': False, 'rig': False, 'poses': []}
    for pose in data['poses']:
        source = Path(pose['source_png'])
        if not source.is_absolute():
            source = manifest.parent / source
        if sha(source) != pose['source_sha256']:
            raise ValueError('SOURCE_HASH_MISMATCH: ' + pose['id'])
        im = Image.open(source).convert('RGBA')
        w, h = im.size
        pixels = im.load()
        runs = defaultdict(list)
        for y in range(h):
            x = 0
            while x < w:
                color = pixels[x, y]
                end = x + 1
                while end < w and pixels[end, y] == color:
                    end += 1
                if color[3]:
                    runs[color].append(f'M{x} {y}h{end-x}v1h-{end-x}z')
                x = end
        target = output / (pose['id'] + '.svg')
        if target.exists():
            raise FileExistsError(target)
        metadata = {**pose, 'representation': receipt['representation'],
                    'semantic_parts': False, 'rig': False, 'dimensions': [w, h]}
        with target.open('w', encoding='utf-8', newline='\n') as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img">\n')
            f.write('<title>' + html.escape(pose['label']) + '</title>\n')
            f.write('<metadata>' + html.escape(json.dumps(metadata, ensure_ascii=False)) + '</metadata>\n')
            f.write('<g id="source-sample-paths" shape-rendering="crispEdges">\n')
            for (r, g, b, a), paths in sorted(runs.items()):
                opacity = '' if a == 255 else f' fill-opacity="{a / 255:.12f}"'
                f.write(f'<path fill="#{r:02x}{g:02x}{b:02x}"{opacity} d="' + ''.join(paths) + '"/>\n')
            f.write('</g>\n</svg>\n')
        receipt['poses'].append({**pose, 'svg_file': str(target), 'svg_sha256': sha(target),
                                 'svg_bytes': target.stat().st_size, 'color_paths': len(runs),
                                 'dimensions': [w, h]})
    (output / 'build-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'BUILT_REQUIRES_RENDER_VERIFICATION', 'poses': len(receipt['poses'])}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    build(args.manifest, args.output)
