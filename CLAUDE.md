@AGENTS.md

# capstone-frontend 작업 규칙

- 폴더: 주소는 `src/app/`(page.tsx는 화면을 불러오기만), 화면과 그 기능에서만 쓰는 코드는 `src/features/<기능>/`, 여러 기능이 같이 쓰는 부품은 `src/components/ui/`, 로직은 `src/lib/`. 테스트는 파일 바로 옆에 둬요.
- 계산(대출 상환액, 시뮬레이션, 확률)은 백엔드에서만 해요. 프론트는 서버가 준 숫자를 `src/lib/format.ts`로 모양만 바꿔 보여 줘요.
- API는 `src/lib/api`의 `api.*`로만 불러요 (fetch를 직접 쓰지 않아요). 오류는 `toFieldErrors(error, input)`로 칸 오류, `formErrorMessage(error, input)`로 화면 위 안내, 칸이 없는 자리(결과 화면 버튼)는 `errorMessage(error)` 한 문장. 요청을 멈춘 것은 `isAbortError(error)`로 걸러요 (오류로 안내하지 않음).
- 결과 화면의 버튼 작업(비교 · 추천 · 미리보기 · 가능성 범위)은 `useApiTask()`(lib/hooks.ts)로 불러요: 하나씩만, 새로 누르거나 화면을 떠나면 앞의 요청을 멈춰요. 가능성 범위 작업(맡기고 1.5초마다 묻기)은 `runRobust`(lib/api/robust.ts).
- API는 기본이 전부 실제(real)예요. 목업은 테스트 · 오프라인용으로 `.env.local`의 `NEXT_PUBLIC_API_MODE`(예: `all-mock`)나 `/dev` 스위치로만 켜요.
- 환경 값(`process.env`)은 `src/config/env.ts`에서만 읽어요. 새 설정은 거기와 `.env.example`에 같이 적어요. `/dev`는 개발 서버에서만 열려요 (배포 빌드는 `NEXT_PUBLIC_DEV_TOOLS=1`일 때만, `devToolsEnabled()`).
- 제도 숫자(금리 · 한도 · 소득 기준 · 기본값)를 화면 문장에 직접 쓰지 않아요. 서버 응답 값을 쓰고, 서버가 안 주는 값은 `src/config/policy.ts`(출처와 함께)에서 가져와요.
- 입력은 `useSimInput()`(simInput.v1)으로만 읽고 써요. `startMonth`는 첫 값을 넣을 때 자동으로 정해져요. `localStorage`를 직접 쓰지 않아요.
- 칸 규칙과 오류 문장은 `src/lib/rules.ts`예요. 백엔드 `SimulationInput.java` · `ErrorStatus.java`와 같게 맞춰요. 칸 범위 숫자는 `LIMITS` 한 곳에 두고, 검사와 칸 아래 안내('19~39세' · '1만~3,000만 원')가 같이 써요 (`formatRange` · `formatManwonRange`, lib/format.ts).
- 금액 칸은 `<MoneyInput>`, 숫자 칸은 `<NumberInput>`, 연월은 `<YearMonthPicker>`, 입력 단계 화면은 `<StepScreen>`을 써요.
- 입력 화면은 `useStepForm(step)`(features/input/step-form.tsx)의 `error(path)` · `touch(path)` · `update`와 `<Field path=…>`를 써요. '다음' 흐름(필수 칸 → validate → 경고 모달)은 거기에 있어요.
- 입력을 고칠 때는 `src/features/input/draft.ts`의 순수 함수(`patch`, `setLoanType` …)를 `update((prev) => …)`에 넘겨요.
- 음수 기호는 U+2212 "−", 반올림은 HALF_UP (구현 명세 7.6).
- 결과 화면은 `useResult(input)`(features/result/use-result.ts)으로 부르고, 본문 블록 순서는 `ResultView.tsx`, 보여 줄 값은 블록마다 순수 함수에서 고른다 (새로 계산하지 않음): 결과 `features/result/result.ts` · 가능성 범위 `robust.ts` · 세금 `features/tax/tax.ts` · 어디에 얼마나 `features/tax/allocation.ts` · 계획 바꿔 보기 `features/plan/plan.ts`. 그래프 눈금 · 라벨 자리는 `features/result/chart.ts`. 숫자 카드는 `<StatCard>`, 비교 표의 차이는 `compareDiff` + `<DiffText>`(components/ui/Stat.tsx).
- 04-E 예시 결과는 예시 값을 `simInput.v1`에 넣지 않는다 (내 입력을 바꾸지 않음). 입력을 시작하는 버튼은 `useStartFlow()`(features/input/start-flow.tsx)를 쓰고, 저장값은 그 모달에서 '새로 시작'을 고를 때만 지운다.
- 확인: `npm run check` (타입·린트·테스트), `npm run build`. 화면에서는 `/dev`의 API 점검.
