# 착한거래 쇼츠 — AI 제작 규격

사람이 화면에서 만들지 않는다. **AI가 에피소드 JSON을 쓰고, 이미지는 받은 파일(또는 등록 컷 id)을 연결해, 명령 한 줄로 MP4를 뽑는다.**

## 0. 로컬 작업 폴더 (기본 작업 방식)

모든 작업은 이 PC의 `D:/large/ai-staff/chakhan-shorts/` 에서 하고, 완성 영상만 올린다(클라우드 연동 없음).

| 위치 | 용도 |
|---|---|
| `episodes\*.json` | 대본(에피소드). 메모장으로 고치거나 스튜디오에서 저장 |
| `images\` | 받은 이미지(투명 배경 PNG). json 에 `"../images/파일.png"` |
| `output\` | 완성 MP4 + `.render.json` |
| `영상만들기.bat` | 더블클릭 = episodes 전부 렌더, json 을 끌어다 놓기 = 그 편만 |
| `chakhan-shorts-studio.html` | 미리보기·문구 수정. 「받은 이미지 추가」로 images 의 PNG를 불러오면 JSON 에 같은 경로로 저장 |
| `사용법.txt` | 위 순서 요약 |

폴더와 bat 는 아래 `build.mjs` 가 만들고 갱신한다(이미 있는 에피소드는 덮어쓰지 않는다).

## 1. 처음 한 번 (또는 스태프 컷·템플릿이 바뀌었을 때)

```bash
python -I studio/chakhan-shorts/tools/fetch_staff.py
```

```bash
node studio/chakhan-shorts/build.mjs
```

필요: Node 20+, Python + Pillow·fontTools·brotli, FFmpeg(ffprobe 포함), Edge 또는 Chrome.

## 2. 에피소드 만들기

`studio/chakhan-shorts/episodes/epNNN-<주제>.json` 을 쓴다. 예시: `episodes/ep001-deposit-vs-prepay.json`.

| 칸 | 화면 위치 | 한도(넘치면 렌더가 멈춤) |
|---|---|---|
| `title` | 큰 제목(흰색) | 한 줄, 약 11자 |
| `subtitle` | 노란 강조(글자별로 튀어나옴) | 한 줄, 약 10자 |
| `kicker` | 제목 아래 회색 한 줄 | 한 줄 |
| `leftTitle` / `rightTitle` | 카드 제목, KEY POINT 막대 이름 | 약 4자 |
| `leftDesc` / `rightDesc` | 카드 설명 | 3줄(약 30자) |
| `point` | KEY POINT 문장 | 2줄(스태프 있으면 약 24자, 없으면 약 36자) |
| `leftBar` / `rightBar` | 막대 아래 설명 | 약 9자 |
| `closing` | 엔딩 노란 띠 문구 | 한 줄, 약 10자 |
| `closingSub` | 엔딩 보조 문구 | 스태프 있으면 2줄, 없으면 한 줄 |
| `staffKP` / `staffEnd` | KEY POINT·엔딩의 AI 스태프 | 아래 3 참고, `"none"` 이면 끔 |
| `duration` | 영상 길이(초) | 8–60, `"auto"` 는 음성 길이 + 1초 |
| `voice` | 음성 WAV/MP3 경로(선택) | 에피소드 파일 기준 상대 경로 |

글자 수는 어림이다. 정확한 판정은 렌더할 때 실제 글꼴 폭으로 한다. 막대 길이는 개념 설명용이라 화면에 「실측 수치가 아닙니다」 안내가 자동으로 붙는다. 실제 금액·수치를 지어내 넣지 않는다.

## 3. 이미지 연결

- **등록 컷 id**: `cover-think`(고민하며 비교) · `cover-aha`(깨달음) · `cover-dejected`(시무룩함) · `cover-confident`(차분한 자신감) · `phone`(전화 상담) · `tablet`(태블릿으로 설명) · `guide-right`(오른쪽 대상 안내). 문장의 감정에 맞춰 고르고 같은 컷만 반복하지 않는다.
- **받은 이미지 파일**: `"staffKP": "images/새컷.png"` 처럼 경로를 쓰면 그대로 들어간다. 쓴 파일의 SHA가 렌더 기록에 남는다.

받는 이미지 규격(이미지를 만드는 쪽에 그대로 전달):
- **투명 배경 PNG**(누끼). 배경이 있으면 렌더가 멈춘다(사각형이 그대로 보이기 때문).
- 허리 위 또는 상반신, 높이 800px 이상, 위아래 여백은 거의 없게.
- 착한거래 착한 클로이(흰 외장·노란 발광·착한거래 명찰) — 프리패스 보라형으로 대체하지 않는다. 손가락은 엄지 외 네 개.
- 아랫단은 화면에서 배경색으로 흐려지므로 허리선에서 잘려도 된다.

## 4. 렌더

```bash
node studio/chakhan-shorts/render.mjs studio/chakhan-shorts/episodes/ep001-deposit-vs-prepay.json
```

- 결과: `D:/large/ai-staff/chakhan-shorts/output/<에피소드>.mp4` (1080×1920, H.264, 30fps) + `.render.json`(입력·이미지·음성·스튜디오 SHA). 위치는 두 번째 인자나 `CHAKHAN_SHORTS_OUT` 로 바꾼다. 영상은 git 에 넣지 않는다.
- 글자 넘침·불투명 이미지·없는 컷 id 가 있으면 `문제:` 를 출력하고 멈춘다. 문구를 줄이거나 이미지를 바꿔 다시 돌린다(`--force` 는 쓰지 않는다).
- 12초 영상 렌더는 이 PC에서 약 10–15초.

## 5. 검수

```bash
node studio/chakhan-shorts/tools/frames.mjs D:/large/ai-staff/chakhan-shorts/check 2.4,5.6,9.0,11.5 studio/chakhan-shorts/episodes/ep001-deposit-vs-prepay.json
```

지정 시각의 화면을 PNG로 저장한다. 게시 전 사람(대표)이 영상을 한 번 보고 올린다. 이 도구는 업로드·예약 게시를 하지 않는다.

장면 시간(12초 기준, 길이에 비례해 늘어남): CI 0–1초 → 제목 0.7–2초 → 카드 2.1–4초 → KEY POINT 4.6–8.6초 → 엔딩 8.6초–끝.
