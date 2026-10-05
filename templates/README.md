# 템플릿 — webtoon-studio 배우 캐스팅 형식 (출처 `freepass-creator/webtoon-studio` rev 75a2be1)

- `casting-v2/` — 6장 캐스팅 파일 v2 템플릿(PNG·SVG·JSON 스키마·검증기). **2400×3200, 1cm = 10px, 200cm 선 y=410, 바닥선 y=2410**(옛 v1 의 y=2300 과 섞지 않는다). 키 눈금 전신·턴어라운드는 이 템플릿 위에 만든다.
- `reference-set/` — 한서윤(OFFICE-01) 견본 7장. 직원마다 같은 구성으로 만든다.
- `WEBTOON-CASTING-STANDARD.md` — 원본 공통 규격(참고). **수영복 바디 프로필은 회사 직원 캐릭터에 쓰지 않는다** — 그 자리는 흰 반팔 티·흰 반바지·흰 운동화 전신으로 대신한다(견본 `representative-profile.jpg` 차림).

## 직원별 8장 세트 (`D:\large\ai-staff\<이름>\세트\`)

| # | 파일 | 견본 | 내용 |
|---|---|---|---|
| 1 | `01-대표프로필.png` | representative-profile | 전신 3방향 + 얼굴 4칸 + 복장 4벌 + 설정표 + 손글씨 한 줄 |
| 2 | `02-키눈금-프로필.png` | casting-profile · casting-v2 02 | 0~200cm 눈금 위 정면·옆·뒤 전신(정수리 = 설정 키) + 얼굴 3방향 + 설정표 |
| 3 | `03-턴어라운드.png` | body-turnaround | 정면·옆·뒤 전신(흰 티 차림), 같은 배율 |
| 4 | `04-얼굴기준.png` | face-reference | 무표정 정면·45도·정확한 옆면 |
| 5 | `05-표정.png` | expression-test | 표정 6칸 |
| 6 | `06-복장.png` | costume-test | 복장 4벌 전신 |
| 7 | `07-동작.png` | pose-test | 동작 6컷(업무 장면) |
| 8 | `08-합.png` | casting-v2 06 | 두 직원이 함께 선 키 비교·같이 일하는 장면 |

수치(키·몸무게)와 이름·직함은 `characters/<이름>/character.json` 이 정본이다. 이미지 안 설정표 글자는 json 값과 같아야 한다.
