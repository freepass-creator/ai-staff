# 착한거래 CI 모션

로고 도형은 `build_ci.py` 결과(// 0.75H 가운데, SUITE Heavy 윤곽선)를 그대로 가져온다. 다시 그리지 않는다. 2026-11-18 대표: 「다 좋네 — 다양하게 미리 만들어 두자」, 「말할 때 // 가 따옴표가 되게」.

## 장면 6가지

| id | 이름 | 움직임 | 어울리는 곳 |
|---|---|---|---|
| `updown` | ① 위아래로 슥 | 첫 획은 위에서, 둘째 획은 아래에서 들어와 멈추고, 글자가 한 자씩 올라온다 | 영상 시작 |
| `stroke` | ② 형광펜 긋기 | 두 획이 아래→위로 칠해지고, 글자가 왼쪽부터 쓸린다 | 설명형 영상 시작 |
| `stamp` | ③ 멈춤 쿵 | // 가 크게 내려와 쿵 멈추고, 글자가 // 뒤에서 빠져나온다 | 엔딩 |
| `pop` | ④ 한 자씩 톡 | 획·글자가 통통 튀며 올라선다 | 가벼운 공지·이벤트 |
| `band` | ⑤ 형광 띠 쓸기 | 띠가 칠해지며 글자가 드러나고 // 가 들어온다 | 표지·썸네일 |
| `quote` | ⑥ 말 따옴표 | 말을 시작할 때 // 가 여는 따옴표처럼 들어오고 말이 한 줄씩 올라온다. 문구·말한 사람을 바꿔 쓴다 | 인용·한마디·자막 강조 |

## 색 · 비율

- 색 세트: `shorts`(검정 바탕 · 노랑 // · 흰 글자), `light`(흰 바탕 초록), `dark`(검정 바탕 초록), `green`(초록 바탕 흰색), `mono_light`, `mono_dark`.
- 비율: `v` 세로 9:16 1080×1920 · `h` 가로 16:9 1920×1080 · `s` 정사각 1080×1080.
- 미리 만든 세트: 착한거래 = 4색 × 3비율 × 6장면(72개), 프리패스 = `shorts`·`mono_light`·`mono_dark` × 3비율 × 5장면(45개, 따옴표 제외 — // 는 같으므로 착한거래 것을 쓴다).

## 만들기

```bash
python -I asset-library/chakhan-ci/motion/build_motion.py
```

```bash
node asset-library/chakhan-ci/motion/render_motion.mjs
```

- `build_motion.py` → `motion.html`(로고 도형·글꼴을 넣은 한 파일. 브라우저로 열면 장면 버튼·낱말·색·비율·따옴표 문구를 골라 재생). 글꼴을 품어 커서 git에 넣지 않는다.
- `render_motion.mjs` → `D:/large/ai-staff/chakhan-ci-motion/<낱말>-<비율>/<낱말>-motion-<비율>-<색>-<장면>.mp4`(30fps, 끝에 0.8초 정지)와 나란히 비교 `compare-*.mp4`. 좁히기: `--word chakhan --format v --theme shorts --scene updown,quote`.
- 따옴표 문구 바꾸기: `--scene quote --quote "계약 전에\n조건부터 같이 봐요" --who "착한거래 AI"`. 웹·스튜디오에서는 `motion.quote(문구, 말한 사람)`.
- Edge/Chrome·ffmpeg 필요, 외부 패키지 없음. 영상은 git에 넣지 않는다. CI 규격이 바뀌면 `build_ci.py` → `build_motion.py` → `render_motion.mjs` 순서로 다시 만든다.
