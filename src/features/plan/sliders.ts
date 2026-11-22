/**
 * 결과 화면 '계획 바꿔 보기' 막대 (멘토 피드백 11/16: 입력칸 대신 드래그 막대, 움직이면 위 그래프가 바로 바뀐다).
 * 막대 범위 · 한 칸 크기와 '이렇게 하면 좋아져요'(서버 /reverse의 levers)를 막대 값으로 옮기는 규칙 (순수 함수).
 * 막대 범위는 입력 칸 규칙(LIMITS) 안에서 지금 값 둘레로 잡는다. 계산은 서버가 한다 (POST /simulate + adjustments).
 */
import { LIMITS } from "@/lib/rules";
import type { LeverType, YearMonth } from "@/lib/types";
import { addMonths, monthsBetween } from "@/lib/year-month";
import type { MoneyPlanKey, PlanValues } from "./plan";

export interface SliderSpec {
  key: MoneyPlanKey | "goalTargetDate";
  label: string;
  min: number;
  max: number;
  step: number;
}

const MAN = 10_000;

const clampRange = (min: number, max: number, limit: { min: number; max: number }) => ({
  min: Math.max(limit.min, min),
  max: Math.min(limit.max, max),
});

/** 금액은 지금 값의 0~2배(최소 +50만 원) 안에서 1만 원 간격, 버틸 금액은 10만 원, 목표 금액은 100만 원 간격. 목표 시점은 개월 수 */
export function sliderSpecs(base: PlanValues, startMonth: YearMonth): SliderSpec[] {
  const around = (value: number, extra: number) => Math.max(value * 2, value + extra);
  const money = (key: MoneyPlanKey, label: string, step: number, limit: { min: number; max: number }, extra = 50 * MAN, low = 0) => {
    const { min, max } = clampRange(low, around(base[key], extra), limit);
    return { key, label, min, max: Math.max(max, base[key]), step };
  };
  const goalMonths = monthsBetween(startMonth, base.goalTargetDate);
  return [
    money("monthlyVariableExpense", "월 변동지출", MAN, { min: 0, max: LIMITS.expenseTotal.max }),
    money("monthlyFixedExpense", "월 고정지출", MAN, { min: 0, max: LIMITS.expenseTotal.max }),
    money("monthlySaving", "월 저축액", MAN, LIMITS.monthlySaving),
    money("breakThreshold", "버틸 금액", 10 * MAN, LIMITS.breakThreshold, 300 * MAN),
    money("goalTargetAmount", "목표 금액", 100 * MAN, LIMITS.goalTargetAmount, 1000 * MAN, Math.max(100 * MAN, Math.round(base.goalTargetAmount * 0.3 / (100 * MAN)) * 100 * MAN)),
    {
      key: "goalTargetDate",
      label: "목표 시점",
      min: LIMITS.goalMonths.min,
      max: Math.max(LIMITS.goalMonths.max, goalMonths),
      step: 1,
    },
  ];
}

/** 막대 값 → 화면 값. 목표 시점은 기준 달부터 개월 수 */
export function sliderValue(values: PlanValues, key: SliderSpec["key"], startMonth: YearMonth): number {
  return key === "goalTargetDate" ? monthsBetween(startMonth, values.goalTargetDate) : values[key];
}

export function withSlider(values: PlanValues, key: SliderSpec["key"], value: number, startMonth: YearMonth): PlanValues {
  return key === "goalTargetDate" ? { ...values, goalTargetDate: addMonths(startMonth, value) } : { ...values, [key]: value };
}

/**
 * '이렇게 하면 좋아져요' 한 줄 → 지금 계획에서 그것만 바꾼 값 (서버 Analyzer.levers의 후보와 같은 규칙).
 * 변동지출 · 월 저축액 10만 원 줄이기, 목표 1년 늦추기, 목표 금액 10% 낮추기(만 원 단위 반올림), 비상금 200만 원 먼저.
 */
export function applyLever(base: PlanValues, type: LeverType): PlanValues {
  switch (type) {
    case "REDUCE_VARIABLE_EXPENSE":
      return { ...base, monthlyVariableExpense: Math.max(0, base.monthlyVariableExpense - 10 * MAN) };
    case "REDUCE_SAVING":
      return { ...base, monthlySaving: Math.max(0, base.monthlySaving - 10 * MAN) };
    case "DELAY_GOAL":
      return { ...base, goalTargetDate: addMonths(base.goalTargetDate, 12) };
    case "LOWER_GOAL":
      return { ...base, goalTargetAmount: Math.round((base.goalTargetAmount / MAN) * 0.9) * MAN };
    case "EMERGENCY_FIRST":
      return { ...base, emergencyFirstAmount: 2_000_000 };
  }
}
