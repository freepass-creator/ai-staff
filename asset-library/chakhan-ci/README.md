# 착한거래 CI

`//` 형광펜 두 획 + `착한거래` 워드마크. 글자는 **SUITE Heavy**(SUIT 아님)를 윤곽선 경로로 바꿔 글꼴 없이도 똑같이 보인다.

| 파일 | 바탕 | 글자 | `//` |
|---|---|---|---|
| `chakhan-ci-on-light.svg` | 흰색·밝은 바탕 | 검정 `#0B0B0C` | 노랑 `#F6FD00` |
| `chakhan-ci-on-dark.svg` | 검정·어두운 바탕 | 노랑 `#F6FD00` | 흰색 `#FFFFFF` |
| `chakhan-ci-mono-black.svg` | 노랑 바탕·단색 인쇄 | 검정 | 검정 |

- 브랜드 노랑은 `#F6FD00` 하나다(블로그 형광펜 마커와 같은 값). 다른 노랑으로 바꿔 칠하지 않는다.
- `//`는 납작한 형광펜 촉으로 아래→위로 그은 두 획이다. 세로 길이는 글자 높이의 88%로 글자 가운데에 맞추고, 세로에서 31° 기울여 사선이 분명하게 보이게 한다(2026-11-17 대표). 양 끝은 촉 각도대로 비스듬히 잘리고, 위 끝은 잉크가 마르며 가는 틈 두 줄로 갈라진다. 손그림 흔들림이나 붓 자국처럼 거칠게 만들지 않는다.
- 비율을 바꾸거나 `//`와 글자 사이를 띄우거나 붙이지 않는다. 최소 높이 24px.
- 확인: `preview.html`(바탕별·크기별).

## 다시 만들기

```bash
python -I asset-library/chakhan-ci/build_ci.py
```

`fontTools`와 `brotli`가 필요하다. 글꼴은 저장소에 등록된 `public-release/site/fonts/SUITE-Heavy.woff2`(SUITE 2.040, OFL — `LICENSE-SUITE.txt`)를 쓴다. 획 모양은 난수 없이 고정 수식이라 매번 같은 SVG가 나온다.
