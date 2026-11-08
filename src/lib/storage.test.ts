import { describe, expect, it } from "vitest";
import {
  INPUT_KEY,
  MAX_SAVED_PLANS,
  PLANS_KEY,
  PROGRESS_KEY,
  clearAll,
  hasAnyValue,
  isStartMonthPast,
  loadInput,
  loadPlans,
  loadProgress,
  parsePlans,
  saveInput,
  savePlans,
  saveProgress,
  type SavedPlan,
  type StorageLike,
} from "./storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { storage, data };
}

/** 사생활 보호 모드처럼 쓰기·읽기가 예외를 던지는 저장소 */
const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

const OCT_27 = new Date(2026, 9, 27);

describe("simInput.v1", () => {
  it("처음 값을 넣을 때 startMonth를 그달로", () => {
    const { storage, data } = memoryStorage();
    const { saved, input } = saveInput({ income: { monthlyNetIncome: 2_500_000 } }, storage, OCT_27);
    expect(saved).toBe(true);
    expect(input.startMonth).toBe("2026-10");
    expect(JSON.parse(data.get(INPUT_KEY)!)).toEqual({ startMonth: "2026-10", income: { monthlyNetIncome: 2_500_000 } });
  });

  it("이미 있는 startMonth는 바꾸지 않는다 (다음 달에 다시 열어도)", () => {
    const { storage } = memoryStorage();
    const { input } = saveInput({ startMonth: "2026-09", person: { age: 27 } }, storage, OCT_27);
    expect(input.startMonth).toBe("2026-09");
  });

  it("값이 하나도 없으면 startMonth를 정하지 않는다", () => {
    const { storage } = memoryStorage();
    expect(saveInput({}, storage, OCT_27).input).toEqual({});
    expect(saveInput({ person: { age: null }, events: [] }, storage, OCT_27).input.startMonth).toBeUndefined();
  });

  it("다시 읽기", () => {
    const { storage } = memoryStorage();
    saveInput({ person: { age: 27 } }, storage, OCT_27);
    expect(loadInput(storage)).toEqual({ startMonth: "2026-10", person: { age: 27 } });
  });

  it("v1.7 칸(세전 연봉 · 무주택 세대주 · 그중 월세 · 상품별 배분)도 그대로 저장하고 다시 읽는다", () => {
    const { storage } = memoryStorage();
    const draft = {
      person: { age: 27, homelessHouseholder: false },
      income: { monthlyNetIncome: 2_500_000, annualGrossSalary: 40_000_000 },
      expenses: { monthlyRent: 500_000 },
      savingPlan: { monthlySaving: 500_000, policyMonthly: 300_000, housingMonthly: 100_000, pensionMonthly: 100_000 },
    };
    saveInput(draft, storage, OCT_27);
    expect(loadInput(storage)).toEqual({ startMonth: "2026-10", ...draft });
  });

  it("깨진 값은 없는 것으로", () => {
    expect(loadInput(memoryStorage({ [INPUT_KEY]: "{oops" }).storage)).toBeNull();
    expect(loadInput(memoryStorage({ [INPUT_KEY]: "[1,2]" }).storage)).toBeNull();
    expect(loadInput(memoryStorage({ [INPUT_KEY]: "42" }).storage)).toBeNull();
    expect(loadInput(memoryStorage().storage)).toBeNull();
  });

  it("저장소가 예외를 던져도 화면은 계속 (try/catch)", () => {
    expect(loadInput(throwingStorage)).toBeNull();
    const result = saveInput({ person: { age: 27 } }, throwingStorage, OCT_27);
    expect(result.saved).toBe(false);
    expect(result.input).toEqual({ startMonth: "2026-10", person: { age: 27 } });
    expect(() => clearAll(throwingStorage)).not.toThrow();
    expect(saveInput({ person: { age: 27 } }, null, OCT_27).saved).toBe(false);
  });

  it("기준 달이 지났는지", () => {
    expect(isStartMonthPast({ startMonth: "2026-09" }, OCT_27)).toBe(true);
    expect(isStartMonthPast({ startMonth: "2026-10" }, OCT_27)).toBe(false);
    expect(isStartMonthPast(null, OCT_27)).toBe(false);
  });

  it("무엇을 '값'으로 보는지", () => {
    expect(hasAnyValue({ startMonth: "2026-10" })).toBe(false);
    expect(hasAnyValue({ loans: { hasNoLoan: false } })).toBe(true);
    expect(hasAnyValue({ income: { monthlyNetIncome: 0 } })).toBe(true);
    expect(hasAnyValue({ goal: { name: "" } })).toBe(false);
  });
});

describe("simPlans.v1 · simProgress.v1", () => {
  const plan = (i: number): SavedPlan => ({
    id: `p${i}`,
    name: `계획 ${i}`,
    adjustments: { monthlySaving: i * 100_000 },
    savedAt: "2026-10-27T00:00:00.000Z",
  });

  it("비교 계획은 3개까지", () => {
    const { storage } = memoryStorage();
    expect(savePlans([plan(1), plan(2), plan(3), plan(4)], storage)).toBe(true);
    expect(loadPlans(storage).map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(MAX_SAVED_PLANS).toBe(3);
  });

  it("모양이 틀린 계획은 버린다", () => {
    expect(parsePlans([plan(1), { id: 2 }, null, "x", { id: "p3", name: "a", adjustments: [] }])).toEqual([plan(1)]);
    expect(parsePlans({})).toEqual([]);
  });

  it("진행 상태", () => {
    const { storage } = memoryStorage({ [PROGRESS_KEY]: '{"visited":["BASIC",3,null]}' });
    expect(loadProgress(storage)).toEqual({ visited: ["BASIC"] });
    saveProgress({ visited: ["BASIC", "ASSETS"] }, storage);
    expect(loadProgress(storage).visited).toEqual(["BASIC", "ASSETS"]);
    expect(loadProgress(memoryStorage({ [PROGRESS_KEY]: "garbage" }).storage)).toEqual({ visited: [] });
  });

  it("새로 시작: 내 입력·계획·진행만 지우고 다른 키는 두기", () => {
    const { storage, data } = memoryStorage({
      [INPUT_KEY]: "{}",
      [PLANS_KEY]: "[]",
      [PROGRESS_KEY]: "{}",
      "apiMode.dev": "all-mock",
    });
    clearAll(storage);
    expect([...data.keys()]).toEqual(["apiMode.dev"]);
  });
});
