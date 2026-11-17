# 착한거래 쇼츠 모션 스튜디오 v2

9:16 쇼츠 모션그래픽(1080×1920) 제작기. 대표 v1(로컬 모션스튜디오)을 이어받아 CI·글꼴·AI 스태프를 내장했다.

**자동 제작(기본)**: AI가 에피소드 JSON을 쓰고 `render.mjs`로 MP4를 뽑는다 → [`EPISODE.md`](EPISODE.md).
아래 화면은 미리보기·수동 확인용이다. 빌드하면 `D:/large/ai-staff/chakhan-shorts/chakhan-shorts-studio.html`(고정 위치)에도 복사되므로 그 파일을 더블클릭해 연다.

`staff/*.webp`, 빌드한 `chakhan-shorts-studio.html`, 영상은 git 에 넣지 않는다(저장소 이미지 규칙). 새로 받은 저장소에서는 아래 「다시 만들기」 두 줄을 먼저 실행한다.

## 화면으로 확인하기

1. `chakhan-shorts-studio.html`을 최신 Chrome/Edge에서 더블클릭해 연다. 인터넷이 없어도 된다.
2. 에피소드 문구(제목·카드·KEY POINT·엔딩)와 영상 길이를 고친다. 미리보기가 바로 바뀐다.
3. AI 스태프: KEY POINT 장면·엔딩 장면에 세울 착한 클로이 컷을 고르거나 `없음`으로 끈다.
4. 음성(선택): WAV/MP3를 넣으면 영상에 함께 녹음된다. 음성 길이에 맞춰 영상 길이를 조정한다.
5. `● 영상 녹화·저장` — 실제 재생 속도로 녹화한다(12초 영상이면 12초). Edge/Chrome은 MP4(H.264)로 바로 저장되며, WebM이 나오면 `convert_to_mp4.bat`에 끌어다 놓는다(FFmpeg 필요).
6. `에피소드 JSON 저장`으로 문구·길이·스태프 선택을 저장해 다음 편에 다시 연다.

장면 순서: CI(// 형광펜이 그어지며 등장) → 제목 → 노란 강조 글자 → 카드 1·2(아이콘이 그려짐) → KEY POINT(막대가 형광펜처럼 칠해짐, 스태프 등장) → 엔딩(형광펜 띠 + 마무리 문구 + CI + 스태프). 아래 15%는 쇼츠 UI가 덮는 자리라 비워 둔다(`쇼츠 UI 안전영역 표시`로 확인).

## 들어 있는 것과 출처

| 항목 | 출처 | 규칙 |
|---|---|---|
| CI | `asset-library/chakhan-ci/chakhan-ci-on-dark.svg` | 정본 그대로. 글자·// 모두 `#F6FD00` |
| 제목 글꼴 | `public-release/site/fonts/SUITE-Heavy.woff2` | SUITE(SUIT 아님), OFL |
| 본문 글꼴 | `blog/fonts/Pretendard-Medium/Bold.woff2` | OFL |
| AI 스태프 | AI Staff 현재 API `chakhan-white-v1` pose 7컷 → `staff/` | API SHA 대조, 투명 여백 자르기·축소만. 재생성·다른 브랜드 대체 없음 |

`file://`로 연 페이지는 옆 파일의 글꼴을 못 읽기 때문에 빌드 때 모두 HTML 안에 넣는다(약 3.4MB).

## 다시 만들기

```bash
python -I studio/chakhan-shorts/tools/fetch_staff.py
```

```bash
node studio/chakhan-shorts/build.mjs
```

- `fetch_staff.py`: 현재 API의 착한거래 컷을 받아 SHA를 대조하고 `staff/`와 `staff.json`(출처 SHA·API revision)을 만든다. 컷이 바뀌었을 때만 다시 돌린다. Pillow 필요.
- `build.mjs`: `src/studio.template.html`에 CI·글꼴·스태프를 넣어 `chakhan-shorts-studio.html`을 만든다. 문구·모션을 고칠 때는 템플릿을 고치고 다시 빌드한다.
- 검수: `node studio/chakhan-shorts/tools/frames.mjs <폴더> 2.4,5.6,9.0` — 지정 시각의 화면을 PNG로 저장한다(헤드리스 Edge/Chrome).
