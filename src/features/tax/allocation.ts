/**
 * 결과 화면 '어디에 얼마나' (명세서 v1.7 9.2, tax-addon.js의 allocSection · runCompare · runRecommend)에 보여 줄 값 (순수 함수).
 * 비교할 배분 후보를 만들고, 서버 결과(/compare · /allocations/recommend)를 화면 문장으로 고른다. 계산은 서버가 한다.
 */
import { YOUTH_FUTURE_SAVING } from "@/config/policy";
import { ALLOCATION_KEYS, type AllocationKey } from "@/features/input/draft";
import { MEANINGFUL_DIFF } from "@/features/result/result";
import { formatKoreanWon, formatPercent, formatPercentPoint } from "@/lib/format";
import type { AllocationOption, Allocation as ResultAllocation, RecommendResult } from "@/lib/types";
import { formatDuration } from "@/lib/year-month";

/** 상품별 월 납입 (원, 입력 savingPlan의 세 칸). 남는 돈은 일반 적금 */
export type MonthlyAllocation = Record<AllocationKey, number>;

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
