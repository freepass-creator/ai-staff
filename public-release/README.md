현재 캐릭터 API는 **26개(기존25+공통어깨1)**: 로봇정면2 + 착한거래포즈7 + 사람형12 + 손정본3 + 승인프로필1. 사람형과 손도 `/api/characters/current` 하나에서 제공한다. `?kind=human_pose`, `?kind=hand_master`로 분류 조회하며 ID/revision/SHA/url로 동일하게 가져온다. 손 기준은 `robot-hand-v1.0`, 좌우손바닥과 왼손등3뷰. 손바닥은 연속곡면이며 오래된 분리 타원패드 기준을 사용하지 않는다.

# AI Staff 현재 자산과 캐릭터 API

단일 진입점은 https://ai-staff-two.vercel.app/api/characters/current 이다. [연동 규격](site/CHARACTER-API.md)과 character-client.mjs를 사용한다. 캐릭터를 새로 출력할 때마다 현재 ID/SHA를 확인하고 API PNG를 그대로 받는다. 미등록·폐기 자산으로 fallback하지 않는다.

2026-11-16 대표 직접 요청으로 구 로봇37컷, 옛 로봇표지와 이를 담은 전체/포스터 ZIP, 각도연구 공개 파일42개를 철회한다. 대상은 robots/retired-public-assets.json. 다른 직원·사람형·승인정면2종과 프로필1장은 보존한다. 기존 collect.py는 재공개 방지를 위해 중단했다.

현재 일반갤러리67자산은 기존 사람형/장면/다른직원자료와 최신착한거래7컷을 포함한다. 캐릭터 API의 자동생산허용은 정면2+포즈7+사람형12+손정본3+승인프로필1이다. 다른직원R1제안은 API생산선택에 노출하지 않는다.

배포: node public-release/build.mjs 새빈폴더. 정적갤러리와 현재allowlist전용Node API를 생성한다. curated폴더만 기존Vercel ai-staff로 배포·검증·승격한다. Cache-Control:no-store/CORS/SHA검증, 옛revision410. 임의외부URL과파일경로입력은없다.

새원본이나포즈가바뀌면 SHA·현재목록·썸네일·키트·배포를 함께 갱신해야한다. 구사이트와Release다운로드는별도로철회·검증한다. 이미복사된외부사본이나공개Git이력까지없어졌다고주장하지않는다.
