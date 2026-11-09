import { describe, expect, it } from "vitest";
import type { SimulationInputDraft } from "@/lib/types";
import { CROSS_RULE_MESSAGES } from "@/lib/rules";
import { isAbortError } from "./client";
import { ApiError, errorMessage, fieldError, formErrorMessage, normalizeFieldPath, toFieldErrors } from "./errors";

const business = (code: keyof typeof CROSS_RULE_MESSAGES) => new ApiError(code, CROSS_RULE_MESSAGES[code], 400);

describe("서버 칸 경로 → 화면 칸", () => {
  it.each([
    ["person.age", "person.age"],
    ["input.person.age", "person.age"],
    ["expenses.fixed.resolvedTotalInRange", "expenses.fixed.total"],
    ["input.expenses.variable.totalPresentWhenTotalMode", "expenses.variable.total"],
    ["assets.cashAndDepositsInRange", "assets.cash"],
    ["input.savingPlan.emergencyFirstAmountAllowed", "savingPlan.emergencyFirstAmount"],
    ["input.income.grossConsistentWithNet", "income.annualGrossSalary"],
    ["expenses.rentWithinFixed", "expenses.monthlyRent"],
    ["savingPlan.pensionMonthly", "savingPlan.pensionMonthly"],
    ["loans.items[0].principal", "loans.items[0].principal"],
    ["input.events[2].occurDate", "events[2].occurDate"],
  ])("%s → %s", (path, expected) => {
    expect(normalizeFieldPath(path)).toBe(expected);
  });
});

describe("toFieldErrors", () => {
  it("COMMON400 → 칸별 메시지", () => {
    const error = new ApiError("COMMON400", "잘못된 요청입니다.", 400, {
      "input.person.age": "19~39 사이로 입력해 주세요",
      "expenses.fixed.resolvedTotalInRange": "합계는 0원 ~ 3,000만 원 사이여야 해요",
    });
    expect(toFieldErrors(error)).toEqual({
      "person.age": "19~39 사이로 입력해 주세요",
      "expenses.fixed.total": "합계는 0원 ~ 3,000만 원 사이여야 해요",
    });
  });

  it("같은 칸으로 모이면 첫 문장만", () => {
    const error = new ApiError("COMMON400", "잘못된 요청입니다.", 400, {
      "expenses.fixed.total": "0원 이상으로 입력해 주세요",
      "expenses.fixed.resolvedTotalInRange": "합계는 0원 ~ 3,000만 원 사이여야 해요",
    });
    expect(toFieldErrors(error)).toEqual({ "expenses.fixed.total": "0원 이상으로 입력해 주세요" });
  });

  it("v1.7 오류 키 두 개 → 세전 연봉 · 그중 월세 칸 (같은 칸이면 범위 문장이 먼저)", () => {
    const error = new ApiError("COMMON400", "잘못된 요청입니다.", 400, {
      "input.expenses.rentWithinFixed": "그중 월세는 고정지출보다 클 수 없어요",
      "input.income.annualGrossSalary": "0원 ~ 10억 원 사이로 입력해 주세요",
      "input.income.grossConsistentWithNet": "세전 연봉이 월 실수령액 × 12보다 작아요. 세금을 떼기 전 금액을 넣어 주세요",
    });
    expect(toFieldErrors(error)).toEqual({
      "expenses.monthlyRent": "그중 월세는 고정지출보다 클 수 없어요",
      "income.annualGrossSalary": "0원 ~ 10억 원 사이로 입력해 주세요",
    });
  });

  it("비즈니스 오류 → 정해진 칸", () => {
    expect(toFieldErrors(business("INPUT4001"))).toEqual({ "person.careerYears": CROSS_RULE_MESSAGES.INPUT4001 });
    expect(toFieldErrors(business("LOAN4001"))).toEqual({ "loans.hasNoLoan": CROSS_RULE_MESSAGES.LOAN4001 });
    expect(toFieldErrors(business("GOAL4001"))).toEqual({ "goal.targetDate": CROSS_RULE_MESSAGES.GOAL4001 });
    expect(toFieldErrors(business("GOAL4002"))).toEqual({ "goal.targetDate": CROSS_RULE_MESSAGES.GOAL4002 });
  });

  it("EVENT 오류 → 문제가 있는 카드를 입력에서 찾는다", () => {
    const input: SimulationInputDraft = {
      startMonth: "2026-11",
      events: [
        { presetKey: "CAR", eventType: "ONE_TIME", occurDate: "2027-05", amount: 5_000_000 },
        { presetKey: "CUSTOM", eventType: "ONE_TIME", occurDate: "2037-01", amount: 1_000_000 },
        { presetKey: "JOB_CHANGE", eventType: "JOB_CHANGE", occurDate: "2028-01", incomeChangeRate: 300, gapMonths: 1 },
        { presetKey: "CUSTOM", eventType: "SPEND_CHANGE", occurDate: "2028-01" },
      ],
    };
    expect(toFieldErrors(business("EVENT4002"), input)).toEqual({ "events[1]": CROSS_RULE_MESSAGES.EVENT4002 });
    expect(toFieldErrors(business("EVENT4004"), input)).toEqual({ "events[2]": CROSS_RULE_MESSAGES.EVENT4004 });
    expect(toFieldErrors(business("EVENT4001"), input)).toEqual({ "events[3]": CROSS_RULE_MESSAGES.EVENT4001 });
  });

  it("카드를 못 찾으면 예정된 일 전체에", () => {
    expect(toFieldErrors(business("EVENT4001"))).toEqual({ events: CROSS_RULE_MESSAGES.EVENT4001 });
  });

  it("칸에 붙일 수 없는 오류는 빈 객체", () => {
    expect(toFieldErrors(new ApiError("NETWORK", "연결 실패", null))).toEqual({});
    expect(toFieldErrors(new ApiError("COMMON500", "서버 내부 오류입니다.", 500))).toEqual({});
    expect(toFieldErrors(new Error("x"))).toEqual({});
  });
});

describe("formErrorMessage", () => {
  it("칸 오류로 보여 줄 수 있으면 null", () => {
    const error = new ApiError("COMMON400", "잘못된 요청입니다.", 400, { "person.age": "19~39 사이로 입력해 주세요" });
    expect(formErrorMessage(error)).toBeNull();
    expect(formErrorMessage(business("INPUT4001"))).toBeNull();
  });

  it("아니면 화면 위 안내", () => {
    // JSON이 깨진 COMMON400(result null)은 칸이 없다
    expect(formErrorMessage(new ApiError("COMMON400", "잘못된 요청입니다.", 400))).toBe("잘못된 요청입니다.");
    expect(formErrorMessage(new ApiError("SIM4003", "비교 계획은 1~3개여야 해요.", 400))).toBe("비교 계획은 1~3개여야 해요.");
    expect(formErrorMessage(new Error("x"))).toBe("알 수 없는 오류가 났어요. 잠시 후 다시 시도해 주세요.");
    expect(formErrorMessage(null)).toBeNull();
  });
});

describe("errorMessage (칸이 없는 자리의 오류 한 문장)", () => {
  it("안내 문장 → 칸 오류의 첫 문장 → fallback", () => {
    expect(errorMessage(new ApiError("BACKEND_UNAVAILABLE", "백엔드가 응답하지 않아요.", 502))).toBe("백엔드가 응답하지 않아요.");
    const fields = new ApiError("COMMON400", "잘못된 요청", 400, { "input.person.age": "19~39 사이로 입력해 주세요" });
    expect(errorMessage(fields)).toBe("19~39 사이로 입력해 주세요");
    expect(errorMessage(new ApiError("COMMON400", "잘못된 요청", 400))).toBe("잘못된 요청");
    expect(errorMessage(new Error("x"))).toBe("알 수 없는 오류가 났어요. 잠시 후 다시 시도해 주세요.");
    expect(errorMessage(null)).toBe("잠시 후 다시 시도해 주세요.");
  });

  it("요청을 멈춘 것(AbortError)은 오류로 보지 않게 가린다", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new ApiError("NETWORK", "x", null))).toBe(false);
  });
});

describe("fieldError", () => {
  const errors = { "loans.items[0].principal": "남은 원금을 입력해 주세요", "events[10]": "x" };

  it("정확한 칸", () => {
    expect(fieldError(errors, "loans.items[0].principal")).toBe("남은 원금을 입력해 주세요");
    expect(fieldError(errors, "loans.items[0]")).toBeUndefined();
  });

  it("prefix면 그 아래 칸까지", () => {
    expect(fieldError(errors, "loans.items[0]", { prefix: true })).toBe("남은 원금을 입력해 주세요");
    expect(fieldError(errors, "loans", { prefix: true })).toBe("남은 원금을 입력해 주세요");
    // events[1]이 events[10]을 잡으면 안 된다
    expect(fieldError(errors, "events[1]", { prefix: true })).toBeUndefined();
  });
});
