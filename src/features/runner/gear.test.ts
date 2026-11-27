import { describe, expect, it } from "vitest";
import type { SimulationInputDraft } from "@/lib/types";
import {
  BASIC_SET,
  GEAR_SLOTS,
  MAX_COINS,
  bestSet,
  gearChange,
  gearSummary,
  isEmptySlot,
  itemOf,
  runnerCoins,
  sameSet,
  spentCoins,
  type GearSet,
} from "./gear";

/** S1 예시: 실수령 250만 · 고정 95만 · 변동 95만 · 저축 50만 */
const S1: SimulationInputDraft = {
  income: { monthlyNetIncome: 2_500_000 },
  expenses: { fixed: { inputMode: "TOTAL", total: 950_000 }, variable: { inputMode: "TOTAL", total: 950_000 } },
  savingPlan: { monthlySaving: 500_000 },
};

const ALL_RUNNER: GearSet = { headband: 1, sunglasses: 1, watch: 1, top: 1, bottoms: 1, socks: 1, shoes: 1 };
const ALL_PRO: GearSet = { headband: 2, sunglasses: 2, watch: 2, top: 2, bottoms: 2, socks: 2, shoes: 2 };

describe("러닝 코인", () => {
  it("남는 돈 24% → 14코인, 저축 20% → 8코인 (S1)", () => {
    const coins = runnerCoins(S1)!;
    expect(coins.spare).toBe(14);
    expect(coins.saving).toBe(8);
    expect(coins.total).toBe(22);
    expect(coins.overspent).toBe(false);
  });

  it("실수령이나 지출이 비어 있으면 아직 모름(null)", () => {
    expect(runnerCoins(null)).toBeNull();
    expect(runnerCoins({ income: { monthlyNetIncome: 2_500_000 } })).toBeNull();
    expect(runnerCoins({ ...S1, income: { monthlyNetIncome: 0 } })).toBeNull();
  });

  it("상세 입력이면 항목 합계로 센다", () => {
    const detail: SimulationInputDraft = {
      ...S1,
      expenses: {
        fixed: { inputMode: "DETAIL", items: [{ amount: 500_000 }, { amount: 450_000 }] },
        variable: { inputMode: "TOTAL", total: 950_000 },
      },
    };
    expect(runnerCoins(detail)?.total).toBe(22);
  });

  it("저축은 남는 돈까지만 센다", () => {
    const coins = runnerCoins({ ...S1, savingPlan: { monthlySaving: 2_000_000 } })!;
    expect(coins.savingRate).toBeCloseTo(0.24);
    expect(coins.saving).toBe(10);
  });

  it("지출이 실수령보다 많으면 0코인", () => {
    const coins = runnerCoins({ ...S1, expenses: { fixed: { inputMode: "TOTAL", total: 2_000_000 }, variable: { inputMode: "TOTAL", total: 900_000 } } })!;
    expect(coins.total).toBe(0);
    expect(coins.overspent).toBe(true);
  });

  it("저축을 비우면 남는 돈 점수만", () => {
    expect(runnerCoins({ ...S1, savingPlan: null })?.total).toBe(14);
  });
});

describe("장비 값", () => {
  it("러너 한 벌 32코인 · 프로 한 벌 64코인", () => {
    expect(spentCoins(BASIC_SET)).toBe(0);
    expect(spentCoins(ALL_RUNNER)).toBe(32);
    expect(spentCoins(ALL_PRO)).toBe(64);
  });

  it("기본 단계는 모두 0코인", () => {
    for (const slot of GEAR_SLOTS) expect(itemOf(slot, 0).price).toBe(0);
  });
});

describe("저절로 입는 장비", () => {
  it("22코인: 런닝화 · 상의 · 하의 · 스마트워치 순서로 러너 단계", () => {
    const set = bestSet(22);
    expect(set).toEqual({ ...BASIC_SET, shoes: 1, top: 1, bottoms: 1, watch: 1 });
  });

  it("0코인이면 기본, 100코인이면 프로 한 벌", () => {
    expect(bestSet(0)).toEqual(BASIC_SET);
    expect(bestSet(MAX_COINS)).toEqual(ALL_PRO);
  });

  it("코인을 넘지 않는다", () => {
    for (let coins = 0; coins <= MAX_COINS; coins += 7) expect(spentCoins(bestSet(coins))).toBeLessThanOrEqual(coins);
  });
});

describe("장비가 바뀐 칸", () => {
  it("코인이 늘어 좋아지면 우선순위가 앞선 칸 (up)", () => {
    expect(gearChange(bestSet(22), bestSet(24))).toMatchObject({ kind: "up", slot: "socks", item: { name: "러닝 양말" } });
    expect(gearChange(BASIC_SET, bestSet(22))).toMatchObject({ kind: "up", slot: "shoes" });
  });

  it("한 칸이 오르고 다른 칸이 내려가면 입은 장비 값으로 방향을 정한다", () => {
    // 10코인 → 12코인: 양말을 벗고 상의를 산다 (값 10 → 12, up)
    expect(bestSet(10)).toEqual({ ...BASIC_SET, shoes: 1, socks: 1 });
    expect(gearChange(bestSet(10), bestSet(12))).toMatchObject({ kind: "up", slot: "top" });
    // 22코인 → 19코인: 스마트워치를 벗고 양말을 신는다 (값 22 → 18, down)
    expect(bestSet(19)).toEqual({ ...BASIC_SET, shoes: 1, top: 1, bottoms: 1, socks: 1 });
    expect(gearChange(bestSet(22), bestSet(19))).toMatchObject({ kind: "down", slot: "watch", tier: 0 });
  });

  it("코인이 줄면 내려간 칸 (down), 그대로면 null", () => {
    expect(gearChange(bestSet(24), bestSet(22))).toMatchObject({ kind: "down", slot: "socks", item: { name: "면 양말" } });
    expect(gearChange(bestSet(22), bestSet(23))).toBeNull();
    expect(sameSet(bestSet(22), bestSet(23))).toBe(true);
    expect(sameSet(bestSet(22), bestSet(24))).toBe(false);
  });

  it("헤어밴드 · 선글라스 · 스마트워치의 기본은 빈칸", () => {
    expect(isEmptySlot("watch", 0)).toBe(true);
    expect(isEmptySlot("watch", 1)).toBe(false);
    expect(isEmptySlot("shoes", 0)).toBe(false);
  });
});

describe("대체 글", () => {
  it("기본만 입었으면 '기본 운동복'", () => {
    expect(gearSummary(BASIC_SET)).toBe("기본 운동복");
    expect(gearSummary({ ...BASIC_SET, shoes: 2, top: 1 })).toBe("카본 레이싱화 · 기능성 티셔츠");
  });
});
