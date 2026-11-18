# 착한거래 CI SVG → PNG 내보내기(카톡 프로필·문서·인쇄 시안처럼 SVG 를 못 쓰는 곳용).
# PNG 는 git 에 넣지 않고 D:/dev-artifacts/ai-staff/chakhan-ci-png/ 에 만든다. 원본은 언제나 SVG.
# 실행: python -I asset-library/chakhan-ci/export_png.py  (Edge 또는 Chrome 필요, 외부 패키지 없음)
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = Path(os.environ.get("CHAKHAN_CI_PNG", "D:/dev-artifacts/ai-staff/chakhan-ci-png"))
BROWSERS = [os.environ.get("CHAKHAN_BROWSER", ""),
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe"]
# (파일, 내보낼 가로 폭 px 목록). 로고는 바탕 투명, 심볼은 정사각 바탕 포함
JOBS = [(p.name, [1200, 2400]) for p in sorted([*HERE.glob("chakhan-ci-*.svg"), *HERE.glob("freepass-ci-*.svg")]) if "construction" not in p.name] + \
       [(p.name, [512, 1024]) for p in sorted(HERE.glob("chakhan-symbol-*.svg"))]


def main():
    exe = next((b for b in BROWSERS if b and Path(b).exists()), None)
    if not exe:
        sys.exit("Edge/Chrome 을 찾지 못했습니다 (CHAKHAN_BROWSER 로 경로 지정)")
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="chakhan-ci-png-"))
    try:
        for name, widths in JOBS:
            svg = (HERE / name).read_text(encoding="utf-8")
            vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
            for w in widths:
                h = round(w * vb[3] / vb[2])
                page = tmp / "p.html"
                page.write_text(f'<!doctype html><style>html,body{{margin:0;background:transparent}}img{{display:block;width:{w}px;height:{h}px}}</style>'
                                f'<img src="{(HERE / name).as_uri()}">', encoding="utf-8")
                png = OUT / f"{name[:-4]}-{w}w.png"
                subprocess.run([exe, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                                "--default-background-color=00000000", f"--window-size={w},{h}", f"--user-data-dir={tmp / 'profile'}",
                                f"--screenshot={png}", page.as_uri()], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
                print("wrote", png)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
