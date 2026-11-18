# 착한거래 CI 등장 모션 — 로고 도형(// 두 막대·글자별 윤곽선)을 build_ci.py 에서 그대로 가져와 motion.html 하나에 넣는다.
# 실행: python -I asset-library/chakhan-ci/motion/build_motion.py   → motion.html (브라우저로 열어 보기)
# 영상: node asset-library/chakhan-ci/motion/render_motion.mjs     → D:/large/ai-staff/chakhan-ci-motion/*.mp4
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import build_ci as bc  # noqa: E402


def geometry(word="착한거래"):
    H = bc.H
    polys = [pts for _, pts in bc._slash_polys()]
    dx = -min(p[0] for pts in polys for p in pts)
    polys = [[(round(x + dx, 3), round(y, 3)) for x, y in pts] for pts in polys]
    right = max(p[0] for pts in polys for p in pts)
    # 글자 잉크 높이를 H 로 — 글자마다 따로(한 자씩 움직이게)
    _, b0 = bc.outline(word, 1.0)
    s = H / (b0[3] - b0[1])
    _, b = bc.outline(word, s)
    wx = right + bc.WORD_GAP
    font = bc._FONT
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    chars, x = [], 0.0
    for c in word:
        d, cb = bc.outline(c, s)
        chars.append({"c": c, "d": d, "x": round(wx - b[0] + x, 3), "y": round(-b[1], 3),
                      "cx": round(wx - b[0] + x + (cb[0] + cb[2]) / 2, 3)})
        x += gs[cmap[ord(c)]].width * s * (1 + bc.TRACK)
    return {"H": H, "slash": polys, "chars": chars, "word_left": round(wx, 3),
            "width": round(wx + (b[2] - b[0]), 3), "top": round(min(0.0, bc.SLASH_TOP), 3), "bottom": round(max(H, bc.SLASH_BOT), 3)}


if __name__ == "__main__":
    geo = {"chakhan": geometry("착한거래"), "freepass": geometry("프리패스")}
    colors = {"yellow": bc.SHORTS_YELLOW, "ink": bc.INK, "white": bc.WHITE, "green": bc.GREEN, "green_dark": bc.GREEN_DARK}
    # 말 따옴표 장면용 글꼴: 제목 SUITE Heavy, SUITE 에 없는 글자는 Pretendard Bold. file:// 에서도 읽히게 HTML 안에 넣는다(그래서 motion.html 은 git 에 넣지 않음).
    import base64
    root = HERE.parents[2]
    fonts = {"SUITE": root / "public-release/site/fonts/SUITE-Heavy.woff2", "PretendardB": root / "blog/fonts/Pretendard-Bold.woff2"}
    fonts = {k: base64.b64encode(v.read_bytes()).decode() for k, v in fonts.items()}
    tpl = (HERE / "motion.template.html").read_text(encoding="utf-8")
    out = (tpl.replace("/*GEO*/null", json.dumps(geo, ensure_ascii=False)).replace("/*COLORS*/null", json.dumps(colors))
           .replace("/*FONTS*/null", json.dumps(fonts)))
    (HERE / "motion.html").write_text(out, encoding="utf-8")
    print("wrote motion.html")
