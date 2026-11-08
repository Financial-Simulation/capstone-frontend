/**
 * 결과 화면 '계획 바꿔 보기'(04-2, 명세서 v1.7 9.2 '직접 바꿔 보기', tax-addon.js의 planSection)에 보여 줄 값 (순수 함수).
 * 값 7개를 바꿔 미리보기(/simulate/preview), 최대 3개 담아 비교(/compare), 가정을 바꿔도 결론이 같은지(/robust).
 * 계산은 서버가 하고, 여기서는 바꾼 값을 고르고 서버 결과에 이름을 붙인다.
 */
import { EMERGENCY_FIRST_OPTIONS, INPUT_DEFAULTS } from "@/config/policy";
import { formatKoreanWon, formatManwon, formatPercent, formatPercentPoint, MINUS } from "@/lib/format";
import { resolvedExpenseTotal } from "@/lib/rules";
import type {
  Adjustments,
  CompareResult,
  ComparisonMetric,
  EmergencyFirstAmount,
  PreviewResult,
  RobustJobResult,
  SimulationInput,
  YearMonth,
} from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { PROBABILITY_GOOD } from "./result";

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

/** 금액 칸 (tax-addon.js와 같은 순서 · 안내) */
export const PLAN_MONEY_FIELDS: readonly { key: MoneyPlanKey; label: string; hint: string }[] = [
  { key: "monthlyVariableExpense", label: "월 변동지출", hint: "식비·쇼핑·여가" },
  { key: "monthlyFixedExpense", label: "월 고정지출", hint: "월세·통신비·보험료" },
  { key: "monthlySaving", label: "월 저축액", hint: "적금·청약·연금에 넣는 돈 합계" },
  { key: "breakThreshold", label: "버틸 금액", hint: "마이너스가 이만큼 넘으면 적금을 깨요" },
  { key: "goalTargetAmount", label: "목표 금액", hint: "" },
];

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

/** "변동지출 85만 원 · 목표 시점 2032년 11월" (담은 계획 이름) */
export function describeChanges(adjustments: Adjustments): string {
  return PLAN_KEYS.filter((key) => key in adjustments)
    .map((key) => `${SHORT[key]} ${valueText(key, (adjustments as Record<string, unknown>)[key])}`)
    .join(" · ");
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

/** 칸 아래 '지금 …' */
export function baseHint(key: PlanKey, base: PlanValues, hint = ""): string {
  const now =
    key === "emergencyFirstAmount"
      ? base.emergencyFirstAmount
        ? `${formatKoreanWon(base.emergencyFirstAmount)} 모은 뒤 적금`
        : "바로 적금 시작"
      : valueText(key, base[key]);
  return `지금 ${now}${hint ? ` · ${hint}` : ""}`;
}

// ===== 미리보기 (/simulate/preview) =====

const METRIC_LABELS: Record<ComparisonMetric, string> = {
  PROBABILITY: "목표 달성 가능성",
  DEBT_PROBABILITY: "빚질 가능성",
  WORST_CASE_AT_GOAL: "최악의 경우 (하위 5%)",
  EARLY_TERMINATION: "청년미래적금 중도해지",
  EXPECTED_SUBSIDY: "정부 지원금",
};
const PERCENT_METRICS: ComparisonMetric[] = ["PROBABILITY", "DEBT_PROBABILITY", "EARLY_TERMINATION"];

function signedManwon(value: number): string {
  return value > 0 ? `+${formatManwon(value)}` : formatManwon(value);
}

const reach70 = (date: YearMonth | null) => `${PROBABILITY_GOOD}%가 되는 때 ${date ? formatYearMonth(date) : "10년 안에 없음"}`;

export interface PreviewView {
  current: { probability: string; detail: string };
  adjusted: { title: string; probability: string; detail: string; tone: "good" | "danger" | "default" };
  rows: { metric: ComparisonMetric; label: string; current: string; adjusted: string; diff: string }[];
}

export function previewView(preview: PreviewResult, adjustments: Adjustments): PreviewView {
  const diff = preview.table.find((row) => row.metric === "PROBABILITY")?.diff ?? 0;
  const meaningful = preview.significance.meaningful;
  const fmt = (metric: ComparisonMetric, value: number | null) =>
    value == null ? "—" : PERCENT_METRICS.includes(metric) ? formatPercent(value) : formatManwon(value);
  return {
    current: { probability: formatPercent(preview.current.probability), detail: reach70(preview.current.reach70Date) },
    adjusted: {
      title: `바꾼 계획 (${describeChanges(adjustments)})`,
      probability: formatPercent(preview.adjusted.probability),
      detail: `${meaningful ? formatPercentPoint(diff) : "거의 차이 없음"} · ${reach70(preview.adjusted.reach70Date)}`,
      tone: !meaningful ? "default" : diff > 0 ? "good" : "danger",
    },
    rows: preview.table.map((row) => ({
      metric: row.metric,
      label: METRIC_LABELS[row.metric],
      current: fmt(row.metric, row.current),
      adjusted: fmt(row.metric, row.adjusted),
      diff: row.diff == null ? "—" : PERCENT_METRICS.includes(row.metric) ? formatPercentPoint(row.diff) : signedManwon(row.diff),
    })),
  };
}

// ===== 담은 계획 비교 (/compare) =====

export interface PlanCompareRow {
  name: string;
  isBase: boolean;
  probability: string;
  diff: { text: string; tone: "up" | "down" | "flat" } | null;
  debt: string;
  worst: string;
  earlyTermination: string;
  subsidy: string;
  taxNetBenefit: string;
}

/** 서버는 '지금 계획' 다음에 보낸 순서대로 돌려준다 */
export function planCompareRows(compare: CompareResult): PlanCompareRow[] {
  return compare.plans.map((plan) => ({
    name: plan.name,
    isBase: plan.isBase,
    probability: formatPercent(plan.probability),
    diff: plan.isBase
      ? null
      : plan.meaningful
        ? { text: formatPercentPoint(plan.diffFromBase), tone: plan.diffFromBase > 0 ? "up" : "down" }
        : { text: "거의 차이 없음", tone: "flat" },
    debt: formatPercent(plan.debtProbability),
    worst: formatManwon(plan.worstCaseAtGoal),
    earlyTermination: plan.earlyTerminationProbability == null ? "대상 아님" : formatPercent(plan.earlyTerminationProbability),
    subsidy: plan.expectedSubsidy == null ? "—" : formatManwon(plan.expectedSubsidy),
    taxNetBenefit: plan.taxNetBenefit == null ? "—" : formatManwon(plan.taxNetBenefit),
  }));
}

// ===== 가정을 바꿔도 결론이 같은지 (/robust의 plans) =====

const oneDecimal = (value: number) => `${value < 0 ? MINUS : ""}${Math.abs(value).toFixed(1)}`;

/** 담은 계획마다 한 줄: 결론(지금보다 나은지 · 못한지)이 몇 번 유지되는지 */
export function robustPlanLines(job: RobustJobResult): { name: string; text: string }[] {
  return (job.plans ?? []).map((plan) => ({
    name: plan.name,
    text:
      `가정을 ${plan.trials}가지로 바꿔도 지금 계획보다 ${plan.diffMedian >= 0 ? "나은" : "못한"} 결론이 ` +
      `${plan.trials}번 중 ${plan.conclusionKept}번 유지돼요 (차이 가운데 ${formatPercentPoint(plan.diffMedian)}, ` +
      `95% 범위 ${oneDecimal(plan.diffLow)}~${oneDecimal(plan.diffHigh)}%p).`,
  }));
}
