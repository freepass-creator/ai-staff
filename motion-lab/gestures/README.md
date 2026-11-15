# 클로이 V1 SVG 키트

2026-11-15 대표가 손 세부 작업을 마무리하고 SVG 납품을 지시한 기준이다. 정본 두 종의 디자인은 `current.json`을 유지한다. 키트 진입점은 `svg-release.json`이다.

| 파일 | 사용 |
|---|---|
| canonical/chakhan-front.svg | 착한 클로이 승인 정면, 원래 크기 픽셀 대조본 |
| canonical/freepass-front.svg | 보라색 기본 클로이 승인 정면, 원래 크기 픽셀 대조본 |
| character/chloe-jointed.svg | 몸·머리·팔·손목·손가락을 20개 그룹으로 제어하는 동작용 SVG |
| character/chloe-jointed-paths.svg | 부위별 경로가 직접 들어 있는 편집·보관용 SVG |
| motions/greeting-paths.svg | PNG 없는 6초 반복 인사 SVG, 경로 편집용 |
| motions/greeting-web.svg | 원본 픽셀 PNG 질감 20개를 내장한 가벼운 웹 인사 SVG |
| source/animation.js | 대기·인사·설명·경청·손가락·정지 6개 프리셋과 제어 함수 |
| source/spec.json | 부품 이름·부모·회전축·원본 해시·동작 범위 |

모션 미리보기: `http://127.0.0.1:54640/gestures/`. 프리셋을 고른 후 **이 동작을 SVG로 저장**하면 해당 동작의 독립 파일을 받는다. 기본 강도는 0.35, 허용 최대는 0.45다. 큰 팔 움직임이나 완전한 주먹·손 앞뒤 전환·3D 회전을 구현한 파일은 아니다. 눈 깜박임은 포함하지 않는다.

인사하는 손의 손가락 네 개와 엄지는 원래 전신에서 보존하고, 허리에 올린 손은 긴 손가락 네 개와 별도의 엄지가 보이도록 보정했다. 손바닥은 차콜색 SVG 경로와 그라디언트로 정리했다. 엄지 아래 도톰한 부분과 중앙면을 구분한다. 손등은 흰색, 손에는 LED가 없다. 손 세부는 대표의 마무리 지시에 따라 실용적으로 정리했으며 정밀한 해부·3D 측정 복원이 아니다.

정면 정본 SVG는 원본 PNG를 색별 픽셀 경로로 보존한다. 동작용은 같은 방식의 경로를 SVG 부문서 20개와 허리 손 보정 부문서 1개에 넣고 관절 변환으로 움직인다. **경로 SVG 내부에는 PNG·외부 이미지·스크립트가 없다.** 부문서의 base64는 SVG XML이지 비트맵이 아니다. 브라우저가 화면 출력용으로 내부 래스터 캐시를 쓰는 것은 가능하다.

웹 재생본(character/chloe-web-jointed.svg 및 motions/greeting-web.svg)은 별도 프로필이다. 이 파일에는 원본 PNG 부품 20개와 허리 손 보정 PNG 1개와 SVG 관절·손바닥 경로가 함께 들어 있다. 경로만으로 실시간 재생하면 무거워 질감과 속도를 보존하는 웹용으로 제공한다. 편집용 경로 SVG와 혼동하지 않는다. 웹 재생본에는 색 축약/샘플링 블러를 적용하지 않는다.

사진 같은 질감을 보존하는 픽셀 경로이므로 매끈한 윤곽만으로 재설계한 형태 벡터와는 다르다. 정면 정본은 1024×1536에서 RGBA 차이 0으로 확인한다. 동작용은 성능을 위해 색·알파를 8단계 간격으로 정리하고, SVG 부품에 0.55픽셀 샘플링 필터를 사용한다. 동작용에 정면 정본의 픽셀 동일성이나 모든 배율에서 동일한 결과를 주장하지 않는다. 작은 동작에서 팔·손목 경계가 남을 수 있다.

웹 배치에는 웹 재생본을 권장한다. 경로 모션도 독립적으로 열리지만 복잡한 픽셀 경로 때문에 장치에 따라 재생이 느릴 수 있다. 키트는 평면 2D 동작 범위를 마무리한 것으로, 자유로운 손가락 쥐기나 3D 리깅 완료를 뜻하지 않는다.

직접 제어 예:

```js
import {poseAt, applyPose} from './source/animation.js';
applyPose(svgElement, spec, poseAt(spec, 'greet', seconds, 0.35));
```

재생성(Pillow·NumPy 필요, 키트 폴더에서 실행):

```text
python source/build.py --source source/body-reference.png --source-sha <source/spec.json의 source_sha256> --output rebuilt --palm-reference source/palm-reference.json --spec-output rebuilt/spec.json --channel-step 8 --waist-detail source/waist-hand-detail.png --waist-detail-sha <source/spec.json의 waist_hand.detail_sha256>
```

정본·동작용·영상의 SHA와 실제 렌더링 검증 결과는 키트의 manifest.json과 validation.json에 기록한다. 공개 홈페이지 배포나 블로그 자동 게시를 수행한 키트는 아니다.

자산 수정 1.1: 허리 손의 긴 손가락이 세 줄뿐인 오류를 수정했다. 인사 손과 허리 손을 각각 확대해 긴 손가락 4개 + 엄지 1개를 시각 확인한다. 허리 손 보정은 몸체와 함께 움직이는 정적 세부 파트이며 손가락별 독립 관절로 추가된 것은 아니다.
