/**
 * 결과 화면 '어디에 얼마나' (명세서 v1.7 9.2, tax-addon.js의 allocSection · runCompare · runRecommend)에 보여 줄 값 (순수 함수).
 * 비교할 배분 후보를 만들고, 서버 결과(/compare · /allocations/recommend)를 화면 문장으로 고른다. 계산은 서버가 한다.
 */
import { HOUSING_SUBSCRIPTION, INPUT_DEFAULTS, PENSION_SAVING, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { ALLOCATION_KEYS, type AllocationKey } from "@/features/input/draft";
import { MEANINGFUL_DIFF, compareDiff, type CompareDiff } from "@/features/result/result";
import { formatKoreanWon, formatManwon, formatPercent, formatPercentPoint } from "@/lib/format";
import { checkFields } from "@/lib/rules";
import type { AllocationOption, Allocation as ResultAllocation, CompareResult, PlanRequest, RecommendResult } from "@/lib/types";
import { formatDuration } from "@/lib/year-month";

/** 상품별 월 납입 (원, 입력 savingPlan의 세 칸). 남는 돈은 일반 적금 */
export type MonthlyAllocation = Record<AllocationKey, number>;

export const ALLOCATION_FIELDS: readonly { key: AllocationKey; label: string }[] = [
  { key: "policyMonthly", label: "청년미래적금" },
  { key: "housingMonthly", label: "주택청약" },
  { key: "pensionMonthly", label: "연금저축" },
];

/** 칸 아래 안내 (숫자는 config) */
export const ALLOCATION_HINTS: Record<AllocationKey, string> = {
  policyMonthly: `월 ${formatKoreanWon(YOUTH_FUTURE_SAVING.monthlyLimit)}까지, 정부 지원금 ${YOUTH_FUTURE_SAVING.matchRate}%`,
  housingMonthly:
    `월 ${formatKoreanWon(HOUSING_SUBSCRIPTION.monthlyLimit)}까지. 납입액 연 ${formatKoreanWon(HOUSING_SUBSCRIPTION.deductionAnnualCap)}까지 ` +
    `${HOUSING_SUBSCRIPTION.deductionRate}% 소득공제, ${HOUSING_SUBSCRIPTION.clawbackYears}년 안에 깨면 추징`,
  pensionMonthly:
    `월 ${formatKoreanWon(PENSION_SAVING.monthlyLimit)}까지. 연 ${formatKoreanWon(PENSION_SAVING.creditAnnualCap)}까지 세액공제, ` +
    `${PENSION_SAVING.withdrawalAge}세 전에 꺼내면 ${PENSION_SAVING.earlyWithdrawalTaxRate}%`,
};

/** 비교 예시 배분의 금액 단위와 '청년미래 + 연금저축'의 연금저축 상한 (화면에서 고른 예시 값, 제도 숫자 아님) */
export const PRESET_STEP = 100_000;
export const PRESET_PENSION_MAX = 500_000;

/** 서버 배분(일반 적금 포함)에서 세 칸만 */
export function toMonthly(allocation: ResultAllocation | MonthlyAllocation): MonthlyAllocation {
  return {
    policyMonthly: allocation.policyMonthly,
    housingMonthly: allocation.housingMonthly,
    pensionMonthly: allocation.pensionMonthly,
  };
}

export function sameAllocation(a: MonthlyAllocation, b: MonthlyAllocation): boolean {
  return ALLOCATION_KEYS.every((key) => a[key] === b[key]);
}

/** 월 저축액에서 세 상품을 뺀 나머지 (일반 적금, 입력하는 대로 보여 주는 표시용). 음수면 합이 월 저축액보다 많다 */
export function generalRest(saving: number, allocation: MonthlyAllocation): number {
  return saving - allocation.policyMonthly - allocation.housingMonthly - allocation.pensionMonthly;
}

/** 일반 적금 칸 아래 안내 */
export function restHint(rest: number, generalSavingRate?: number | null): { text: string; over: boolean } {
  if (rest < 0) {
    return { text: `합이 월 저축액보다 ${formatKoreanWon(-rest)} 많아요. 계산할 때 연금저축 → 청약 순서로 줄여요.`, over: true };
  }
  return { text: `남는 돈은 일반 적금(연 ${generalSavingRate ?? INPUT_DEFAULTS.generalSavingRate}%)에 넣어요.`, over: false };
}

/** 칸 범위. 입력 칸 규칙(lib/rules.ts, 서버 SimulationInput.java와 같은 한도 · 문장)으로 검사한다 */
export function allocationErrors(draft: MonthlyAllocation): Partial<Record<AllocationKey, string>> {
  const errors = checkFields({ savingPlan: draft });
  return Object.fromEntries(
    ALLOCATION_KEYS.flatMap((key) => {
      const message = errors[`savingPlan.${key}`];
      return message ? [[key, message]] : [];
    }),
  );
}

/**
 * '지금 계획과 비교하기'로 보낼 배분 (1~3개). 바꾼 배분이 있으면 맨 앞에, 나머지는 예시 배분으로 채운다.
 * 지금 배분과 같거나, 앞에 넣은 것과 같거나, 합이 월 저축액을 넘는 예시는 뺀다 (tax-addon.js의 runCompare와 같게).
 * 청년미래 대상이 아니면 예시에서 청년미래를 0으로 둔다.
 */
export function comparePlans(
  draft: MonthlyAllocation,
  current: MonthlyAllocation,
  saving: number,
  eligible: boolean,
): (PlanRequest & { adjustments: MonthlyAllocation })[] {
  const policyMax = eligible ? Math.min(saving, YOUTH_FUTURE_SAVING.monthlyLimit) : 0;
  const plans: (PlanRequest & { adjustments: MonthlyAllocation })[] = [];
  if (!sameAllocation(draft, current)) plans.push({ name: "바꾼 배분", adjustments: { ...draft } });
  const presets = [
    {
      name: eligible ? "청년미래·일반 적금만" : "일반 적금만",
      adjustments: { policyMonthly: policyMax, housingMonthly: 0, pensionMonthly: 0 },
    },
    {
      name: eligible ? "청년미래 + 연금저축" : "일반 적금 + 연금저축",
      adjustments: { policyMonthly: policyMax, housingMonthly: 0, pensionMonthly: Math.min(Math.max(saving - policyMax, 0), PRESET_PENSION_MAX) },
    },
    {
      name: `청약·연금저축 ${formatKoreanWon(PRESET_STEP)}씩`,
      adjustments: {
        policyMonthly: eligible ? Math.max(policyMax - 2 * PRESET_STEP, 0) : 0,
        housingMonthly: PRESET_STEP,
        pensionMonthly: PRESET_STEP,
      },
    },
  ];
  for (const preset of presets) {
    if (plans.length >= 3) break;
    if (sameAllocation(preset.adjustments, current)) continue;
    if (plans.some((plan) => sameAllocation(plan.adjustments, preset.adjustments))) continue;
    if (generalRest(saving, preset.adjustments) < 0) continue;
    plans.push(preset);
  }
  return plans;
}

/** "청년미래 30만 원 · 청약 10만 원 · 연금 10만 원 · 일반 0원" */
export function allocationLine(allocation: ResultAllocation): string {
  return [
    `청년미래 ${formatKoreanWon(allocation.policyMonthly)}`,
    `청약 ${formatKoreanWon(allocation.housingMonthly)}`,
    `연금 ${formatKoreanWon(allocation.pensionMonthly)}`,
    `일반 ${formatKoreanWon(allocation.generalMonthly)}`,
  ].join(" · ");
}

// ===== 가장 좋은 배분 찾기 (/allocations/recommend) =====

export interface RecommendCard {
  key: "current" | "bestProbability" | "bestBenefit";
  title: string;
  probability: string;
  /** 지금 배분과의 차이. 2%p보다 작으면 '지금과 거의 같음' (지금 배분 카드는 null) */
  diff: string | null;
  allocation: string;
  benefit: string;
  /** '이 배분으로' (지금 배분과 다를 때만) */
  apply: MonthlyAllocation | null;
}

export function recommendCards(rec: RecommendResult): RecommendCard[] {
  const current = toMonthly(rec.current.allocation);
  const card = (key: RecommendCard["key"], title: string, option: AllocationOption): RecommendCard => {
    const monthly = toMonthly(option.allocation);
    return {
      key,
      title,
      probability: formatPercent(option.probability),
      diff:
        key === "current"
          ? null
          : Math.abs(option.diffFromBase) < MEANINGFUL_DIFF
            ? "지금과 거의 같음"
            : formatPercentPoint(option.diffFromBase),
      allocation: allocationLine(option.allocation),
      benefit: `세금 순이득 ${formatKoreanWon(option.taxNetBenefit)} + 정부 지원금 ${formatKoreanWon(option.subsidy)} = ${formatKoreanWon(option.totalBenefit)}`,
      apply: key === "current" || sameAllocation(monthly, current) ? null : monthly,
    };
  };
  return [
    card("current", "지금 배분", rec.current),
    card("bestProbability", "목표 달성 가능성이 가장 높은 배분", rec.bestProbability),
    card("bestBenefit", "세금·지원금이 가장 큰 배분", rec.bestBenefit),
  ];
}

/** 추천 아래 설명. 규칙 문장은 서버 것 그대로 */
export function recommendNote(rec: RecommendResult, paths: number, goalWhen: string): string {
  const rule = rec.rule.replace(/[.。]\s*$/, "");
  return (
    `배분 ${rec.evaluated}가지를 같은 미래 ${paths.toLocaleString("ko-KR")}개로 계산했어요. ${rule}. ` +
    `세금·지원금은 목표 시점(${goalWhen})까지 받는 돈의 평균이에요. ` +
    `위 '위험'의 정부 지원금은 ${formatDuration(YOUTH_FUTURE_SAVING.riskSubsidyWindowMonths)} 안에 받는 돈이라 숫자가 다를 수 있어요.`
  );
}

// ===== 지금 계획과 비교하기 (/compare) =====

export interface CompareRow {
  name: string;
  isBase: boolean;
  allocation: string[];
  probability: string;
  /** 지금 계획과의 차이. 의미 없는 차이면 '거의 차이 없음' (서버의 meaningful) */
  diff: CompareDiff | null;
  taxNetBenefit: string;
  earlyTermination: string;
  medianAtGoal: string;
  apply: MonthlyAllocation | null;
}

export function compareRows(compare: CompareResult, current: MonthlyAllocation): CompareRow[] {
  return compare.plans.map((plan) => {
    const allocation = plan.allocation;
    const monthly = allocation ? toMonthly(allocation) : null;
    return {
      name: plan.name,
      isBase: plan.isBase,
      allocation: allocation
        ? [
            `청년미래 ${formatKoreanWon(allocation.policyMonthly)}`,
            `청약 ${formatKoreanWon(allocation.housingMonthly)} · 연금 ${formatKoreanWon(allocation.pensionMonthly)}`,
            `일반 ${formatKoreanWon(allocation.generalMonthly)}`,
          ]
        : [],
      probability: formatPercent(plan.probability),
      diff: compareDiff(plan),
      taxNetBenefit: plan.taxNetBenefit == null ? "—" : formatKoreanWon(plan.taxNetBenefit),
      earlyTermination: plan.earlyTerminationProbability == null ? "대상 아님" : formatPercent(plan.earlyTerminationProbability),
      medianAtGoal: plan.medianAtGoal == null ? "—" : formatManwon(plan.medianAtGoal),
      apply: plan.isBase || !monthly || sameAllocation(monthly, current) ? null : monthly,
    };
  });
}
