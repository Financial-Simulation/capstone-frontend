/**
 * 목업 API. 엔드포인트마다 실제 API와 같은 모양을 돌려준다.
 *  - 계산 API(simulate · preview · compare · reverse · robust): 입력이 같은 정답 케이스. 없으면 S1을 돌려주고 exact=false
 *  - validate: 칸 규칙·교차 규칙·합계·경고를 서버처럼 흉내 낸다. 단, 대출 상환액은 계산하지 않는다(null)
 *  - repaymentPreview: 계산이라 목업이 없다 → MOCK_UNAVAILABLE
 *  - presets · examples · meta: 서버·params.json과 같은 고정값
 *
 * 화면은 실제 API와 똑같이 쓰고, 목업인지는 ApiResult.source로만 구분한다.
 */
import type {
  CompareRequest,
  CompareResult,
  ExamplesResult,
  MetaResult,
  PresetsResult,
  PreviewRequest,
  PreviewResult,
  RepaymentPreviewRequest,
  RepaymentPreviewResult,
  ReverseRequest,
  ReverseResult,
  RobustJobResult,
  RobustRequest,
  RobustStartResult,
  SimulateRequest,
  SimulateResult,
  SimulationInputDraft,
  ApiWarning,
  ValidateRequest,
  ValidateResult,
  ValidateSummary,
  PolicySavingAllocation,
} from "@/lib/types";
import { ApiError } from "@/lib/api/errors";
import { checkCrossRules, checkFields, checkRequired, resolvedExpenseTotal } from "@/lib/rules";
import examplesData from "./data/examples.json";
import metaData from "./data/meta.json";
import presetsData from "./data/presets.json";
import { adjustmentsKey, findGoldenCase, goldenCaseByKey, shiftDates, type GoldenCase } from "./golden";
import { isYearMonth, monthsBetween } from "@/lib/year-month";

export interface MockMatch {
  /** 정답 파일의 어떤 케이스를 돌려줬는지 (S1~S3, E1~E5). 해당 없으면 null */
  caseKey: string | null;
  /** 입력(과 조정값)이 정답 파일과 정확히 같았는지 */
  exact: boolean;
  note?: string;
}

export interface MockReturn<T> {
  data: T;
  match: MockMatch;
}

const clone = <T,>(value: T): T => structuredClone(value);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 계산 API는 실제처럼 잠깐 기다린다 ('계산 중' 화면을 볼 수 있게) */
const CALC_DELAY_MS = 600;
const LOOKUP_DELAY_MS = 120;

function badRequest(fieldErrors: Record<string, string>): ApiError {
  return new ApiError("COMMON400", "잘못된 요청입니다.", 400, fieldErrors);
}

/** 서버의 checkRequired()처럼 계산 직전 검사: 필수 칸 → 칸 규칙 → 교차 규칙 */
function assertComputable(input: SimulationInputDraft): void {
  const required = checkRequired("ALL", input);
  if (Object.keys(required).length > 0) throw badRequest(required);
  const fields = checkFields(input);
  if (Object.keys(fields).length > 0) throw badRequest(fields);
  const cross = checkCrossRules(input);
  if (cross) throw new ApiError(cross.code, cross.message, 400);
}

const FALLBACK_NOTE = "정답 파일에 같은 입력이 없어 S1 결과를 보여 줘요";

interface Picked {
  golden: GoldenCase;
  exact: boolean;
  /** 응답의 연월을 옮길 개월 수 (입력의 기준 달 − 정답 케이스의 기준 달) */
  shift: number;
}

function pickCase(input: SimulationInputDraft): Picked {
  const found = findGoldenCase(input);
  if (found) return { golden: found.golden, exact: true, shift: found.shift };
  // 같은 입력이 없으면 S1. 날짜는 입력의 기준 달에 맞춰 옮긴다 (그래프 가로축이 내 기준 달부터 시작하게)
  const s1 = goldenCaseByKey("S1")!;
  const shift = isYearMonth(input.startMonth) ? monthsBetween(s1.input.startMonth, input.startMonth) : 0;
  return { golden: s1, exact: false, shift };
}

/** 정답 파일의 응답을 복사하고 기준 달 차이만큼 연월을 옮긴다 */
function answer<T>(picked: Picked, value: T): T {
  return shiftDates(clone(value), picked.shift);
}

function matchOf(picked: Picked, exact: boolean, note?: string): MockMatch {
  const shifted =
    picked.shift === 0
      ? undefined
      : `기준 연월이 정답 파일(${picked.golden.input.startMonth})과 ${Math.abs(picked.shift)}개월 달라 날짜만 옮겼어요`;
  return {
    caseKey: picked.golden.key,
    exact,
    note: exact ? (note ?? shifted) : (note ?? FALLBACK_NOTE),
  };
}

// ===== 입력 검사 =====

/** 백엔드 Money.toKorean과 같은 표기 (경고 문장용) */
function toKoreanServer(won: number): string {
  const comma = (v: number) => v.toLocaleString("ko-KR");
  const sign = won < 0 ? "-" : "";
  const abs = Math.abs(won);
  const man = Math.floor(abs / 10_000);
  const rest = abs % 10_000;
  if (man === 0) return `${sign}${comma(rest)}원`;
  if (rest === 0) return `${sign}${comma(man)}만 원`;
  return `${sign}${comma(man)}만 ${comma(rest)}원`;
}

const allPresent = (...values: (number | null | undefined)[]) => values.every((v) => v != null);

export async function validate(request: ValidateRequest): Promise<MockReturn<ValidateResult>> {
  await wait(LOOKUP_DELAY_MS);
  const input = request.input ?? {};

  const fields = checkFields(input);
  if (Object.keys(fields).length > 0) throw badRequest(fields);
  const cross = checkCrossRules(input);
  if (cross) throw new ApiError(cross.code, cross.message, 400);

  const net = input.income?.monthlyNetIncome ?? null;
  const fixed = input.expenses?.fixed ? resolvedExpenseTotal(input.expenses.fixed) : null;
  const variable = input.expenses?.variable ? resolvedExpenseTotal(input.expenses.variable) : null;

  let loanPayment: number | null = null;
  let loanBalance: number | null = null;
  const loans = input.loans;
  if (loans?.hasNoLoan != null) {
    loanBalance = (loans.items ?? []).reduce((sum, item) => sum + (item?.principal ?? 0), 0);
    // 상환액 계산은 백엔드(LoanCalculator)에서만 한다. 대출이 없을 때만 0으로 안다
    loanPayment = (loans.items ?? []).length === 0 ? 0 : null;
  }

  const surplus = allPresent(net, fixed, variable, loanPayment) ? net! - fixed! - variable! - loanPayment! : null;
  const saving = input.savingPlan?.monthlySaving ?? null;
  const assets = input.assets;
  const totalAssets =
    assets && allPresent(assets.cash, assets.deposits) ? assets.cash! + assets.deposits! + (assets.investments ?? 0) : null;

  const summary: ValidateSummary = {
    monthlyNetIncome: net,
    fixedTotal: fixed,
    variableTotal: variable,
    monthlyLoanPayment: loanPayment,
    monthlySurplus: surplus,
    monthlySaving: saving,
    totalAssets,
    totalLoanBalance: loanBalance,
  };

  const warnings: ApiWarning[] = [];
  let policySaving: PolicySavingAllocation | null = null;
  const age = input.person?.age;
  if (age != null && net != null && saving != null) {
    let reason: string | null = null;
    if (age > 34) reason = "만 34세를 넘어 청년미래적금 대상이 아니에요. 일반 적금으로 계산해요.";
    else if (net * 12 * 100 > 75_000_000 * 88) {
      reason = "총급여가 7,500만 원을 넘어 청년미래적금 대상이 아니에요. 일반 적금으로 계산해요.";
    }
    if (reason) {
      warnings.push({ code: "INFO_POLICY_INELIGIBLE", message: reason });
      policySaving = { eligible: false, reason, policyMonthly: 0, generalMonthly: saving };
    } else {
      const policy = Math.min(saving, 500_000);
      policySaving = { eligible: true, reason: null, policyMonthly: policy, generalMonthly: saving - policy };
    }
  }

  if (allPresent(net, fixed, variable) && fixed! + variable! >= net!) {
    warnings.push({
      code: "WARN_EXPENSE_OVER_INCOME",
      message: `지출(${toKoreanServer(fixed! + variable!)})이 월 실수령액(${toKoreanServer(net!)}) 이상이라 매달 모자라요.`,
    });
  }
  if (allPresent(surplus, saving) && saving! > surplus!) {
    warnings.push({
      code: "WARN_MONTHLY_SHORTFALL",
      message: `저축액이 매달 남는 돈(${toKoreanServer(surplus!)})보다 커서 계획만큼 넣지 못하는 달이 생겨요.`,
    });
  }
  const target = input.goal?.targetAmount;
  if (allPresent(target, totalAssets) && target! <= totalAssets!) {
    warnings.push({
      code: "WARN_GOAL_ALREADY_MET",
      message: `이미 모은 돈(${toKoreanServer(totalAssets!)})이 목표 금액(${toKoreanServer(target!)}) 이상이에요. 목표를 더 높게 잡아 볼까요?`,
    });
  }

  const hasLoans = (loans?.items ?? []).length > 0;
  return {
    data: { step: request.step ?? null, summary, policySaving, warnings },
    match: {
      caseKey: null,
      exact: !hasLoans,
      note: hasLoans ? "목업 검사라 대출 상환액·매달 남는 돈은 비워 둬요 (백엔드에서만 계산)" : "목업 검사",
    },
  };
}

export async function repaymentPreview(request: RepaymentPreviewRequest): Promise<MockReturn<RepaymentPreviewResult>> {
  void request;
  await wait(LOOKUP_DELAY_MS);
  throw new ApiError(
    "MOCK_UNAVAILABLE",
    "목업에서는 대출 상환액을 계산하지 않아요. 백엔드를 켜고 이 API를 real로 바꿔 주세요.",
    null,
  );
}

// ===== 고정값 =====

export async function presets(): Promise<MockReturn<PresetsResult>> {
  await wait(LOOKUP_DELAY_MS);
  return { data: clone(presetsData as PresetsResult), match: { caseKey: null, exact: true } };
}

export async function examples(): Promise<MockReturn<ExamplesResult>> {
  await wait(LOOKUP_DELAY_MS);
  return { data: clone(examplesData as unknown as ExamplesResult), match: { caseKey: null, exact: true } };
}

export async function meta(): Promise<MockReturn<MetaResult>> {
  await wait(LOOKUP_DELAY_MS);
  return {
    data: clone(metaData as MetaResult),
    match: { caseKey: null, exact: true, note: "params.json의 meta (근거 11개 항목)" },
  };
}

// ===== 계산 =====

export async function simulate(request: SimulateRequest): Promise<MockReturn<SimulateResult>> {
  await wait(CALC_DELAY_MS);
  assertComputable(request.input);
  const picked = pickCase(request.input);
  return { data: { ...answer(picked, picked.golden.simulate), warnings: [] }, match: matchOf(picked, picked.exact) };
}

export async function preview(request: PreviewRequest): Promise<MockReturn<PreviewResult>> {
  await wait(CALC_DELAY_MS / 2);
  assertComputable(request.input);
  if (adjustmentsKey(request.adjustments) === "[]") {
    throw badRequest({ adjustments: "바꿀 값을 하나 이상 보내 주세요" });
  }
  const picked = pickCase(request.input);
  // 목표 시점(goalTargetDate)도 기준 달 차이만큼 옮겨서 비교한다
  const { adjustments: goldenAdjustments, ...result } = answer(picked, picked.golden.preview);
  const sameAdjustments = adjustmentsKey(request.adjustments) === adjustmentsKey(goldenAdjustments);
  return {
    data: result,
    match: matchOf(
      picked,
      picked.exact && sameAdjustments,
      picked.exact && !sameAdjustments ? "정답 파일의 조정값과 달라서 정답 파일의 미리보기를 보여 줘요" : undefined,
    ),
  };
}

export async function compare(request: CompareRequest): Promise<MockReturn<CompareResult>> {
  await wait(CALC_DELAY_MS);
  assertComputable(request.input);
  if (!request.plans || request.plans.length < 1 || request.plans.length > 3) {
    throw new ApiError("SIM4003", "비교 계획은 1~3개여야 해요.", 400);
  }
  const picked = pickCase(request.input);
  const result = answer(picked, picked.golden.compare);
  const [base, ...candidates] = result.plans;
  const matched = request.plans.map((plan) => {
    const hit = candidates.find((c) => adjustmentsKey(c.adjustments) === adjustmentsKey(plan.adjustments));
    return hit ? { ...hit, name: plan.name } : null;
  });
  if (picked.exact && matched.every(Boolean)) {
    return { data: { ...result, plans: [base, ...matched.map((p) => p!)] }, match: matchOf(picked, true) };
  }
  return {
    data: result,
    match: matchOf(
      picked,
      false,
      picked.exact ? "정답 파일에 없는 계획이 있어서 정답 파일의 비교 계획을 보여 줘요" : undefined,
    ),
  };
}

export async function reverse(request: ReverseRequest): Promise<MockReturn<ReverseResult>> {
  await wait(CALC_DELAY_MS);
  assertComputable(request.input);
  const picked = pickCase(request.input);
  const target = request.targetProbability ?? 70;
  return {
    data: answer(picked, picked.golden.reverse),
    match: matchOf(picked, picked.exact && target === 70, target !== 70 ? "정답 파일은 목표 확률 70% 기준이에요" : undefined),
  };
}

// ===== 가능성 범위 (비동기 작업) =====

/** 목업 작업이 끝나는 데 걸리는 시간 (실제는 몇 초) */
const ROBUST_DURATION_MS = 3_000;
const jobs = new Map<string, { picked: Picked; startedAt: number }>();
let jobCounter = 0;

export async function startRobust(request: RobustRequest): Promise<MockReturn<RobustStartResult>> {
  await wait(LOOKUP_DELAY_MS);
  assertComputable(request.input);
  if (request.plans && request.plans.length > 3) {
    throw new ApiError("SIM4003", "비교 계획은 1~3개여야 해요.", 400);
  }
  const picked = pickCase(request.input);
  jobCounter += 1;
  const jobId = `mock-${picked.golden.key.toLowerCase()}-${jobCounter}`;
  jobs.set(jobId, { picked, startedAt: Date.now() });
  return {
    data: { jobId, status: "RUNNING", trials: picked.golden.robust.trials },
    match: matchOf(picked, picked.exact),
  };
}

export async function robustJob(jobId: string): Promise<MockReturn<RobustJobResult>> {
  await wait(LOOKUP_DELAY_MS);
  const job = jobs.get(jobId);
  if (!job) throw new ApiError("JOB404", "작업이 없거나 10분이 지나 삭제되었어요.", 404);
  const progress = Math.min(100, Math.floor(((Date.now() - job.startedAt) / ROBUST_DURATION_MS) * 100));
  const { robust } = job.picked.golden;
  const done = progress >= 100;
  return {
    data: {
      jobId,
      status: done ? "DONE" : "RUNNING",
      progress,
      trials: robust.trials,
      pathsPerTrial: robust.pathsPerTrial,
      probability: done ? clone(robust.probability) : null,
      plans: done ? clone(robust.plans) : null,
      message: done ? robust.message : null,
    },
    match: matchOf(job.picked, job.picked.exact),
  };
}
