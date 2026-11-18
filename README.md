# ai-staff — AI 직원 캐릭터 기준

> **현재 제작 기준 (2026-11-16):** [단일 공개 캐릭터 API](https://ai-staff-two.vercel.app/api/characters/current)의 ID·revision·SHA256을 따른다. 승인 목록은 로봇 정본 2, 착한거래 포즈 7, 사람형 12, 손 정본 3, 프로필 1, 공통 어깨 1의 **26종**이다. 배포 여부와 관계없이 과거 로봇 37컷·구 포스터·각도 연구·구 모션 원본을 자동 제작 기준으로 검색하거나 대체하지 않는다. 공개 이미지와 로컬 개발 도구는 별도다.

## 최신 클로이 진입점 (대표 정정, 2026-11-15)

- **현행 블로그·홍보 활용 컷:** 착한거래 7컷을 `/chakhan/` 및 `asset-library/chakhan-use-cuts/library.json`에서 참조한다. 예전 37장면/표지·본문 카드 111개 구성은 이력으로 남기되 현재 API·공개 배포·신규 제작에 사용하지 않는다. 현행 이미지 생성은 [NEW-GENERATION.md](public-release/site/NEW-GENERATION.md)의 동일 변형·손·어깨 PNG 참조 규칙을 따른다.

- 모든 직원 캐릭터의 소속 브랜드는 **프리패스**이며 기본 이마 명찰도 프리패스다. 캐릭터 이름과 구분한다. 기본 보라 정본의 얼굴은 검은 유리 디스플레이 안에서 표정이 발광하는 방식이다.

- **착한 클로이**를 요청하면 먼저 `robots/current.json`의 `chakhan-white-v1`을 조회한다. 흰색 V1 정면 정본이며 손등 LED는 없다.
- **기본 클로이 / 보라색 클로이**는 `basic-purple-v1`을 조회한다. 매끈한 표면·은은한 발광 V1 정본이며 `production_usable:true`다. 착한거래형도 같은 최신 재질 정본으로 확정했다.
- `클로이` 또는 `CLO-02`만으로 변형을 임의 선택하지 않는다. 이름·번호·PC 역할은 별도다.
- 이전 `clo02-true.png`, source-needed 상태, 2d-master-kit-v1, 모션 키트 자산을 최신 정본으로 추적하거나 fallback하지 않는다. 파일은 이력으로 보존하되 검색·선택·서빙에서 제외한다. 최신 정본은 smooth-subtle-0.1 하나이며 robots/current.json만 조회한다.
- 확인: `node robots/current.mjs resolve 착한클로이 --production`. 보기: `http://127.0.0.1:54640/characters/`. API는 별칭과 승인 상태·해시를 함께 반환한다.


AI 직원의 번호·이름·기준 이미지를 관리한다. 로봇 캐릭터는 아래 최신 확정을 먼저 읽고, 기존 사람형 캐릭터 자료는 해당 캐릭터의 설정으로만 사용한다.

## 현재 로봇 이름·번호 (대표 확정, 2026-11-11)

| 공식 번호 | 이름 | 이번에 확정한 식별 기준 |
|---|---|---|
| **CLO-02** | **클로이** | **보라색 로봇** |
| **CLO-04** | **클로아** | 번호·이름 확정. 색상·원본 이미지는 추가 지정 없이 바꾸지 않는다 |

- 로봇 이름·번호 정본: [robots/registry.json](robots/registry.json)
- 이미지 구별·기존 파일 정리: [robots/README.md](robots/README.md)
- 작업 규칙: [AGENTS.md](AGENTS.md)
- 과거의 **CLO-02=클로아 / CLO-04=클로이** 표기는 대체되었다.
- 로봇 번호, 담당 PC 번호, 브랜드 색상은 각각 별도 정보다. 색을 바꾸었다고 다른 번호를 부여하지 않는다. 기존 파일명이나 명찰에 CLO-02가 있어도 원본 모양이 다르면 확인 전 같은 캐릭터로 합치지 않는다.

## 현재 실행·공유

로컬 검토 서버는 `node robots/current-server.mjs`로 시작하고 `http://127.0.0.1:54640/`에서 확인한다. **다른 AI와 실제 제작기의 승인 목록은 공개 단일 API**에서 조회한다. 로컬 서버의 폐기 경로(`/library/`, `/templates/`, `/share/`, `/gestures/`, `/motion/`)는 410으로 처리되며 최신 자산 선택에 사용하지 않는다. 저장소 전체를 일반 정적 서버로 노출하지 않는다.

Git 코드는 실행 코드와 등록부이며 큰 이미지·SVG·ZIP은 별도다. 다른 PC/AI는 [공유 시작점](sharing/README.md)과 `/share/`의 최신 패키지·해시·설치 도구를 함께 읽는다. 코드만 clone한 상태를 자산 설치 완료로 취급하지 않는다.

이 저장소는 현재 공개 GitHub 저장소다. 2026-11-15 후속 대표 직접 지시에 따라 공개 push와 배포를 진행한다. 공개 사이트는 public-release/build.mjs가 만든 허용 목록 전용 정적 산출물만 배포하고, 원본과 제작 키트는 GitHub Release에 고정 해시로 제공한다. 현재 Node API·외부 D 경로가 있는 저장소 전체를 정적 Vercel로 배포하지 않는다. 웹으로 배포할 때는 읽기 전용 자산 API와 접근 범위를 별도로 구성한다. 착한거래 고객 홈페이지 저장소는 수정하지 않는다.

**공개 현재 보기:** `https://ai-staff-two.vercel.app/?kind=approved`(제작 승인 갤러리), `/chakhan/`(착한거래 7컷), `/api/characters/current`(26종 단일 API). **PC 로컬 개발 도구:** `/production/`(채널 제작), `/employees/`(직원 관리). 로컬 제작 도구·과거 모션 경로는 공개 운영 배포와 구분한다.

## 기존 사람형 캐릭터·생성기

AI 상황실장 **클로운**, 프리패스 AI 매니저 **클로담**의 사람형 캐릭터 자료와 생성기는 기존 위치에 보존한다. 이 두 인물을 로봇 클로이·클로아로 자동 개명하지 않는다.

- 사람형 캐릭터 정본: `characters/<이름>/character.json`
- 사람형 클로이: [설정](characters/클로이/character.json) · [수령·사용 안내](characters/클로이/README.md). 최신 선택은 비교 시트 가운데 B안(목표 7등신). 생성 눈금은 실측이 아니며 로봇 정본과 별개다.
- 사람형 활용 라이브러리: `/human/` · `asset-library/chloe-human/library.json`. SVG·투명 PNG 9종과 상황별 사용 설명을 제공한다. 검색은 `/api/characters/human/select?q=문단설명`, 다른 AI는 `AI-WRITER-USAGE.md`를 읽는다.
- 아래 명령과 얼굴 검사·이력서·키 눈금 규격은 기존 사람형 생성기용이다. 로봇 레지스트리는 이 생성기의 실행 입력이 아니다.

## 다시 뽑는 법

Python의 기존 설치 패키지를 사용합니다. 설치·다운로드는 하지 않습니다. PowerShell에서 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용하세요.

```powershell
npm.cmd run gen -- --char 클로운 --set turnaround --dry-run
npm.cmd run gen -- --char 클로운 --set turnaround
npm.cmd run gen -- --char 클로운 --set all --n 2 --dry-run
npm.cmd run docs -- --char 클로운
npm.cmd run check -- --char 클로운 --dir D:/large/ai-staff/클로운/세트
npm.cmd run check -- characters/클로운/refs/front.png D:/large/ai-staff/클로운/turnaround/front-10301.png
npm.cmd test
```

`generator/config.json`은 모델 경로·해상도·IP-Adapter 세기·시드·최대 시도 횟수·얼굴 임계값의 정본입니다. 캐릭터 문안과 외모는 `character.json`만 수정합니다. 장면은 캐릭터의 `scenes`가 우선이며 없을 때만 `generator/scenes.json`을 사용합니다. 동작은 `poses`가 있으면 그 배열, 없으면 장면 배열입니다. `--n`은 항목당 후보 수이며 각 후보에 서로 겹치지 않는 고정 시드 묶음을 배정합니다. 시트에는 첫 번째 후보의 통과 결과를 씁니다.

| 세트 | 시트 파일 | 구성 |
|---|---|---|
| profile | 01-대표프로필.png | 전신 3방향·얼굴 4칸·복장 4벌·설정·말투 예문 |
| scale | 02-키눈금-프로필.png | 키 눈금 전신 3방향·얼굴 3방향·설정 |
| turnaround | 03-턴어라운드.png | 전신 정면·옆·뒤; 개별 ¾ 이미지도 생성 |
| face | 04-얼굴기준.png | 정면·45도·옆면 |
| expressions | 05-표정.png | JSON 전체 생성, 시트는 앞 6개 |
| outfits | 06-복장.png | JSON 전체 생성, 시트는 앞 4개 |
| poses | 07-동작.png | 동작 전체 생성, 시트는 앞 6개 |
| duo | 08-합.png | 두 정본을 별도로 생성한 키 비교와 업무 컷 합성 |
| scenes | 없음 | 장면 개별 이미지 |
| all | 위 8장 | 필요한 개별 이미지를 먼저 생성 |

개별 파일은 `D:/large/ai-staff/<이름>/<세트>/<항목>-<시드>.png`, 시트는 `<이름>/세트/01-대표프로필.png` 등의 이름입니다. 실패한 얼굴도 개별 파일과 manifest에 남기되 시트에 쓰지 않습니다. 얼굴이 0개·2개 이상이거나 임계값 미달이면 다음 고정 시드로 최대 3회 시도합니다. 뒷면만 검사를 제외합니다. 재시도 소진은 종료 코드 1입니다. **기존 파일은 덮어쓰지 않습니다.** 기존 사람이 만든 시트를 보존하려면 새 실행 전에 config의 `output_root`를 별도 결과 폴더로 지정하세요. `--dry-run`은 출력 파일을 쓰지 않고 로컬 토크나이저로 두 CLIP의 77토큰 한계를 검사합니다. 누락된 참조·모델도 계획의 `blockers`에 표시합니다.

각 manifest는 입력·코드·모델 SHA-256, 실제 설정, 패키지 버전, 시드, 시도별 얼굴 점수와 성공 여부를 기록합니다. 같은 입력·모델·설정·실행 환경에서 재현하는 것을 목표로 하며 GPU/라이브러리 버전이 바뀌면 픽셀 동일성은 보장하지 않습니다. 얼굴 통과는 SFace 기본 코사인 0.363 기준이며 사람의 외관 검토를 대신하지 않습니다. 시트 상태는 자동 확정하지 않고 `REVIEW`입니다.

### 키 눈금과 기존 이미지 검사

casting-v2 템플릿을 재사용합니다. 2400×3200, 1cm=10px, 200cm y=410, 바닥 y=2410입니다. 배경을 제거하지 않고 사람 경계 사각형을 크롭한 뒤 키×10px로 리사이즈합니다. 단색 배경 차이로 경계를 추정한 경우 해부학적 정수리·발바닥 오차는 **미측정(null)**, 검토 필요로 기록합니다. 지정한 경계의 픽셀 높이·바닥 오차와 구별합니다. 템플릿의 수치 검증기는 casting.json만 검사하므로 실제 이미지 해부학적 정확성까지 PASS로 간주하지 않습니다.

```powershell
python generator/compose_scale.py --char 클로운 --images front.png side.png back.png --output out/scale.png --boxes boxes.json
node templates/casting-v2/validate-casting-v2.mjs out/casting.json
```

`boxes.json`은 입력 순서대로 `[[left,top,right,bottom], ...]` 세 개입니다. 자동 크롭이 부정확하면 이 수동 경계로 재합성합니다. `check -- --char ... --dir ...`는 그 폴더의 이미지마다 모든 얼굴의 점수를 `face-report.json`으로 기록합니다. 시트에는 다른 직원·뒷면 등이 있으므로 검출 얼굴 점수와 자동 passed를 함께 해석해야 합니다. 디렉터리 검사에서 여러 얼굴을 허용하더라도 모든 검출 얼굴이 기준을 넘을 때만 passed입니다.

### Drive 업로드

```powershell
npm.cmd run upload -- --char 클로운 --set 세트 --dir D:/large/ai-staff/클로운/세트 --dry-run
npm.cmd run upload -- --char 클로운 --set 세트 --dir D:/large/ai-staff/클로운/세트
```

실행하면 지정된 Drive 부모 아래 `<이름>/<세트>`를 찾거나 만들고 이름이 같은 파일은 건너뜁니다. 페이지네이션을 끝까지 읽고, 업로드는 파일의 폴더를 cwd로 하여 파일명만 전달합니다. 이 개발 작업에서는 실제 업로드를 실행하지 않았습니다.

### 구현·검증 상태

CREATE_NEW_JUSTIFIED(2026-10-03): `reuse:check` 후보인 character.json과 casting-v2 PNG·JSON·검증기를 재사용했습니다. 기존 자산에는 정본 기반 SDXL 실행·얼굴 검사·문서 재생성·Drive 래퍼가 없어 generator 모듈과 단위 시험을 새로 만들었습니다. academy READY는 사용자 전달 ai-core #382를 따릅니다. 대상 가지는 `feat/generator`이며 Git 명령은 실행하지 않았습니다.

두 사람의 `refs/front.png` 는 임시(오디션2 후보 시트에서 자른 얼굴)다. 얼굴 정본은 대표가 GPT로 만들어 주는 이미지 — 오면 refs·character.json 외모·키·몸무게를 바꾸고 문서를 다시 뽑는다. GPU 실생성은 그 뒤에 검증한다.

`next_start_here`: 대표 이미지 수령 → refs 교체·character.json 갱신 → `npm.cmd test` → 시험 실행(dry-run) → GPU 생성 → 키 눈금은 `compose_scale.py` 로 v2 정확 합성(턴어라운드에서 정수리·발바닥 경계 재서 `--boxes`).

> CREATE_NEW_JUSTIFIED(2026-10-03): ai-core `reuse:check "AI 직원 가상 캐릭터 프로젝트" --root C:\dev` — 일반 capability(프로젝트 빌드·테스트)만 나오고 캐릭터·이미지 자산 프로젝트는 없음. ai-ops 에 시험판 생성기 `scripts/이미지/캐릭터-생성.py` 가 있으나 캐릭터 정본·문서·검사가 없어 새 저장소로 분리(대표 결정).


블로그 포스터 템플릿은 `asset-library/blog-templates/library.json`과 `/templates/`에서 조회합니다. 6형식·6배경·11시안과 반복 출력 엔진을 제공합니다. 등록된 캐릭터 자산을 재사용하며 얼굴을 매번 생성하지 않습니다.


공개 자산 빌드: `public-release/README.md`. COD-01/COD-03/CLO-04 R1은 기존 프로필의 얼굴·머리 구조를 보존해 정면으로 맞춘 파생 제안이며 CLO-02 정본과 구분합니다. 새 환경 컷은 고정 캐릭터를 별도 생성 배경에 합성하므로 반복 출력에서 얼굴을 다시 그리지 않습니다.
