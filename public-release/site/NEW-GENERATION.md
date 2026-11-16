# 앞으로 새 캐릭터·포즈를 생성할 때

기존 이미지는 그대로 재사용한다. 새로 생성할 때만 아래 준비기를 실행한다.

```powershell
node public-release/site/prepare-generation.mjs --id canonical-chakhan-white-v1 --brief "안도하며 가슴에 손을 얹는 자연스러운 상반신" --output D:/dev-artifacts/ai-staff/next-character-001
node public-release/site/prepare-generation.mjs --check D:/dev-artifacts/ai-staff/next-character-001
```

출력의 imagegen-request.json을 읽어 해당 인수 그대로 기존 imagegen 도구에 전달한다. referenced_image_paths에 있는 실제 PNG를 모두 첨부한다. 텍스트 프롬프트만 복사해 생성하지 않는다. 이 준비기는 이미지 모델을 호출하거나 API 키를 쓰지 않는다.

로봇은 선택한 CLO-02와 같은 변형 정면, 좌·우 손바닥, 왼손등의 현재 PNG를 SHA로 검증한다. 사람형은 같은 사람의 정면과 선택 포즈만 받으며 로봇 손을 넣지 않는다. 프로필·손 단독 부품은 새 배우 생성 대상으로 쓸 수 없다. 현재 미승인 COD-01/03·CLO-04에 CLO-02의 얼굴·성별·외장을 자동 전파하지 않는다.

새 결과는 미검수 후보다. REVIEW.json은 모두 false로 시작한다. 실제 생성 PNG의 각손에서 엄지와 검지/중지/약지/새끼를 짚어 보고 두께·길이·좌우 손목 연결·엄지기저/오목 중앙/연속 그립·흰 도장 광택·은은한 LCD 발광·명찰을 확인한다. 세 손가락처럼 보이는 표지 손은 자세나 윤곽을 바꿔 다시 만든다. 참조 다운로드 성공을 이미지 품질 승인으로 간주하지 않는다.

READY.json이 없거나 --check에 실패하면 생성 요청을 사용하지 않는다. 원본 SHA가 달라지거나 준비 중 온라인 revision이 바뀌면 새 빈 폴더로 다시 준비한다. 과거 폴더나 생성 캐시로 대체하지 않는다. 자동 정본 승격·게시·예약은 없다.

공개 한 주소 `/api/characters/current`에서 각 배우의 generation_url을 따라간다. `/api/characters/generation?id=현재ID&brief=새장면`이 현재 참조·규격·검수 항목을 제공한다.

준비 폴더는 절대 PNG 경로를 담으므로 이동·복사한 요청은 사용하지 않는다. 다른 PC나 폴더에서는 새 빈 폴더로 다시 준비한다. --check는 실제 첨부 경로·PNG·온라인 revision을 다시 확인한다. 생성 규칙을 바꿀 때 generation rules revision도 갱신한다.
