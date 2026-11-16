현재 캐릭터 API는 **25개**: 로봇정면2 + 착한거래포즈7 + 사람형12 + 손정본3 + 승인프로필1. 사람형과 손도 `/api/characters/current` 하나에서 제공한다. `?kind=human_pose`, `?kind=hand_master`로 분류 조회하며 ID/revision/SHA/url로 동일하게 가져온다. 손 기준은 `robot-hand-v1.0`, 좌우손바닥과 왼손등3뷰. 손바닥은 연속곡면이며 오래된 분리 타원패드 기준을 사용하지 않는다.

# 캐릭터 최신 API

다른 AI와 프로젝트는 `https://ai-staff-two.vercel.app/api/characters/current` 한 곳에서 시작한다. 캐릭터 출력 때마다 최신 목록을 읽고 `id`, `revision`(PNG SHA256), `url`을 사용한다. url은 사이트 기준 상대경로이며 절대주소로 합쳐 호출한다. API가 주는 PNG 바이트를 그대로 쓴다. 이미지 생성으로 다시 그리지 않는다.

예: `GET /api/characters/resolve?id=cover-confident`. 정면은 `q=착한클로이` 또는 `q=기본클로이`. 기본 `클로이`만으로는 변형을 임의 선택하지 않는다. 프로필은 `id=profile-selected-02` 한 장만 허용한다.

`GET /api/characters/assets/cover-confident?revision=<현재 SHA>`로 받으면 PNG 해시를 서버에서 검증한다. 폐기한 ID·revision은 410, 임의 ID는404, 원본 검증 실패는502로 멈춘다. 구버전/폴더검색 fallback은 없다. 손의 규격은 `/hand-grip-policy.json`.

매 게시 전 current를 새로 읽어 local SHA와 비교하고 다르면 새 PNG를 받는다. API 실패 시 과거 파일을 대신 게시하지 않는다. 이미 발행한 글의 재현용 사본은 이력일 뿐 새 글의 선택 원본이 아니다. 최신 목록을 정기적으로 읽는 로직은 소비 앱이 구현한다. 여기서는 상주 자동게시/동기화 에이전트를 설치하지 않는다.

구 로봇37컷·옛 로봇표지·이를 포함한 예전 전체/포스터 ZIP과 각도연구 다운로드는 공개 철회한다. 기존 사람형과 다른 직원의 등록/참고자료는 유지한다. 참조정면, 활용포즈, 승인프로필 용도는 서로 대체하지 않는다.

미리보기 `/chakhan/`, 문구 편집용 최신 표지 키트는 `/chakhan-use-cuts.json`의 downloads.zip. 사용 브랜드는 착한거래, 기본 보라 정면은 프리패스다.

