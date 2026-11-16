# ERP5 영업 목록 가을 배너

클로아(CLO-04)와 문구를 왼쪽에, 은행나무와 낮은 산이 보이는 가을 풍경을 오른쪽에 둔 검토 시안이다. 안내와 응원 두 장에 적용했다. 원문과 카카오 연결은 ERP5의 기존 배너를 사용한다.

| 목록 화면 너비 | 좌우 여백 | 실제 배너 | 클로아 |
| --- | --- | --- | --- |
| 웹 1280px | 각 24px | 1232 × 96px | 52 × 52px |
| 모바일 390px | 각 16px | 358 × 80px | 40 × 40px |
| 모바일 360px | 각 16px | 328 × 80px | 40 × 40px |

![웹 안내 배너](review/notice-web.webp)

![390px 모바일 안내 배너](review/notice-mobile.webp)

![360px 모바일 응원 배너](review/cheer-mobile.webp)

## ERP5에 연결하는 방법

1. `banner.css`, `autumn-landscape.webp`를 같은 폴더에 두고 기존 목록 CSS 다음에 같은 도메인의 `banner.css`를 읽는다. 풍경은 780 × 260px이며 표시창에 맞춰 오른쪽부터 잘린다.
2. 가을의 `.bnx-note`와 `.bnx-cheer`에 `erp-autumn` 클래스를 추가한다. 기존 `data-wd`의 영문 요일 코드로 팔레트가 바뀐다. 배너 날짜·카피·넘김과 데이터 슬라이드는 ERP5에서 관리한다.
3. 시안의 두 슬라이드는 얼굴 이미지 한 장씩을 첫 자식으로 쓴다. 시안 재현 시 `<img class="autumn-face" src="/assets/banner/review/cloa-128.webp" width="52" height="52" alt="" loading="lazy">`를 쓴다. 확정 후 기존 얼굴 슬롯을 활용할 때도 한 장씩만 렌더링한다. 얼굴은 참조 이미지에서 잘라 만든 검토용이며 출처·크롭·상태는 `review/face-source.json`에 있다.
4. 카카오 링크는 남색 말풍선 아이콘과 ‘카카오톡 채널 열기’ 문구를 한 줄로 표시한다. 웹에서는 본문 오른쪽, 모바일에서는 본문 아래에 놓인다. 모바일의 ‘안내’는 얼굴 아래에 있고 터치 범위는 안내 카드 전체다.

## 자산

- `library.json`에 버전과 개별 SHA-256이 있다. 요일별 배경·글자·테두리·장식 색은 `autumn-palette.json`에 있다.
- 풍경 대신 요청서의 두 겹 잎 장식을 쓰는 경우, 같은 경로에 네 SVG를 복사하고 슬라이드에 `erp-autumn--leaves`도 추가한다. 잎은 웹 양끝 110 × 96px, 모바일 양끝 54 × 80px에 색상 마스크로 표시된다.
- 풍경 5,150바이트와 장식 SVG 네 장 2,770바이트를 합쳐 7,920바이트다. 얼굴은 별도 파일이다.

검토 이미지는 운영 목록을 연 브라우저에서 디자인 파일만 교체하여 캡처했다. 웹 담당자는 배포할 때 ERP5 정적 자산 등록과 실제 도메인 확인을 이어간다. [ERP5 디자인 요청서](https://github.com/freepass-creator/freepasserp5/blob/d490e3edc9ce0bf5b97198a8771e8afa6349693d/docs/design-briefs/banner-20261116/README.md)
