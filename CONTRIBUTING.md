# 기여 안내

이 저장소에 코드를 올리는 방법이에요. 실행 방법은 [README '실행'](README.md#실행), 화면을 눌러 보는 목록은 [`docs/qa-checklist.md`](docs/qa-checklist.md)예요.

## 브랜치

- `main`에는 직접 커밋하지 않고 PR로만 합쳐요.
- 이름: `feat/…`(기능) · `fix/…`(고침) · `refactor/…`(동작은 그대로, 코드 정리) · `docs/…`(문서). 예: `feat/stage5-report`
- 여러 단계로 나뉘는 큰 작업은 앞 단계 브랜치에서 다음 브랜치를 만들어 이어 가요 (`git switch -c feat/다음-단계`).

## 커밋

- 형식은 백엔드와 같아요: `종류: 한 일` (종류: `feat` · `fix` · `refactor` · `docs` · `test` · `chore`)
- 한 커밋에는 한 가지 일만 담아요. 본문에는 바뀐 것과 이유를 한 줄씩 적어요.

```bash
git commit -m "feat: 리포트 저장 화면과 인쇄 (5단계)" -m "- 결과 위쪽 '리포트 저장' → /report
- '인쇄 · PDF로 저장' = 브라우저 인쇄, 인쇄할 때는 머리글 · 버튼을 뺌"
```

- 폴더를 옮기거나 파일을 지웠으면 `git add -A <폴더>`로 담아요 (그래야 옮긴 파일이 '이름 바꿈'으로 잡혀요).

## PR 올리기 전에

1. `npm run check` (타입 검사 · 린트 · 테스트)
2. `npm run build`
3. 바꾼 화면을 직접 눌러 보기: 데스크톱과 휴대폰 폭 390px (Chrome 개발자 도구의 기기 모드). [`docs/qa-checklist.md`](docs/qa-checklist.md)에서 그 부분
4. 화면 문장이나 규칙을 바꿨으면 README와 [`docs/refactor-plan.md`](docs/refactor-plan.md)도 같이 고쳐요

## PR

- 제목은 커밋과 같은 형식으로 써요. 본문에는 무엇을 · 왜 · 어떻게 확인했는지 적고, 화면이 바뀌면 스크린샷을 붙여요.
- 팀원 한 명 이상이 확인한 뒤 합쳐요.
- 백엔드 API(요청 · 응답 모양)가 바뀌는 일이면 백엔드 담당과 먼저 맞추고, `src/lib/types`와 목업(`src/mocks`)을 같이 고쳐요.

## 코드 규칙 (요약)

전체 목록은 [`CLAUDE.md`](CLAUDE.md)의 '작업 규칙'이에요 (AI 도구도 같은 파일을 읽어요). 자주 걸리는 것만 적으면:

- **계산은 백엔드에서만** 해요. 프론트는 서버가 준 숫자를 `src/lib/format.ts`로 모양만 바꿔 보여 줘요.
- **API는 `api.*`로만** 불러요 (`src/lib/api`, fetch를 직접 쓰지 않아요). 오류는 칸이면 `toFieldErrors`, 화면 위 안내면 `formErrorMessage`, 칸이 없는 자리면 `errorMessage`.
- **숫자를 화면 문장에 직접 쓰지 않아요.** 환경 값은 `src/config/env.ts`, 제도 숫자는 서버 값이나 `src/config/policy.ts`(출처와 함께), 칸 범위는 `src/lib/rules.ts`의 `LIMITS`.
- **입력 저장은 `useSimInput()`으로만** 해요 (`localStorage`를 직접 쓰지 않아요).
- **폴더**: 주소는 `src/app/`, 화면과 그 기능의 코드는 `src/features/<기능>/`, 여러 기능이 같이 쓰는 부품은 `src/components/ui/`, 로직은 `src/lib/`.
- 음수 기호는 U+2212 "−", 반올림은 HALF_UP (구현 명세 7.6).

## 테스트

- vitest로 순수 함수를 시험해요 (`*.test.ts`를 시험하는 파일 바로 옆에). 화면에 보여 줄 값을 고르는 함수(예: `features/report/report.ts`)에 시험을 붙여요.
- 숫자는 팀 정답 파일(`src/mocks/data/analysis_golden.json`)과 대조해요. 백엔드 숫자가 바뀌면 `policy.test.ts`와 정답 파일 시험이 먼저 깨져요 → 정답 파일과 `config/policy.ts`를 같이 고쳐요.
