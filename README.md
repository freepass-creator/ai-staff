# ai-staff — AI 직원 가상 인물

회사 AI 직원(대표 비서 **이든**, 프리패스 AI 매니저 **루다**(초안))을 «살아 있는 가상 인물 한 명»으로 정의하고, 같은 사람의 이미지를 다시 뽑을 수 있게 하는 저장소.

- 규칙: [AGENTS.md](AGENTS.md)
- 캐릭터 정본: `characters/<이름>/character.json`

> CREATE_NEW_JUSTIFIED(2026-10-03): ai-core `reuse:check "AI 직원 가상 캐릭터 프로젝트" --root C:\dev` — 일반 capability(프로젝트 빌드·테스트)만 나오고 캐릭터·이미지 자산 프로젝트는 없음. ai-ops 에 시험판 생성기 `scripts/이미지/캐릭터-생성.py` 가 있으나 캐릭터 정본·문서·검사가 없어 새 저장소로 분리(대표 결정).
