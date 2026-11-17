# 착한거래 CI 생성기 — «//» 형광펜 두 획 + «착한거래»(SUITE Heavy 윤곽선).
# 글자는 글꼴 윤곽선 경로로 바꿔 글꼴이 없어도 똑같이 보인다. 형광펜 획은 난수 없이 고정 수식으로 그려 매번 같은 결과가 나온다.
# 실행: python -I asset-library/chakhan-ci/build_ci.py  (저장소 루트에서, fontTools·brotli 필요)
import math
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "public-release/site/fonts/SUITE-Heavy.woff2"
OUT = Path(__file__).resolve().parent

YELLOW = "#F6FD00"      # 브랜드 노랑 = 블로그 형광펜 마커와 같은 값
YELLOW_GRAIN = "#D9E000"  # 형광펜 결(같은 색 계열의 조금 진한 줄)
WHITE = "#FFFFFF"
WHITE_GRAIN = "#D8D8D8"
INK = "#0B0B0C"

H = 100.0               # 워드마크 잉크 높이(기준 단위)
TRACK = -0.03           # 자간(글자 폭 대비)

# 형광펜 획 규격(H 대비). 2026-11-17 대표: CI로 쓰기엔 길다 → 글자 높이 안으로 줄이고 사선을 확실하게.
ANGLE = math.radians(31)   # 세로에서 오른쪽으로 기운 각
STROKE_W = 0.25 * H        # 획 굵기(획에 수직)
GAP = 0.12 * H             # 두 획 사이(수평)
SLASH_SPAN = 0.88 * H      # 획 세로 길이(글자 높이보다 조금 짧게, 글자 가운데에 맞춤)
SLASH_BOT = H / 2 + SLASH_SPAN / 2
SLASH_TOP = H / 2 - SLASH_SPAN / 2
WORD_GAP = 0.20 * H        # 획과 글자 사이


_FONT = None


def outline(text, scale, track=TRACK):
    """글자를 윤곽선 경로로. 기준선 y=0(아래가 +), 반환: 경로, 잉크 상자(xmin, ymin, xmax, ymax)."""
    global _FONT
    _FONT = _FONT or TTFont(str(FONT))
    gs, cmap = _FONT.getGlyphSet(), _FONT.getBestCmap()
    x, cmds, bp = 0.0, [], BoundsPen(gs)
    for c in text:
        n = cmap[ord(c)]
        pen = SVGPathPen(gs, lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        m = (scale, 0, 0, -scale, x, 0)
        gs[n].draw(TransformPen(pen, m))
        gs[n].draw(TransformPen(bp, m))
        cmds.append(pen.getCommands())
        x += gs[n].width * scale * (1 + track)
    return "".join(cmds), bp.bounds


def word_scale():
    """워드마크 «착한거래» 잉크 높이가 H 가 되는 글자 배율."""
    _, b = outline("착한거래", 1.0)
    return H / (b[3] - b[1])


def wordmark(text="착한거래"):
    d, b = outline(text, word_scale())
    # 잉크 상자를 (0,0)-(w,H) 로 옮긴다. 기준선은 y = -b[1]
    return d, (b[0], b[1]), b[2] - b[0]


def fmt(p):
    return f"{p[0]:.2f} {p[1]:.2f}"


def marker_stroke(x0, seed):
    """납작한 형광펜 촉으로 아래→위로 그은 한 획. 가장자리는 곧고(손이 그은 아주 작은 휨만), 양 끝은 촉 각도대로
    비스듬히 잘리며, 위 끝 조금은 잉크가 마르며 가는 틈 두 줄로 갈라진다. x0 = 아래쪽 왼 끝 x."""
    yb, yt = SLASH_BOT, SLASH_TOP
    dx = (yb - yt) * math.tan(ANGLE)
    Wx = STROKE_W / math.cos(ANGLE)           # 수평으로 잰 획 폭
    bow = 0.012 * H * (1 if seed == 0 else 0.8)  # 손목 호(아주 살짝)

    def P(t, f):  # t: 0=아래 1=위(획 방향), f: 0=왼 가장자리 1=오른 가장자리
        x = x0 + dx * t + bow * math.sin(math.pi * t) + Wx * f
        return (x, yb - (yb - yt) * t)

    # 양 끝은 촉 각도대로 비스듬히: 아래는 오른쪽이, 위는 왼쪽이 조금 짧다(두 자른 선이 평행)
    t0 = lambda f: 0.06 * f
    t1 = lambda f: 1 - 0.06 * (1 - f)

    N = 10
    DRY = 0.84                           # 이 위로는 마르며 가는 틈으로 갈라진다
    lt = [DRY * i / N for i in range(N + 1)]
    rt = [t0(1) + (DRY - t0(1)) * i / N for i in range(N + 1)]
    pts = [P(t, 0) for t in lt] + [P(t, 1) for t in reversed(rt)]
    body = "M" + " L".join(fmt(p) for p in pts) + " Z"

    # 마른 끝: 가는 틈 두 줄로 나뉜 세 띠. 같은 진하기, 끝 길이만 아주 조금 다르다
    strips = []
    for (f0, f1, short) in [(0.0, 0.315, 0.0), (0.345, 0.655, 0.018), (0.685, 1.0, 0.008)]:
        a = DRY - 0.004
        q = [P(a, f0), P(t1(f0) - short, f0), P(t1(f1) - short, f1), P(a, f1)]
        strips.append((f"M{fmt(q[0])} L{fmt(q[1])} L{fmt(q[2])} L{fmt(q[3])} Z", 1))

    # 펜 결: 획 방향의 아주 옅은 줄 두 개
    grains = []
    for f in (0.27, 0.63):
        g = [P(0.06, f), P(DRY - 0.02, f), P(DRY - 0.02, f + 0.035), P(0.06, f + 0.035)]
        grains.append(f"M{fmt(g[0])} L{fmt(g[1])} L{fmt(g[2])} L{fmt(g[3])} Z")

    right_x = max(P(1.0, 1)[0], P(0.5, 1)[0])
    return body, strips, grains, right_x


# ── 카테고리 락업: CI | 카테고리 이름 (2026-11-17 대표: AI 장기렌터카, 상식 한 스푼 … 은 모두 착한거래의 카테고리)
# 카테고리 글씨는 CI와 같은 SUITE Heavy, 크기는 워드마크 글자의 0.47배, 기준선은 워드마크와 같다.
SUB_RATIO = 0.47
SUB_GAP = 0.30 * H     # 워드마크 → 세로줄, 세로줄 → 카테고리
RULE_W = 0.035 * H
RULE_H = 0.70 * H      # 워드마크 잉크 상자 세로 가운데
CATEGORIES = {"ai-rentcar": "AI 장기렌터카", "sangsik": "상식 한 스푼"}


def build(word_fill, slash_fill, grain=None, sub=None, sub_fill=None, rule_fill=None, rule_opacity=1.0, spec=None):
    first_x0 = 0.0
    step = STROKE_W / math.cos(ANGLE) + GAP
    parts, right_edge = [], 0
    for i in range(2):
        body, fringes, grains, rx = marker_stroke(first_x0 + i * step, seed=i)
        right_edge = max(right_edge, rx)
        parts.append(f'<path d="{body}"/>')
        parts += [f'<path d="{d}"/>' for d, _ in fringes]
        if grain:
            parts += [f'<path d="{d}" fill="{grain}" opacity=".45"/>' for d in grains]
    d, (bx, by), ww = wordmark()
    wx = right_edge + WORD_GAP
    total_w = wx + ww + 0.04 * H
    baseline = -by
    extra, label = "", "착한거래"
    rx = wx + ww + SUB_GAP
    sx = rx + RULE_W + SUB_GAP
    ssize = word_scale() * SUB_RATIO
    if sub:
        sd, sb = outline(sub, ssize)
        extra = (f'<rect x="{rx:.2f}" y="{(H - RULE_H) / 2:.2f}" width="{RULE_W:.2f}" height="{RULE_H:.2f}" fill="{rule_fill}"'
                 + (f' opacity="{rule_opacity}"' if rule_opacity != 1 else "") + "/>"
                 f'<path fill="{sub_fill}" transform="translate({sx - sb[0]:.2f} {baseline:.2f})" d="{sd}"/>')
        total_w = sx + (sb[2] - sb[0]) + 0.04 * H
        label = f"착한거래 {sub}"
    pad = 0.08 * H
    top, bot = min(0.0, SLASH_TOP), max(H, SLASH_BOT)
    vb = (-pad, top - pad, total_w + 2 * pad, bot - top + 2 * pad)
    if spec is not None:  # 영상·웹이 카테고리 글씨를 같은 자리에 직접 쓸 수 있게 기준값을 남긴다(SVG 단위)
        upm = _FONT["head"].unitsPerEm
        spec.update({
            "viewBox": [round(v, 2) for v in vb], "baseline": round(baseline, 2), "wordmark_right": round(wx + ww, 2),
            "rule": {"x": round(rx, 2), "y": round((H - RULE_H) / 2, 2), "w": round(RULE_W, 2), "h": round(RULE_H, 2)},
            "sub_x": round(sx, 2), "sub_font_size": round(ssize * upm, 2), "sub_font": "SUITE Heavy (900)",
        })
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" '
        f'width="{vb[2] * 2:.0f}" height="{vb[3] * 2:.0f}" role="img" aria-label="{label}">'
        f'<title>{label}</title>'
        f'<g fill="{slash_fill}">{"".join(parts)}</g>'
        f'<path fill="{word_fill}" transform="translate({wx - bx:.2f} {-by:.2f})" d="{d}"/>'
        f"{extra}</svg>\n"
    )
    return svg


# 바탕별 색: (글자, //, 형광펜 결, 카테고리 글씨, 세로줄, 세로줄 투명도)
BACKGROUNDS = {
    "on-light": (INK, YELLOW, YELLOW_GRAIN, INK, INK, 0.3),        # 흰·밝은 바탕: 글자 검정, // 노랑
    "on-dark": (YELLOW, WHITE, WHITE_GRAIN, WHITE, WHITE, 0.4),    # 검정·어두운 바탕: 글자 노랑, // 흰색(2026-11-17 대표)
}
MONO = (INK, INK, None)                                            # 노랑 바탕·단색 인쇄용

if __name__ == "__main__":
    import json
    for bg, (wf, sf, g, cf, rf, ro) in BACKGROUNDS.items():
        (OUT / f"chakhan-ci-{bg}.svg").write_text(build(wf, sf, g), encoding="utf-8")
        print("wrote", f"chakhan-ci-{bg}.svg")
        for slug, name in CATEGORIES.items():
            fn = f"chakhan-ci-{slug}-{bg}.svg"
            (OUT / fn).write_text(build(wf, sf, g, name, cf, rf, ro), encoding="utf-8")
            print("wrote", fn)
    (OUT / "chakhan-ci-mono-black.svg").write_text(build(*MONO), encoding="utf-8")
    print("wrote chakhan-ci-mono-black.svg")
    spec = {"schema": "chakhan-ci/spec/v1", "units": "SVG viewBox units of chakhan-ci-on-*.svg (wordmark ink height = 100)",
            "colors": {"yellow": YELLOW, "ink": INK, "white": WHITE},
            "backgrounds": {bg: {"wordmark": v[0], "slashes": v[1], "category": v[3], "rule": v[4], "rule_opacity": v[5]} for bg, v in BACKGROUNDS.items()},
            "category": {"ratio_to_wordmark": SUB_RATIO, "gap": round(SUB_GAP, 2), "rule_w": round(RULE_W, 2), "rule_h": round(RULE_H, 2)}, "categories": CATEGORIES}
    build(*BACKGROUNDS["on-dark"][:3], spec=spec)
    (OUT / "chakhan-ci-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote chakhan-ci-spec.json")
