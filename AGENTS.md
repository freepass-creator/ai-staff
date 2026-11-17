- **손 정본·사람형 통합(2026-11-16 대표 직접 요청)**: 같은 current API에서 `kind=hand_master` 3종, `kind=human_pose` 12종을 고른다. 손 정본은 `robots/hand-masters.json` revision `robot-hand-v1.0`. 평면판·별도 타원 붙임 패드·긴손가락3개/엄지포함6개 시안 금지. 팔짱은 각손끝5개를 구분해서 검수한다. 새 손 포즈는 연속 탄성 손바닥 표면·엄지기저/바깥볼륨/오목중앙을 참조.

# ai-staff — 작업 규칙 (Codex·Claude 공통)

## 블로그 메인 표지·손바닥 설계 (대표 정정, 2026-11-16)

가리키기·물건 제시만 늘리지 않는다. `asset-library/chakhan-use-cuts/production-plan.json`에 따라 고민·깨달음·시무룩함·자신감 등 감정과 자세를 스스로 섞어 제작한다. 표정은 LCD 그래픽으로 바꾸되 눈 크기·얼굴·흰색 외장·노란 발광·착한거래 명찰을 유지한다. 손바닥은 `robots/hand-grip-policy.json`의 진한 회색 탄성 그립, 도톰한 엄지 밑·바깥 패드, 기능적인 굽힘 홈과 미세 결을 적용한다. 손 하나에 엄지 외 네 손가락을 실제 PNG 확대 검수한다. 정본 PNG나 단일 승인 프로필을 자동 대체하지 않는다.

## 착한거래 활용 컷 진입점 (2026-11-15)

착한거래 블로그·홍보 컷은 `asset-library/chakhan-use-cuts/library.json` → 공개 또는 상대경로 카탈로그를 먼저 읽는다. 표지 감정 4컷과 상담·안내 3컷, 표지 예시 4개 및 사용 설명·SHA·ZIP이 등록돼 있다. 보기 `/chakhan/`, AI용 `/chakhan-use-cuts.json`. 프리패스 보라형과 사용 브랜드 착한거래를 혼동하지 않는다. PNG를 재생성하지 않고 그대로 사용하며 프로필 허용 목록이나 정면 정본으로 승격하지 않는다.

## 착한거래 CI·쇼츠 제작 (대표 직접 지시, 2026-11-17)

- CI 정본: `asset-library/chakhan-ci/` — `//` 형광펜 두 획 + `착한거래`(**SUITE** Heavy, SUIT 아님). 밝은 바탕은 글자 검정·`//` 노랑, 어두운 바탕은 글자·`//` 모두 `#F6FD00`. 다시 그리지 말고 `build_ci.py` 결과를 그대로 쓴다.
- 쇼츠는 사람이 화면에서 만들지 않는다. `studio/chakhan-shorts/EPISODE.md`를 읽고 에피소드 JSON을 쓴 뒤 `render.mjs`로 MP4를 뽑는다. 이미지는 등록 컷 id 또는 받은 투명 PNG 경로로 연결한다. 글자 넘침·불투명 이미지는 렌더가 멈추며 `--force`로 넘기지 않는다. 영상은 `D:/large/ai-staff/chakhan-shorts`에 두고 git에 넣지 않는다. 업로드·예약 게시는 하지 않는다.

## 카카오톡 프로필: 한 장만 허용 (대표 최종 정정, 2026-11-15)

`asset-library/kakao-profiles/library.json`만 조회한다. 선택된 남색 배경 02 상반신 PNG 한 장(SHA `49b6f9ae899afc64271aac75e0705b192316053d32ff85c6c316f20d02774352`)만 재사용한다. 나머지 프로필 사진은 전부 폐기·사용 금지다. 01·03·04 또는 다른 02 사진을 생성 캐시/과거 첨부/아카이브/디자인 원본에서 끌어와 대신 쓰지 않는다. 정면 캐릭터 정본과 블로그 자산은 별도이며 이 규칙으로 변경하지 않는다.

## 최신 클로이 진입점 (대표 정정, 2026-11-15)

- **공개 배포와 R1**: public-release/README.md와 robots/revisions/current.json을 읽는다. CLO-02 정본은 보존. 기존 캐릭터는 COD-01·COD-03·CLO-04이며 기존 프로필을 직접 참조해 같은 정면 자세로 맞춘다. COD-01 파랑 원형눈/양옆핀, COD-03 청록 네모눈/중앙능선은 보존. 잘못 만든 CLO-01/CLO-03 새 캐릭터 시안은 철회한다.02/04는가까운컨셉,04어깨는좁고절제한다.플레이트외형과분할/겹침은각기다르게.배경은따로생성하고고정캐릭터를합성한다.

- **다른 PC·AI 공유**: `sharing/README.md` → `/share/`·`/share/share.json`. PC별 고정 파일 `D:/dev-artifacts/ai-staff/shared/current.json`에서 커밋/패키지/설치 경로를 읽는다. 코드만 clone해서 자산이 준비됐다고 하지 않는다. 후속 대표 직접 지시로 공개 push/릴리스·웹 배포가 승인됐다. 공개는 public-release의 선별 카탈로그·현재 PNG/키트만 사용하고 내부복원 source.bundle/PC인수 원문/과거 자산은 올리지 않는다. 과거 파일은 이력으로 보존하되 반려 01·구 /motion/·레거시 자산은 현재 선택/서빙/공유에서 제외한다.

- **블로그 포스터 템플릿**: `asset-library/blog-templates/library.json` → `/templates/` → `STYLE-GUIDE.html`·`README.md`·`content.schema.json`. 전단지/포스터형 6레이아웃·6배경·11시안. P2 CI·SUITE Heavy 제목·Noto Sans KR 본문 고정, 배경/복장/상반신·사선 포즈는 순환한다. 가장 중요한 기준은 반복 출력 시 같은 캐릭터 유지: 등록된 PNG·폰트·CI와 B안 참조 SHA를 검증하고 출력에서 얼굴/몸을 재생성하지 않는다. 새 포즈/복장은 대조 후 고정 등록하며 SVG는 필수 형식이 아니다. 비서형 최신은 무릎 위 차콜 펜슬스커트·검정 펌프스·동그란 안경이다.

- **사람형 클로이**: `characters/클로이/character.json` → `assets.json` → 선택 시트 가운데 **B안(목표 7등신)**을 읽는다. PC1 인계 수령본이며 A/C·거절된 v1 얼굴·키다리 비교 v3는 선택하지 않는다. 소속 프리패스/활용 착한거래. 생성 눈금은 실측이 아니며 사람형 정적 SVG 9종은 `characters/클로이/svg-library.json`에서 조회한다. 고정 시점 픽셀 경로이며 의미별 벡터·리그는 미구현이다. 실제 PC0 경로는 해당 README의 매핑을 따른다. 로봇 정본·클로운·클로담은 별도 유지한다.
- **사람형 이미지 활용**: `asset-library/chloe-human/library.json` → `/human/` → `AI-WRITER-USAGE.md`를 읽는다. 기존 세 컷 포함 9컷 사용 가능. 행동·사용 문단·배치·각도·촬영 범위로 고르고 규칙 검색 `/api/characters/human/select?q=문단설명`의 약한 일치/일치 없음/실제 증빙 필요를 구분한다. PC1은 `D:/dev/ai-staff/asset-library/chloe-human/library.json`의 그 PC에 맞춘 패키지 경로로 읽는다. 블로그·웹에는 투명 PNG를 쓰고 큰 정적 경로 SVG는 보관·합성용으로 구분한다.

- **SVG 납품·제스처**: `robots/svg-release.json`을 진입점으로 삼고 `robots/SVG-RELEASE.md`를 읽는다. 승인 정면 두 종과 PNG 없는 관절 경로 SVG, 질감을 내장한 가벼운 웹 모션 SVG를 구분한다. `/gestures/`에서 6개 프리셋을 선택해 저장한다. 작은 정면 2D 동작 범위이며 3D 리그나 완전한 손 쥐기를 뜻하지 않는다.

- **온라인 캐릭터 단일 진입점(2026-11-16 대표 직접 정정)**: `https://ai-staff-two.vercel.app/api/characters/current` → 현재 ID/revision/url만 사용. `/api/characters/resolve?id=cover-confident` 후 반환된 PNG URL을 사용한다. 구 로봇37컷·옛 포스터/전체ZIP·각도연구는 공개 철회. `asset-library/chloe-blog/library.json`은 retired이며 이력/폴더/생성캐시 검색 fallback 금지. 현재 착한거래7컷은 `asset-library/chakhan-use-cuts/library.json`. 손가락은 엄지 외4개, 길이/두께/손목 연결을 실제 PNG로 검수.

- **구도 다양성(대표 정정)**: 전신 정면만 반복하지 않는다. `camera_angle`과 `framing`으로 측면·후면·뒤쪽 사선·어깨 너머, 상반신·앉기·걷기·악수 등을 고른다. 정본 정면 사진은 디자인 참조이며 카메라 고정 지시가 아니다. 새 구도 8종은 `series:natural-angles`로 조회한다. 뒤쪽의 추정 구조를 정본·3D 설계도로 승격하지 않는다.

- **글 상황에 맞는 이미지 선택(대표 추가 정정)**: 특정 각도만 늘리지 말고 행동·대상·시선·표정·촬영 범위를 섞는다. `usage-index.json` 또는 `AI-WRITER-USAGE.md`의 실제 장면·사용 문단·환경·배치 설명을 읽고 기존 PNG를 먼저 재사용한다. 차량·고객·자료·설명란을 가리키는 대상을 구분한다. 현재 온라인 API의 usage·tags로 후보를 고른다. 구 `/api/characters/library/select`는 410이다. 약한 일치·맞는 그림 없음·실제 증빙 필요를 구분하고 그림을 억지 배정하지 않는다. 지속 제작 기준과 대기 장면은 `production-plan.json`에 기록한다. 자동 생성·예약·게시는 별도 설치하지 않는다.

- 모든 직원 캐릭터의 소속 브랜드는 **프리패스**이며 기본 이마 명찰도 프리패스다. 캐릭터 이름과 구분한다. 기본 보라 정본의 얼굴은 검은 유리 디스플레이 안에서 표정이 발광하는 방식이다.

- **착한 클로이**를 요청하면 먼저 `robots/current.json`의 `chakhan-white-v1`을 조회한다. 흰색 V1 정면 정본이며 손등 LED는 없다.
- **기본 클로이 / 보라색 클로이**는 `basic-purple-v1`을 조회한다. 매끈한 표면·은은한 발광 V1 정본이며 `production_usable:true`다. 착한거래형도 같은 최신 재질 정본으로 확정했다.
- `클로이` 또는 `CLO-02`만으로 변형을 임의 선택하지 않는다. 이름·번호·PC 역할은 별도다.
- 이전 `clo02-true.png`, source-needed 상태, 2d-master-kit-v1, 모션 키트 자산을 최신 정본으로 추적하거나 fallback하지 않는다. 파일은 이력으로 보존하되 검색·선택·서빙에서 제외한다. 최신 정본은 smooth-subtle-0.1 하나이며 robots/current.json만 조회한다.
- 확인: `node robots/current.mjs resolve 착한클로이 --production`. 보기: `http://127.0.0.1:54640/characters/`. API는 별칭과 승인 상태·해시를 함께 반환한다.


목적: AI 직원 캐릭터의 번호·이름·이미지 기준을 일관되게 관리한다.

## 로봇 최신 정본 (대표 확정, 2026-11-11)

- **CLO-02 = 클로이 = 보라색 로봇.**
- **CLO-04 = 클로아.** 이번 지시에서 색상·원본은 새로 지정되지 않았다.
- 기계가 읽는 이름·번호 정본은 `robots/registry.json`, 이미지 구별과 기존 자산 정리 절차는 `robots/README.md`다.
- 과거 문서의 `CLO-02=클로아` 및 `CLO-04=클로이`는 대체된 표기다. 새 안내문·이미지 주문서·명찰·파일 메타데이터에는 이 조합을 쓰지 않는다.
- 명칭 정정은 PC 번호·호스트·업무 담당·운영권을 변경하는 지시가 아니다.
- 파일명·OCR·발광 색 하나만으로 캐릭터를 합치지 않는다. 눈·얼굴 화면·입·볼 표시·안테나·귀 옆 핀 등 원본의 형태를 함께 대조한다.
- 이전 주황 원본과 착한거래 노랑 파생본 중 CLO-02 표기가 있는 자료는 원본 대응 확인 대상이다. 확인 없이 일괄 CLO-04로 개명하거나 새 이미지의 기준 원본으로 선택하지 않는다.
- 이미지의 모델 번호가 잘못됐으면 원본을 보존하고 확인된 번호로 별도 수정본을 만든다. 파일 이름만 바꾼 것을 이미지 수정 완료로 기록하지 않는다.

## 기존 사람형 캐릭터 정본

이 절과 다음 사람형 기준은 `characters/클로운`, `characters/클로담`에만 적용한다. 로봇에는 사람의 나이·키·몸무게·이력서·얼굴 인식 검사를 강제하지 않는다.

- 사람형 캐릭터 정본은 `characters/<이름>/character.json` 하나다. 이력서·자기소개서·프로필 문서와 이미지 생성은 이 파일을 읽어서 만든다. 문서를 손으로 고치지 말고 JSON을 고친 뒤 다시 만든다.
- 사람형 기준 얼굴은 `characters/<이름>/refs/front.png`(·`three_quarter.png`)다.

## 기존 사람형 기준 (대표 결정, 2026-10-03)

- 한국 사람. 혼혈·서양 얼굴 아님.
- 수수하고 평범한 실제 직장인. 화보·모델·아이돌 느낌이 나오면 버리고 다시 만든다. 「일만 잘하면 된다」.
- 체형: 너무 마르지 않게(대표 10-03 밤 「조금 후덕한 이미지 — 복이 들어오게」). 정확한 얼굴·체형은 대표 이미지 기준.
- 결과물 형식은 `freepass-creator/webtoon-studio` 배우 오디션 형식(대표 프로필·키 눈금 전신·표정·복장·자세)을 따른다. 단 수영복 바디 프로필은 쓰지 않는다.
- 실존 인물·실존 기관을 닮게 하거나 사칭하지 않는다(이력서의 학교·회사는 「(가상)」 표기).
- 이 두 사람형 캐릭터 이름은 AI 상황실장 = 클로운, 카톡 AI 매니저 = 클로담(대표 10-04 최종 — 로운 실장·로담 매니저). 얼굴은 대표가 GPT로 만들어 주는 이미지가 정본(기존 문서상 대기 중), 오디션2 후보는 예비다. 이 사람형 인물의 과거 이름 취소 규칙을 로봇 클로이·클로아에 적용하지 않는다.

## 이미지 보관

- 이미지는 git 에 넣지 않는다(기준 얼굴 `refs/` 와 작은 썸네일만 예외). 원본은 `D:\large\ai-staff\<이름>\<세트>\`, 대표 보기용 사본은 구글 드라이브 「AI 직원 캐릭터」(ID 는 비공개 ai-ops 문서, pyh@teamjpk.com, `gws` CLI).
- 모델은 `D:\large\image-workshop\models`(RealVisXL V5, IP-Adapter plus-face SDXL, ControlNet openpose/depth SDXL, sdxl-fp16-fix VAE). GPU RTX 3060 12GB.

## 커밋

- main 직접 커밋 금지 — 가지 → PR → 검토 → 그날 머지.


## 2026-11-15 네 캐릭터 구분 정정

| 번호 | 공식 ID | 캐릭터 표현 |
|---|---|---|
| 1 | COD-01 | 남성 |
| 2 | CLO-02 · 클로이 | 여성 |
| 3 | COD-03 | 남성 |
| 4 | CLO-04 · 클로아 | 여성 |

CLO-01·CLO-03 캐릭터는 없다. 기존 네 캐릭터의 눈매·머리 장식·개성을 유지해 활용한다. 원본을 단순 색상 교체하거나 남성 1·3을 여성 클로이 얼굴로 통일하지 않는다. 번호와 PC 운영 역할은 별개다.

## 새 생성 입력 규격 (2026-11-16 대표 직접 요청)

기존 자산은 소급 재생성하지 않는다. 새 CLO-02/사람형 포즈는 먼저 `node public-release/site/prepare-generation.mjs --id <current-id> --brief <장면> --output <새빈폴더>`를 실행하고 `--check <준비폴더>`로 검증한다. `imagegen-request.json`의 실제 PNG referenced_image_paths를 모두 imagegen에 첨부한다. 프롬프트만으로 생성 금지. 로봇은 동일변형 정면+좌우손바닥+왼손등, 사람형은동일인물참조만 사용. 출력은REVIEW.json실물검수전productionfalse, 자동정본승격없음. `/api/characters/current`의generation_url과NEW-GENERATION.md를따른다.

## 여성형 어깨 공통 규격 (2026-11-16 대표 직접 확정)

클로이(CLO-02)·클로아(CLO-04)는 robots/shoulder-master.json의 동일한 여성형 원형 발광 어깨를 쓴다. 둥근 외측 디스크/은은한 발광링/몸에 붙는 흰 곡면 테두리이며 넓거나 겹치는 견갑은 새 생성에 쓰지 않는다. 각자 얼굴·번호·머리장식·발광색은 유지한다. 현재 API의 shoulder-feminine-round-v1은 어깨 형태 전용으로 같은 generation 요청에 실제 PNG를 포함한다. 기존 이미지 일괄 재생성 지시가 아니다.
