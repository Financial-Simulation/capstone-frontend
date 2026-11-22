/**
 * 결과 화면 '계획 바꿔 보기'(04-2, 명세서 v1.7 9.2 '직접 바꿔 보기', tax-addon.js의 planSection)에 보여 줄 값 (순수 함수).
 * 값 7개를 바꿔 미리보기(/simulate/preview), 최대 3개 담아 비교(/compare), 가정을 바꿔도 결론이 같은지(/robust).
 * 계산은 서버가 하고, 여기서는 바꾼 값을 고르고 서버 결과에 이름을 붙인다.
 */
import { EMERGENCY_FIRST_OPTIONS, INPUT_DEFAULTS } from "@/config/policy";
import { compareDiff, type CompareDiff } from "@/features/result/result";
import { formatKoreanWon, formatManwon, formatPercent, formatPercentPoint, MINUS } from "@/lib/format";
import { LIMITS, resolvedExpenseTotal } from "@/lib/rules";
import type {
  Adjustments,
  CompareResult,
  EmergencyFirstAmount,
  PlanRequest,
  RobustJobResult,
  SimulationInput,
  YearMonth,
} from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";

/** 바꿔 볼 수 있는 값 7개 (Adjustments의 이름 그대로) */
export interface PlanValues {
  monthlyVariableExpense: number;
  monthlyFixedExpense: number;
  monthlySaving: number;
  breakThreshold: number;
  goalTargetAmount: number;
  goalTargetDate: YearMonth;
  emergencyFirstAmount: EmergencyFirstAmount;
}

export type PlanKey = keyof PlanValues;
export type MoneyPlanKey = Exclude<PlanKey, "goalTargetDate" | "emergencyFirstAmount">;

/** 담은 계획 이름에 쓰는 짧은 이름 */
const SHORT: Record<PlanKey, string> = {
  monthlyVariableExpense: "변동지출",
  monthlyFixedExpense: "고정지출",
  monthlySaving: "저축",
  breakThreshold: "버틸 금액",
  goalTargetAmount: "목표",
  goalTargetDate: "목표 시점",
  emergencyFirstAmount: "비상금 먼저",
};

export const PLAN_KEYS = Object.keys(SHORT) as PlanKey[];

/** '지금 계획'의 값 (비운 칸은 서버 기본값으로) */
export function planBase(input: SimulationInput): PlanValues {
  return {
    monthlyVariableExpense: resolvedExpenseTotal(input.expenses.variable) ?? 0,
    monthlyFixedExpense: resolvedExpenseTotal(input.expenses.fixed) ?? 0,
    monthlySaving: input.savingPlan.monthlySaving,
    breakThreshold: input.emergency?.breakThreshold ?? INPUT_DEFAULTS.breakThreshold,
    goalTargetAmount: input.goal.targetAmount,
    goalTargetDate: input.goal.targetDate,
    emergencyFirstAmount: input.savingPlan.emergencyFirstAmount ?? INPUT_DEFAULTS.emergencyFirstAmount,
  };
}

/** 바꾸는 중인 값. 금액 칸은 비울 수 있다 (비우면 바꾸지 않은 것으로 본다) */
export type PlanDraft = { [K in PlanKey]: PlanValues[K] | null };

/** 지금 계획과 다른 값만 (서버 Adjustments) */
export function planChanges(draft: PlanDraft, base: PlanValues): Adjustments {
  const adjustments: Record<string, unknown> = {};
  for (const key of PLAN_KEYS) {
    const value = draft[key];
    if (value != null && value !== base[key]) adjustments[key] = value;
  }
  return adjustments as Adjustments;
}

export function hasChanges(adjustments: Adjustments): boolean {
  return Object.keys(adjustments).length > 0;
}

function valueText(key: PlanKey, value: unknown): string {
  if (key === "goalTargetDate") return formatYearMonth(value as YearMonth);
  if (key === "emergencyFirstAmount") return value ? formatKoreanWon(value as number) : "없음";
  return formatKoreanWon(value as number);
}

/** 배분 막대 (Adjustments의 이름 그대로) */
const ALLOCATION_SHORT = { policyMonthly: "청년미래", housingMonthly: "청약", pensionMonthly: "연금저축" } as const;

/** "변동지출 85만 원 · 목표 시점 2032년 11월 · 청약 20만 원" (담은 계획 이름, 20자를 넘을 수 있다 → 서버에는 planRequests로) */
export function describeChanges(adjustments: Adjustments): string {
  const values = adjustments as Record<string, unknown>;
  const plan = PLAN_KEYS.filter((key) => key in adjustments).map((key) => `${SHORT[key]} ${valueText(key, values[key])}`);
  const allocation = (Object.keys(ALLOCATION_SHORT) as (keyof typeof ALLOCATION_SHORT)[])
    .filter((key) => key in adjustments)
    .map((key) => `${ALLOCATION_SHORT[key]} ${formatKoreanWon(values[key] as number)}`);
  return [...plan, ...allocation].join(" · ");
}

/** max자를 넘으면 앞 max−1자 + "…" */
function clipName(name: string, max: number): string {
  return name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;
}

/**
 * 담은 계획 → 서버에 보내는 계획 (/compare · /robust · /reports).
 * 서버는 계획 이름을 20자까지만 받는다 (PlanSpec.name, 넘으면 COMMON400 "plans[0].name").
 * 두 값 이상 바꾼 계획 이름(describeChanges)은 20자를 넘기 쉬워서 줄여 보내고, 화면에는 planLabels로 담은 계획 이름을 붙인다.
 */
export function planRequests(plans: readonly { name: string; adjustments: Adjustments }[]): PlanRequest[] {
  return plans.map((plan) => ({ name: clipName(plan.name, LIMITS.nameLength), adjustments: plan.adjustments }));
}

/** 보낸 계획 하나의 이름표: 서버에 보낸 이름(20자까지)과 화면에 보여 줄 담은 계획 이름 */
export interface PlanLabel {
  sent: string;
  label: string;
}

/** planRequests와 같은 순서의 이름표 (planCompareRows · robustPlanLines · reportView에 넘긴다) */
export function planLabels(plans: readonly { name: string }[]): PlanLabel[] {
  return plans.map((plan) => ({ sent: clipName(plan.name, LIMITS.nameLength), label: plan.name }));
}

/**
 * 서버가 돌려준 index번째 계획 이름 → 화면 이름. 보낸 이름 그대로 돌아왔을 때만 담은 계획 이름으로 바꾼다.
 * 목업은 정답 파일에 없는 계획이면 정답 파일의 예시 계획을 대신 돌려주므로, 그때는 그 예시 이름을 그대로 둔다.
 */
function labelOf(name: string, index: number, labels?: readonly PlanLabel[]): string {
  const label = labels?.[index];
  return label && label.sent === name ? label.label : name;
}

export function sameAdjustments(a: Adjustments, b: Adjustments): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]);
}

/** 비상금 먼저 모으기 선택지 */
export const EMERGENCY_CHOICES = EMERGENCY_FIRST_OPTIONS.map((value) => ({
  value,
  label: value ? `${formatKoreanWon(value)} 모은 뒤 적금` : "바로 적금 시작",
}));

// ===== 담은 계획 비교 (/compare) =====

/** 담은 계획 비교 표의 칸 이름. 결과 화면 '계획 바꿔 보기'와 리포트가 같이 쓴다 (PlanCompareRow와 같은 순서) */
export const PLAN_COMPARE_HEADERS = [
  "계획",
  "목표 달성 가능성",
  "빚질 가능성",
  "최악의 경우",
  "청년미래 중도해지",
  "정부 지원금",
  "세금 순이득",
] as const;

export interface PlanCompareRow {
  name: string;
  isBase: boolean;
  probability: string;
  diff: CompareDiff | null;
  debt: string;
  worst: string;
  earlyTermination: string;
  subsidy: string;
  taxNetBenefit: string;
}

/**
 * 서버는 '지금 계획' 다음에 보낸 순서대로 돌려준다.
 * labels: 보낸 계획의 이름표 (planLabels). 줄여 보낸 이름 대신 담은 계획 이름을 붙인다
 */
export function planCompareRows(compare: CompareResult, labels?: readonly PlanLabel[]): PlanCompareRow[] {
  return compare.plans.map((plan, index) => ({
    name: plan.isBase ? plan.name : labelOf(plan.name, index - 1, labels),
    isBase: plan.isBase,
    probability: formatPercent(plan.probability),
    diff: compareDiff(plan),
    debt: formatPercent(plan.debtProbability),
    worst: formatManwon(plan.worstCaseAtGoal),
    earlyTermination: plan.earlyTerminationProbability == null ? "대상 아님" : formatPercent(plan.earlyTerminationProbability),
    subsidy: plan.expectedSubsidy == null ? "—" : formatManwon(plan.expectedSubsidy),
    taxNetBenefit: plan.taxNetBenefit == null ? "—" : formatManwon(plan.taxNetBenefit),
  }));
}

// ===== 가정을 바꿔도 결론이 같은지 (/robust의 plans) =====

const oneDecimal = (value: number) => `${value < 0 ? MINUS : ""}${Math.abs(value).toFixed(1)}`;

/** 담은 계획마다 한 줄: 결론(지금보다 나은지 · 못한지)이 몇 번 유지되는지. labels는 planCompareRows와 같다 */
export function robustPlanLines(job: RobustJobResult, labels?: readonly PlanLabel[]): { name: string; text: string }[] {
  return (job.plans ?? []).map((plan, index) => ({
    name: labelOf(plan.name, index, labels),
    text:
      `가정을 ${plan.trials}가지로 바꿔도 지금 계획보다 ${plan.diffMedian >= 0 ? "나은" : "못한"} 결론이 ` +
      `${plan.trials}번 중 ${plan.conclusionKept}번 유지돼요 (차이 가운데 ${formatPercentPoint(plan.diffMedian)}, ` +
      `95% 범위 ${oneDecimal(plan.diffLow)}~${oneDecimal(plan.diffHigh)}%p).`,
  }));
}
