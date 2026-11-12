"""Regression checks for the static AI Staff blog image workbench."""
from pathlib import Path
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "studio" / "blog-stills"


class BlogStillWorkbenchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (PAGE / "index.html").read_text(encoding="utf-8")
        cls.css = (PAGE / "editor.css").read_text(encoding="utf-8")
        cls.js = (PAGE / "editor.js").read_text(encoding="utf-8")

    def test_links_and_scripts_exist(self):
        self.assertIn('href="./editor.css"', self.html)
        self.assertIn('src="./editor.js"', self.html)
        self.assertIn('href="studio/blog-stills/"', (ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertIn('href="../blog-stills/"', (ROOT / "studio" / "studio" / "index.html").read_text(encoding="utf-8"))

    def test_blog_categories_and_six_cuts(self):
        for category in ("price", "cars", "guide", "credit", "market", "care", "analysis", "notice"):
            self.assertIn(f'<option value="{category}">', self.html)
            self.assertRegex(self.js, rf"\b{category}:\s*\{{")
        for cut in ("cover", "compare", "check", "explain", "faq", "closing"):
            self.assertIn(f'data-cut="{cut}"', self.html)

    def test_png_sizes_and_zip_output(self):
        for width, height in ((1200, 800), (1080, 1350), (1200, 630)):
            self.assertIn(f"width:{width},height:{height}", self.js)
        self.assertIn("image/png", self.js)
        self.assertIn("application/zip", self.js)
        self.assertIn("0x04034b50", self.js)
        self.assertIn("0x02014b50", self.js)
        self.assertIn("0x06054b50", self.js)

    def test_identity_and_unverified_asset_notice(self):
        self.assertIn("공식 보라색 CLO-02 원본은 저장소에 없으므로", self.html)
        self.assertIn("원본 외형 미검수", self.js)
        self.assertIn("아카이브 이미지의 외형·이름을 직접 검수", self.html)
        self.assertIn("캐릭터 없음 (즉시 활용)", self.html)
        self.assertIn("외부 게시 금지", self.js)
        self.assertIn("출처·기준일", self.html)

    def test_character_asset_paths(self):
        paths = re.findall(r"""(?:thumbs|compare|consult|front|point|phone|surprise|thumbsup):'([^']+\.(?:png|webp))'""", self.js)
        self.assertEqual(len(paths), 8)
        for src in paths:
            self.assertTrue((PAGE / src).exists(), f"Source asset missing: {src}")

    def test_script_parses_in_node_if_available(self):
        if shutil.which("node") is None:
            self.skipTest("Node.js is not installed.")
        result = subprocess.run(["node", "--check", str(PAGE / "editor.js")], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
