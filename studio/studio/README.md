# 클로이 모션 스튜디오 1.1

CLO-02 클로이의 승인된 정면 원본으로 동작과 대사를 연출하고 무음 영상을 녹화하는 화면입니다. 캐릭터 실행 파일은 ChloeMotion 1.5.0입니다. 홈페이지의 대기 모션과 같은 원본·렌더러를 사용하며 영상 파일을 반복 재생하는 방식이 아닙니다.

모션 스튜디오 1.1.0은 ChloeMotion 1.5.0을 사용합니다. 동작 버튼을 연달아 누르면 현재 자세와 움직이던 속도를 짧게 이어받아 약 0.55초 동안 다음 동작으로 연결합니다. 감속하는 여운은 변형 범위와 발의 바닥 위치에 맞춰 제한합니다. 작은 호흡과 눈 깜빡임은 동작과 별도의 시계를 따라 이어집니다.

재생 중 속도를 바꿔도 진행 중인 걸음의 시점이 건너뛰지 않습니다. 속도와 몸짓 크기는 새 값에 부드럽게 접근하며, 일시정지한 장면에서는 조절값을 바로 확인할 수 있습니다. 1.4.0에서 다듬은 원본 얼굴·눈·속눈썹과 연결된 관절을 함께 사용합니다.

## 지금 할 수 있는 것

- 대기, 인사, 설명, 끄덕이기, **정면 제자리 걷기와 가벼운 제자리 뛰기**를 선택합니다.
- 동작 속도·크기, 캐릭터 크기·좌우 위치를 조절합니다.
- 쇼츠용 1080×1920 또는 가로 1920×1080 촬영 화면을 고릅니다.
- 흰색·노랑·검정·초록 크로마키 배경을 고릅니다. 초록 배경에는 브랜드 글자와 바닥 그림자를 그리지 않습니다. 캐릭터만 편집하려면 말풍선도 끄세요.
- 한 줄씩 입력한 대사는 약 4.6초마다 교대하며 말풍선 위치가 조금 바뀝니다. 전체 90자, 빈 줄을 제외한 최대 6개 멘트입니다.
- 6·12·20초를 선택해 브라우저에서 녹화합니다. 일찍 끝내기도 가능합니다. 배경·캐릭터·말풍선을 모두 하나의 캔버스에 그리므로 결과에 함께 포함됩니다.
- 녹화는 무음입니다. 실제 AI 상담 답변, 음성 생성, 입 모양 동기화, 유튜브 업로드 기능은 들어 있지 않습니다.

`동작을 이어서 시연`은 인사 → 걷기 → 설명 → 뛰기 → 대기를 12초 안에 이어 보여 줍니다. 일반 재생에서는 선택한 동작을 반복합니다. 일반 다시 시작은 표시 시간과 동작 시간을 0으로 돌리고, 보이던 자세와 호흡·눈의 흐름은 이어갑니다. 녹화 시작은 이전 미리보기 자세와 모든 시계를 초기화하여, 같은 설정이면 같은 시작 자세에서 녹화합니다.

## 사용 환경과 저장 형식

폴더를 HTTP(S)로 제공해 `studio/index.html`을 여세요. 이미지 파일을 직접 여는 `file://` 방식은 이미지 보안 정책 때문에 동작하지 않을 수 있습니다. 캐릭터 동작에는 WebGL, 녹화에는 canvas.captureStream과 MediaRecorder가 필요합니다. 지원하지 않는 환경은 원본 정지 그림과 안내를 표시하며 동작·녹화를 사용할 수 없습니다.

저장 형식은 브라우저가 실제 지원하는 MP4 또는 WebM입니다. MP4를 먼저 시도하고, 지원되지 않으면 WebM을 사용합니다. 파일 확장자는 실제 인코딩 형식을 따릅니다. WebM 파일이 나왔을 때 확장자만 MP4로 바꾸지 마세요.

미리보기는 `requestAnimationFrame`으로 60Hz 등 화면의 갱신 주기에 맞춰 그립니다. 녹화는 별도로 30fps를 요청합니다. 실제 프레임 수는 기기·브라우저·장면 부하에 따라 달라지며 60fps 미리보기나 모든 녹화 프레임을 보장하지 않습니다. 기기의 **동작 줄이기** 설정이 켜져 있으면 스튜디오는 정지 상태로 시작하고, 재생 버튼으로 직접 시작할 수 있습니다. 숨겨진 탭에서는 미리보기 시간을 진행하지 않습니다. 홈페이지의 `mount()` 모션에 적용되던 화면 밖 정지와 동작 줄이기 처리도 유지됩니다.

현재 녹화는 **실시간 녹화**입니다. 브라우저의 처리 속도가 부족하면 프레임이 줄 수 있으며, 1080 규격 출력이 원본 그림보다 더 많은 세부 묘사를 만들어 내는 것은 아닙니다. 원본은 1024×1536 무손실 WebP입니다. 탭이 숨겨지면 녹화를 종료하고 그때까지의 부분 영상을 제공합니다. 녹화기는 최대 30초, 보관 녹화 데이터 최대 50MiB로 제한합니다.

## 웹 화면을 코드로 연출하기

스튜디오의 `studio.js`를 불러온 화면에서 아래 인터페이스를 사용할 수 있습니다.

```js
ChloeStudio.act('walk');
ChloeStudio.say('안녕하세요, 클로이예요.\n함께 비교해 볼까요?');
ChloeStudio.play();
// ChloeStudio.pause();
// ChloeStudio.restart();
// ChloeStudio.getState();
```

이는 화면에 있는 동작 버튼과 같은 기능입니다. 실행 시 실제 AI 답변을 생성하거나 외부로 메시지를 보내지 않습니다.

## 다른 장면에 캐릭터를 넣기

키트 루트의 `chloe-motion.js`를 먼저 불러옵니다. 아래 경로는 키트 루트에서 사용하는 예시입니다. `createActor()`가 만드는 캔버스는 문서에 자동 삽입하지 않습니다. 아래처럼 출력 캔버스와 동작 버튼을 준비합니다.

```html
<canvas id="my-scene" width="1080" height="1920"></canvas>
<button type="button" data-chloe-action="idle">대기</button>
<button type="button" data-chloe-action="walk">걷기</button>
<button type="button" data-chloe-action="explain">설명</button>
```

```js
const actor = await ChloeMotion.createActor({
  src: './assets/clo02-thumbs-up-master.webp',
  pose: 'thumbs',
  width: 1024,
  height: 1536
});

if (actor) {
  const output = document.querySelector('#my-scene');
  const ctx = output.getContext('2d');
  const transitionDuration = 0.55;
  let action = 'idle';
  let clock = 0; // 동작을 바꿔도 이어지는 재생 시간
  let startedAt = 0;
  let lastNow = performance.now();
  let fromPose = null;
  let frameRequest = 0;

  function changeAction(nextAction) {
    if (!actor.supportedActions.includes(nextAction)) return;
    // 전환 중 다시 바꾸어도 실제 보이는 자세와 움직임을 한 번 받습니다.
    fromPose = actor.capturePose();
    // 정지 자세만 연결할 때: actor.capturePose({momentum: false})
    action = nextAction;
    startedAt = clock;
  }
  function resetFrameTime() { lastNow = performance.now(); }
  function frame(now) {
    const delta = Math.max(0, (now - lastNow) / 1000);
    lastNow = now;
    if (document.hidden) {
      frameRequest = requestAnimationFrame(frame);
      return;
    }
    clock += delta;
    const seconds = clock - startedAt;
    const drawn = actor.draw(seconds, {
      action, speed: 1, intensity: 0.7, clock,
      fromPose, transitionDuration,
      // 원래 진행률을 전달하면 실행 파일이 한 번만 부드럽게 만듭니다.
      blend: fromPose ? seconds / transitionDuration : 1
    });
    if (!drawn) return;
    ctx.clearRect(0, 0, output.width, output.height);
    // 같은 프레임에서 즉시 복사합니다.
    ctx.drawImage(actor.canvas, 0, 0, output.width, output.height);
    frameRequest = requestAnimationFrame(frame);
  }
  document.querySelectorAll('button[data-chloe-action]').forEach(button => {
    button.addEventListener('click', () => changeAction(button.dataset.chloeAction));
  });
  document.addEventListener('visibilitychange', resetFrameTime);
  frameRequest = requestAnimationFrame(frame);
  // 종료할 때:
  // cancelAnimationFrame(frameRequest);
  // document.removeEventListener('visibilitychange', resetFrameTime);
  // actor.destroy();
}
```

배경·대사·다른 오브젝트도 `output`에 그린 뒤 `recorder.js`에 같은 캔버스를 넘기면 하나의 장면으로 녹화할 수 있습니다. DOM 요소로 표시한 자막은 캔버스 녹화에 자동 포함되지 않습니다. 이 저수준 API에서는 호출하는 화면이 재생 시계·숨김·동작 줄이기 처리를 관리합니다. 재생 종료 때는 호스트의 프레임 반복을 취소하고 `actor.destroy()`를 호출하세요.

| 인터페이스 | 의미 |
|---|---|
| `createActor({src, pose, width, height})` | `Promise<actor \| null>`. 원본 로드 또는 WebGL 사용 불가 시 `null` |
| `actor.canvas` | 투명 배경의 캐릭터 캔버스 |
| `actor.supportedActions` | 이 자세에서 지원하는 동작 이름 |
| `draw(seconds, options)` | 해당 시점의 자세를 그림. 정상 `true`, 폐기·그래픽 오류 시 `false` |
| `capturePose()` | 마지막으로 표시한 자세의 복사본 반환. 최근 프레임이 이어져 있으면 제한된 움직임의 여운도 포함. 폐기된 캐릭터는 `null` |
| `capturePose({momentum: false})` | 움직이던 속도를 제외하고 현재 자세만 복사 |
| `action` | `idle`, `greet`, `explain`, `nod`, `walk`, `run` |
| `speed` | `seconds`에 곱하는 배율. 기본 1. 스튜디오는 0.5~1.5의 속도를 동작 시간에 누적하고 이 값은 1로 전달 |
| `intensity` | 몸짓 크기 0~1. 스튜디오 기본 0.7. `clock`을 전달하면 눈 깜빡임은 별도로 이어짐 |
| `clock` | 동작 시간과 별도로 계속 이어지는 재생 시간(초). 호흡·눈 깜빡임·전환 전 속도 추적에 사용. 일시정지 중에는 멈추고 동작 전환 때는 되돌리지 않음 |
| `fromPose` | `capturePose()`에서 받은 자세. 같은 캐릭터의 다음 동작에 전달하며 이전 동작 정보보다 우선 |
| `blend` | 0~1의 원래 전환 진행률. 실행 파일에서 smootherstep을 한 번 적용. 스튜디오는 0.55초에 걸쳐 0→1로 전달 |
| `transitionDuration` | `blend`가 0→1이 되는 시간(초). 기본 0.55. 움직임의 여운을 실제 전환 시간에 맞춤 |
| `fromAction`, `fromTime` | `fromPose`가 없을 때 이전 동작의 특정 시점에서 전환하는 기존 방식 |
| `destroy()` | 그래픽 자원 해제 |

`seconds`와 `fromTime`은 `speed`를 적용하기 전 초 단위입니다. 재생 중 속도를 변경할 때는 스튜디오처럼 프레임마다 지난 시간에 현재 속도를 곱해 동작 시간에 누적하고, `draw()`에는 `speed: 1`을 전달하세요. `clock`과 전환 진행률은 이 속도와 별개의 재생 시간을 사용합니다. 그러면 속도를 바꿀 때 이미 지난 동작 시간이 다시 배율을 적용받지 않습니다.

동일한 시간·옵션·`fromPose`는 동일한 자세를 만듭니다. `capturePose()`의 반환값은 내부 자세 스냅샷이므로 직접 수정하지 않고 `fromPose`로 전달하세요. 캡처는 동작을 바꿀 때만 하며 매 프레임 새로 받지 않습니다. 최근 프레임 사이의 간격이 너무 길거나 초기 한 프레임만 표시된 경우에는 속도 추적 없이 자세를 연결합니다. 정지 중에 새 동작을 정하거나 움직임의 여운이 필요 없을 때는 `momentum: false`를 지정할 수 있습니다.

일반 동작 전환에서는 `clock`을 유지합니다. 녹화를 같은 자세에서 다시 시작하려면 이전 `fromPose`를 비우고 동작 시간과 `clock`을 0, `blend`를 1로 초기화합니다. `clock`을 생략하는 기존 호출과 `fromAction`·`fromTime` 방식도 사용할 수 있습니다.

`walk`·`run`은 `thumbs` 원본에 맞춘 **정면 2D 제자리 동작**이며 다른 자세에서는 `idle`로 처리합니다. 승인된 자세와 관절이 다른 이미지에는 그대로 적용할 수 없습니다.

## 녹화기 인터페이스

```js
const capture = ChloeRecorder.create(outputCanvas, {
  fps: 30,
  maxDurationMs: 30000,
  onState(state) { /* 녹화 상태·진행 시간 표시 */ },
  onComplete({blob, extension, durationMs}) {
    // 다운로드 URL은 사용하는 화면이 만들고, 더 이상 필요 없으면 해제합니다.
  },
  onError(error) { /* error.message 표시 */ }
});
capture.start({durationMs: 12000});
// capture.stop();
// capture.destroy();
```

파일은 마지막 데이터가 도착한 뒤 전달됩니다. `capture.state`에서 `status`, `supported`, `busy`, `elapsedMs`를 확인할 수 있습니다. 이 헬퍼는 마이크·카메라·네트워크를 사용하지 않습니다.

## 앞으로의 3D 캐릭터

현재 자산은 **정면 2D 그림을 연결된 메시로 움직이는 구조**입니다. 360도 회전, 옆면으로 달리기, 뒤돌기, 바닥을 이동하는 큰 보행, 물건을 집는 정확한 손동작은 이 원본에서 완성됐다고 보지 않습니다.

이 범위로 확장하려면 승인된 얼굴·머리·몸 비율과 명찰을 유지한 전후좌우 3D 모델, 뼈대와 관절 연결, 발 접지 및 손 조절, 동작 클립이 필요합니다. 정면 그림으로 보이지 않는 뒷면 디자인을 임의 확정하지 않습니다. 향후 3D 렌더러도 `draw(time, action)`과 캔버스 출력 경계에 연결하면 화면 구도·대사·녹화 구조를 이어 사용할 수 있습니다. 현재 구현이 3D 모델 제작이나 모든 동작 생성을 자동으로 완료하는 것은 아닙니다.

## 소스 구성

- `studio.js`: 장면 시계·구도·대사·최종 캔버스 합성
- `recorder.js`: 무음 실시간 캔버스 녹화
- `index.html`, `studio.css`: 동작·촬영 조절 화면
- `../chloe-motion.js`: 캐릭터의 동일 정본. 저장소에서는 `/clo02-motion.js`

수정은 저장소 정본에서 한 뒤 `python3 tools/build-chloe-motion-kit.py`로 다시 묶습니다. 웹사이트에 복사한 ZIP은 새 버전으로 직접 교체해야 합니다.
