# 착한거래 CI

**규정 전체는 [`guide.html`](guide.html)** (의미·색·비율 도면·여백·최소 크기·카테고리·심볼·단색·하지 않는 것·파일).

`//` + `착한거래` 워드마크. `//`는 **잠시 멈춤(일시정지)** + **형광펜으로 줄 쳐 가며 잘 읽기** — 「거래 전에 잠깐 멈춰 꼼꼼히 확인하자」(2026-11-17 대표). 글자는 **SUITE Heavy**(SUIT 아님)를 윤곽선 경로로 바꿔 글꼴 없이도 똑같이 보인다. 원본은 모두 SVG.

## 색 규칙 (2026-11-17 대표)

- **착한거래 글씨와 `//` 그림자는 늘 같은 색이며, 바탕에 맞춰 다양하게 바꿀 수 있다**(기본은 바탕의 반대색, 어두운 바탕 강조형은 노랑).
- **형광펜(`//`) 색은 노랑 `#F6FD00` · 흰색 · 검정 세 가지뿐이다.** 기본 노랑, 바탕이나 글씨가 노랑이면 흰색, 한 색만 되는 곳은 검정.

| 파일 | 바탕 | 글자 · 그림자 · 카테고리 | `//` |
|---|---|---|---|
| `chakhan-ci-on-light.svg` | 흰색·밝은 바탕 | 검정 `#0B0B0C` | 노랑 |
| `chakhan-ci-on-dark.svg` | 검정·어두운 바탕 | 흰색 `#FFFFFF` | 노랑 |
| `chakhan-ci-on-yellow.svg` | 노랑 바탕 | 검정 | 흰색 |
| `chakhan-ci-on-dark-accent.svg` | 강조형: 검정·어두운 바탕에서만, 노란 글씨 | 노랑(카테고리는 흰색) | 흰색 |
| `chakhan-ci-mono-black.svg` | 한 색만 되는 곳(도장·각인·팩스) | 검정(그림자 없음) | 검정 |

## 비율 (H = 「착한거래」 글자 높이)

- `//` 길이 0.88H(글자 세로 가운데) · 세로에서 31° · 획 굵기 0.25H(직각) · 두 획 사이 0.12H · 끝은 평행하게 자른 **단색 획**(갈라짐·결·손떨림 없음).
- `//` 그림자: 같은 획을 오른쪽 아래로 0.045H 옮겨 뒤에 깐다. `//` ↔ 글자 0.20H(그림자 끝에서).
- 여백 0.5H(사방). 최소 높이: 기본형 24px · 카테고리형 28px · 심볼 32px.
- 도면: `chakhan-ci-construction.svg`. 기준값: `chakhan-ci-spec.json`.

## 카테고리 `CI | 카테고리`

AI 장기렌터카, 상식 한 스푼, 미스터리극장 … 은 모두 착한거래의 **카테고리**다. `chakhan-ci-<ai-rentcar|sangsik>-on-<light|dark|yellow|dark-accent>.svg`.

- SUITE Heavy, 「착한거래」 글자의 **0.47배**, 기준선 맞춤. 워드마크 → 세로줄 → 카테고리 각 0.30H. 세로줄 0.035H × 0.70H(흰 바탕 검정 30%, 검정 바탕 흰색 40%).
- 새 카테고리는 `build_ci.py`의 `CATEGORIES`에 더해 다시 만든다. 영상·웹에서 직접 쓸 때는 `chakhan-ci-spec.json`을 따른다.

## 심볼

`chakhan-symbol-on-dark|light|yellow.svg` — 유튜브·카톡 프로필 같은 작은 정사각·원형 자리에는 `//`만 쓴다.

## 다시 만들기

```bash
python -I asset-library/chakhan-ci/build_ci.py
```

```bash
python -I asset-library/chakhan-ci/export_png.py
```

- `build_ci.py`: 모든 SVG·`chakhan-ci-spec.json`·비율 도면. `fontTools`·`brotli` 필요. 글꼴은 `public-release/site/fonts/SUITE-Heavy.woff2`(SUITE 2.040, OFL — `LICENSE-SUITE.txt`). 난수 없는 고정 수식이라 매번 같은 결과.
- `export_png.py`: PNG(로고 1200·2400px 폭, 심볼 512·1024px, 바탕 투명)를 `D:/dev-artifacts/ai-staff/chakhan-ci-png/`에 만든다(Edge/Chrome 필요). PNG는 git에 넣지 않는다.
- 확인: `guide.html`, `preview.html`.
