import { describe, expect, it } from "vitest";
import { checkCrossRules, checkRequired } from "@/lib/rules";
import {
  DEFAULT_EXPENSE_ITEMS,
  addExpenseItem,
  addLoan,
  fillBlankExpenseItems,
  patch,
  patchExpense,
  patchExpenseItem,
  removeExpenseItem,
  removeLoan,
  setExpenseMode,
  setHasLoan,
  setLoanType,
} from "./draft";

describe("묶음 고치기", () => {
  it("다른 칸은 그대로", () => {
    const next = patch({ person: { age: 27, careerYears: 2 } }, "person", { age: 28 });
    expect(next).toEqual({ person: { age: 28, careerYears: 2 } });
    expect(patch({}, "income", { monthlyNetIncome: 1 })).toEqual({ income: { monthlyNetIncome: 1 } });
  });
});

describe("지출: 합계로 / 항목별로", () => {
  it("항목별로 처음 바꾸면 기본 항목", () => {
    const next = setExpenseMode({}, "fixed", "DETAIL");
    expect(next.expenses?.fixed?.inputMode).toBe("DETAIL");
    expect(next.expenses?.fixed?.items?.map((i) => i.name)).toEqual([...DEFAULT_EXPENSE_ITEMS.fixed]);
    expect(setExpenseMode({}, "variable", "DETAIL").expenses?.variable?.items?.map((i) => i.name)).toEqual([
      "식비",
      "쇼핑",
      "여가·문화",
      "기타",
    ]);
  });

  it("합계로 돌아가면 비어 있던 합계에 항목 합", () => {
    let input = setExpenseMode({}, "fixed", "DETAIL");
    input = patchExpenseItem(input, "fixed", 0, { amount: 700_000 });
    input = patchExpenseItem(input, "fixed", 1, { amount: 100_000 });
    expect(setExpenseMode(input, "fixed", "TOTAL").expenses?.fixed).toMatchObject({ inputMode: "TOTAL", total: 800_000 });
    // 이미 합계가 있으면 그대로
    const withTotal = patchExpense(input, "fixed", { total: 950_000 });
    expect(setExpenseMode(withTotal, "fixed", "TOTAL").expenses?.fixed?.total).toBe(950_000);
    // 항목도 비어 있으면 합계도 빈 칸
    expect(setExpenseMode(setExpenseMode({}, "fixed", "DETAIL"), "fixed", "TOTAL").expenses?.fixed?.total).toBeNull();
  });

  it("항목 더하기 · 지우기", () => {
    let input = setExpenseMode({}, "variable", "DETAIL");
    input = addExpenseItem(input, "variable");
    expect(input.expenses?.variable?.items).toHaveLength(5);
    input = removeExpenseItem(input, "variable", 0);
    expect(input.expenses?.variable?.items?.[0]?.name).toBe("쇼핑");
  });

  it("'다음' 전에: 비운 금액은 0원, 이름도 금액도 없는 줄은 뺀다", () => {
    let input = setExpenseMode({}, "fixed", "DETAIL");
    input = patchExpenseItem(input, "fixed", 0, { amount: 700_000 });
    input = addExpenseItem(input, "fixed");
    const filled = fillBlankExpenseItems(input);
    expect(filled.expenses?.fixed?.items).toEqual([
      { name: "월세·관리비", amount: 700_000 },
      { name: "통신비", amount: 0 },
      { name: "보험료", amount: 0 },
      { name: "구독료", amount: 0 },
      { name: "교통비", amount: 0 },
    ]);
    // 합계로 입력이면 건드리지 않는다
    const total = patchExpense({}, "fixed", { inputMode: "TOTAL", total: 1 });
    expect(fillBlankExpenseItems(total)).toBe(total);
  });
});

describe("대출", () => {
  it("종류를 고르면 평균 금리 · 흔한 갚는 방식 · 이름", () => {
    const input = setLoanType(addLoan({}), 0, "JEONSE");
    expect(input.loans?.items?.[0]).toEqual({
      loanType: "JEONSE",
      name: "전세자금대출",
      annualRate: 4.3,
      repaymentType: "INTEREST_ONLY",
    });
    expect(setLoanType(input, 0, "STUDENT").loans?.items?.[0]).toMatchObject({ annualRate: 1.7, repaymentType: "EQUAL_PAYMENT" });
  });

  it("있음 / 없음 (LOAN4001이 나지 않게)", () => {
    const yes = setHasLoan({}, true);
    expect(yes.input.loans).toEqual({ hasNoLoan: false, items: [{}] });
    const filled = setLoanType(yes.input, 0, "CREDIT");
    const no = setHasLoan(filled, false);
    expect(no.input.loans).toEqual({ hasNoLoan: true, items: [] });
    expect(checkCrossRules(no.input)).toBeNull();
    // 다시 '있음'이면 지웠던 대출을 돌려놓는다
    const back = setHasLoan(no.input, true, no.stash);
    expect(back.input.loans?.items?.[0]?.loanType).toBe("CREDIT");
  });

  it("마지막 대출을 지우면 '대출 정보를 하나 이상 입력해 주세요'", () => {
    const input = removeLoan(setHasLoan({}, true).input, 0);
    expect(checkRequired("ASSETS", input)["loans.items"]).toBe("대출 정보를 하나 이상 입력해 주세요");
  });
});
