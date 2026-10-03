# ai-staff — AI 직원 가상 인물

회사 AI 직원(경영지원실장 **클로이**, 프리패스 AI 매니저 **클로아**)을 «살아 있는 가상 인물 한 명»으로 정의하고, 같은 사람의 이미지를 다시 뽑을 수 있게 하는 저장소.

- 규칙: [AGENTS.md](AGENTS.md)
- 캐릭터 정본: `characters/<이름>/character.json`

## 다시 뽑는 법

Python의 기존 설치 패키지를 사용합니다. 설치·다운로드는 하지 않습니다. PowerShell에서 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용하세요.

```powershell
npm.cmd run gen -- --char 클로이 --set turnaround --dry-run
npm.cmd run gen -- --char 클로이 --set turnaround
npm.cmd run gen -- --char 클로이 --set all --n 2 --dry-run
npm.cmd run docs -- --char 클로이
npm.cmd run check -- --char 클로이 --dir D:/large/ai-staff/클로이/세트
npm.cmd run check -- characters/클로이/refs/front.png D:/large/ai-staff/클로이/turnaround/front-10301.png
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
python generator/compose_scale.py --char 클로이 --images front.png side.png back.png --output out/scale.png --boxes boxes.json
node templates/casting-v2/validate-casting-v2.mjs out/casting.json
```

`boxes.json`은 입력 순서대로 `[[left,top,right,bottom], ...]` 세 개입니다. 자동 크롭이 부정확하면 이 수동 경계로 재합성합니다. `check -- --char ... --dir ...`는 그 폴더의 이미지마다 모든 얼굴의 점수를 `face-report.json`으로 기록합니다. 시트에는 다른 직원·뒷면 등이 있으므로 검출 얼굴 점수와 자동 passed를 함께 해석해야 합니다. 디렉터리 검사에서 여러 얼굴을 허용하더라도 모든 검출 얼굴이 기준을 넘을 때만 passed입니다.

### Drive 업로드

```powershell
npm.cmd run upload -- --char 클로이 --set 세트 --dir D:/large/ai-staff/클로이/세트 --dry-run
npm.cmd run upload -- --char 클로이 --set 세트 --dir D:/large/ai-staff/클로이/세트
```

실행하면 지정된 Drive 부모 아래 `<이름>/<세트>`를 찾거나 만들고 이름이 같은 파일은 건너뜁니다. 페이지네이션을 끝까지 읽고, 업로드는 파일의 폴더를 cwd로 하여 파일명만 전달합니다. 이 개발 작업에서는 실제 업로드를 실행하지 않았습니다.

### 구현·검증 상태

CREATE_NEW_JUSTIFIED(2026-10-03): `reuse:check` 후보인 character.json과 casting-v2 PNG·JSON·검증기를 재사용했습니다. 기존 자산에는 정본 기반 SDXL 실행·얼굴 검사·문서 재생성·Drive 래퍼가 없어 generator 모듈과 단위 시험을 새로 만들었습니다. academy READY는 사용자 전달 ai-core #382를 따릅니다. 대상 가지는 `feat/generator`이며 Git 명령은 실행하지 않았습니다.

현재 클로아의 `refs/front.png`가 없어 클로아 이미지 생성과 `duo/all` 실제 실행은 HOLD입니다. dry-run·문서 생성은 가능합니다. 대표프로필의 예문은 한글 시스템 글꼴에 작은 기울기·기준선 변화를 주어 필기 느낌으로 조판합니다. 합 시트는 키 비교와 두 사람이 함께 보고서를 보는 업무 장면으로 구성합니다. 업무 장면은 좌우 IP-Adapter 마스크로 두 얼굴을 구분하고 검출 얼굴이 정확히 두 개이며 각각 해당 정본 기준을 넘을 때만 사용합니다. 실제 GPU 생성·시각 품질·Drive 업로드는 미검증입니다. Claude 독립 검토는 `CLAUDE_PROCESS_FAILED`로 UNAVAILABLE이며 통과로 계산하지 않았습니다.

`next_start_here`: `npm.cmd test` → dry-run의 blockers 확인 → 클로아 기준 얼굴 준비 → 별도 output_root에서 GPU 생성 → geometry/face manifest와 실제 시트 검토. 커밋·푸시·PR은 사용자가 진행합니다.

> CREATE_NEW_JUSTIFIED(2026-10-03): ai-core `reuse:check "AI 직원 가상 캐릭터 프로젝트" --root C:\dev` — 일반 capability(프로젝트 빌드·테스트)만 나오고 캐릭터·이미지 자산 프로젝트는 없음. ai-ops 에 시험판 생성기 `scripts/이미지/캐릭터-생성.py` 가 있으나 캐릭터 정본·문서·검사가 없어 새 저장소로 분리(대표 결정).
