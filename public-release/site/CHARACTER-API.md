# AI Staff VER1.0 — 현재 자산

단일 진입점: https://ai-staff-two.vercel.app/api/characters/current

현재26개: 로봇 정면3(기본 클로이/착한거래 클로이/클로아), 새 착한거래 포즈7, 사람형12, 손정본3, 공통 어깨1. 프로필은 구디자인으로 제공 중단했다. 구정면·R1 클로아·과거7포즈SHA·옛 SVG/모션/표지완성본·혼합ZIP은 현재 선택과 다운로드에서 제외한다. 원본은 로컬 이력으로만 보존하며 fallback하지 않는다.

CLO02와 CLO04는 VER1.0 공통 플랫폼이다. 넓은 검은 LCD 화면과 큰 눈의 비율, 몸/관절 비율, 여성형 원형 발광 어깨, 흰 광택 도장과 진회색 연속 손바닥을 유지한다. 02의양옆핀/보라색(착한거래는노랑)/속눈썹미소, 04의링안테나/amber/세줄볼표시/열린미소는 구별한다. 같은 플랫폼은 비주얼 설계 기준이며 실측3D모델·리그를 제공한다는 뜻은 아니다.

정면 ID: canonical-basic-purple-v1, canonical-chakhan-white-v1, canonical-cloa-amber-v1. 포즈 ID: cover-think, cover-aha, cover-dejected, cover-confident, phone, tablet, guide-right. ID만 저장하고매번 current에서 revision/SHA/url을새로받는다. 과거hash로요청하면410이며사람형에는로봇손/외장을적용하지않는다.

기존 이미지는 API PNG를그대로사용한다. 새 생성은 generation_url에 brief를추가하거나 다음명령을사용한다.

    node prepare-generation.mjs --id canonical-chakhan-white-v1 --brief "장면 설명" --output 새빈폴더
    node prepare-generation.mjs --check 생성한폴더

준비파일 imagegen-request.json의 실제 PNG 참조를 생성 도구에 첨부한다. 로봇은 정면·포즈 모두 같은 변형의 최신 정면+손3뷰+원형어깨, 정확히5종 PNG를 첨부한다. 선택한 포즈의 행동 힌트는 별도 문장으로 전달하며 포즈 PNG를 여섯 번째 첨부로 더하지 않는다. 손 참조를 생략하거나 5개 첨부 상한을 넘기지 않는다. 생성후각손엄지외4개/총5개·두께길이·손목연결·브랜드·얼굴비율·원형어깨를직접확인한다. 생성은자동게시/자동승격하지않는다.

현재 정적 PNG가배포형식이다. VER1.0용 SVG/관절리그는아직없으며 옛SVG를대신쓰지않는다. 새캐릭터키트는 catalog.json의 downloads.assets(정면3+포즈7+안내+공개메타). 예전코드/source.bundle/인수원문/비밀값은공개패키지에넣지않는다.
