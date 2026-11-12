import base64
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class SecretaryStudioTest(unittest.TestCase):
    def test_registry_and_engine_are_consistent(self):
        m=json.loads((ROOT/'characters/secretary-skirt-01/character.json').read_text(encoding='utf-8'))
        engine=(ROOT/'studio/secretary/engine.js').read_text(encoding='utf-8')
        html=(ROOT/'studio/secretary/index.html').read_text(encoding='utf-8')
        self.assertEqual(len(m['view_order']),6)
        self.assertEqual(len(set(m['view_order'])),6)
        for view in m['view_order']:
            self.assertIn(view, engine)
            self.assertIn(f'data-view="{view}"',html)
        for motion in m['supported_motion']:
            self.assertIn(f'data-motion="{motion}"',html)
        self.assertFalse(m['approved_for_external_use'])
        self.assertFalse(m['provenance']['preview_is_true_vector'])

    def test_preview_has_no_external_image_dependencies(self):
        s=(ROOT/'characters/secretary-skirt-01/refs/turnaround-preview.svg').read_text(encoding='utf-8')
        self.assertIn('<svg',s)
        match=re.search(r'data:image/webp;base64,([\w+/=]+)',s)
        self.assertIsNotNone(match)
        self.assertTrue(base64.b64decode(match.group(1)).startswith(b'RIFF'))

if __name__ == '__main__':unittest.main()
