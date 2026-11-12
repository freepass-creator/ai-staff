"""Regression contracts for Chloe's 10 existing photographs inside AI Staff studios."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
STUDIO = ROOT / "studio" / "studio"
BLOG = ROOT / "studio" / "blog-stills"
MANIFEST = ROOT / "studio" / "turnaround" / "reference-index.json"

VIEWS = (
    "front", "front-left", "left", "back-left", "back",
    "back-right", "right", "front-right", "top", "bottom"
)


class ChloeStudioReferenceIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (STUDIO / "index.html").read_text(encoding="utf-8")
        cls.js = (STUDIO / "studio.js").read_text(encoding="utf-8")
        cls.css = (STUDIO / "angle-gallery.css").read_text(encoding="utf-8")
        cls.blog = (BLOG / "index.html").read_text(encoding="utf-8")
        cls.blog_js = (BLOG / "editor.js").read_text(encoding="utf-8")
        cls.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def test_has_ten_existing_photos_and_zero_new_character_art(self):
        files = [item["filename"] for item in self.manifest["images"]]
        self.assertEqual(files, ["chloe-" + view + ".webp" for view in VIEWS])
        selected = re.findall(r'data-reference-angle="([^"]+)"', self.html)
        self.assertEqual(selected, list(VIEWS))
        for view in VIEWS:
            self.assertIn('data-chloe-source="view-' + view + '"', self.html)
            self.assertIn("'view-" + view + "': { file: 'chloe-" + view + ".webp'", self.js)
            self.assertIn("reference: '" + view + "'", self.js)
            self.assertIn("chloe-" + view + ".webp", self.blog_js)

    def test_chakhan_identity_defaults_to_ten_view_source_and_blocks_legacy_export(self):
        self.assertIn("var selectedPose = 'view-front'", self.js)
        self.assertIn("var source = new URL(POSES['view-front'].file, referenceBase).href;", self.js)
        self.assertIn('data-chloe-source="view-front" data-reference-angle="front" aria-pressed="true"', self.html)
        self.assertIn('!POSES[selectedPose].reference || !state.ready', self.js)
        self.assertIn('brandApprovedReference: !!POSES[selectedPose].reference', self.js)
        self.assertIn('기존 모션 포즈는 외형 재검수 전까지 참고 시연용', self.html)

    def test_source_path_and_deep_link_are_whitelisted(self):
        self.assertIn("var referenceBase = new URL('../../robots/CLO-02/chakhan-sales/motion-3d/assets/'", self.js)
        self.assertIn("POSES[next].reference ? referenceBase :", self.js)
        self.assertIn("Object.prototype.hasOwnProperty.call(POSES, 'view-' + parameters.get('angle'))", self.js)
        self.assertIn('href="?angle=front"', self.html)

    def test_download_and_restore_motion_controls(self):
        self.assertIn('id="chloe-angle-download"', self.html)
        self.assertIn("original.href = source; original.download = POSES[selectedPose].file;", self.js)
        self.assertIn("setPlayback(false);", self.js)
        self.assertIn("$('record-button').disabled = true;", self.js)
        self.assertIn("$('play-toggle').disabled = true;", self.js)
        self.assertIn("state.speech = false; $('speech-toggle').checked = false;", self.js)
        self.assertIn("if (recorder) captureState(recorder.state);", self.js)
        self.assertIn("captureFrame: function ()", self.js)
        self.assertIn("referenceView: POSES[selectedPose].reference || null", self.js)

    def test_blog_still_editor_selects_same_ten_source_images(self):
        option_count = len(re.findall(r'<option value="angle(?:Front|Back|Left|Right|Top|Bottom)', self.blog))
        self.assertEqual(option_count, len(VIEWS))
        self.assertIn("다각도 원본 10장", self.blog)
        self.assertIn('href="../turnaround/"', self.blog)

    def test_js_parses(self):
        if not shutil.which("node"):
            self.skipTest("Node.js unavailable")
        for name in ("studio.js",):
            check = subprocess.run(["node", "--check", str(STUDIO / name)], capture_output=True, text=True)
            self.assertEqual(check.returncode, 0, check.stderr)
        check = subprocess.run(["node", "--check", str(BLOG / "editor.js")], capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, check.stderr)


if __name__ == "__main__":
    unittest.main()
