/**
 * 개발 점검 화면의 API 점검 목록.
 * 하나하나가 '이 요청을 보내면 이렇게 와야 한다'를 적어 둔 것이라, 백엔드에 새 API가 붙으면
 * 스위치를 real로 바꾸고 다시 돌려서 정답 파일과 같은지 바로 본다.
 */
import examplesData from "@/mocks/data/examples.json";
import {
  api,
  formErrorMessage,
  isAbortError,
  isApiError,
  resolveMode,
  toFieldErrors,
  type ApiResult,
  type ApiSource,
  type Endpoint,
} from "@/lib/api";
import type { MockMatch } from "@/mocks/handlers";
import type { FieldErrorMap, RobustJobResult, SimulationInput, SimulationInputDraft } from "@/lib/types";
import { formatPercent, formatPercentPoint, formatWon } from "@/lib/format";

/** 백엔드 /examples의 S1 (기본값까지 채워진 모양). 정답 파일 S1과 같은 입력이다 */
export const EXAMPLE_S1 = examplesData.examples[0].input as unknown as SimulationInput;

/** 정답 파일 T1 (v1.7 세금): S1 + 그중 월세 50만 원 + 배분 청년미래 30만 · 청약 10만 · 연금저축 10만 */
const EXAMPLE_T1: SimulationInput = {
  ...EXAMPLE_S1,
  expenses: { ...EXAMPLE_S1.expenses, monthlyRent: 500_000 },
  savingPlan: { ...EXAMPLE_S1.savingPlan, policyMonthly: 300_000, housingMonthly: 100_000, pensionMonthly: 100_000 },
};

export interface CheckErrorView {
  code: string;
  message: string;
  status: number | null;
  /** toFieldErrors(): 화면의 어느 칸·카드에 붙는지 */
  fields: FieldErrorMap;
  /** formErrorMessage(): 칸에 못 붙여 화면 위에 보여 줄 문장 */
  formMessage: string | null;
}

export interface CheckRecord {
  pass: boolean;
  source: ApiSource;
  mock?: MockMatch;
  ms: number;
  summary: string;
  /** 응답 result 또는 오류 */
  json: unknown;
  error?: CheckErrorView;
}

export interface Check {
  id: string;
  endpoint: Endpoint;
  title: string;
  expect: (source: ApiSource) => string;
  execute: (signal: AbortSignal, onProgress: (text: string) => void) => Promise<CheckRecord>;
}

interface CheckDefinition<T> {
  id: string;
  endpoint: Endpoint;
  title: string;
  expect: (source: ApiSource) => string;
  run: (signal: AbortSignal, onProgress: (text: string) => void) => Promise<ApiResult<T>>;
  /** 칸 오류 위치를 찾을 입력 (EVENT 오류) */
  input?: SimulationInputDraft;
  /** 오류가 나야 맞는 점검이면 그 코드 */
  expectError?: (source: ApiSource) => string | null;
  summarize?: (data: T) => string;
  verify?: (data: T, result: ApiResult<T>) => boolean;
}

const elapsed = (start: number) => Math.round(performance.now() - start);

function defineCheck<T>(def: CheckDefinition<T>): Check {
  return {
    id: def.id,
    endpoint: def.endpoint,
    title: def.title,
    expect: def.expect,
    async execute(signal, onProgress) {
      const source = resolveMode(def.endpoint);
      const expectedError = def.expectError?.(source) ?? null;
      const start = performance.now();
      try {
        const result = await def.run(signal, onProgress);
        const verified = def.verify ? def.verify(result.data, result) : true;
        return {
          pass: expectedError === null && verified,
          source: result.source,
          mock: result.mock,
          ms: elapsed(start),
          summary: def.summarize ? def.summarize(result.data) : "성공",
          json: result.data,
        };
      } catch (error) {
        if (isAbortError(error)) throw error;
        const view: CheckErrorView = isApiError(error)
          ? {
              code: error.code,
              message: error.message,
              status: error.status,
              fields: toFieldErrors(error, def.input),
              formMessage: formErrorMessage(error, def.input),
            }
          : {
              code: "UNKNOWN",
              message: String(error),
              status: null,
              fields: {},
              formMessage: formErrorMessage(error, def.input),
            };
        return {
          pass: expectedError !== null && view.code === expectedError,
          source,
          ms: elapsed(start),
          summary: `${view.code} · ${view.message}`,
          json: isApiError(error) ? { code: error.code, status: error.status, message: error.message, result: error.fieldErrors } : view,
          error: view,
        };
      }
    },
  };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}

const S1_PLANS = [
  { name: "변동지출 10만 원 줄이기", adjustments: { monthlyVariableExpense: 850_000 } },
  { name: "비상금 300만 원 먼저", adjustments: { emergencyFirstAmount: 3_000_000 as const } },
  { name: "목표 1년 늦추기", adjustments: { goalTargetDate: "2032-11" } },
];

const EVENT_INPUT: SimulationInputDraft = {
  startMonth: "2026-11",
  events: [
    { presetKey: "CAR", name: "자동차", eventType: "ONE_TIME", occurDate: "2028-03", amount: 5_000_000 },
    { presetKey: "CUSTOM", name: "여행", eventType: "ONE_TIME", occurDate: "2037-03", amount: 2_000_000 },
  ],
};

export const CHECKS: Check[] = [
  defineCheck({
    id: "validate-s1",
    endpoint: "validate",
    title: "입력 검사 · S1, ② 자산·대출·저축까지",
    expect: (source) =>
      source === "real"
        ? "성공 · 대출 상환액 134,839원 · 매달 남는 돈 465,161원 · 경고 WARN_MONTHLY_SHORTFALL"
        : "성공 · 목업은 대출을 계산하지 않아 상환액·남는 돈이 비어 있음",
    run: (signal) => api.validate({ step: "ASSETS", input: EXAMPLE_S1 }, { signal }),
    summarize: (d) =>
      [
        `대출 상환액 ${formatWon(d.summary.monthlyLoanPayment) || "없음(null)"}`,
        `매달 남는 돈 ${formatWon(d.summary.monthlySurplus) || "없음(null)"}`,
        `청년미래적금 ${d.policySaving?.eligible ? `대상 (월 ${formatWon(d.policySaving.policyMonthly)})` : "비대상"}`,
        `경고 ${d.warnings.map((w) => w.code).join(", ") || "없음"}`,
      ].join(" · "),
    verify: (d, r) =>
      r.source === "real"
        ? d.summary.monthlyLoanPayment === 134_839 && d.summary.monthlySurplus === 465_161
        : d.summary.monthlyNetIncome === 2_500_000 && d.summary.monthlyLoanPayment === null,
  }),
  defineCheck({
    id: "validate-age",
    endpoint: "validate",
    title: "입력 검사 · 나이 17 (칸 오류)",
    expect: () => "COMMON400 → 나이 칸(person.age)에 '19~39 사이로 입력해 주세요'",
    run: (signal) => api.validate({ step: "BASIC", input: { person: { age: 17 } } }, { signal }),
    expectError: () => "COMMON400",
  }),
  defineCheck({
    id: "validate-career",
    endpoint: "validate",
    title: "입력 검사 · 나이 20, 경력 6년 (여러 칸 규칙)",
    expect: () => "INPUT4001 → 경력 칸(person.careerYears)",
    run: (signal) => api.validate({ step: "BASIC", input: { person: { age: 20, careerYears: 6 } } }, { signal }),
    expectError: () => "INPUT4001",
  }),
  defineCheck({
    id: "validate-goal",
    endpoint: "validate",
    title: "입력 검사 · 목표 시점 2027-10 (기준 2026-11)",
    expect: () => "GOAL4001 → 목표 시점 칸(goal.targetDate)",
    run: (signal) =>
      api.validate(
        { step: "GOAL", input: { startMonth: "2026-11", goal: { targetAmount: 30_000_000, targetDate: "2027-10" } } },
        { signal },
      ),
    expectError: () => "GOAL4001",
  }),
  defineCheck({
    id: "validate-event",
    endpoint: "validate",
    title: "입력 검사 · 예정된 일 2개 중 2번째가 120개월 뒤",
    expect: () => "EVENT4002 → 2번째 카드(events[1])",
    input: EVENT_INPUT,
    run: (signal) => api.validate({ step: "EVENTS", input: EVENT_INPUT }, { signal }),
    expectError: () => "EVENT4002",
  }),
  defineCheck({
    id: "repayment-s1",
    endpoint: "repaymentPreview",
    title: "대출 상환액 · S1 학자금 1,200만 원, 1.9%, 96개월",
    expect: (source) =>
      source === "real" ? "첫 달 134,839원" : "MOCK_UNAVAILABLE (목업은 대출을 계산하지 않음 → real로 바꿔서 확인)",
    run: (signal) =>
      api.repaymentPreview(
        { loanType: "STUDENT", principal: 12_000_000, annualRate: 1.9, remainingMonths: 96, repaymentType: "EQUAL_PAYMENT" },
        { signal },
      ),
    expectError: (source) => (source === "mock" ? "MOCK_UNAVAILABLE" : null),
    summarize: (d) => `첫 달 ${formatWon(d.firstMonthPayment)} (원금 ${formatWon(d.firstMonthPrincipal)} + 이자 ${formatWon(d.firstMonthInterest)}) · 총이자 ${formatWon(d.totalInterest)}`,
    verify: (d) => d.firstMonthPayment === 134_839,
  }),
  defineCheck({
    id: "presets",
    endpoint: "presets",
    title: "예정된 일 프리셋",
    expect: () => "5종: 독립 · 전세 이사 · 결혼 · 이직 · 자동차",
    run: (signal) => api.presets({ signal }),
    summarize: (d) => `${d.presets.length}종: ${d.presets.map((p) => p.name).join(" · ")}`,
    verify: (d) => d.presets.length === 5,
  }),
  defineCheck({
    id: "examples",
    endpoint: "examples",
    title: "예시 사용자",
    expect: () => "S1 27세 개발자 · S2 24세 첫 직장 · S3 36세 계약직",
    run: (signal) => api.examples({ signal }),
    summarize: (d) => d.examples.map((e) => `${e.key} ${e.label}`).join(" · "),
    verify: (d) => d.examples.map((e) => e.key).join() === "S1,S2,S3",
  }),
  defineCheck({
    id: "simulate-s1",
    endpoint: "simulate",
    title: "기본 결과 · S1",
    expect: () => "목표 확률 58.0% · 첫 문장에 '4,440만 원' (정답 파일 S1과 같아야 함)",
    run: (signal) => api.simulate({ input: EXAMPLE_S1 }, { signal }),
    summarize: (d) => `목표 확률 ${formatPercent(d.goal.probability)} · ${d.headline}`,
    verify: (d, r) => d.goal.probability === 58 && (r.source === "real" || r.mock?.exact === true),
  }),
  defineCheck({
    id: "simulate-t1",
    endpoint: "simulate",
    title: "세금 (v1.7) · T1, S1 + 월세 50만 · 배분 30만/10만/10만",
    expect: () => "목표 확률 66.1% · 돌려받는 세금 4,320,332원 · 세금 순이득 4,276,235원",
    run: (signal) => api.simulate({ input: EXAMPLE_T1 }, { signal }),
    summarize: (d) =>
      d.tax
        ? `목표 확률 ${formatPercent(d.goal.probability)} · 돌려받는 세금 ${formatWon(d.tax.refundTotal)} · 세금 순이득 ${formatWon(d.tax.netBenefit)}`
        : `목표 확률 ${formatPercent(d.goal.probability)} · 세금(tax)이 없음 → v1.7 백엔드인지 확인`,
    verify: (d) => d.goal.probability === 66.1 && d.tax?.netBenefit === 4_276_235,
  }),
  defineCheck({
    id: "preview-s1",
    endpoint: "preview",
    title: "조절 미리보기 · S1, 변동지출 95만 → 85만 원",
    expect: () => "58.0% → 70.5% (+12.5%p)",
    run: (signal) => api.preview({ input: EXAMPLE_S1, adjustments: { monthlyVariableExpense: 850_000 } }, { signal }),
    summarize: (d) =>
      `${formatPercent(d.current.probability)} → ${formatPercent(d.adjusted.probability)} (${formatPercentPoint(
        d.adjusted.probability - d.current.probability,
      )})`,
    verify: (d) => d.current.probability === 58 && d.adjusted.probability === 70.5,
  }),
  defineCheck({
    id: "compare-s1",
    endpoint: "compare",
    title: "계획 비교 · S1, 비교 계획 3개",
    expect: () => "지금 58.0% · 변동지출 70.5% · 비상금 먼저 · 목표 1년 늦추기",
    run: (signal) => api.compare({ input: EXAMPLE_S1, plans: S1_PLANS }, { signal }),
    summarize: (d) => d.plans.map((p) => `${p.name} ${formatPercent(p.probability)}`).join(" · "),
    verify: (d) => d.plans.length === 4 && d.plans[0].isBase && d.plans[1].probability === 70.5,
  }),
  defineCheck({
    id: "reverse-s1",
    endpoint: "reverse",
    title: "역산 · S1, 목표 확률 70%",
    expect: () => "변동지출을 월 10만 원 줄이면 70.5%",
    run: (signal) => api.reverse({ input: EXAMPLE_S1, targetProbability: 70 }, { signal }),
    summarize: (d) =>
      `지금 ${formatPercent(d.currentProbability)} · 변동지출 ${formatWon(d.requiredVariableExpenseCut?.amount)} 줄이면 ${formatPercent(
        d.requiredVariableExpenseCut?.probability,
      )} · 제안 ${d.levers.length}개`,
    verify: (d) => d.currentProbability === 58 && d.requiredVariableExpenseCut?.amount === 100_000,
  }),
  defineCheck({
    id: "robust-s1",
    endpoint: "robust",
    title: "가능성 범위 · S1 (작업 시작 → 1초마다 확인)",
    expect: () => "중앙값 66.4% (51.4%~83.5%)",
    run: async (signal, onProgress) => {
      const start = await api.startRobust({ input: EXAMPLE_S1, plans: S1_PLANS.slice(0, 1) }, { signal });
      onProgress(`작업 ${start.data.jobId} 시작`);
      const deadline = performance.now() + 120_000;
      for (;;) {
        await wait(1_000, signal);
        const job = await api.robustJob(start.data.jobId, { signal });
        onProgress(`${job.data.status} ${job.data.progress}%`);
        if (job.data.status !== "RUNNING" || performance.now() > deadline) return job;
      }
    },
    summarize: (d: RobustJobResult) =>
      d.probability
        ? `${d.status} · 중앙값 ${formatPercent(d.probability.median)} (${formatPercent(d.probability.low)}~${formatPercent(d.probability.high)})`
        : `${d.status} · ${d.progress}%`,
    verify: (d) => d.status === "DONE" && d.probability?.median === 66.4,
  }),
  defineCheck({
    id: "recommend-s1",
    endpoint: "recommend",
    title: "배분 추천 (v1.7) · S1",
    expect: () => "혜택 최대: 청년미래 10만 · 청약 10만 · 연금저축 30만 원 → 57.4%, 세금 + 지원금 1,951,429원",
    run: (signal) => api.recommendAllocation({ input: EXAMPLE_S1 }, { signal }),
    summarize: (d) => {
      const a = d.bestBenefit.allocation;
      return `${d.evaluated}개 배분 계산 · 혜택 최대: 청년미래 ${formatWon(a.policyMonthly)} · 청약 ${formatWon(a.housingMonthly)} · 연금저축 ${formatWon(
        a.pensionMonthly,
      )} → ${formatPercent(d.bestBenefit.probability)}, ${formatWon(d.bestBenefit.totalBenefit)}`;
    },
    verify: (d) => d.bestBenefit.totalBenefit === 1_951_429 && d.bestBenefit.probability === 57.4,
  }),
  defineCheck({
    id: "reports-s1",
    endpoint: "reports",
    title: "리포트 (v1.7) · S1, 비교 계획 1개",
    expect: () => "모델 1.7 · 근거 15개 · 개선 포인트 3개 · 비교 2줄 (지금 계획 + 1개) · 세금 있음",
    run: (signal) => api.report({ input: EXAMPLE_S1, plans: S1_PLANS.slice(0, 1), seed: null }, { signal }),
    summarize: (d) =>
      `모델 ${d.modelVersion} · 근거 ${d.parameters.length}개 · 개선 포인트 ${d.levers.length}개 · 비교 ${d.comparison.length}줄 · 세금 ${
        d.tax ? "있음" : "없음"
      } · ${d.generatedAt}`,
    verify: (d) =>
      d.modelVersion === "1.7" && d.parameters.length === 15 && d.levers.length === 3 && d.comparison.length === 2 && !!d.tax,
  }),
  defineCheck({
    id: "meta",
    endpoint: "meta",
    title: "근거·파라미터",
    expect: () => "모델 1.7 · 2,000경로 · 근거 15개",
    run: (signal) => api.meta({ signal }),
    summarize: (d) => `모델 ${d.modelVersion} · ${d.paths.toLocaleString("ko-KR")}경로 · 근거 ${d.parameters.length}개`,
    verify: (d) => d.modelVersion === "1.7" && d.paths === 2000 && d.parameters.length === 15,
  }),
];
