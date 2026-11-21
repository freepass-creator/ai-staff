"""CHLOE_REAL_V1 fixed-front-pose body lock gate.

Non-generation validation; forbid changes outside the explicitly editable stocking mask.
This does not verify 3D character identity or other viewpoints.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def _sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def verify(reference, candidate, mask, expected_sha256):
    """Return a machine-readable strict pixel-lock result; no mutation."""
    ref_path, candidate_path, mask_path = map(Path, (reference, candidate, mask))
    if not (ref_path.is_file() and candidate_path.is_file() and mask_path.is_file()):
        return {"passed": False, "reason": "MISSING_FILE"}
    if _sha256(ref_path) != expected_sha256:
        return {"passed": False, "reason": "REFERENCE_SHA256_MISMATCH"}
    a = np.asarray(Image.open(ref_path).convert("RGB"))
    b = np.asarray(Image.open(candidate_path).convert("RGB"))
    m = np.asarray(Image.open(mask_path).convert("L"))
    if a.shape != b.shape or a.shape[:2] != m.shape:
        return {"passed": False, "reason": "CANVAS_OR_MASK_SIZE_MISMATCH"}
    allowed = m > 127
    changed_outside = np.any(a != b, axis=2) & ~allowed
    count = int(np.count_nonzero(changed_outside))
    total = int(np.count_nonzero(~allowed))
    return {
        "passed": count == 0,
        "reason": "PASS_FIXED_FRONT_BODY" if count == 0 else "FAIL_CHANGED_OUTSIDE_MASK",
        "outside_mask_changed_pixels": count,
        "outside_mask_total_pixels": total,
        "changed_outside_ratio": round(count / max(1, total), 8),
        "guarantee": "front 2D pixels outside edit mask only; not identity or 3D geometry",
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reference", required=True)
    p.add_argument("--candidate", required=True)
    p.add_argument("--mask", required=True)
    p.add_argument("--sha256", required=True)
    args = p.parse_args()
    result = verify(args.reference, args.candidate, args.mask, args.sha256)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
