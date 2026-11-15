# AI Staff 현재 자산과 캐릭터 API

단일 진입점은 https://ai-staff-two.vercel.app/api/characters/current 이다. [연동 규격](site/CHARACTER-API.md)과 character-client.mjs를 사용한다. 캐릭터를 새로 출력할 때마다 현재 ID/SHA를 확인하고 API PNG를 그대로 받는다. 미등록·폐기 자산으로 fallback하지 않는다.

2026-11-16 대표 직접 요청으로 구 로봇37컷, 옛 로봇표지와 이를 담은 전체/포스터 ZIP, 각도연구 공개 파일42개를 철회한다. 대상은 robots/retired-public-assets.json. 다른 직원·사람형·승인정면2종과 프로필1장은 보존한다. 기존 collect.py는 재공개 방지를 위해 중단했다.

현재 일반갤러리64자산은 기존 사람형/장면/다른직원자료와 최신착한거래7컷을 포함한다. 캐릭터 API의 자동생산허용은 정면2+포즈7+승인프로필1만이다. 다른직원R1제안은 API생산선택에 노출하지 않는다.

배포: node public-release/build.mjs 새빈폴더. 정적갤러리와 현재allowlist전용Node API를 생성한다. curated폴더만 기존Vercel ai-staff로 배포·검증·승격한다. Cache-Control:no-store/CORS/SHA검증, 옛revision410. 임의외부URL과파일경로입력은없다.

새원본이나포즈가바뀌면 SHA·현재목록·썸네일·키트·배포를 함께 갱신해야한다. 구사이트와Release다운로드는별도로철회·검증한다. 이미복사된외부사본이나공개Git이력까지없어졌다고주장하지않는다.
