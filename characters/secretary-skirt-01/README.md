# ASSISTANT-SKIRT-01 — AI Staff 치마 정장 AI 비서 (후보)

- **상태:** 검수 전 후보. 기존 클로이·클로아·클로운·클로담과 별도 인물. 이름은 아직 미정.
- **정본 후보:** 이번 대화에서 생성한 정면 전신과 6방향 전신 시트. 추후 승인 전 외부 홍보용 확정 자산으로 사용하지 않음.
- **화면:** [`../../studio/secretary/`](../../studio/secretary/) — 외형 고정, 6방향 전환, SVG 뷰포트의 미세 위치·기울기·크기 모션.
- **SVG의 정확한 의미:** `refs/turnaround-preview.svg`는 래스터(JPEG)를 `<image>`에 내장한 **SVG 컨테이너**입니다. 복잡한 얼굴·머리·의복을 벡터 경로로 복원한 것이 아니며, 실제 3D 메시·관절 리그도 아닙니다.
- **고화질:** 채팅 제공 원본·방향별 PNG/WebP는 별도 자산 팩에 있으며, 검수 후 영구 보관 위치에 등록해야 합니다. `refs/turnaround-preview.svg`는 6각도 동작을 확인하는 작은 샘플입니다.
- **제한:** 호흡·인사·설명·끄덕임은 **이미지 전체의 미세한 모션**입니다. 손가락, 팔, 무릎, 입이 개별로 움직이지 않습니다.
- **변경 규칙:** 얼굴·복장을 새로 그리지 않고 원본을 이용해야 합니다. 인물 외형을 새로 합성·수정할 때는 버전을 새로 만들고 검수 기록을 남깁니다.

## 코드 재사용

```html
<link rel="stylesheet" href="/studio/secretary/styles.css">
<div id="staff-character"></div>
<script src="/studio/secretary/engine.js"></script>
<script>
  const actor = new AIStaffSecretary.Actor(document.querySelector('#staff-character'), {
    source: '/characters/secretary-skirt-01/refs/turnaround-preview.svg'
  });
  actor.setView('left_three_quarter').setMotion('present').setSpeed(1);
</script>
```

이 컴포넌트를 사용할 페이지에서는 `#staff-character`에 표시 높이·너비를 지정해야 합니다. 기본 컴포넌트 클래스(`secretary-character`)에 스튜디오 CSS의 애니메이션이 적용됩니다.
