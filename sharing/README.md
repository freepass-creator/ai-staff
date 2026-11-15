# 다른 PC·AI에서 가져다 쓰기

현재 보기와 내려받기: `/share/`. 기계가 읽는 시작점은 `/share/share.json`이다. 이 화면은 PC0 localhost 전용이고 공개 배포가 아니다. PC1의 고정 시작 파일은 `D:/dev-artifacts/ai-staff/shared/current.json`이다. 실제 설치 경로와 소스 커밋·패키지 SHA를 여기서 조회한다.

이번 커밋은 공개 GitHub에 push/PR/릴리스하지 않는다. 저장소가 공개이므로 로컬 가지 커밋과 기존 LAN PC1 전달까지만 한다. 웹 공개가 필요한 경우 접근 범위와 자산 호스팅을 별도 구성한다. 일반 정적 서버/Vercel로 저장소 전체를 배포하지 않는다.

## 필요한 것만 사용

- 포스터 제작: `poster-templates.zip`의 `index.html`, `STYLE-GUIDE.html`, `START-HERE.md`. 문구 JSON과 준비된 테마·등록 PNG를 바꿔 출력한다.
- 사람형 9컷: `human-poses.zip`의 `usage-index.json`. 추가 의상 3종과 비서형은 포스터 키트의 `wardrobe-library.json`에 있다.
- 로봇 37장면: `robot-blog.zip`. 반려 01과 그 조판/프롬프트는 제외했다.
- 로봇 정면/SVG 제스처: `robot-svg.zip`. PURE와 PNG 내장 WEB을 구분한다.
- 실행 코드: `source.bundle`은 `share.json`에 적힌 base commit을 가진 저장소에서 읽는다. 기존 checkout을 덮어쓰지 않고 새 source 폴더에 설치한다.

## 새 폴더로 설치

`AI-Staff-Current-Kit.zip`과 옆의 `install.py`를 받아 아래처럼 실행한다. Python과 Git, Node가 이미 있는 환경을 쓴다. 인증·네트워크·설정 변경 없이 기존 로컬 저장소를 참조한다.

```powershell
python install.py --archive AI-Staff-Current-Kit.zip --destination D:/dev-artifacts/ai-staff/shared/install/새버전 --reference-repo D:/dev/ai-staff
```

설치기는 archive/내부 파일의 SHA와 경로를 검사하고 빈 새 대상에만 설치한다. 기존 source checkout은 변경하지 않는다. 새 source의 현재 자산 경로만 해시를 기준으로 설치한 data 폴더에 맞춘다. 과거/거절된 이력의 미포함 파일은 현재 자산으로 대체하지 않는다. 코드만 clone하고 이미지 설치가 됐다고 판단하지 않는다.

설치 결과 `install-receipt.json`에 source/data 경로와 해시가 있다. 서버는 자동 시작하지 않는다. 필요할 때 새 source 폴더에서 `node robots/current-server.mjs`로 시작한다. 기본 54640이 사용 중이면 `AI_STAFF_CHARACTER_PORT`에 다른 포트를 정한다. 현재 사람의 앱/기존 서버를 종료하지 않는다.

포스터 출력은 `data/poster-templates/render.mjs`와 `data/renderer-runtime/node_modules/playwright/index.mjs`를 사용한다. `--bundle data/poster-templates --input 문구.json --output 빈새폴더 --playwright-module .../index.mjs`로 지정한다. 키트는 상대 경로의 PNG·CI·폰트를 해시 검증해서 그대로 사용한다.

핵심은 같은 클로이 유지다. SVG가 필수인 것이 아니다. 기존 캐릭터를 출력마다 생성하지 않고 고정된 PNG/질감/얼굴을 재사용한다. 새 포즈·복장·환경 후보만 별도 제작·대조 후 등록한다. 공개 게시와 자동 생성 예약은 설치하지 않는다.

관리자 갱신: 승인 범위의 변경을 커밋한 뒤 `python sharing/build.py`를 실행한다. 공유본은 커밋별 폴더에 보존하고 `current.json`이 최신을 가리킨다. 이전 작업·고객 자료·로그인/설정·아카이브를 자동 삭제하지 않는다.
