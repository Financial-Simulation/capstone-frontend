import { describe, expect, it } from "vitest";
import { allocationChanges, fitAllocation, generalOf, sliderMax, withAllocation } from "./allocation-sliders";

const a = { policyMonthly: 300_000, housingMonthly: 100_000, pensionMonthly: 100_000 };

describe("배분 막대", () => {
  it("한 막대는 상품 한도와 '월 저축액 − 다른 두 상품' 안에서만", () => {
    expect(sliderMax(a, "policyMonthly", 500_000)).toBe(300_000);
    expect(sliderMax(a, "pensionMonthly", 2_000_000)).toBe(1_500_000);
    expect(withAllocation(a, "housingMonthly", 400_000, 500_000)).toEqual({ ...a, housingMonthly: 100_000 });
    expect(withAllocation(a, "policyMonthly", 0, 500_000)).toEqual({ ...a, policyMonthly: 0 });
    expect(generalOf(withAllocation(a, "policyMonthly", 0, 500_000), 500_000)).toBe(300_000);
  });

  it("월 저축액이 줄면 청년미래 → 청약 → 연금저축 순서로 남는 만큼만", () => {
    expect(fitAllocation(a, 350_000)).toEqual({ policyMonthly: 300_000, housingMonthly: 50_000, pensionMonthly: 0 });
    expect(fitAllocation(a, 0)).toEqual({ policyMonthly: 0, housingMonthly: 0, pensionMonthly: 0 });
  });

  it("지금 배분과 다른 칸만 서버에 보낸다", () => {
    expect(allocationChanges(a, a)).toEqual({});
    expect(allocationChanges({ ...a, pensionMonthly: 0 }, a)).toEqual({ pensionMonthly: 0 });
  });
});
