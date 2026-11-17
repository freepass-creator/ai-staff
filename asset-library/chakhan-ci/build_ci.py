# 착한거래 CI 생성기 — «//»(잠시 멈춤) 두 획 + «착한거래»(SUITE Heavy 윤곽선). 한 색 로고.
# 글자는 글꼴 윤곽선 경로로 바꿔 글꼴이 없어도 똑같이 보인다. 획은 난수 없이 고정 수식으로 그려 매번 같은 결과가 나온다.
# 실행: python -I asset-library/chakhan-ci/build_ci.py  (저장소 루트에서, fontTools·brotli 필요)
#       CHAKHAN_SLASH_SPAN=0.70 처럼 // 세로 길이(H 배수)를 바꿔 시험할 수 있다.
import math
import os
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "public-release/site/fonts/SUITE-Heavy.woff2"
OUT = Path(os.environ.get("CHAKHAN_CI_OUT", Path(__file__).resolve().parent))

# 2026-11-17 대표 확정: 대표색은 「착한 초록」 하나, 로고(// + 글씨)는 한 색. 바탕에 따라 밝기만 짝꿍으로 바꾼다.
# 근거(APCA, WCAG 3 초안): 흰 바탕 #009867 Lc 63.9 · WCAG 3.69 / 검정 바탕 #38CA91 Lc 61.6 · WCAG 9.39 — 두 바탕 모두 본문 수준(Lc 60) 이상.
GREEN = "#009867"        # 착한 초록(기준색) — 흰·밝은 바탕, 인쇄
GREEN_DARK = "#38CA91"   # 착한 초록(검정 바탕용) — 검정·어두운 바탕, 쇼츠·다크 모드
WHITE = "#FFFFFF"
INK = "#0B0B0C"
HL_LIGHT = "#B5F1D2"     # 형광펜(확인 표시) 효과 — 흰 바탕 글자 밑에 깐다(움직임 효과 전용, 로고에는 쓰지 않음)
HL_DARK = "#075539"      # 형광펜 효과 — 검정 바탕 흰 글자 밑에 깐다

H = 100.0               # 워드마크 잉크 높이(기준 단위)
TRACK = -0.03           # 자간(글자 폭 대비)

# // 규격(H 대비). 31° 로 기운 두 단색 획, 끝은 평행하게 자른다.
ANGLE = math.radians(31)   # 세로에서 오른쪽으로 기운 각
STROKE_W = 0.25 * H        # 획 굵기(획에 수직)
GAP = 0.12 * H             # 두 획 사이(수평)
SLASH_SPAN = float(os.environ.get("CHAKHAN_SLASH_SPAN", "0.70")) * H  # 획 세로 길이(글자 세로 가운데에 맞춤). 2026-11-17 대표 확정 0.70H — 사선보다 「마크」로 서게
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


def slash_stroke(x0):
    """아래→위로 그은 한 획. 가장자리는 곧고 양 끝은 촉 각도대로 비스듬히(평행하게) 자른 단색 평행사변형. x0 = 아래쪽 왼 끝 x."""
    yb, yt = SLASH_BOT, SLASH_TOP
    dx = (yb - yt) * math.tan(ANGLE)
    Wx = STROKE_W / math.cos(ANGLE)           # 수평으로 잰 획 폭

    def P(t, f):  # t: 0=아래 1=위(획 방향), f: 0=왼 가장자리 1=오른 가장자리
        return (x0 + dx * t + Wx * f, yb - (yb - yt) * t)

    # 양 끝은 촉 각도대로 비스듬히: 아래는 오른쪽이, 위는 왼쪽이 조금 짧다(두 자른 선이 평행)
    pts = [P(0, 0), P(0.94, 0), P(1, 1), P(0.06, 1)]
    return "M" + " L".join(fmt(p) for p in pts) + " Z", P(1.0, 1)[0]


def slashes():
    step = STROKE_W / math.cos(ANGLE) + GAP
    parts, right = [], 0
    for i in range(2):
        body, rx = slash_stroke(i * step)
        parts.append(f'<path d="{body}"/>')
        right = max(right, rx)
    return "".join(parts), right


# ── 카테고리 락업: CI | 카테고리 이름 (AI 장기렌터카 = 서비스, 상식 한 스푼 = 마케팅 콘텐츠 시리즈 — 모두 착한거래 아래)
# 카테고리 글씨는 CI와 같은 SUITE Heavy, 크기는 워드마크 글자의 0.47배, 기준선은 워드마크와 같다.
SUB_RATIO = 0.47
SUB_GAP = 0.30 * H     # 워드마크 → 세로줄, 세로줄 → 카테고리
RULE_W = 0.035 * H
RULE_H = 0.70 * H      # 워드마크 잉크 상자 세로 가운데
CATEGORIES = {"ai-rentcar": "AI 장기렌터카", "sangsik": "상식 한 스푼"}

# 바탕별 색: (로고 = 글자·//, 카테고리 글씨, 세로줄, 세로줄 투명도). 로고는 한 색.
LOGO_COLORS = (GREEN, GREEN_DARK, WHITE, INK)
BACKGROUNDS = {
    "on-light": (GREEN, GREEN, GREEN, 0.35),                # 흰·밝은 바탕: 착한 초록
    "on-dark": (GREEN_DARK, GREEN_DARK, GREEN_DARK, 0.45),  # 검정·어두운 바탕: 검정 바탕용 초록
    "on-green": (WHITE, WHITE, WHITE, 0.5),                 # 초록 바탕(반전): 전부 흰색
}
MONO = INK                                                  # 한 색만 되는 곳(도장·각인·팩스·흑백 인쇄): 전부 검정


def build(fill, sub=None, sub_fill=None, rule_fill=None, rule_opacity=1.0, spec=None):
    if fill not in LOGO_COLORS:
        raise ValueError(f"로고 색은 {LOGO_COLORS} 중 하나: {fill}")
    g, right_edge = slashes()
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
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" '
        f'width="{vb[2] * 2:.0f}" height="{vb[3] * 2:.0f}" role="img" aria-label="{label}">'
        f'<title>{label}</title><g fill="{fill}">{g}</g>'
        f'<path fill="{fill}" transform="translate({wx - bx:.2f} {-by:.2f})" d="{d}"/>'
        f"{extra}</svg>\n"
    )


def symbol(bg_fill, slash_fill, radius=0.0):
    """정사각 심볼(// 만): 앱 아이콘·유튜브·카톡 프로필. 원형으로 잘려도 // 가 남게 가운데에 작게."""
    g, right = slashes()
    cx, cy = right / 2, (SLASH_TOP + SLASH_BOT) / 2
    side = max(SLASH_SPAN * 2.0, right * 1.75)
    x0, y0 = cx - side / 2, cy - side / 2
    rr = f' rx="{side * radius:.2f}"' if radius else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} {side:.2f} {side:.2f}" width="512" height="512" role="img" aria-label="착한거래">'
            f'<title>착한거래</title><rect x="{x0:.2f}" y="{y0:.2f}" width="{side:.2f}" height="{side:.2f}"{rr} fill="{bg_fill}"/>'
            f'<g fill="{slash_fill}">{g}</g></svg>\n')


CLEAR = 0.5 * H   # 여백: 잉크 상자 둘레로 0.5H 는 비운다


def construction():
    """비율 도면: 흰 바탕 CI 위에 치수선(H 기준)과 여백을 그린다. 규정집(guide.html)용."""
    spec = {}
    logo = build(GREEN, spec=spec)
    inner = logo[logo.index("<g "):logo.rindex("</svg>")]
    step = STROKE_W / math.cos(ANGLE) + GAP
    Wx = STROKE_W / math.cos(ANGLE)
    dx = (SLASH_BOT - SLASH_TOP) * math.tan(ANGLE)
    slash_r = step + dx + Wx
    word_l, word_r = spec["wordmark_right"] - wordmark()[2], spec["wordmark_right"]
    B = "#2F6BFF"
    t = lambda x, y, s, a="middle": f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{a}" font-size="7.5" fill="{B}" font-family="Pretendard,Malgun Gothic,sans-serif" font-weight="700">{s}</text>'
    ln = lambda x1, y1, x2, y2, dash=False: f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{B}" stroke-width=".8"' + (' stroke-dasharray="3 2"' if dash else "") + "/>"

    def hdim(x1, x2, y, s):  # 가로 치수
        return ln(x1, y, x2, y) + ln(x1, y - 3, x1, y + 3) + ln(x2, y - 3, x2, y + 3) + t((x1 + x2) / 2, y + 10, s)

    def vdim(x, y1, y2, s, side=1):  # 세로 치수
        return ln(x, y1, x, y2) + ln(x - 3, y1, x + 3, y1) + ln(x - 3, y2, x + 3, y2) + t(x + 6 * side, (y1 + y2) / 2 + 3, s, "start" if side > 0 else "end")

    W = word_r + 0.04 * H
    a = [
        f'<rect x="{-CLEAR:.1f}" y="{-CLEAR:.1f}" width="{W + 2 * CLEAR:.1f}" height="{H + 2 * CLEAR:.1f}" fill="none" stroke="{B}" stroke-width=".8" stroke-dasharray="4 3"/>',
        t(-CLEAR + 2, -CLEAR - 4, "여백 0.5H (사방)", "start"),
        ln(word_l, 0, W, 0, True), ln(word_l, H, W, H, True),
        vdim(W + CLEAR + 12, 0, H, "H = 착한거래 글자 높이"),
        vdim(-14, SLASH_TOP, SLASH_BOT, f"// 길이 {SLASH_SPAN / H:.2f}H", -1),
        hdim(slash_r, word_l, H + 16, "0.20H"),
        hdim(0, Wx, H + 16, "획 0.25H"),
        hdim(Wx, step, H + 30, "사이 0.12H"),
        ln(0, SLASH_BOT, 0, SLASH_TOP, True), t(10, SLASH_TOP + 12, "31°", "start"),
    ]
    vb = (-CLEAR - 60, -CLEAR - 16, W + 2 * CLEAR + 60 + 120, H + 2 * CLEAR + 24)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" width="{vb[2] * 2:.0f}" height="{vb[3] * 2:.0f}">'
            f'<rect x="{vb[0]:.1f}" y="{vb[1]:.1f}" width="{vb[2]:.1f}" height="{vb[3]:.1f}" fill="#fff"/>{inner}{"".join(a)}</svg>\n')


if __name__ == "__main__":
    import json
    OUT.mkdir(parents=True, exist_ok=True)
    for bg, (fill, cf, rf, ro) in BACKGROUNDS.items():
        (OUT / f"chakhan-ci-{bg}.svg").write_text(build(fill), encoding="utf-8")
        print("wrote", f"chakhan-ci-{bg}.svg")
        for slug, name in CATEGORIES.items():
            fn = f"chakhan-ci-{slug}-{bg}.svg"
            (OUT / fn).write_text(build(fill, name, cf, rf, ro), encoding="utf-8")
            print("wrote", fn)
    (OUT / "chakhan-ci-mono-black.svg").write_text(build(MONO), encoding="utf-8")
    print("wrote chakhan-ci-mono-black.svg")
    # 심볼(앱 아이콘·프로필): 기본은 초록 바탕에 흰 //
    for bg, (bf, sf) in {"on-green": (GREEN, WHITE), "on-dark": (INK, GREEN_DARK), "on-light": (WHITE, GREEN)}.items():
        (OUT / f"chakhan-symbol-{bg}.svg").write_text(symbol(bf, sf), encoding="utf-8")
        print("wrote", f"chakhan-symbol-{bg}.svg")
    spec = {"schema": "chakhan-ci/spec/v2", "units": "SVG viewBox units of chakhan-ci-on-*.svg (wordmark ink height = 100)",
            "colors": {"green": GREEN, "green_dark": GREEN_DARK, "ink": INK, "white": WHITE, "highlight_on_light": HL_LIGHT, "highlight_on_dark": HL_DARK},
            "rule": "one-colour logo (// and wordmark same colour): #009867 on light, #38CA91 on dark, white on green, black for one-colour print",
            "contrast": {"green_on_white": {"apca_lc": 63.9, "wcag": 3.69}, "green_dark_on_black": {"apca_lc": 61.6, "wcag": 9.39}},
            "backgrounds": {bg: {"logo": v[0], "category": v[1], "rule": v[2], "rule_opacity": v[3]} for bg, v in BACKGROUNDS.items()},
            "clear_space": round(CLEAR, 2), "min_height_px": {"ci": 24, "lockup": 28, "symbol": 32},
            "slash": {"span": round(SLASH_SPAN / H, 3), "angle_deg": round(math.degrees(ANGLE), 1), "stroke": round(STROKE_W / H, 3),
                      "gap": round(GAP / H, 3), "word_gap": round(WORD_GAP / H, 3)},
            "category": {"ratio_to_wordmark": SUB_RATIO, "gap": round(SUB_GAP, 2), "rule_w": round(RULE_W, 2), "rule_h": round(RULE_H, 2)},
            "categories": CATEGORIES}
    build(GREEN_DARK, spec=spec)
    (OUT / "chakhan-ci-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote chakhan-ci-spec.json")
    (OUT / "chakhan-ci-construction.svg").write_text(construction(), encoding="utf-8")
    print("wrote chakhan-ci-construction.svg")
