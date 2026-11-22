import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/rules";
import { goldenCaseByKey } from "@/mocks/golden";
import { planBase, planChanges } from "./plan";
import { applyLever, sliderSpecs, sliderValue, withSlider } from "./sliders";

const golden = (key: string) => goldenCaseByKey(key)!;

describe("계획 바꿔 보기 막대", () => {
  const input = golden("S1").input;
  const base = planBase(input);
  const specs = sliderSpecs(base, input.startMonth);

  it("막대 6개, 지금 값이 범위 안에 있고 한도(LIMITS)를 넘지 않는다", () => {
    expect(specs.map((s) => s.key)).toEqual([
      "monthlyVariableExpense",
      "monthlyFixedExpense",
      "monthlySaving",
      "breakThreshold",
      "goalTargetAmount",
      "goalTargetDate",
    ]);
    for (const s of specs) {
      const now = sliderValue(base, s.key, input.startMonth);
      expect(now, s.key).toBeGreaterThanOrEqual(s.min);
      expect(now, s.key).toBeLessThanOrEqual(s.max);
      expect((now - s.min) % s.step, s.key).toBe(0);
    }
    expect(specs.find((s) => s.key === "monthlySaving")!.max).toBeLessThanOrEqual(LIMITS.monthlySaving.max);
  });

  it("S1: 변동지출 0~190만 원 1만 원 간격, 목표 금액 900만~6,000만 원 100만 원 간격, 목표 시점 개월 수", () => {
    expect(specs[0]).toMatchObject({ min: 0, max: 1_900_000, step: 10_000 });
    expect(specs[4]).toMatchObject({ min: 9_000_000, max: 60_000_000, step: 1_000_000 });
    expect(sliderValue(base, "goalTargetDate", input.startMonth)).toBe(60);
    expect(withSlider(base, "goalTargetDate", 72, input.startMonth).goalTargetDate).toBe("2032-11");
    expect(withSlider(base, "monthlySaving", 400_000, input.startMonth).monthlySaving).toBe(400_000);
  });

  it("'이렇게 하면 좋아져요'를 누르면 그것만 바뀐다 (서버 Analyzer.levers와 같은 규칙)", () => {
    const change = (type: Parameters<typeof applyLever>[1]) => planChanges(applyLever(base, type), base);
    expect(change("REDUCE_VARIABLE_EXPENSE")).toEqual({ monthlyVariableExpense: 850_000 });
    expect(change("REDUCE_SAVING")).toEqual({ monthlySaving: 400_000 });
    expect(change("DELAY_GOAL")).toEqual({ goalTargetDate: "2032-11" });
    expect(change("LOWER_GOAL")).toEqual({ goalTargetAmount: 27_000_000 });
    expect(change("EMERGENCY_FIRST")).toEqual({ emergencyFirstAmount: 2_000_000 });
    // 정답 파일 S1의 미리보기(변동지출 10만 원 줄이기)와 같은 조정값
    expect(change("REDUCE_VARIABLE_EXPENSE")).toEqual(golden("S1").preview.adjustments);
  });
});
