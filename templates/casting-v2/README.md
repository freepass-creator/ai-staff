# 캐스팅 파일 v2

`CASTING-ABS-v2.0`의 정식 6장 템플릿이다. 기존 한 장짜리 후보표의 장점인 빠른 인물 파악을 01번에 유지하고, 실제 판정에 필요한 절대척도·표정·의상·동작·상대역 합을 독립 페이지로 분리했다.

## 바로보기

- [6장 전체 템플릿](CASTING-TEMPLATES.md)
- [공통 캐스팅 절대규격](../../../CASTING-STANDARD.md)

## 고정값

- 캔버스: 2400 × 3200픽셀
- 절대척도: 1cm = 10픽셀
- 200cm 기준선: y=410픽셀
- 0cm 바닥선: y=2410픽셀
- 절대척도 적용 페이지: 02, 04, 06
- 사진 안의 사용자용 표기: 한글

## 파일 구성

| 번호 | PNG | SVG 편집 원본 | 용도 |
|---:|---|---|---|
| 01 | `casting-dossier-v2-01-overview.png` | `casting-dossier-v2-01-overview.svg` | 전체 프로필 |
| 02 | `casting-dossier-v2-02-body-scale.png` | `casting-dossier-v2-02-body-scale.svg` | 절대척도 체형 |
| 03 | `casting-dossier-v2-03-face-expression.png` | `casting-dossier-v2-03-face-expression.svg` | 얼굴·표정 |
| 04 | `casting-dossier-v2-04-costume.png` | `casting-dossier-v2-04-costume.svg` | 의상·실루엣 |
| 05 | `casting-dossier-v2-05-movement.png` | `casting-dossier-v2-05-movement.svg` | 동작·자세 |
| 06 | `casting-dossier-v2-06-chemistry.png` | `casting-dossier-v2-06-chemistry.svg` | 상대역 합 |

`casting-v2-template.json`은 후보별 수치 기록용 기본 파일이며 `casting-v2.schema.json`은 값과 상태를 검사하는 스키마다. `validate-casting-v2.mjs`는 키×10픽셀 계산과 6장 파일의 존재 여부까지 검사한다.

## 사용 순서

1. 각 SVG의 인물 자리표시자를 동일 배우 사진으로 교체한다.
2. 페이지 02·04·06의 전신을 실제 키 × 10픽셀로 맞춘다.
3. 발바닥을 y=2410픽셀에 정렬한다.
4. 후보 코드, 성인 나이, 신체 수치와 판정을 편집 단계에서 입력한다.
5. 2400 × 3200픽셀 PNG 또는 JPG로 내보낸다.
6. 후보 폴더의 `README.md`에 01~06 순서로 연결한다.

```sh
node assets/casting/v2/validate-casting-v2.mjs 작품/characters/candidates/후보코드/casting.json
```

자리표시자 인물은 레이아웃과 척도를 확인하기 위한 도형이며 캐스팅 후보가 아니다. 새 후보는 이 템플릿을 복제해 사용하고 공통 파일 자체를 후보별로 수정하지 않는다.

## 재생성

레이아웃 SVG는 `generate-casting-v2.mjs`로 다시 만들 수 있다. 기본 한글 글꼴은 `fonts/`에 포함되어 있으며 글꼴 라이선스는 `fonts/OFL.txt`에 있다.

v1 템플릿은 기존 기록 재현용으로 상위 폴더에 보존하지만 신규 후보와 최종 승인에는 사용하지 않는다.
