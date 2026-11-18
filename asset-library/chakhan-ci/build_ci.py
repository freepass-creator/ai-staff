# 착한거래 CI 생성기 — «//»(잠시 멈춤) 두 획 + «착한거래»(SUITE Heavy 윤곽선). 한 색 로고.
# 글자는 글꼴 윤곽선 경로로 바꿔 글꼴이 없어도 똑같이 보인다. 획은 난수 없이 고정 수식으로 그려 매번 같은 결과가 나온다.
# 실행: python -I asset-library/chakhan-ci/build_ci.py  (저장소 루트에서, fontTools·brotli 필요)
#       시안 시험: CHAKHAN_SLASH_SPAN·_ANGLE·_STROKE·_GAP·_LIFT·_ALIGN, CHAKHAN_WORD_GAP 환경변수로 // 를 바꿔 볼 수 있다(CHAKHAN_CI_OUT 로 다른 폴더에).
import math
import os
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "public-release/site/fonts/SUITE-Heavy.woff2"
FONT_EN = ROOT / "public-release/site/fonts/Pretendard-Bold.woff2"   # FREEPASS 영문(OFL 1.1, Pretendard 1.3.9)
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

# // 규격(H 대비). 31° 로 기운 두 단색 막대(형광펜 획).
# 2026-11-18 대표 확정: 끝을 획 방향에 직각으로 자른 같은 크기 막대 두 개, 한 획 세로 0.75H, 글자 세로 가운데(위아래 틈 0.125H씩). 바닥에 붙이지 않는다. 색·기울기·굵기·간격은 그대로.
ANGLE = math.radians(float(os.environ.get("CHAKHAN_SLASH_ANGLE", "31")))  # 세로에서 오른쪽으로 기운 각
STROKE_W = float(os.environ.get("CHAKHAN_SLASH_STROKE", "0.25")) * H       # 획 굵기(획에 수직)
GAP = float(os.environ.get("CHAKHAN_SLASH_GAP", "0.12")) * H            # 두 획 사이(수평)
SLASH_SPAN = float(os.environ.get("CHAKHAN_SLASH_SPAN", "0.75")) * H  # 한 획의 세로 크기. 2026-11-18 대표 확정 0.75H
SLASH_LIFT = float(os.environ.get("CHAKHAN_SLASH_LIFT", "0")) * H  # 둘째 획을 획 방향으로 올리는 길이. 2026-11-18 대표 확정: 0(두 획 같은 크기·같은 높이)
_ALIGN = os.environ.get("CHAKHAN_SLASH_ALIGN", "center")  # floor=글자 바닥에 닿음 · center=글자 위아래 가운데 · top=글자 위에 맞춤
SLASH_FLOOR = {"floor": H, "center": (H + SLASH_SPAN) / 2, "top": SLASH_SPAN}[_ALIGN]  # 두 획의 가장 아래 모서리 높이
WORD_GAP = float(os.environ.get("CHAKHAN_WORD_GAP", "0.20")) * H       # 획과 글자 사이


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


def slash_stroke(x0, lift=0.0):
    """아래→위로 그은 형광펜 막대 하나. 양 끝은 획 방향에 직각(바닥이 수평이 아님). x0 = 막대의 가장 왼쪽 x(올리기 전), lift = 획 방향으로 올린 길이."""
    ux, uy = math.sin(ANGLE), -math.cos(ANGLE)      # 획 방향(위로)
    nx, ny = math.cos(ANGLE), math.sin(ANGLE)       # 획에 직각(오른쪽 아래)
    L = (SLASH_SPAN - STROKE_W * math.sin(ANGLE)) / math.cos(ANGLE)  # 막대 하나의 세로 크기가 SLASH_SPAN 이 되는 중심선 길이
    h = STROKE_W / 2
    bx = x0 + h * nx + lift * ux                   # 아래 끝 중심
    by = SLASH_FLOOR - h * ny + lift * uy
    ex, ey = bx + ux * L, by + uy * L               # 위 끝 중심
    pts = [(bx - nx * h, by - ny * h), (bx + nx * h, by + ny * h), (ex + nx * h, ey + ny * h), (ex - nx * h, ey - ny * h)]
    return "M" + " L".join(fmt(p) for p in pts) + " Z", pts


def _slash_polys():
    step = STROKE_W / math.cos(ANGLE) + GAP
    return [slash_stroke(i * step, i * SLASH_LIFT) for i in range(2)]


def slashes():
    polys = _slash_polys()
    xs = [p[0] for _, pts in polys for p in pts]
    dx = -min(xs)  # 가장 왼쪽을 0 에
    parts = ['<path d="M' + " L".join(fmt((x + dx, y)) for x, y in pts) + ' Z"/>' for _, pts in polys]
    return "".join(parts), max(xs) + dx


_ys = [p[1] for _, pts in _slash_polys() for p in pts]
SLASH_TOP, SLASH_BOT = min(_ys), max(_ys)   # 두 막대를 합친 위·아래(둘째가 올라간 만큼 위가 높다)


# ── 카테고리 락업: CI | 카테고리 이름 (AI 장기렌터카 = 서비스, 상식 한 스푼 = 마케팅 콘텐츠 시리즈 — 모두 착한거래 아래)
# 카테고리 글씨는 CI와 같은 SUITE Heavy, 크기는 워드마크 글자의 0.62배(2026-11-18 대표 「보조 글씨 좀 더 커야」 0.47→0.62), 기준선은 워드마크와 같다.
SUB_RATIO = float(os.environ.get("CHAKHAN_SUB_RATIO", "0.62"))
SUB_GAP = 0.30 * H     # 워드마크 → 세로줄, 세로줄 → 카테고리
RULE_W = 0.035 * H
RULE_H = 0.70 * H      # 워드마크 잉크 상자 세로 가운데
CATEGORIES = {"ai-rentcar": "AI 장기렌터카", "sangsik": "상식 한 스푼", "econtract": "전자계약"}

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


# ── 쇼츠용 형광펜판(2026-11-18 대표 지시). 쇼츠 화면(검정 #0B0B0C)과 같은 형광 노랑을 쓴다. 기본 CI(초록 한 색)와 별개 세트.
SHORTS_YELLOW = "#F6FD00"
SHORTS = {  # 이름: (// 색, 글자 색, 형광펜 띠 색, 띠 모양, 놓을 바탕, 쓰임)
    "yellow-slash-on-dark": (SHORTS_YELLOW, WHITE, None, None, INK, "기본 — 쇼츠 화면 구석·첫 장면"),
    "yellow-on-dark": (SHORTS_YELLOW, SHORTS_YELLOW, None, None, INK, "강하게 — 엔딩·한 장면 전체"),
    "on-yellow": (INK, INK, None, None, SHORTS_YELLOW, "노랑 바탕 장면·표지"),
    "band-on-dark": (SHORTS_YELLOW, INK, SHORTS_YELLOW, "full", INK, "표지·썸네일 — 사선 형광 띠 위 검정 글자"),
    "highlight-on-light": (INK, INK, SHORTS_YELLOW, "under", WHITE, "밝은 장면 — 글자 아래쪽에 형광펜 칠"),
    "yellow-slash-on-light": (SHORTS_YELLOW, INK, None, None, WHITE, "흰 바탕은 노랑이 흐려 큰 크기에서만"),
}


def lockup(word="착한거래", slash_fill=GREEN, text_fill=GREEN, band=None, band_mode=None, with_slash=True, label=None):
    """// + 글자(SUITE Heavy) 한 줄. 글자 잉크 높이를 언제나 H 로 맞추므로 다른 낱말(프리패스)도 같은 규격이 된다. 바탕 투명(띠만 칠함)."""
    _, b0 = outline(word, 1.0)
    d, b = outline(word, H / (b0[3] - b0[1]))
    g, right = slashes()
    wx = right + WORD_GAP if with_slash else 0.0
    W = wx + (b[2] - b[0]) + 0.04 * H
    top, bot = (min(0.0, SLASH_TOP), max(H, SLASH_BOT)) if with_slash else (0.0, H)
    pad = 0.08 * H
    x_min, x_max = -pad, W + pad
    extra = ""
    if band:  # 형광펜으로 그은 띠: 살짝 기운 사각형
        if band_mode == "full":
            y0, y1, x0, x1, sk = -0.16 * H, 1.16 * H, wx - 0.14 * H, W + 0.10 * H, 0.08 * H
        else:
            y0, y1, x0, x1, sk = 0.42 * H, 1.06 * H, wx - 0.06 * H, W + 0.06 * H, 0.04 * H
        extra = f'<path fill="{band}" d="M{x0:.2f} {y0 + sk:.2f} L{x1:.2f} {y0:.2f} L{x1:.2f} {y1 - sk:.2f} L{x0:.2f} {y1:.2f} Z"/>'
        top, bot, x_max = min(top, y0), max(bot, y1), max(x_max, x1 + pad)
    vb = (x_min, top - pad, x_max - x_min, bot - top + 2 * pad)
    label = label or word
    s = f'<g fill="{slash_fill}">{g}</g>' if with_slash else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" '
            f'width="{vb[2] * 2:.0f}" height="{vb[3] * 2:.0f}" role="img" aria-label="{label}"><title>{label}</title>{extra}{s}'
            f'<path fill="{text_fill}" transform="translate({wx - b[0]:.2f} {-b[1]:.2f})" d="{d}"/></svg>\n')


# ── 프리패스 워드마크(2026-11-18 대표 지시: 같은 SUITE Heavy·같은 // 규격). 대표색 미정이라 검정·흰색, 쇼츠는 형광 노랑 //.
FREEPASS = {  # 이름: (// 넣기, // 색, 글자 색)
    # 2026-11-18 대표 「추천대로」: 한글 프리패스도 영문 FREEPASS 와 같은 하늘 // (#5B9FD4). 착한거래 정본(초록 한 색)과 // 모양은 같고 색 짜임으로 구분
    "on-light": (True, "#5B9FD4", INK), "on-dark": (True, "#5B9FD4", WHITE), "shorts-on-dark": (True, SHORTS_YELLOW, WHITE),
    "mono-black": (True, INK, INK), "mono-white": (True, WHITE, WHITE),
    "word-on-light": (False, INK, INK), "word-on-dark": (False, WHITE, WHITE),
}


# ── FREEPASS 영문 BI (2026-11-18 대표: 「FREEPASS 착한거래 버전으로 BI」, 「프리텐다드 볼드로 하자」) ──
# 글꼴: Pretendard Bold. 한글 SUITE Heavy(착한거래·프리패스)와 획 굵기·잉크 밀도를 재서 고름(SemiBold 가 수치상 +3%, 눈으로는 Bold 가 같은 무게).
# 간격: 글자마다 폭은 글꼴 그대로, 글자 사이 빈 공간을 EN_GAP 으로 고르게 + 사선 A 둘레만 눈대중으로 당김(EN_KERN).
# 색: 검정 글자 + 하늘 //(freepasserp.com 하늘색). 착한거래 정본은 초록 한 색 — 프리패스는 글자·// 두 색으로 구분된다.
FREEPASS_SKY = "#5B9FD4"
EN_GAP = 0.11
EN_KERN = {"PA": -0.10, "AS": -0.03}   # 2026-11-18 대표 확정(사선 A 둘레를 더 당김)
EN_CAP = float(os.environ.get("FREEPASS_EN_CAP", "0.90"))   # 2026-11-18 대표 확정: 대문자 0.90H — 대문자는 네모를 꽉 채워 같은 높이면 한글보다 커 보인다   # 대문자 높이(H 대비). // 는 그대로 두고 글자만 줄여 세로 가운데에 맞춘다
_FONT_EN = None


def outline_en(ch, scale):
    global _FONT_EN
    _FONT_EN = _FONT_EN or TTFont(str(FONT_EN))
    gs, cmap = _FONT_EN.getGlyphSet(), _FONT_EN.getBestCmap()
    pen, bp = SVGPathPen(gs, lambda v: f"{v:.2f}".rstrip("0").rstrip(".")), BoundsPen(gs)
    m = (scale, 0, 0, -scale, 0, 0)
    gs[cmap[ord(ch)]].draw(TransformPen(pen, m)); gs[cmap[ord(ch)]].draw(TransformPen(bp, m))
    return pen.getCommands(), bp.bounds


def lockup_en(word="FREEPASS", slash_fill=FREEPASS_SKY, text_fill=INK, with_slash=True, label=None):
    """// + 영문 대문자(Pretendard Bold). 대문자 잉크 높이를 H 로, // 는 착한거래와 같은 규격."""
    global _FONT_EN
    _FONT_EN = _FONT_EN or TTFont(str(FONT_EN))
    gs, cmap = _FONT_EN.getGlyphSet(), _FONT_EN.getBestCmap()
    bp = BoundsPen(gs)
    for c in word:
        gs[cmap[ord(c)]].draw(bp)
    k = EN_CAP * H / (bp.bounds[3] - bp.bounds[1])   # 대문자 높이 → EN_CAP·H
    base = bp.bounds[3] * k + (1 - EN_CAP) * H / 2   # 기준선 위치(글자를 H 의 세로 가운데에)
    g, right = slashes()
    x = right + WORD_GAP if with_slash else 0.0
    paths, prev = [], None
    for c in word:
        d, b = outline_en(c, k)
        if prev:
            x += EN_KERN.get(prev + c, 0) * H * EN_CAP
        paths.append(f'<path transform="translate({x - b[0]:.2f} {base:.2f})" d="{d}"/>')
        x += (b[2] - b[0]) + EN_GAP * H * EN_CAP
        prev = c
    W = x - EN_GAP * H * EN_CAP
    top, bot = (min(0.0, SLASH_TOP), max(H, SLASH_BOT)) if with_slash else (0.0, H)
    pad = 0.08 * H
    vb = (-pad, top - pad, W + 2 * pad, bot - top + 2 * pad)
    label = label or word
    s = f'<g fill="{slash_fill}">{g}</g>' if with_slash else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" '
            f'width="{vb[2] * 2:.0f}" height="{vb[3] * 2:.0f}" role="img" aria-label="{label}"><title>{label}</title>{s}'
            f'<g fill="{text_fill}">{"".join(paths)}</g></svg>\n')


FREEPASS_EN = {  # 이름: (// 넣기, // 색, 글자 색, 쓰는 곳)
    "on-light": (True, FREEPASS_SKY, INK, "흰·밝은 바탕 기본"),
    "on-dark": (True, FREEPASS_SKY, WHITE, "검정·남색 바탕"),
    "mono-black": (True, INK, INK, "한 색 인쇄(검정)"),
    "mono-white": (True, WHITE, WHITE, "한 색(흰색) — 사진·색 바탕 위"),
    "word-on-light": (False, INK, INK, "// 없이 글자만"),
    "shorts-on-dark": (True, SHORTS_YELLOW, WHITE, "쇼츠(형광 노랑 //)"),
}


CLEAR = 0.5 * H   # 여백: 잉크 상자 둘레로 0.5H 는 비운다


def construction():
    """비율 도면: 흰 바탕 CI 위에 치수선(H 기준)과 여백을 그린다. 규정집(guide.html)용."""
    spec = {}
    logo = build(GREEN, spec=spec)
    inner = logo[logo.index("<g "):logo.rindex("</svg>")]
    step = STROKE_W / math.cos(ANGLE) + GAP
    Wx = STROKE_W / math.cos(ANGLE)
    dx = (SLASH_BOT - SLASH_TOP) * math.tan(ANGLE)
    slash_r = slashes()[1]
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
        vdim(-14, SLASH_TOP, SLASH_BOT, f"획 {SLASH_SPAN / H:.2f}H · 가운데", -1),
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
    for name, (sf, tf, band, mode, _bg, _use) in SHORTS.items():
        fn = f"chakhan-ci-shorts-{name}.svg"
        (OUT / fn).write_text(lockup("착한거래", sf, tf, band, mode), encoding="utf-8")
        print("wrote", fn)
    for name, (ws, sf, tf) in FREEPASS.items():
        fn = f"freepass-ci-{name}.svg"
        (OUT / fn).write_text(lockup("프리패스", sf, tf, with_slash=ws), encoding="utf-8")
        print("wrote", fn)
    for name, (ws, sf, tf, _use) in FREEPASS_EN.items():
        fn = f"freepass-en-ci-{name}.svg"
        (OUT / fn).write_text(lockup_en("FREEPASS", sf, tf, with_slash=ws), encoding="utf-8")
        print("wrote", fn)
    spec = {"schema": "chakhan-ci/spec/v2", "units": "SVG viewBox units of chakhan-ci-on-*.svg (wordmark ink height = 100)",
            "colors": {"green": GREEN, "green_dark": GREEN_DARK, "ink": INK, "white": WHITE, "highlight_on_light": HL_LIGHT, "highlight_on_dark": HL_DARK},
            "rule": "one-colour logo (// and wordmark same colour): #009867 on light, #38CA91 on dark, white on green, black for one-colour print",
            "contrast": {"green_on_white": {"apca_lc": 63.9, "wcag": 3.69}, "green_dark_on_black": {"apca_lc": 61.6, "wcag": 9.39}},
            "backgrounds": {bg: {"logo": v[0], "category": v[1], "rule": v[2], "rule_opacity": v[3]} for bg, v in BACKGROUNDS.items()},
            "clear_space": round(CLEAR, 2), "min_height_px": {"ci": 24, "lockup": 28, "symbol": 32},
            "slash": {"span": round(SLASH_SPAN / H, 3), "angle_deg": round(math.degrees(ANGLE), 1), "stroke": round(STROKE_W / H, 3),
                      "gap": round(GAP / H, 3), "word_gap": round(WORD_GAP / H, 3),
                      "lift": round(SLASH_LIFT / H, 3), "ends": "square-to-stroke"},
            "category": {"ratio_to_wordmark": SUB_RATIO, "gap": round(SUB_GAP, 2), "rule_w": round(RULE_W, 2), "rule_h": round(RULE_H, 2)},
            "categories": CATEGORIES,
            "shorts": {"yellow": SHORTS_YELLOW, "sets": {k: {"slash": v[0], "text": v[1], "band": v[2], "band_mode": v[3], "background": v[4], "use": v[5]} for k, v in SHORTS.items()}},
            "freepass": {"note": "2026-11-18 확정 — 검정 글자 + 하늘 // #5B9FD4(어두운 바탕은 흰 글자), 한 색은 검정·흰색, 쇼츠는 형광 노랑 //", "files": [f"freepass-ci-{k}.svg" for k in FREEPASS]},
            "freepass_en": {"font": "Pretendard Bold 1.3.9 (OFL 1.1)", "word": "FREEPASS", "cap_height": EN_CAP, "letter_gap": EN_GAP, "kern": EN_KERN,
                            "colors": {"slash": FREEPASS_SKY, "text": INK}, "why": "한글 SUITE Heavy 와 획 굵기·잉크 밀도가 맞는 영문(실측 20종 비교, 2026-11-18)",
                            "sets": {k: {"slash": v[1], "text": v[2], "with_slash": v[0], "use": v[3]} for k, v in FREEPASS_EN.items()}}}
    build(GREEN_DARK, spec=spec)
    (OUT / "chakhan-ci-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote chakhan-ci-spec.json")
    (OUT / "chakhan-ci-construction.svg").write_text(construction(), encoding="utf-8")
    print("wrote chakhan-ci-construction.svg")
