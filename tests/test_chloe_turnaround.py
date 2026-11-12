"""The AI Staff turnaround assets must remain byte-identical to the recovered Chloe source."""
from pathlib import Path
import hashlib
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "robots" / "CLO-02" / "chakhan-sales" / "motion-3d" / "assets"
STUDIO = ROOT / "studio" / "turnaround"
EXPECTED = [
    "chloe-front.webp", "chloe-front-left.webp", "chloe-left.webp",
    "chloe-back-left.webp", "chloe-back.webp", "chloe-back-right.webp",
    "chloe-right.webp", "chloe-front-right.webp",
    "chloe-top.webp", "chloe-bottom.webp",
]


class PreservedChloeReferenceTests(unittest.TestCase):
    def test_manifest_is_complete_and_traces_original_branch(self):
        data = json.loads((STUDIO / "reference-index.json").read_text(encoding="utf-8"))
        self.assertEqual(data["character"], "CLO-02")
        self.assertEqual(data["variant"], "CLO-02-CHAKHAN")
        self.assertEqual(data["source"]["repository"], "freepass-creator/chakhan-sales")
        self.assertEqual(data["source"]["branch"], "codex/chloe-pt-continuation-20261112")
        self.assertTrue(data["sourceByteIdentical"])
        self.assertEqual([row["filename"] for row in data["images"]], EXPECTED)

    def test_original_git_blob_sha_matches_all_ten(self):
        data = json.loads((STUDIO / "reference-index.json").read_text(encoding="utf-8"))
        for entry in data["images"]:
            path = ASSETS / entry["filename"]
            self.assertTrue(path.is_file(), entry["filename"])
            raw = path.read_bytes()
            self.assertGreater(len(raw), 10000)
            self.assertEqual(raw[0:4], b"RIFF")
            self.assertEqual(raw[8:12], b"WEBP")
            git_blob_hash = hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()
            self.assertEqual(git_blob_hash, entry["gitBlobSha"], entry["filename"])

    def test_existing_viewer_uses_exactly_the_source_images(self):
        html = (STUDIO / "index.html").read_text(encoding="utf-8")
        actual = re.findall(r'data-file="([^"]+)"', html)
        self.assertEqual(actual, EXPECTED)
        self.assertIn("기존 자산 그대로 보존", html)
        self.assertIn("PT 작업 PR #11", html)


if __name__ == "__main__":
    unittest.main()
