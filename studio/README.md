# 클로이 모션 키트 1.5.0

착한거래에서 사용하는 CLO-02 클로이의 움직임을 다른 홈페이지에도 붙일 수 있는 독립형 키트입니다. 고개·몸·어깨·팔·손의 움직임과 눈 깜빡임을 웹에서 그립니다. 짧은 멘트를 번갈아 보여 주고 말풍선 위치를 조금씩 바꾸는 기능도 함께 들어 있습니다. 미리 만든 동영상 파일이나 외부 애니메이션 라이브러리를 반복 재생하지 않습니다. 움직임 실행 파일은 ChloeMotion 1.5.0, 말풍선 실행 파일은 ChloeDialogue 1.3.0입니다.

1.5.0에서는 시선과 동작이 방향을 바꾸거나 멈출 때의 흐름을 다듬었습니다. 포인터를 따라가던 고개는 현재 속도에서 부드럽게 감속하고, 스튜디오의 동작 전환은 현재 자세와 짧은 움직임의 여운을 함께 이어받습니다. 움직임이 과해지거나 발이 바닥 아래로 내려가지 않도록 이 여운의 범위를 제한합니다. 승인된 원본과 1.4.0의 눈·관절 연결을 사용합니다.

마우스처럼 정밀한 포인터가 있는 환경에서는 각 클로이의 위치를 기준으로 작게 반응합니다. 포인터가 한동안 움직이지 않거나 화면을 벗어나면 부드럽게 원래 방향으로 돌아갑니다. 일반 멘트 전환에는 작은 맞장구를 사용하고, 명시적으로 인사할 때는 `greet()`를 사용합니다. 주변을 살피고 몸짓을 건넨 뒤 쉬는 구간과, 고개 다음에 몸과 팔·손이 조금씩 늦게 따라오는 흐름도 이어집니다.

## 파일 구성

```text
chloe-motion.js          움직임 실행 파일
chloe-motion.css         캐릭터와 얼굴의 기본 크기 규칙
chloe-dialogue.js        멘트 순환·말풍선 이동·맞장구 연결
chloe-dialogue.css       말풍선 전환과 제어 버튼 스타일
assets/                 승인된 전신 이미지 3종 × 2개 크기
index.html              네 가지 형태·말풍선·제어 버튼을 확인하는 예제
README.md               이 문서
studio/                 동작 연출·세로/가로 촬영·무음 녹화 화면
assets/clo02-thumbs-up-master.webp  촬영용 1024×1536 무손실 원본
MANIFEST.sha256         배포 파일 무결성 확인용 SHA-256 목록
```

ZIP을 풀어 웹사이트의 같은 폴더에 올리면 됩니다. `index.html`은 해당 폴더를 HTTP(S)로 제공했을 때 실행하는 예제입니다. 파일을 더블클릭한 `file://` 환경은 브라우저의 이미지 보안 제한 때문에 움직임이 표시되지 않을 수 있습니다. 사용 중인 홈페이지의 미리보기 서버나 정적 웹서버로 확인하세요.

## 1. 전신 캐릭터를 자동으로 붙이기

아래 예시는 키트 파일이 현재 HTML과 같은 폴더에 있을 때의 상대 경로입니다.

```html
<link rel="stylesheet" href="./chloe-motion.css">

<div style="width:260px;max-width:100%">
  <img
    class="chloe-mascot"
    data-chloe-pose="thumbs"
    src="./assets/clo02-thumbs-up-640.webp"
    width="640" height="960"
    alt="친절하게 엄지를 들어 안내하는 AI 상담사 클로이"
  >
</div>

<script src="./chloe-motion.js" defer></script>
```

실행 파일이 `img[data-chloe-pose]`를 찾아 자동 적용합니다. 사용할 자세와 이미지를 함께 맞추세요.

| `pose` / `data-chloe-pose` | 이미지 파일 | 형태 |
|---|---|---|
| `thumbs` | `clo02-thumbs-up-640.webp` | 엄지척 |
| `compare` | `clo02-compare-640.webp` | 양쪽 안내 |
| `consultation` | `clo02-consultation-640.webp` | 휴대폰을 들고 인사 |

작은 배치에는 이름 끝이 `-320.webp`인 파일을 사용할 수 있습니다. 다른 캐릭터나 다른 자세의 이미지는 이 키트의 관절 위치와 맞지 않습니다.

## 2. 버튼 위에 얼굴만 붙이기

얼굴형은 `compare` 이미지에 맞추어져 있습니다. 아래 SVG는 움직임을 불러오기 전과 사용할 수 없는 환경에서 보여 주는 정지 얼굴입니다. 실제 상담 링크와 버튼의 배치는 각 사이트에서 정하면 됩니다.

```html
<span
  class="chloe-face"
  data-chloe-face
  data-chloe-src="./assets/clo02-compare-320.webp"
  aria-hidden="true"
>
  <svg viewBox="128 120 768 600" aria-hidden="true" focusable="false">
    <image
      href="./assets/clo02-compare-320.webp"
      width="1024" height="1536"
    />
  </svg>
</span>
```

`.chloe-face`의 너비를 조정하면 얼굴 크기가 함께 바뀝니다. 얼굴은 장식용으로 숨기고, 실제 버튼에는 별도의 읽을 수 있는 이름을 주세요.

## 3. 코드로 인사·맞장구·정지·재생 제어하기

자동 적용 대신 일반 `<img>`를 직접 지정할 수도 있습니다. 아래 코드는 실행 파일이 로드되고 해당 요소가 문서에 연결된 다음 실행합니다.

```html
<img id="my-chloe" class="chloe-mascot"
     src="./assets/clo02-thumbs-up-640.webp"
     width="640" height="960" alt="AI 상담사 클로이">
```

```js
const original = document.querySelector('#my-chloe');
const chloe = await window.ChloeMotion.mount(original, {
  pose: 'thumbs',
  faceOnly: false,
  autoplay: true,
  lookAtPointer: true
});

if (chloe) {
  chloe.greet();   // 한 번 반기는 동작
  // chloe.acknowledge(); // 다음 안내나 선택에 작은 맞장구를 보낼 때
  chloe.pause();   // 현재 동작을 멈춤
  chloe.play();    // 이어서 재생
  // chloe.destroy(); // 움직임을 해제하고 원래 요소 복원
}
```

위의 연속 호출은 메서드 사용법을 보여 주는 예시입니다. 실제 화면에서는 `index.html`처럼 각 버튼의 클릭에 하나씩 연결하세요.

| 항목 | 동작 |
|---|---|
| `ChloeMotion.version` | `1.5.0` |
| `mount(element, options)` | `Promise<controller \| null>` 반환. 사용할 수 없으면 원래 이미지 유지 |
| `pose` | `thumbs`, `compare`, `consultation` 중 하나 |
| `faceOnly` | 얼굴만 표시. 기본값 `false`; 얼굴형은 `compare` 권장 |
| `autoplay` | 자동 재생 여부. 기본값 `true` |
| `lookAtPointer` | 캐릭터 위치를 기준으로 포인터에 작게 반응하고, 입력이 멎으면 서서히 돌아옴. 기본값 `true` |
| `play()` | 재생 요청 |
| `pause()` | 수동 정지 |
| `greet()` | 인사 동작 요청. 수동 정지나 기기의 동작 줄이기 설정은 유지 |
| `acknowledge()` | 안내·선택에 작은 끄덕임과 몸짓으로 반응. 인사보다 작으며 정지·동작 줄이기 설정은 유지 |
| `destroy()` | 관찰과 렌더링을 해제하고 원래 이미지 또는 SVG 복원 |

얼굴의 SVG를 담은 요소도 `mount(wrapper, {pose:'compare', faceOnly:true})`로 지정할 수 있습니다. `data-chloe-src`에 이미지 경로를 넣으세요. 자동 적용한 요소에 다시 `mount()`를 호출해도 같은 컨트롤러를 사용합니다.

## 4. 여러 멘트가 이어지는 말풍선 붙이기

`chloe-dialogue.js`와 `chloe-dialogue.css`를 함께 불러오고 말풍선 요소에 `mount()`를 호출합니다. 아래는 바로 사용할 수 있는 예시입니다. 멘트 배열만 바꾸면 다른 홈페이지의 안내에도 사용할 수 있습니다.

```html
<link rel="stylesheet" href="./chloe-motion.css">
<link rel="stylesheet" href="./chloe-dialogue.css">
<style>
  .my-guide { width:280px; max-width:100%; }
  .my-speech {
    position:relative; margin:0 8px 15px; padding:14px 16px;
    border:1.5px solid #111; border-radius:16px; background:#fff;
    color:#111; font:14px/1.5 sans-serif;
    box-shadow:0 4px 0 #f6fd00;
  }
  .my-guide .chloe-mascot { width:220px; margin:auto; }
</style>

<div class="my-guide">
  <div id="my-speech" class="my-speech">
    <strong>어떤 차 찾으세요?</strong>
    <span>예산부터 알려주셔도 좋아요.</span>
  </div>
  <img id="talking-chloe" class="chloe-mascot"
       data-chloe-pose="thumbs"
       src="./assets/clo02-thumbs-up-640.webp"
       width="640" height="960" alt="AI 상담사 클로이">
</div>

<script src="./chloe-motion.js"></script>
<script src="./chloe-dialogue.js"></script>
<script>
  const talk = ChloeDialogue.mount('#my-speech', {
    character:'#talking-chloe',
    messages:[
      {title:'어떤 차 찾으세요?',
       body:'예산부터 알려주셔도 좋아요.'},
      {title:'몇 년쯤 타실까요?',
       body:'이용 기간도 맞춰서\n함께 살펴봐요.'},
      {title:'먼저 비교해 봐요.',
       body:'마음에 드는 조건인지\n천천히 살펴보세요.'}
    ],
    interval:8500,
    offsetX:5,
    offsetY:7
  });
</script>
```

`body`의 `\n`은 줄바꿈입니다. 제목은 짧게, 본문은 한두 줄 정도가 자연스럽습니다. 멘트는 문자로 넣으며 HTML 태그는 실행되지 않습니다. 본문이 필요 없는 작은 얼굴 말풍선은 `{title:'궁금한 점 있으세요?'}`처럼 쓸 수 있습니다.

| 항목 | 동작 |
|---|---|
| `ChloeDialogue.version` | `1.3.0` |
| `mount(element, options)` | 말풍선에 적용하고 컨트롤러 반환. CSS 선택자로 지정할 수도 있음 |
| `messages` | `{title, body}` 형태의 멘트 배열. `body`는 생략 가능 |
| `character` | 맞장구칠 캐릭터 요소, CSS 선택자 또는 요소를 반환하는 함수 |
| `interval` | 멘트를 읽는 기본 시간(ms). 예제는 `8500`으로 지정 |
| `offsetX`, `offsetY` | 가로·세로의 작은 이동 범위(px). 모바일에서는 CSS로 줄임 |
| `autoplay` | 자동 순환 여부. `false`이면 직접 넘기며 사용 |
| `initialDelay` | 첫 자동 전환까지의 시간(ms)을 따로 지정할 때 사용 |
| `onSpeak` | 멘트가 표시될 때 실행하는 콜백 |
| `next()` | 다음 멘트 직접 보기 |
| `say({title, body})` | 특정 멘트를 한 번 보여 주고 읽을 시간을 준 뒤 순환 이어가기 |
| `pause()` / `play()` | 말풍선 자동 순환 정지 / 재생 |
| `destroy()` | 말풍선을 해제하고 원래 안내 문구 복원 |

멘트가 바뀔 때 `character`로 연결한 클로이는 `acknowledge()`로 작게 맞장구칩니다. 직접 인사를 요청하려면 캐릭터 컨트롤러의 `greet()`를 호출하세요. 이전 버전의 움직임 실행 파일에 연결하면 기존 `greet()` 방식으로 동작합니다. 캐릭터를 움직일 수 없는 환경에서도 안내 문구는 사용할 수 있습니다. 같은 말풍선에 여러 번 `mount()`를 호출해도 이미 적용된 컨트롤러를 반환합니다.

각 멘트의 공간을 함께 확보하므로 자동 전환할 때 아래 버튼이나 내용이 밀리지 않습니다. 말풍선 자체는 고정된 자리를 기준으로 작게 이동하고, 기존 요소의 `transform`과 분리해서 적용합니다. 말풍선 주변에는 설정한 이동 범위만큼 여유를 두세요. 화면 가장자리에 딱 붙인 요소는 이동 폭을 더 작게 지정하는 편이 좋습니다.

말풍선의 작은 버튼으로 자동 순환을 정지하거나 다시 시작할 수 있습니다. 마우스를 올리거나 키보드로 선택하면 읽는 동안 기다리고, 화면 밖·숨겨진 요소·비활성 탭에서도 순환을 멈춥니다. 다시 보일 때는 읽을 시간을 새로 주며 밀린 멘트를 빠르게 재생하지 않습니다. **동작 줄이기** 설정에서는 자동 순환과 이동을 멈추지만 `next()`나 `say()`로 안내를 바꿀 수 있습니다.

자동 전환마다 화면 낭독기가 안내를 반복하지 않도록 `aria-live`를 사용하지 않습니다. 현재 표시된 문구는 읽을 수 있고, 숨겨진 다른 문구는 접근성 트리에서 제외합니다. 말풍선에는 자체 제어 버튼이 들어가므로 **링크나 버튼 안에 말풍선 요소를 넣지 말고 형제로 배치**하세요. 얼굴형 예제도 이 구조를 사용합니다.

## 5. 버튼 선택에 맞춰 멘트 바꾸기

메인 화면의 선택 버튼에서 `say()`를 호출하면 선택에 맞는 짧은 안내를 보여 줄 수 있습니다. 아래 코드는 앞 예제의 `talk`를 사용합니다.

```js
document.querySelector('#choose-return').addEventListener('click', () => {
  talk.say({
    title:'반납 기준으로 볼게요.',
    body:'월대여료와 이용 조건을\n함께 비교해요.'
  });
});
```

위 선택 버튼의 실제 기능은 사이트에서 별도로 구현하세요. 말풍선은 안내 문구와 캐릭터의 작은 반응을 담당합니다.

전체 정지·재생은 캐릭터와 말풍선에 각각 연결합니다. 예제의 제어 버튼들은 이 방식을 사용합니다.

```js
const chloe = await ChloeMotion.mount('#talking-chloe');
document.querySelector('#pause-all').addEventListener('click', () => {
  if (chloe) chloe.pause();
  talk.pause();
});
document.querySelector('#play-all').addEventListener('click', () => {
  if (chloe) chloe.play();
  talk.play();
});
```

## 6. 동작을 연출하고 영상으로 녹화하기

`studio/index.html`을 열면 대기·인사·설명·끄덕이기·정면 제자리 걷기·제자리 뛰기를 선택할 수 있습니다. 캐릭터의 크기·위치, 속도, 배경, 여러 대사를 조절하고 세로 9:16 또는 가로 16:9 화면을 무음 영상으로 녹화합니다. 브라우저 지원에 따라 MP4 또는 WebM 파일이 만들어집니다.

코드에서 사용할 때는 `ChloeMotion.createActor()`로 캔버스를 만들고 `draw(timeSeconds, {action: 'walk'})`처럼 시점과 동작을 지정합니다. 동작을 바꾸기 직전에 `actor.capturePose()`로 현재 표시된 자세를 받아 다음 `draw()`의 `fromPose`에 넘기면 전환 도중 다시 바꾸어도 그 자세에서 이어집니다. 최근 프레임이 이어져 있으면 짧게 감속하는 움직임도 함께 담습니다. 자세만 연결하려면 `capturePose({momentum: false})`를 사용합니다. `blend`에는 0~1의 원래 진행률을 전달하며, `transitionDuration`은 전환 시간(초)으로 기본값이 `0.55`입니다. 기존 `fromAction`, `fromTime`, `blend` 방식도 사용할 수 있습니다.

`clock`에는 동작을 바꿔도 이어지는 재생 시간을 초 단위로 전달합니다. 이 시계가 호흡·눈 깜빡임과 전환 전 속도 추적을 담당하므로, 새 동작을 시작할 때 눈까지 다시 시작하지 않습니다. 스튜디오는 약 0.55초 동안 동작을 연결하며, 재생 중 속도와 몸짓 크기를 바꾸면 천천히 새 값에 도달합니다. 정지한 장면의 조절값은 즉시 반영합니다.

일반 다시 시작은 표시 시간과 동작 시간을 0으로 돌리되 호흡·눈의 시계는 이어갑니다. 녹화 시작은 이전 자세와 모든 시계를 초기화하여 같은 설정의 시작 자세로 돌아갑니다. [스튜디오 문서](https://chakhan-sales.vercel.app/motion-studio/README.md)에 공유 시계를 사용하는 예제와 녹화기 API가 있습니다. 같은 문서가 ZIP의 `studio/README.md`에도 포함돼 있습니다.

현재 걷기·뛰기는 승인된 정면 그림의 제자리 동작입니다. 옆면·뒷면·360도 회전과 자유로운 보행은 3D 모델·뼈대·동작 클립을 별도로 제작해야 합니다. 녹화 결과에는 음성이 포함되지 않으며 유튜브에 자동 업로드하지 않습니다.

## 사용할 때 알아둘 점

- WebGL을 사용할 수 있는 Chrome, Safari, Firefox 계열 브라우저를 대상으로 합니다. 브라우저 종류와 관계없이 WebGL이 차단되거나 이미지 로드가 실패하면 정지 이미지를 유지합니다. 모든 버전·기기 조합에서 검증됐다는 뜻은 아닙니다.
- 사용자의 **동작 줄이기** 설정을 따릅니다. 화면 밖이나 비활성 탭에서는 움직임을 멈추어 불필요한 처리를 줄입니다.
- 홈페이지 모션과 스튜디오 미리보기는 `requestAnimationFrame`으로 60Hz 등 화면의 갱신 주기에 맞춰 그립니다. 실제 프레임 수는 기기·브라우저·장면 부하에 따라 달라지며 60fps를 보장하지 않습니다. 스튜디오 녹화는 별도로 30fps를 요청합니다.
- 이미지와 실행 파일은 같은 사이트에서 제공하는 구성이 가장 간단합니다. 다른 도메인의 이미지에는 올바른 CORS 응답과 이미지의 `crossorigin` 설정이 필요합니다.
- JavaScript가 꺼져 있어도 원래 `<img>` 또는 얼굴 SVG가 남습니다. 별도의 상담 링크나 버튼 기능은 페이지에서 구현하세요.
- 얼굴·몸 비율과 캐릭터 식별을 유지하기 위해 승인된 이미지를 함께 배포합니다. CLO-02의 이름은 **클로이**입니다.
- 모션 키트에는 카카오톡 연결, 메시지 발송, 분석 태그 또는 AI 상담 서버가 포함되어 있지 않습니다. 말풍선은 페이지에 지정한 안내 문구를 보여 주며, 실제 상담 답변을 생성하지 않습니다.

## 개발 원본과 다시 묶기

캐릭터 움직임의 정본은 루트의 **`clo02-motion.js`**, 말풍선의 정본은 **`chloe-dialogue.js`와 `chloe-dialogue.css`**입니다. ZIP 안의 `chloe-motion.js`는 `clo02-motion.js`를 배포할 때 복사한 파일입니다. ZIP이나 생성된 미리보기에서 따로 코드를 수정하지 마세요.

```sh
python3 tools/build-chloe-motion-kit.py
```

이 명령은 다음을 만듭니다.

- `downloads/chloe-motion-kit-1.5.0.zip`: 다른 사이트로 가져갈 독립형 파일 묶음
- `motion-demo/index.html`: 같은 저장소의 실행 파일과 이미지를 참조하는 공개 미리보기

예제 원본은 `packages/chloe-motion/demo.html`, 기본 스타일은 `packages/chloe-motion/chloe-motion.css`입니다. 이미지 정본은 `assets/clo02/`에 있습니다. 빌드 시 실행 코드·이미지를 별도 원본으로 복제하지 않습니다. 이미 다른 사이트에 복사한 키트는 해당 사이트에서 새 버전으로 교체해야 반영됩니다. 기존 1.1.0·1.2.0·1.3.0·1.4.0 ZIP도 그대로 보존합니다.

## 저장소에서 동작 검증하기

```bash
node tools/validate-chloe-motion.cjs
node tools/validate-chloe-motion.cjs --attention-only
```

전체 검사는 Node.js와 Pillow가 설치된 Python이 필요합니다. `CHLOE_VALIDATOR_PYTHON`으로 Python 실행 파일을 지정할 수 있습니다. 포인터 검사만 실행할 때는 Node.js만 필요합니다. 결과 JSON은 운영체제의 임시 폴더에 저장하며, 실행 파일 경로와 보고서 경로를 인자로 직접 지정할 수도 있습니다.

검사는 세 자세와 얼굴 크롭, 눈을 감은 상태, 관절의 연결, 발이 지면에 머무르는 위치, 동작 전환과 반복 가능한 자세, 서로 다른 프레임 간격에서의 포인터 반응을 확인합니다. 수치 검사를 통과해도 눈과 관절의 실제 모양은 브라우저에서 함께 확인해야 합니다.
