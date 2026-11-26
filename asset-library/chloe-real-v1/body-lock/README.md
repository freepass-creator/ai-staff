# CHLOE_REAL_V1 체형 잠금 — 정면 2D 참고 자산

2026-11-19 사용자 지시: "지금 이 다리 몸매 체형 정확하게 달라지지 않게끔 반영하자."

## 범위
- **정본 체형 이미지**: 차콜 정장 전신 정면 1086×1448 PNG, SHA-256 `8ca752cb889d1cd5a8682bf33cd3e74e397a304689bd4bc17abb4252a482fe4a`.
- **원본 얼굴 권위**: 최초 360도 시트 좌하단 얼굴 크롭이며 위 체형 PNG의 얼굴이 새 얼굴 정본이 되는 것은 아니다.
- 두 다리의 길이·방향·허벅지/무릎/종아리/발목 윤곽, 머리-몸의 화면상 비율, 골반과 어깨의 균형, 구두·접지는 이 고정 정면 이미지 그대로 사용한다.
- 명목상 고해상도 확대/생성 이미지를 정본으로 승격하지 않는다. 신장·실제 신체 치수·3D 동일성을 추정하지 않는다.

## 파일 위치
- 전체 독립 패키지: [Google Drive 보관본](https://drive.google.com/file/d/1EFgSAZErw5iHQVLXDvACdoKVdeWy-rAq/view?usp=drivesdk).
- [전신 원본](https://drive.google.com/file/d/1FsWNoDq7N3o0dLe0kCPnMdlPWebdtl_d/view?usp=drivesdk), [스타킹 영역 마스크](https://drive.google.com/file/d/1J0jvle9F7N4QlFG9PSy_Nh21dUkiIl9C/view?usp=drivesdk).
- 기존 색상별 생성 이미지 5장은 패키지의 `PREVIOUS_STOCKING_VARIANTS_REVIEW_ONLY/`에 보존한다. 각각 픽셀이 달라 같은 체형이라고 **자동 승인 불가**.
- 기준 파일은 git에 PNG를 넣지 않고 Drive와 로컬 자산 폴더로 보존한다.

## 검사기 사용
`python generator/chloe_real_body_lock.py --reference <master.png> --candidate <output.png> --mask <stockings-mask.png> --sha256 8ca752...`

**PASS**: 파일 해시 확인, 원본과 동일한 크기, 편집 허용 구역 바깥의 RGB 픽셀 변화 0개.

**FAIL**: 여타 생성형 재렌더(스타킹만 다르게 써도 다른 부위의 픽셀이 바뀜), 리사이즈·이동·표정/얼굴 수정·실루엣 변경.

## 적용 한계
이 코드는 **정적 정면 이미지의 픽셀 잠금** 검사기다. 영상/새 카메라 각도/포즈/의상에 대한 일관된 3D 메시/리그 검증을 구현한 게 아니다. 이 신규 자산 등록은 `characters/클로이` 기존 B안, 로봇형 CLO-02, 서비스 `current API`를 건드리지 않는다. AI 스튜디오의 자동 호출/배포는 별도 구현 및 테스트 전까지 미완료로 표시한다.
