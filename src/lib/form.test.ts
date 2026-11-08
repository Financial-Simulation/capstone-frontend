import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { SimulationInputDraft } from "./types";
import {
  STEP_WARNINGS,
  errorScope,
  errorTargets,
  errorsForStep,
  fieldId,
  getAtPath,
  normalizeErrors,
  scopeInput,
  unchangedErrors,
} from "./form";

const s1 = () => structuredClone(goldenCaseByKey("S1")!.input) as SimulationInputDraft;

describe("화면까지의 입력만 보내기", () => {
  it("01-1은 기준 연월 · 나 · 소득 · 지출만", () => {
    expect(Object.keys(scopeInput(s1(), "BASIC")).sort()).toEqual(["expenses", "income", "person", "startMonth"]);
  });

  it("01-2는 앞 화면 + 자산 · 저축 · 버틸 금액 · 대출", () => {
    expect(Object.keys(scopeInput(s1(), "ASSETS")).sort()).toEqual(
      ["assets", "emergency", "expenses", "income", "loans", "person", "savingPlan", "startMonth"].sort(),
    );
  });

  it("03은 전부", () => {
    expect(scopeInput(s1(), "EVENTS")).toEqual(s1());
  });

  it("없는 묶음은 넣지 않는다", () => {
    expect(scopeInput({ person: { age: 27 } }, "GOAL")).toEqual({ person: { age: 27 } });
  });
});

describe("오류 키", () => {
  it("이 화면 칸의 오류만", () => {
    const errors = { "person.age": "a", "goal.targetDate": "b", "events[0]": "c", "loans.items[0].principal": "d" };
    expect(errorsForStep(errors, "BASIC")).toEqual({ "person.age": "a" });
    expect(errorsForStep(errors, "ASSETS")).toEqual({ "loans.items[0].principal": "d" });
    expect(errorsForStep(errors, "EVENTS")).toEqual({ "events[0]": "c" });
  });

  it("검사 이름 → 칸 (먼저 온 문장)", () => {
    expect(
      normalizeErrors({
        "expenses.fixed.resolvedTotalInRange": "합계는 0원 ~ 3,000만 원 사이여야 해요",
        "assets.cashAndDepositsInRange": "현금과 예·적금을 합쳐 10억 원 이하로 입력해 주세요",
      }),
    ).toEqual({
      "expenses.fixed.total": "합계는 0원 ~ 3,000만 원 사이여야 해요",
      "assets.cash": "현금과 예·적금을 합쳐 10억 원 이하로 입력해 주세요",
    });
  });

  it("칸 id", () => {
    expect(fieldId("person.age")).toBe("f-person-age");
    expect(fieldId("loans.items[0].principal")).toBe("f-loans-items-0-principal");
    expect(fieldId("events[12]")).toBe("f-events-12");
  });

  it("오류가 칸(또는 그 아래)을 가리키는지", () => {
    expect(errorTargets("loans.items[0].principal", "loans.items[0]")).toBe(true);
    expect(errorTargets("loans.items[0]", "loans.items[0]")).toBe(true);
    expect(errorTargets("events[10]", "events[1]")).toBe(false);
    expect(errorTargets("person.age", "person.ageX")).toBe(false);
  });

  it("경고는 화면마다 하나씩", () => {
    expect(STEP_WARNINGS.BASIC).toEqual(["WARN_EXPENSE_OVER_INCOME"]);
    expect(STEP_WARNINGS.ASSETS).toEqual(["WARN_MONTHLY_SHORTFALL"]);
    expect(STEP_WARNINGS.GOAL).toEqual(["WARN_GOAL_ALREADY_MET"]);
  });
});

describe("서버 오류는 값이 바뀌면 지운다", () => {
  it("경로 읽기", () => {
    const input = s1();
    expect(getAtPath(input, "person.age")).toBe(27);
    expect(getAtPath(input, "loans.items[0].principal")).toBe(12_000_000);
    expect(getAtPath(input, "events[3].amount")).toBeUndefined();
    expect(getAtPath(input, "nope.deep")).toBeUndefined();
  });

  it("범위: 카드 · 지출 묶음은 통째로, 나머지는 첫 묶음", () => {
    expect(errorScope("person.careerYears")).toBe("person");
    expect(errorScope("events[1].occurDate")).toBe("events[1]");
    expect(errorScope("events[1]")).toBe("events[1]");
    expect(errorScope("loans.items[2].annualRate")).toBe("loans.items[2]");
    expect(errorScope("expenses.fixed.items[0].amount")).toBe("expenses.fixed");
    expect(errorScope("goal.targetDate")).toBe("goal");
  });

  it("경력 오류(INPUT4001)는 나이를 고쳐도 풀린다", () => {
    const sent: SimulationInputDraft = { person: { age: 20, careerYears: 6 }, goal: { targetDate: "2027-10" } };
    const errors = { "person.careerYears": "경력은 나이 − 15년을 넘을 수 없어요.", "goal.targetDate": "x" };
    const fixed: SimulationInputDraft = { ...sent, person: { age: 25, careerYears: 6 } };
    expect(unchangedErrors(errors, sent, sent)).toEqual(errors);
    expect(unchangedErrors(errors, sent, fixed)).toEqual({ "goal.targetDate": "x" });
  });

  it("다른 카드를 고쳐도 그 카드 오류는 남는다", () => {
    const sent: SimulationInputDraft = {
      events: [
        { presetKey: "CAR", eventType: "ONE_TIME", occurDate: "2027-01", amount: 1 },
        { presetKey: "WEDDING", eventType: "ONE_TIME", occurDate: "2037-01", amount: 1 },
      ],
    };
    const current: SimulationInputDraft = {
      events: [{ ...sent.events![0], amount: 2 }, sent.events![1]],
    };
    expect(unchangedErrors({ "events[1]": "범위 밖" }, sent, current)).toEqual({ "events[1]": "범위 밖" });
  });
});
