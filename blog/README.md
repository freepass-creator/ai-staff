# 착한거래 블로그 제작소 v1

이 도구는 [AI Staff 공통 채널 제작 엔진](../production/README.md)의 블로그 어댑터다. 전체 홍보 작업은 /production/에서 공통 브리프를 만들고 채널별로 나눈다.

무료 GPT가 구조화 원고를 만들고, AI Staff가 형식 검사·이미지·전달 묶음을 만드는 로컬 도구다. 기존 네이버 게시물과 PC1 AI Link의 발행 owner를 보존한다. 계정 연결·자동 게시 기능은 없다.

## 실행

저장소 루트에서 `node blog/server.cjs`를 실행하고 출력된 `http://127.0.0.1:<port>/blog/`를 연다. 유료 API·추가 npm 설치가 필요 없다. `AI_STAFF_BLOG_PORT`로 포트를 지정하고 `AI_STAFF_BLOG_DATA`로 보관함 경로를 지정할 수 있다. 기본 보관함은 `D:/dev-artifacts/ai-staff/blog-engine-20261114/library`다. 화면·Claude·기존 브라우저를 조작하지 않는다.

이미지 제작은 승인된 `D:/large/ai-staff/클로이/blog-production-kit-ver2-20261114/fullbody`의 6개 PNG를 읽는다. 서버는 intro, point-right, point-left, thumbs-up, think, present만 제공한다. 파일을 git에 복제하지 않는다. 정적 호스팅만으로 이 로컬 자산을 읽거나 보관함을 저장할 수는 없다.

## 사용 순서

1. **기존 게시 목록 갱신**: 공개 RSS의 최근 제목만 확인한다. 조회 실패/24시간 경과는 `duplicate_unknown`이다. 과거 전체 글·미발행 초안의 전수 검사는 아니다.
2. **주제 입력 → GPT 작업지시 만들기**: 한 번에 1~12개. 설명·비교·체크리스트·문답·가상 상황·오해 풀기를 최근 사용량에 따라 배분한다. 작업지시 TXT를 무료 GPT에 주면 된다. 별도 계정 생성이나 API 키는 필요 없다.
3. **JSON 가져오기**: 1~20개 원고 배열 또는 파일. 주문 ID·주제 키·스냅샷 해시·구성 유형을 대조한다. 지원하지 않는 필드, 출처 ID 오류, 계산 오류, 게시 제목 중복, 보관함 내 본문 중복을 검사한다. 기존 job_id를 다시 가져오면 새 버전으로 보관하며 서버 history에 이전 상태가 남는다.
4. **원고 선택 → 이미지 만들기**: 같은 자료에서 1200px PNG를 만든다. 이미지 Pretendard 500/700/900, 본문 카드 최소56px(350px 표시에서 약16.3px), 표지84px. 표지 보조문장은42px이므로 짧게 쓰고 핵심 정보는 본문에도 둔다. 한 장이 길어지면 문구를 줄이거나 소제목을 분리한다. 클로이는 표지에만 넣는다.
5. **모바일390px 확인 → AI 링크용 ZIP**: PNG·분할HTML·UTF-8 CF_HTML·일반텍스트·원본JSON/Markdown·검사 결과·순서 manifest·SHA256를 묶는다. 사용자 PC에 내려받은 ZIP을 기존 AI Link 담당에 전달한다. 이 도구가 PC1에 자동 전송하지는 않는다.

`6개 구성 시연 불러오기`는 사용법 시연이다. 시연 작업은 demo 표시를 제거할 수 없고 manifest도 `demo_only`다. 실사용 원고는 새 주문서에서 만든다.

## GPT 원고 계약

작업지시의 JSON 예시가 정본이다. `schema_version`, `job_id`, `topic_key`, `source_snapshot_hash`를 그대로 유지한다. 제목과 별도로 `cover_headline` 5~32자, deck은 표지에 들어갈 짧은 설명을 쓴다. 임의 HTML/CSS/명령/파일경로/게시 승인 필드를 받지 않는다. 원고 내용은 출력할 때 항상 이스케이프한다.

소제목 3~8개 중 visual:true를 1~3개 고른다. checklist의 items, compare의 pairs/calculation, qna의 questions를 사용한다. 현재 가격·약관 등 current_fact에는 sources와 연결된 source_ids가 있어야 한다. **출처 형식이 맞아도 실제 사실 확인이 끝난 것은 아니다.** 무료 GPT가 검색할 수 없으면 현재 사실을 꾸미지 않고 일반적인 확인 방법으로 작성한다. 추가 일러스트는 image_briefs로만 전달하며 자동 생성하지 않는다.

계산은 안전한 원 단위 정수만 받는다. `월 대여료×개월 + 초기 소모 비용 + 만기 소모 비용`을 코드로 계산한다. 반환 예정 보증금은 합산하지 않는다. 합계가 실제 상품의 완전한 총소유비용이라는 뜻은 아니며 모든 예시에는 `가상 예시 · 실제 견적 아님`을 붙인다. 서로 다른 기간의 합계는 유불리를 단정하지 않는다.

## AI Link 전달 계약

`naver-manifest.json`은 기존 PC1 입력 계약의 `id`, `title:'title.txt'`, `state:'ready_to_edit'`, 순서가 있는 steps(html/image), `missing_images:[]`, note를 유지한다. 표지는 첫 HTML 다음에 들어가며 본문 이미지는 해당 소제목 다음에 놓인다.

`ready_to_edit`는 입력 형식 상태이며 발행 승인이 아니다. `production_state`는 demo_only/duplicate_unknown/format_ready이고 `publish_authorized:false`를 고정한다. 네이버 입력 담당은 기존 권한 안에서 사실·중복·편집 화면·공개 결과를 별도로 확인해야 한다.

분할 HTML 본문18px/줄1.85/문단아래22px, 소제목24px/700이다. **네이버 편집기에서 나눔고딕을 선택해야 한다.** HTML font-family만으로 실제 서체가 보장되지 않는다. PC1 실측에서 source18px는 PC19px·모바일20px로 변환됐으므로 입력 후 실제 텍스트의 글꼴·크기·줄높이·이미지 로딩·가로 넘침을 회수 확인한다. cfhtml은 UTF-8 **바이트 오프셋**이며 Windows Html 클립보드에 binary MemoryStream으로 넣어야 한다. ANSI 문자열로 변환하면 안 된다.

기존 완료20편+40이미지는 PC1 소유의 두 final batch에 있다. 이 엔진의 새 빈 보관함을 기존 재고가 없다는 뜻으로 해석하지 않는다. `inventory-baseline.json`은 알려진 출처와 최근 공개 제목 기준을 보존하며 과거 본문 중복 검사는 미지원이다.

## 검증

`node --test blog/core.test.cjs` — 잘못된 JSON, 주문 결합, 중복, 안전한 계산, HTML 이스케이프, CF_HTML 바이트, ZIP 계약.

`node blog/verify-browser.cjs` — 이 PC의 기존 Playwright/Edge 런타임을 이용하는 통합 검증. `BLOG_TEST_URL`로 실행 중 서버 URL을 지정한다. 해당 경로의 런타임은 프로젝트 의존성으로 배포하지 않는다. 별도 개발 PC에서는 자체 Playwright 경로로 조정한다. 증거와 다운로드는 D:/dev-artifacts/ai-staff/blog-engine-20261114에 저장한다. 검증은 로컬 보관함에 시연 원고를 넣으며 네이버에 접속하거나 게시하지 않는다.

보관함 저장은 revision 충돌을 검사하며 RSS 갱신과 저장을 직렬화한다. localhost Host·Origin을 확인하고 임의 URL·경로·명령을 실행하는 API는 두지 않는다. 변경 이력 자동 삭제·외부 계정 변경·백그라운드 예약은 하지 않는다.
