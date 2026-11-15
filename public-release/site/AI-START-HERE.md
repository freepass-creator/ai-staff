# AI Staff 현재 캐릭터 사용

**단일 캐릭터 진입점: https://ai-staff-two.vercel.app/api/characters/current**

[연동 규격](CHARACTER-API.md) · [검증 클라이언트](character-client.mjs). 새 출력마다 현재 목록을 읽고 ID/revision/url을 사용한다. PNG는 서버와 클라이언트에서 SHA256을 확인한다. 구버전 ID·옛 해시는410으로 중단하며 과거 파일을 대신 선택하지 않는다.

현재 자동선택은 CLO-02 정면정본2종, 착한거래 포즈7종, 승인 프로필1장이다. 착한거래는 흰 외장·노란 발광·착한거래 명찰이다. 기본 보라 정면은 프리패스용이며 용도를 바꾸지 않는다. 일반 클로이만으로는 변형을 임의 선택하지 않는다.

표지에는 고민·깨달음·시무룩함·자신감을, 상담에는 전화·태블릿·대상안내를 고른다. 미리보기 /chakhan/, 표지4예시와 문구조판키트는 chakhan-use-cuts.json. 원고에 맞는 usage/tags로 선택하며 같은 PNG의 얼굴·손·몸을 다시 생성하지 않는다. 구 로봇37컷/옛 표지/이를담은ZIP/각도연구는 공개철회했다.

프로필은 profile-selected-02 한 장만 허용한다. 디자인참조 정면이나 블로그포즈로 대체하지 않는다. 손은 엄지 외 긴손가락4개이며 두께·길이·엄지기저볼륨·관절연결을 눈으로 확인한다. hand-grip-policy.json 참조. SVG·3D·물리성능 동일성을 주장하지 않는다.

사람형과 다른직원 참고자료는 catalog.json과 현재 일반묶음에 보존했다. design_proposal인 COD-01/COD-03/CLO-04 R1은 생산API에 포함하지 않는다. 01/03남성,02/04여성이다. CLO-01/CLO-03캐릭터는없다. 번호와PC역할은별개다.

표지제목은 SUITE Heavy, 본문 Noto Sans KR, CI는 승인P2. 고정PNG의 문구·배경·배치만 바꾼다. 실제 고객·차량·계약 증빙이 필요한 문단은 실제 자료를 쓴다. 문구조판은 render-covers.mjs로 수행하고 폰트/CI/SHA를 확인한다.
