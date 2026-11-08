# capstone-frontend

6조 사회초년생 금융 시뮬레이터의 프론트엔드예요 (보고서 4장). Next.js 16 (App Router) + TypeScript + Tailwind CSS v4로 만들었어요.
계산은 백엔드([capstone-backend](https://github.com/Financial-Simulation/capstone-backend))에서만 하고, 프론트는 입력을 받아서 보내고 서버가 준 결과를 보여 주기만 해요.

## 실행

필요한 것: Node.js 20.9 이상(`node -v`), 백엔드까지 켜려면 JDK 21(`/usr/libexec/java_home -V`로 확인, macOS는 `brew install --cask temurin@21`).
JDK 24 같은 다른 버전만 있으면 백엔드가 "languageVersion=21을 찾을 수 없다"며 켜지지 않아요. 21을 같이 깔면 되고 기본 Java는 바꾸지 않아도 돼요.

터미널 두 개를 켜 두고 작업해요 (VS Code 터미널 패널의 `+`).

```bash
# 터미널 1: 프론트 (이 폴더)
npm install
npm run dev                  # http://localhost:3000

# 터미널 2: 백엔드 (DB · 환경변수 없이 받아서 켜기만 하면 돼요)
git clone https://github.com/Financial-Simulation/capstone-backend.git   # 처음 한 번
cd capstone-backend
chmod +x gradlew             # 압축(zip)으로 받은 폴더면 처음 한 번
./gradlew bootRun            # http://localhost:8080, 'Started CapstoneServerApplication'이 보이면 켜진 것
```

- 백엔드는 **v1.7**(세금 · 배분 추천 · 리포트 포함, 조민석 11/1)이 있어야 해요. 받은 백엔드가 v1.7인지는 아래 '붙었는지 확인'(17개가 기대대로)으로 봐요.
  bootRun 진행 표시가 `80% EXECUTING`에서 멈춘 것처럼 보이는 건 서버가 켜져 있다는 뜻이에요. 끌 때는 Ctrl+C.
- 설정(백엔드 주소 · 목업 스위치)은 아무것도 안 해도 기본값으로 돌아가요. 바꿀 때만 `.env.local`을 만들어 그 줄만 적어요.
  항목과 기본값은 `.env.example`, 코드에서 읽는 곳은 `src/config/env.ts` 하나예요.
- 붙었는지 확인: `localhost:3000/dev` → API 점검 `전부 실행` (기본이 전부 real이에요).
  v1.7 백엔드면 17개가 모두 기대대로예요 (세금 · 배분 추천 · 리포트 포함). v1.6 백엔드(GitHub main)에 붙이면 v1.7 점검 4개(세금 · 배분 추천 · 리포트 · meta)가 실패해요.
- 브라우저는 `localhost:3000/api/*`만 부르고, 개발 서버가 `localhost:8080/api/*`로 넘겨요 (`next.config.ts`의 rewrites).
  그래서 백엔드의 CORS 설정(`app.cors.allowed-origins`)은 건드리지 않아도 돼요. 백엔드 주소를 바꾸려면 `.env.local`에 `BACKEND_URL=…`을 적고 `npm run dev`를 다시 켜요.
  배포 빌드(`npm run build`)는 빌드할 때 이 주소가 정해져서, 바꾸면 다시 빌드해요.
  CORS는 브라우저가 백엔드 주소를 바로 부를 때만 필요해요 (예: 예전 데모를 `localhost:5173`에서 띄울 때 → `./gradlew bootRun --args='--app.cors.allowed-origins=http://localhost:5173'`).
- 백엔드가 꺼져 있으면 "백엔드가 응답하지 않아요"가 나와요. 백엔드 없이 화면만 보려면 `.env.local`에 `NEXT_PUBLIC_API_MODE=all-mock`을 적거나 `/dev`에서 `전부 mock`을 눌러요.
  계산이 5초 넘게 걸리면 '평소보다 오래 걸리고 있어요'가 붙고, 개발 서버의 프록시는 30초 안에 답이 없으면 끊어요 → '백엔드가 응답하지 않아요' + '다시 계산'.
- 개발 서버에서는 화면 맨 아래 **개발 점검** 링크(`/dev`)로 API를 하나씩 보내 볼 수 있어요.
  `정답 파일 대조` → `전부 대조`: 정답 파일의 11개 입력을 기본 결과 · 미리보기 · 계획 비교 · 역산 · 배분 추천 API에 그대로 보내고 응답이 정답과 똑같은지 표로 봐요.
  v1.7 백엔드면 `같음 55 / 55`예요. 다르면 아래에 처음 다른 곳(예: `plans[1].probability: 정답 70.5 · 응답 70.4`)이 나와요.
  배포 빌드(`npm run build` · Vercel)에서는 `/dev`가 '없는 화면'이고 링크도 숨겨요. 배포 빌드에서도 열려면 `.env.local`에 `NEXT_PUBLIC_DEV_TOOLS=1`을 적고 다시 빌드해요.

## 발표 데모 (노트북)

발표는 노트북 한 대에서 백엔드와 프론트를 같이 켜서 해요. DB · 외부 서비스 · 인터넷이 필요 없어서 발표장 와이파이와 상관없어요 (글꼴도 컴퓨터에 있는 것을 써요).

1. 전날: JDK 21 · Node 20.9 이상, 이 폴더에서 `npm install`. 개발 서버로 `/dev` → API 점검 `전부 실행`이 17개 모두 기대대로인지(백엔드 v1.7) 확인해요.
2. 터미널 1: 백엔드 `./gradlew bootRun`
3. 터미널 2: 프론트 `npm run build && npm start` → http://localhost:3000
   개발 서버보다 빠르고 화면을 처음 열 때 멈칫하지 않아요. 백엔드 주소는 빌드할 때 정해져요 (기본 localhost:8080).
4. 발표 직전: 내 결과와 예시 결과(`/example`)를 한 번씩 열어 둬요. 백엔드를 켜고 첫 계산이 가장 느려요.
5. 예비: 백엔드 없이 도는 목업 사이트 https://capstone-flax-eight.vercel.app (정답 파일 숫자, '목업' 표시)와 녹화 영상

화면 점검 목록은 [`docs/qa-checklist.md`](docs/qa-checklist.md)예요.

## VS Code

- **`capstone-frontend` 폴더 자체를 열어요** (File → Open Folder). 위 폴더(`finance-simulator` 등)를 열면 `.vscode` 설정과 추천 확장을 못 읽어요.
- 처음 열면 오른쪽 아래에 추천 확장 설치 안내가 떠요 (`.vscode/extensions.json`): ESLint · Tailwind CSS IntelliSense · REST Client · EditorConfig.
- 저장할 때 ESLint가 고칠 수 있는 것만 고쳐요. 코드 모양을 통째로 바꾸는 자동 포맷은 켜 두지 않았어요 (`.vscode/settings.json`).
- TypeScript는 프로젝트에 깔린 버전을 써요. 처음 열 때 "작업 영역 버전을 쓸까요?"가 뜨면 허용해요.
- 디버그(⇧⌘D): `Next.js: debug server-side` · `client-side` · `full stack` (`.vscode/launch.json`, Next 문서 설정 그대로).
- 테스트는 터미널에서 `npm test`(한 번) · `npm run test:watch`(고칠 때마다) · `npm run check`(타입 · 린트 · 테스트)로 돌려요.
  Vitest VS Code 확장은 추천에서 뺐어요. macOS에서 경로에 한글 폴더(예: `캡스톤`)가 있으면 "Attempted to get parent of root folder" 오류로 테스트 목록을 못 만들어요.
- 백엔드 API를 직접 보내 보려면 백엔드 폴더의 `http/api.http`를 열고 요청 위의 `Send Request` (REST Client).

## 협업 (git)

- 저장소: https://github.com/Financial-Simulation/capstone-frontend
- 브랜치 · 커밋 · PR 규칙과 코드 규칙은 [`CONTRIBUTING.md`](CONTRIBUTING.md)에 있어요. `main`에는 PR로만 합치고, PR 전에 `npm run check`가 통과해야 해요.
- 리팩터링 · v1.7 반영 계획과 단계별 진행 상태: [`docs/refactor-plan.md`](docs/refactor-plan.md)

## 목업 스위치 (엔드포인트별 mock / real)

기본은 **전부 실제 API(real)**예요 (11/8부터, 백엔드에 API가 다 있어요). 목업(mock)은 테스트와 오프라인(백엔드 없이 화면만 볼 때)용이에요.

정하는 곳은 세 군데이고, 아래로 갈수록 먼저 적용돼요.

1. 기본값: 전부 real (`src/lib/api/mode.ts`의 `DEFAULT_SOURCE`)
2. `.env.local`의 `NEXT_PUBLIC_API_MODE`: 예) `all-mock`, `robust=mock`, `all-mock,validate=real` (dev 서버를 다시 켜야 적용돼요)
3. `/dev` 화면의 스위치: 이 브라우저에만 저장돼요 (`localStorage`의 `apiMode.dev`)

mock은 팀 정답 파일(`src/mocks/data/analysis_golden.json`, v1.7 `engine/analysis_golden.json`을 줄인 복사본)에서 **입력이 같은 케이스**(예시 S1~S3 · 경계 E1~E5 · 세금 T1~T3, 11개)를 돌려줘요.
'같은 입력'은 엔진이 쓰는 값으로 비교해요. 이름, 합계로/항목별로 같은 입력 방식 차이, 비워 둔 기본값(금리 · 무주택 세대주 · 상품별 배분 등)은 같은 것으로 봐요.
맞는 케이스가 없으면 S1 결과를 주고 `exact: false`로 표시해요. 화면은 `ApiResult.source`가 `"mock"`인지로 목업 배지를 띄우면 돼요.
seed가 같아서 실제 API의 숫자도 정답 파일과 똑같아야 해요. `/dev`의 API 점검(대표 값 17개)과 정답 파일 대조(11개 입력 × 5개 API 전부)로 확인해요.

## 제도 숫자 (금리 · 한도 · 소득 기준)

- 서버가 주는 값은 응답 그대로 써요: 합계(`/inputs/validate`의 `summary`), 청년미래적금 대상 판정과 이유 · 지원금 없음 안내(`policySaving` · `warnings`), 근거와 가정(`/meta`), 예정된 일 기본 금액(`/events/presets`), 결과의 경로 수(`/simulate`의 `paths`).
- 서버가 주지 않는 값(빈 칸 기본값 · 대출 종류별 기본 금리 · 청년미래적금 기준 · 월세 세액공제 안내 · 결과 전 안내의 경로 수)은 `src/config/policy.ts` 한 곳에 출처와 함께 있어요. 화면 문장에 숫자를 직접 쓰지 않아요.
- `src/config/policy.test.ts`가 이 값을 서버 근거(`/meta` 사본)와 대조해요. 백엔드 숫자가 바뀌면 이 시험이 먼저 깨져요.
- 입력 칸 범위(나이 19~39 등)는 `src/lib/rules.ts`가 서버 `SimulationInput.java`를 옮겨 둔 거예요 ('다음'을 누르기 전에 바로 알려 주려고). 기준은 서버예요.
  범위 숫자는 `LIMITS` 한 곳에 있고, 검사와 칸 아래 안내('19~39세' · '1만~3,000만 원' · '1~480개월')가 같이 써요. 이직의 '기본 +10%'처럼 기본값 안내는 프리셋(`/events/presets`) 값이에요.

## API 쓰는 법

```ts
import { api, formErrorMessage, toFieldErrors } from "@/lib/api";

try {
  const { data, source } = await api.validate({ step: "BASIC", input });
  // data = ApiResponse.result (isSuccess · code · message는 이미 풀었어요)
} catch (error) {
  setFieldErrors(toFieldErrors(error, input)); // { "person.age": "19~39 사이로 입력해 주세요" }
  setNotice(formErrorMessage(error, input));   // 칸에 못 붙이는 오류만 (네트워크·서버 오류 등)
}
```

| 서버 응답 | 화면에서 |
| --- | --- |
| `COMMON400` + 칸별 메시지 맵 | 그 칸 아래에. `input.` 접두사와 `resolvedTotalInRange` 같은 검사 이름은 실제 칸으로 바꿔요 (v1.7 `income.grossConsistentWithNet` → 세전 연봉, `expenses.rentWithinFixed` → 그중 월세) |
| `INPUT4001` | 경력 칸 (`person.careerYears`) |
| `LOAN4001` | 대출 있음/없음 (`loans.hasNoLoan`) |
| `GOAL4001` · `GOAL4002` | 목표 시점 칸 (`goal.targetDate`) |
| `EVENT4001` · `EVENT4002` · `EVENT4004` | 문제가 있는 예정된 일 카드 (`events[1]`). 서버가 몇 번째인지 안 알려 줘서 입력에서 다시 찾아요 |
| 그 밖의 오류 · 네트워크 · 백엔드 꺼짐 | 화면 위 안내 |

결과 화면의 버튼(비교 · 추천 · 미리보기 · 가능성 범위)은 칸이 없어서 `useApiTask`로 불러요.
한 번에 하나만 돌고, 새로 누르거나 화면을 떠나면 앞의 요청을 멈춰요(멈춘 건 오류로 안 보여요). 실패하면 `errorMessage(error)` 한 문장을 붙여요.

```ts
const { busy, error, run } = useApiTask<"compare" | "recommend">();
run("compare", "비교하지 못했어요", async (signal) => {
  setCompare((await api.compare({ input, plans }, { signal })).data);
}); // 실패하면 error = "비교하지 못했어요: 백엔드가 응답하지 않아요. …"
```

v1.7에서 생긴 것 (타입은 `src/lib/types`):

- API: `api.recommendAllocation({ input })` 배분 자동 추천, `api.report({ input, plans })` 리포트 한 장의 숫자 (PDF는 화면이 인쇄로 만들어요)
- 입력(모두 선택): `income.annualGrossSalary` 세전 연봉 · `expenses.monthlyRent` 그중 월세 · `person.homelessHouseholder` 무주택 세대주 · `savingPlan.policyMonthly / housingMonthly / pensionMonthly` 상품별 배분
- 응답: `/simulate`의 `tax`(돌려받는 세금 · 낸 세금 · 순이득 · 실제 배분), `/compare` 줄마다 `medianAtGoal` · `taxNetBenefit` · `allocation`. v1.6 백엔드에는 없어서 선택(?) 칸이에요.

## 입력 저장

- 입력은 서버가 아니라 이 브라우저의 `localStorage`에만 있어요 (보고서 4.3). 읽기·쓰기는 모두 try/catch라서 사생활 보호 모드에서도 화면은 돼요.
  - `simInput.v1`: `SimulationInput` 그대로
  - `simPlans.v1`: 비교 계획 (최대 3개)
  - `simProgress.v1`: 거쳐 간 단계
- 처음 값을 넣는 순간 `startMonth`(기준 연월)가 그달로 정해지고, 그 뒤에는 바뀌지 않아요.
- 화면 코드는 `useSimInput()`만 쓰고 `localStorage`를 직접 건드리지 않아요.

## 화면 주소

화면마다 주소가 있어서 브라우저 뒤로 가기가 '이전'과 같아요. 단계 표시는 끝낸 단계만 누를 수 있어요.
끝낸 단계는 들어가 봤고, 필수 칸이 다 찼고, 앞 단계도 모두 끝낸 단계예요. 바로 다음 단계는 '다음' 버튼과 같아요.

| 주소 | 화면 | 상태 |
| --- | --- | --- |
| `/` | 00 시작 · '이어서 할까요?' · '기준 달을 이번 달로 바꿀까요?' | 완료 |
| `/input/basic` | 01-1 나이 · 경력 · 고용형태 · 실수령액 · 더 정확하게 넣기(세전 연봉 · 무주택 세대주) · 고정/변동지출(합계로/항목별로) · 그중 월세 · 월 여유자금 | 완료 (validate) |
| `/input/assets` | 01-2 현금 · 예적금 · 대출 카드(상환액 미리보기) · 월 저축액 · 매달 남는 돈 · 청년미래적금 안내 · 선택 입력 | 완료 (validate · repayment-preview) |
| `/input/goal` | 02 이름 · 금액 · 연월(기준 달부터 12~120개월만) · 입력 요약 | 완료 (validate) |
| `/input/scenario` | 03 기본 상황 + 예정된 일 5종 (켜면 연월 · 금액 칸) | 완료 (presets · validate) |
| `/result` | 04 결과 확인 · 계산 중 · 계산 실패 · 입력 없음 / 덜 끝남 · 가능성 범위 · 세금 · 어디에 얼마나 · 계획 바꿔 보기(04-2) | 완료 (simulate · reverse · validate · robust · compare · recommend · preview) |
| `/report` | 04 리포트 저장: 한 장짜리 리포트 → '인쇄 · PDF로 저장'(브라우저 인쇄) | 완료 (reports · meta) |
| `/example` | 04-E 예시 결과 (S1~S3, '예시 데이터로 계산한 결과예요' 배너) | 완료 (examples · simulate) |
| `/dev` | 개발 점검 (목업 스위치 · API 점검 · 정답 파일 대조 · 저장값 · 금액 칸). 개발 서버에서만 (배포 빌드는 `NEXT_PUBLIC_DEV_TOOLS=1`일 때만) | 완료 |

### '다음' 버튼 (모든 입력 화면 같음, `features/input/step-form.tsx`)

1. 그 화면의 필수 칸과 칸별 규칙을 프론트가 먼저 확인 → 빈 칸·잘못된 칸에 빨간 테두리와 문장, 첫 오류 칸으로 이동 (접어 둔 '더 정확하게 넣기' 안이면 펼쳐서)
2. `POST /inputs/validate` (그 화면까지의 입력) → 서버 오류는 그 칸·카드에 (고치면 사라져요)
3. 그 화면의 경고는 모달: 01-1 지출 ≥ 소득 · 01-2 매달 모자람 · 02 이미 목표 달성 → '수정하기'(칸 강조) / '그대로 진행'
4. 백엔드에 닿지 못하면 위쪽 안내 + '다시 시도' / '검사 없이 다음으로' (프론트 검사는 이미 통과)

칸별 규칙 오류는 칸을 떠난 뒤(또는 '다음'을 누른 뒤) 보여 줘요. 치는 도중에 깜빡이지 않게요.
항목별 지출에서 비워 둔 금액은 '다음'을 누를 때 0원으로 채워요 (화면에 안내).

## 결과 화면 (04 · 04-E)

- 입력이 다 차면 한 번에 부른다: `POST /simulate`(본 결과) · `POST /reverse`(목표 확률 70%, '이렇게 바꿔 보세요') · `POST /inputs/validate`(step=ALL, 청년미래적금 비대상 이유만 씀).
  같은 입력 · 같은 seed면 같은 결과라서 화면에 다시 들어오면 다시 불러도 숫자가 같다 (`features/result/use-result.ts`).
- 상태: 입력 없음 → 시작 안내 / 필수 칸이 빠짐 → 그 단계로 가기 / 계산 중('취소' → 03, 5초가 넘으면 '평소보다 오래 걸리고 있어요') /
  계산 실패: 서버가 입력 칸을 문제 삼으면 '입력 확인하기'(그 단계로), 백엔드 꺼짐 · 응답 없음 · 서버 오류면 '다시 계산'만 (`result.ts`의 `failure`). 04-E는 늘 '다시 계산'.
- 본문 순서 (`features/result/ResultView.tsx`): 첫 문장(API의 headline 그대로) → 가능성 범위(04만) → 범위 그래프 → 1·3·5·10년 표 → 위험 카드 5장 → 세금 → 어디에 얼마나(둘 다 04만) → 적금을 처음 깬 이유 4가지(합 100%) → 이렇게 바꿔 보세요 → 계획 바꿔 보기(펼쳤을 때) → 내 입력값과 적용 가정(펼치면 `GET /meta`).
- 세금 (v1.7, `features/tax/TaxSection.tsx` · `tax.ts`): `/simulate`의 `tax`로 카드 5장(매년 · 목표 시점까지 돌려받는 세금, 낸 이자소득세, 해지로 다시 낸 세금, 순이득)과 안내 문장. 금액은 모두 서버 값이고, 화면에서 세율표로 계산하지 않는다 ('내는 세금 연 약 n만 원'은 서버가 값을 주면 넣는다). 04-E 예시에는 붙이지 않는다.
- 가능성 범위 (`features/result/RobustSection.tsx` · `robust.ts`): '가능성 범위 계산'을 누르면 `POST /robust`로 작업을 맡기고 1.5초마다 `GET /robust/{jobId}`로 진행률을 물어 범위를 띠로 그린다 (`lib/api/robust.ts`의 `runRobust`, 계획 바꿔 보기도 같이 쓴다). 화면을 떠나면 묻기를 멈춘다.
- 계획 바꿔 보기 04-2 (`features/plan/PlanSection.tsx` · `plan.ts`): 맨 아래 '계획 바꿔 보기'로 펼친다. 값 7개(변동 · 고정지출, 월 저축액, 버틸 금액, 목표 금액 · 시점, 비상금 먼저)를 바꿔 '바꾼 계획 미리보기'(`POST /simulate/preview`), 최대 3개 담아(`simPlans.v1`) '담은 계획 비교'(`POST /compare`), '가정을 바꿔도 결론이 같은지 보기'(`POST /robust`의 plans). 내 입력은 바꾸지 않는다.
- 어디에 얼마나 (v1.7, `features/tax/AllocationSection.tsx` · `allocation.ts`): 월 저축액을 청년미래 · 청약 · 연금저축으로 나눠 '지금 계획과 비교하기'(`POST /compare`), '가장 좋은 배분 찾기'(`POST /allocations/recommend`). '이 배분으로'는 내 입력의 배분(`savingPlan.policyMonthly` 등)을 바꾸고 결과 전체를 다시 계산한다. 04-E 예시에는 붙이지 않는다.
- 리포트 저장 (`features/report/ReportScreen.tsx` · `ReportPaper.tsx` · `report.ts`): 위쪽 '리포트 저장' → `/report`. 내 입력과 담은 계획(`simPlans.v1`)으로 `POST /reports`를 불러 한 장으로 그린다 (입력 요약 · 목표 · 앞으로 모을 돈 · 위험 · 세금 · 개선 포인트 · 담은 계획 비교 · 근거 · 유의사항).
  '인쇄 · PDF로 저장'은 브라우저 인쇄(대상: 'PDF로 저장')이고, 인쇄할 때는 머리글 · 버튼을 빼고(`print:hidden`) A4로 나온다 (`globals.css`의 `@page`). 04-E 예시에는 없다.
- 서버 값을 화면용으로 고르는 건 `features/result/result.ts`(계산하지 않고 고르기 · 문장 · 색 기준만, 세금 · 배분 · 계획은 그 폴더의 `tax.ts` · `allocation.ts` · `plan.ts`), 눈금과 그래프 위 라벨 자리(선 · 점 · 다른 라벨과 겹치지 않는 곳, 없으면 계산기 라벨은 생략)는 `features/result/chart.ts`.
- 그래프: 범위(아래 10%~위 10%)는 옅은 면, 중간값 · 최악의 경우(하위 5%)는 선, 목표 금액 · 목표 시점은 점선, 계산기 결과는 두 점(목표 시점 · 10년 뒤), 예정된 일은 입력의 occurDate로 ◆.
  마우스 · 손가락 · 화살표 키(Shift는 1년씩, Home/End)로 달을 옮기면 툴팁, '표로 보기'에 해마다 값.
- 목업이면 결과 위에 보라색 '목업' 안내를 띄운다. 기준 연월이 정답 파일(2026-11)과 다르면 날짜만 옮긴 정답을 쓰고 그렇다고 적는다 (10월에 S1을 넣어도 S1과 같은 숫자).
- 04-E는 예시 값을 내 입력(`simInput.v1`)에 넣지 않는다. '내 정보로 시작하기'는 00 '시뮬레이션 시작하기'와 같은 흐름(`features/input/start-flow.tsx`: 저장값이 있으면 '이어서 할까요?')이고, 저장값은 거기서 '새로 시작'을 고를 때만 지운다.
  `/examples`에 닿지 못하면 프론트에 든 같은 예시 입력(`mocks/data/examples.json`)으로 계산한다.

## 정해 둔 것 (10/28 회의 '정할 것', 팀 확인 전 임시)

1. 결과 화면은 실제 API로 계산한다 (11/8, 기본을 전부 real로). 목업으로 볼 때만 '목업' 안내를 띄운다.
2. 입력 검사 순서는 지금 구현대로(필수 칸은 프론트, '다음'마다 `/inputs/validate`). 오류 문장은 서버 것을 그대로 쓴다.
3. CORS는 같은 도메인 프록시(Next 서버의 rewrites, `BACKEND_URL`). `next start`에서도 확인했다.
4. 계산기 결과는 선이 아니라 두 점(목표 시점 · 10년 뒤). 월별 값이 API에 생기면 선으로 바꾼다.
5. 예정된 일 표시는 입력의 occurDate로 그린다.
6. 달성 가능성 색: 70% 이상 '가능성 높음'(초록) · 50~70% '가능성 보통'(주황) · 50% 미만 '가능성 낮음'(빨강), 색만 쓰지 않고 점 + 글자.
7. 금액은 원 단위로 받고(쉼표 자동) 옆에 '250만 원'처럼 읽기 쉬운 금액을 보여 준다.
8. 리포트는 v1.7 `POST /reports` 데이터로 인쇄용 화면을 그린다 (5단계). 처음 정한 '프론트가 받은 결과로 조립'에서 서버가 리포트 API를 만들면서 바뀌었다.

## 폴더

기능(화면) 단위로 나눠요. 주소는 `app/`, 화면과 그 기능에서만 쓰는 코드는 `features/`, 여러 기능이 같이 쓰는 건 `components/ui/`와 `lib/`에 둬요.
테스트(`*.test.ts`)는 시험하는 파일 바로 옆에 있어요.

```
src/
  app/                 주소(라우트)만: page.tsx · layout.tsx가 features의 화면을 불러요
    dev/               개발 점검 화면 · API 점검 목록 · 정답 파일 대조 (발표 화면이 아니라서 주소 폴더에 같이 둬요, 배포 빌드에서는 닫혀 있어요)
  features/
    input/             00 시작 · 입력 4단계 (01-1 · 01-2 · 02 · 03)
      basic/ assets/ goal/ scenario/
                       단계 화면 (BasicStep · ExpenseEditor · TaxInputs · AssetsStep · LoanCard · GoalStep · ScenarioStep)
      StepScreen · StepNav · StepIndicator · input-flow
                       입력 화면 틀 · '이전/다음' · 단계 표시
      step-form.tsx    '다음' 흐름 · 경고 모달 · 0.3초 디바운스 API
      start-flow.tsx · StartActions.tsx
                       '시뮬레이션 시작하기' · '내 정보로 시작하기'의 이어서 하기 모달
      draft.ts         입력 고치기 (지출 방식 · 대출 · 기본 항목 · 상품별 배분)
      events.ts        예정된 일 프리셋 ↔ events[]
      warnings.ts      서버 경고 → 경고 모달 문구
    result/            04 결과 · 04-E 예시 결과
      ResultScreen · ExampleScreen · StateViews(계산 중 · 실패) · use-result(API 세 개를 한 번에)
      ResultView       결과 본문의 블록 순서만 (아래 블록과 tax · plan 폴더의 블록)
      Hero · RobustSection · SavingsSections · RiskSections · Levers · Assumptions · BandChart
                       첫 문장 · 가능성 범위 · 모은 돈(그래프 · 표) · 위험 · 이렇게 바꿔 보세요 · 입력값과 가정 · 범위 그래프
      result.ts        보여 줄 값 고르기 (표 · 위험 카드 · 원인 · 레버 · 비교 차이 · 입력이 다 찼는지 · 실패 안내)
      robust.ts        가능성 범위 띠와 문장
      chart.ts         그래프 눈금 · 축 글자 · 라벨 자리 고르기
    tax/               세금 · 어디에 얼마나 (v1.7, 04 결과에만)
      TaxSection · tax.ts
                       세금 카드 5장과 안내 문장
      AllocationSection · allocation.ts
                       상품별 배분 · 지금 계획과 비교 · 가장 좋은 배분 · '이 배분으로'
    plan/              계획 바꿔 보기 04-2 (04 결과에만)
      PlanSection · plan.ts
                       값 7개 미리보기 · 담은 계획 비교 · 결론이 같은지
    report/            리포트 저장 (/report, 인쇄 · PDF)
      ReportScreen · ReportPaper · report.ts · use-report
                       버튼 줄 · 한 장짜리 리포트(인쇄용) · 보여 줄 값 고르기 · POST /reports
  components/
    Header.tsx         모든 화면 위 머리글 · 아래 꼬리글
    ui/                공용 부품: index.tsx(Button · LinkButton · Card · FormSection · Badge)
                       Modal · Field · Choice · MoneyInput(쉼표 자동) · NumberInput · YearMonthPicker
                       Stat.tsx(결과 숫자 카드 StatCard · 비교 표의 차이 DiffText)
  config/
    env.ts             환경 설정을 읽는 곳 (백엔드 주소 · API 주소 · 목업 스위치 · 개발 점검, 목록과 기본값은 .env.example)
    policy.ts          서버가 주지 않는 제도 숫자 · 기본값 (출처와 함께): 빈 칸 기본값 · 대출 기본값 · 청년미래적금 · 세금 기준 · 경로 수
  lib/                 여러 기능이 같이 쓰는 것
    types/             SimulationInput · ApiResponse · ValidateResponse · 결과 타입 (v1.7)
    api/               fetch 래퍼 · API 함수 · 오류 → 칸 · 오류 한 문장 · mock/real 스위치 · 가능성 범위 작업(runRobust)
    rules.ts           입력 규칙 · 칸 범위(LIMITS) · 오류 문장 (백엔드 SimulationInput.java와 같게)
    form.ts            화면까지의 입력 · 오류 키
    steps.ts           입력 4단계와 주소
    storage.ts         simInput.v1 · simPlans.v1 · simProgress.v1
    hooks.ts           useSimInput · useProgress · useSavedPlans · useApiModes · useApiTask(결과 화면 버튼 작업)
    format.ts          금액·확률 표시 ("4,440만 원", "−1,568만 원", "+12.5%p") · 범위 안내 ("19~39세", "1만~3,000만 원")
    year-month.ts      연월 계산 ("2026-11" + 개월 수)
  mocks/               목업 API와 정답 파일 (목업을 쓸 때만 불러와요)
```

## 확인

```bash
npm run check   # 타입 검사 + 린트 + 테스트 (vitest)
npm run build   # 배포용 빌드
```

패키지를 새로 추가할 때 `Cannot read properties of null (reading 'edgesOut')`가 나면 npm 10의 버그예요 (vitest를 넣을 때 겪었어요).
`npx npm@11 install <패키지>`로 설치하면 돼요. 이미 있는 package-lock.json으로 `npm install`하는 것은 npm 10에서도 괜찮아요.

## 일정

- 10/27 (완료): 저장소 · 개발 프록시 · 타입 · API 함수 · 목업 스위치 · 입력 저장 · 공통 틀
- 10/28 (완료): 00 시작 모달 · 입력 화면 01-1 · 01-2 · 02 · 03 (validate · repayment-preview · presets 실제 연동)
- 10/29 (완료): 결과 04 · 예시 결과 04-E · 계산 중 · 계산 실패 · 주요 원인 · 이렇게 바꿔 보세요 · 발표용 캡처와 녹화
- 10/30 (금): 중간 데모
- 11/8 (0~5단계): VS Code · 팀 저장소, 하드코딩 걷어내기, 실제 API · 정답 파일 대조, v1.7 입력 · 세금 · 어디에 얼마나 · 가능성 범위 · 계획 바꿔 보기, 리포트
- ~11/27 (6단계): 검증 · PR · 발표 데모 준비. 자세한 건 `docs/refactor-plan.md`
