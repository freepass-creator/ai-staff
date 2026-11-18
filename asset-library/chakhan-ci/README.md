# 착한거래 CI

**규정 전체는 [`guide.html`](guide.html)** (의미·색과 수치 근거·비율 도면·여백·최소 크기·카테고리·심볼·확인 표시 효과·하지 않는 것·파일).

`//`(잠시 멈춤) + `착한거래` 워드마크. 「거래 전에 잠깐 멈추고 꼼꼼히 확인하자」 — 착한거래는 그 확인을 대신 해 주는 AI다. 글자는 **SUITE Heavy**(SUIT 아님)를 윤곽선 경로로 바꿔 글꼴 없이도 똑같이 보인다. 원본은 모두 SVG.

## 색: 착한 초록 한 색 (2026-11-17 대표 확정)

로고는 `//`와 글씨가 **같은 한 색**이다. 바탕에 따라 같은 초록의 밝기만 바꾼다.

| 파일 | 바탕 | 로고 |
|---|---|---|
| `chakhan-ci-on-light.svg` | 흰·밝은 바탕(기본) | 착한 초록 `#009867` |
| `chakhan-ci-on-dark.svg` | 검정·어두운 바탕(쇼츠·다크 모드) | 검정 바탕용 초록 `#38CA91` |
| `chakhan-ci-on-green.svg` | 착한 초록 바탕(반전) | 흰색 |
| `chakhan-ci-mono-black.svg` | 한 색만 되는 곳(도장·각인·팩스) | 검정 |

근거(APCA, WCAG 3 초안): 흰 바탕 `#009867` Lc 63.9(WCAG 3.69), 검정 바탕 `#38CA91` Lc 61.6(WCAG 9.39) — 두 바탕 모두 본문 수준(Lc 60) 이상. 한 색으로는 두 바탕을 동시에 만족할 수 없어 짝꿍으로 정했다.

## 비율 (H = 「착한거래」 글자 높이)

- `//` 한 획 세로 **0.75H**, 글자 세로 **가운데**(위아래 틈 0.125H씩, 바닥에 붙이지 않음) · 세로에서 31° · 획 굵기 0.25H(직각) · 두 획 사이 0.12H · **형광펜 막대**: 같은 크기 두 막대, 양 끝을 획 방향에 직각으로 자른다(2026-11-18 대표 확정). 단색, 그림자 없음. `//` ↔ 글자 0.20H.
- 여백 0.5H(사방). 최소 높이: 기본형 24px · 카테고리형 28px · 심볼 32px.
- 도면 `chakhan-ci-construction.svg`, 기준값 `chakhan-ci-spec.json`.

## 카테고리 `CI | 카테고리`

`chakhan-ci-<ai-rentcar|sangsik>-on-<light|dark|green>.svg`. AI 장기렌터카(서비스), 상식 한 스푼(마케팅 콘텐츠) 모두 착한거래 아래. SUITE Heavy 0.47배, 기준선 맞춤, 로고와 같은 한 색. 새 카테고리는 `build_ci.py`의 `CATEGORIES`에 더한다.

## 심볼 · 확인 표시 효과

- `chakhan-symbol-on-green|dark|light.svg` — 앱 아이콘·프로필. 기본은 초록 바탕에 흰 `//`.
- 형광펜(확인 표시)은 로고가 아니라 움직임·화면 효과: 흰 바탕 `#B5F1D2`, 검정 바탕 `#075539`를 글자 아래 45%에 칠한다.

## 쇼츠용 형광펜판 (2026-11-18 대표 지시)

`chakhan-ci-shorts-<이름>.svg` — 쇼츠 화면(검정 `#0B0B0C`)용 별도 세트. 형광 노랑 `#F6FD00`, // 모양·비율은 기본형과 같다. 쇼츠판만 // 와 글씨 색을 나눌 수 있다. 기본 CI(초록)는 블로그·문서·인쇄용.

| 이름 | 모습 | 쓰임 |
|---|---|---|
| `yellow-slash-on-dark` | 노랑 // · 흰 글자 | 기본 — 화면 구석·첫 장면 |
| `yellow-on-dark` | 전부 노랑 | 엔딩·마지막 로고 |
| `on-yellow` | 전부 검정(노랑 바탕에 놓음) | 노랑 바탕 장면·엔딩 |
| `band-on-dark` | 사선 노랑 띠 위 검정 글자 | 표지·썸네일 |
| `highlight-on-light` | 검정 글자 아래쪽에 형광펜 칠 | 밝은 장면 |
| `yellow-slash-on-light` | 흰 바탕 · 노랑 // | 노랑이 흐려 큰 크기에서만 |

쇼츠 아래 15%(화면 UI 자리)에는 로고를 두지 않는다.

## 프리패스 워드마크 (2026-11-18 대표 지시)

`freepass-ci-<on-light|on-dark|shorts-on-dark|word-on-light|word-on-dark>.svg` — 같은 SUITE Heavy·같은 // 규격(글자 높이 H). 대표색 미정이라 검정·흰색, 쇼츠는 노랑 //. `word-*`는 // 없이 글자만.

## 다시 만들기

```bash
python -I asset-library/chakhan-ci/build_ci.py
```

```bash
python -I asset-library/chakhan-ci/export_png.py
```

- `build_ci.py`: 모든 SVG·기준값·도면. `fontTools`·`brotli` 필요. 글꼴 `public-release/site/fonts/SUITE-Heavy.woff2`(SUITE 2.040, OFL — `LICENSE-SUITE.txt`). 고정 수식이라 매번 같은 결과. `CHAKHAN_SLASH_SPAN`·`_ANGLE`·`_STROKE`·`_GAP`·`_ALIGN`·`CHAKHAN_CI_OUT`으로 시험용 출력 가능.
- `export_png.py`: PNG를 `D:/dev-artifacts/ai-staff/chakhan-ci-png/`에(Edge/Chrome 필요). PNG는 git에 넣지 않는다.
- 확인: `guide.html`, `preview.html`.
