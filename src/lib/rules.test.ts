import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { SimulationInputDraft } from "./types";
import { CROSS_RULE_MESSAGES, MESSAGES, checkCrossRules, checkFields, checkRequired, resolvedExpenseTotal } from "./rules";

/** 정답 파일의 입력 (고쳐도 원본이 바뀌지 않게 복사) */
function golden(key: string): SimulationInputDraft {
  return structuredClone(goldenCaseByKey(key)!.input) as SimulationInputDraft;
}

describe("정답 파일 입력은 모든 규칙을 통과한다", () => {
  it.each(["S1", "S2", "S3", "E1", "E2", "E3", "E4", "E5"])("%s", (key) => {
    const input = golden(key);
    expect(checkFields(input)).toEqual({});
    expect(checkCrossRules(input)).toBeNull();
    expect(checkRequired("ALL", input)).toEqual({});
  });
});

describe("칸별 규칙 (COMMON400, 서버 경로와 문장)", () => {
  it("나이 19~39", () => {
    expect(checkFields({ person: { age: 17 } })).toEqual({ "person.age": MESSAGES.age });
    expect(checkFields({ person: { age: 19 } })).toEqual({});
    expect(checkFields({ person: { age: 40 } })).toEqual({ "person.age": "19~39 사이로 입력해 주세요" });
  });

  it("값이 없는 칸은 보지 않는다", () => {
    expect(checkFields({})).toEqual({});
    expect(checkFields({ person: { age: null } })).toEqual({});
  });

  it("월 실수령액 1만~3,000만 원", () => {
    expect(checkFields({ income: { monthlyNetIncome: 5_000 } })).toEqual({
      "income.monthlyNetIncome": MESSAGES.monthlyNetIncome,
    });
  });

  it("지출 합계는 @AssertTrue 경로(resolvedTotalInRange)로", () => {
    const errors = checkFields({ expenses: { fixed: { inputMode: "TOTAL", items: [], total: 40_000_000 } } });
    expect(errors).toEqual({ "expenses.fixed.resolvedTotalInRange": MESSAGES.expenseTotalRange });
  });

  it("항목별 입력의 빈 금액", () => {
    const errors = checkFields({
      expenses: { variable: { inputMode: "DETAIL", items: [{ name: "식비", amount: null }], total: null } },
    });
    expect(errors).toEqual({ "expenses.variable.items[0].amount": MESSAGES.amountRequired });
  });

  it("현금 + 예·적금 10억 원 이하", () => {
    const errors = checkFields({ assets: { cash: 600_000_000, deposits: 500_000_000 } });
    expect(errors).toEqual({ "assets.cashAndDepositsInRange": MESSAGES.cashAndDeposits });
  });

  it("비상금 먼저 모으기는 정해진 금액만", () => {
    // 타입으로는 막혀 있지만 저장값이 깨졌거나 서버가 받는 값이면 들어올 수 있다
    const bad = { savingPlan: { emergencyFirstAmount: 1_500_000 } } as unknown as SimulationInputDraft;
    expect(checkFields(bad)).toEqual({
      "savingPlan.emergencyFirstAmountAllowed": MESSAGES.emergencyFirst,
    });
    expect(checkFields({ savingPlan: { emergencyFirstAmount: 3_000_000 } })).toEqual({});
  });

  it("대출 칸", () => {
    const errors = checkFields({
      loans: { hasNoLoan: false, items: [{ loanType: "STUDENT", principal: 0, annualRate: 25, remainingMonths: 500 }] },
    });
    expect(errors).toEqual({
      "loans.items[0].principal": MESSAGES.principalMin,
      "loans.items[0].annualRate": MESSAGES.annualRate,
      "loans.items[0].remainingMonths": MESSAGES.remainingRange,
    });
  });
});

describe("여러 칸 규칙 (서버와 같은 순서로 첫 번째만)", () => {
  it("INPUT4001: 경력 > 나이 − 15", () => {
    expect(checkCrossRules({ person: { age: 20, careerYears: 6 } })?.code).toBe("INPUT4001");
    expect(checkCrossRules({ person: { age: 20, careerYears: 5 } })).toBeNull();
  });

  it("LOAN4001: '대출 없음'과 목록이 다르면", () => {
    expect(checkCrossRules({ loans: { hasNoLoan: true, items: [{ principal: 1 }] } })?.code).toBe("LOAN4001");
    expect(checkCrossRules({ loans: { hasNoLoan: false, items: [] } })?.code).toBe("LOAN4001");
    expect(checkCrossRules({ loans: { hasNoLoan: true, items: [] } })).toBeNull();
  });

  it("GOAL4001 · GOAL4002: 기준 달부터 12~120개월", () => {
    const at = (targetDate: string) => checkCrossRules({ startMonth: "2026-11", goal: { targetDate } })?.code ?? null;
    expect(at("2027-10")).toBe("GOAL4001");
    expect(at("2027-11")).toBeNull();
    expect(at("2036-11")).toBeNull();
    expect(at("2036-12")).toBe("GOAL4002");
  });

  it("EVENT4001 · 4002 · 4004", () => {
    const base = { presetKey: "CUSTOM" as const, name: "일" };
    const one = (event: NonNullable<SimulationInputDraft["events"]>[number]) =>
      checkCrossRules({ startMonth: "2026-11", events: [event] })?.code ?? null;

    expect(one({ ...base, eventType: "ONE_TIME", occurDate: "2027-03" })).toBe("EVENT4001");
    expect(one({ ...base, eventType: "ONE_TIME", occurDate: "2027-03", amount: 1_000_000 })).toBeNull();
    expect(one({ ...base, eventType: "ONE_TIME", occurDate: "2036-10", amount: 1 })).toBeNull();
    expect(one({ ...base, eventType: "ONE_TIME", occurDate: "2036-11", amount: 1 })).toBe("EVENT4002");
    expect(one({ ...base, eventType: "ONE_TIME", occurDate: "2026-10", amount: 1 })).toBe("EVENT4002");
    expect(one({ ...base, eventType: "JOB_CHANGE", occurDate: "2028-01", incomeChangeRate: -95, gapMonths: 0 })).toBe(
      "EVENT4004",
    );
    expect(one({ ...base, eventType: "JOB_CHANGE", occurDate: "2028-01", incomeChangeRate: 10, gapMonths: 25 })).toBe(
      "EVENT4004",
    );
    expect(one({ ...base, eventType: "JOB_CHANGE", occurDate: "2028-01", incomeChangeRate: 200, gapMonths: 24 })).toBeNull();
  });

  it("순서: INPUT4001이 LOAN4001보다 먼저", () => {
    const error = checkCrossRules({ person: { age: 20, careerYears: 9 }, loans: { hasNoLoan: true, items: [{}] } });
    expect(error).toEqual({ code: "INPUT4001", message: CROSS_RULE_MESSAGES.INPUT4001 });
  });
});

describe("필수 칸 ('다음' 버튼)", () => {
  it("01-1 빈 화면", () => {
    expect(Object.keys(checkRequired("BASIC", {})).sort()).toEqual(
      [
        "expenses.fixed.total",
        "expenses.variable.total",
        "income.monthlyNetIncome",
        "person.age",
        "person.careerYears",
        "startMonth",
      ].sort(),
    );
  });

  it("합계 입력인데 합계가 비면", () => {
    const errors = checkRequired("BASIC", { expenses: { fixed: { inputMode: "TOTAL", items: [] } } });
    expect(errors["expenses.fixed.total"]).toBe("합계를 입력해 주세요");
  });

  it("01-2 '대출 있음'인데 대출이 하나도 없으면 와이어플로 문장", () => {
    const errors = checkRequired("ASSETS", { loans: { hasNoLoan: false, items: [] } });
    expect(errors["loans.items"]).toBe("대출 정보를 하나 이상 입력해 주세요");
  });

  it("누적이면 앞 단계까지 본다", () => {
    const errors = checkRequired("GOAL", {}, { cumulative: true });
    expect(errors).toHaveProperty(["person.age"]);
    expect(errors).toHaveProperty(["assets.cash"]);
    expect(errors).toHaveProperty(["goal.targetAmount"]);
    expect(checkRequired("GOAL", {})).not.toHaveProperty(["person.age"]);
  });

  it("03 예정된 일은 없어도 되고, 켰으면 금액 칸을 다 채워야", () => {
    expect(checkRequired("EVENTS", {})).toEqual({});
    const errors = checkRequired("EVENTS", {
      events: [{ presetKey: "CAR", eventType: "ONE_TIME", occurDate: "2027-03" }],
    });
    expect(errors).toEqual({ "events[0]": "금액 칸을 모두 입력해 주세요" });
  });
});

describe("resolvedExpenseTotal", () => {
  it("DETAIL이면 항목 합, TOTAL이면 합계", () => {
    expect(
      resolvedExpenseTotal({ inputMode: "DETAIL", items: [{ amount: 700_000 }, { amount: 100_000 }, { amount: null }], total: 1 }),
    ).toBe(800_000);
    expect(resolvedExpenseTotal({ inputMode: "TOTAL", items: [{ amount: 5 }], total: 950_000 })).toBe(950_000);
    expect(resolvedExpenseTotal({ inputMode: "TOTAL" })).toBeNull();
    expect(resolvedExpenseTotal(null)).toBeNull();
  });
});
