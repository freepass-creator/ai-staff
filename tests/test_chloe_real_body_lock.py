"""Tests use artificial data; no private images or GPU are needed."""
import hashlib
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image
from generator.chloe_real_body_lock import verify


class ChloeRealBodyLockTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.base = root / "reference.png"
        self.candidate = root / "candidate.png"
        self.mask = root / "stocking-mask.png"
        Image.fromarray(np.full((9, 9, 3), 120, dtype=np.uint8)).save(self.base)
        m = np.zeros((9, 9), dtype=np.uint8)
        m[3:7, 3:7] = 255
        Image.fromarray(m).save(self.mask)
        self.hash = hashlib.sha256(self.base.read_bytes()).hexdigest()

    def check(self):
        return verify(self.base, self.candidate, self.mask, self.hash)

    def test_unchanged_passes(self):
        self.candidate.write_bytes(self.base.read_bytes())
        self.assertTrue(self.check()["passed"])

    def test_change_only_inside_mask_passes(self):
        a = np.asarray(Image.open(self.base)).copy()
        a[4, 4, :] = [5, 20, 200]
        Image.fromarray(a).save(self.candidate)
        self.assertTrue(self.check()["passed"])

    def test_change_outside_mask_fails(self):
        a = np.asarray(Image.open(self.base)).copy()
        a[0, 0, :] = [1, 2, 3]
        Image.fromarray(a).save(self.candidate)
        self.assertEqual(self.check()["reason"], "FAIL_CHANGED_OUTSIDE_MASK")

    def test_modified_reference_hash_fails(self):
        self.candidate.write_bytes(self.base.read_bytes())
        self.base.write_bytes(b"tampered")
        self.assertEqual(self.check()["reason"], "REFERENCE_SHA256_MISMATCH")

    def test_resized_candidate_fails(self):
        Image.new("RGB", (8, 9), (120, 120, 120)).save(self.candidate)
        self.assertEqual(self.check()["reason"], "CANVAS_OR_MASK_SIZE_MISMATCH")


if __name__ == "__main__":
    unittest.main()
