/**
 * 결과 화면 '계획 바꿔 보기'의 배분 막대 (조민석 배치안 11/18: 가장 좋은 배분 버튼 3개 + 드래그로 배분 바꾸기).
 * 월 저축액을 청년미래적금 · 주택청약 · 연금저축에 얼마씩 넣을지. 남는 돈은 일반 적금 (순수 함수, 계산은 서버).
 * 막대는 상품 한도와 '월 저축액 − 다른 두 상품' 안에서만 움직인다 (엔진도 월 저축액 안에서 이 순서로 뗀다).
 */
import { HOUSING_SUBSCRIPTION, PENSION_SAVING, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { ALLOCATION_KEYS, type AllocationKey } from "@/features/input/draft";
import type { MonthlyAllocation } from "@/features/tax/allocation";
import type { Adjustments } from "@/lib/types";

export interface AllocationSlider {
  key: AllocationKey;
  label: string;
  /** 상품 월 납입 한도 (원) */
  limit: number;
}

export const ALLOCATION_SLIDERS: readonly AllocationSlider[] = [
  { key: "policyMonthly", label: "청년미래적금", limit: YOUTH_FUTURE_SAVING.monthlyLimit },
  { key: "housingMonthly", label: "주택청약", limit: HOUSING_SUBSCRIPTION.monthlyLimit },
  { key: "pensionMonthly", label: "연금저축", limit: PENSION_SAVING.monthlyLimit },
];

const sum = (a: MonthlyAllocation) => a.policyMonthly + a.housingMonthly + a.pensionMonthly;

/** 월 저축액이 줄었으면 청년미래 → 청약 → 연금저축 순서로 남는 만큼만 (엔진과 같은 순서) */
export function fitAllocation(a: MonthlyAllocation, saving: number): MonthlyAllocation {
  let left = Math.max(0, saving);
  const out = { ...a };
  for (const { key, limit } of ALLOCATION_SLIDERS) {
    out[key] = Math.max(0, Math.min(a[key], limit, left));
    left -= out[key];
  }
  return out;
}

/** 막대 하나의 최댓값: 상품 한도와 '월 저축액 − 다른 두 상품' 중 작은 쪽 */
export function sliderMax(a: MonthlyAllocation, key: AllocationKey, saving: number): number {
  const limit = ALLOCATION_SLIDERS.find((s) => s.key === key)!.limit;
  return Math.max(0, Math.min(limit, saving - (sum(a) - a[key])));
}

export function withAllocation(a: MonthlyAllocation, key: AllocationKey, value: number, saving: number): MonthlyAllocation {
  return { ...a, [key]: Math.max(0, Math.min(value, sliderMax(a, key, saving))) };
}

/** 일반 적금으로 가는 돈 */
export function generalOf(a: MonthlyAllocation, saving: number): number {
  return Math.max(0, saving - sum(a));
}

/** 지금 배분과 다른 칸만 (서버 Adjustments의 policyMonthly · housingMonthly · pensionMonthly) */
export function allocationChanges(a: MonthlyAllocation, base: MonthlyAllocation): Adjustments {
  const out: Record<string, number> = {};
  for (const key of ALLOCATION_KEYS) if (a[key] !== base[key]) out[key] = a[key];
  return out as Adjustments;
}
