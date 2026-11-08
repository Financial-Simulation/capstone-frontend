import { describe, expect, it } from "vitest";
import type { ValidateSummary } from "./types";
import { describeWarning } from "./warnings";

const summary = (values: Partial<ValidateSummary>): ValidateSummary => ({
  monthlyNetIncome: null,
  fixedTotal: null,
  variableTotal: null,
  monthlyLoanPayment: null,
  monthlySurplus: null,
  monthlySaving: null,
  totalAssets: null,
  totalLoanBalance: null,
  ...values,
});

describe("경고 모달 문구 (와이어플로)", () => {
  it("지출이 소득보다 많아요 + 차이", () => {
    const view = describeWarning(
      { code: "WARN_EXPENSE_OVER_INCOME", message: "지출(240만 원)이 월 실수령액(200만 원) 이상이라 매달 모자라요." },
      summary({ monthlyNetIncome: 2_000_000, fixedTotal: 1_300_000, variableTotal: 1_100_000 }),
    );
    expect(view.title).toBe("지출이 소득보다 많아요");
    expect(view.body).toContain("실수령액보다 40만 원 많아요");
    expect(view.fields).toEqual(["expenses.fixed", "expenses.variable"]);
  });

  it("지출 = 소득이면 '같아요'", () => {
    const view = describeWarning(
      { code: "WARN_EXPENSE_OVER_INCOME", message: "" },
      summary({ monthlyNetIncome: 2_000_000, fixedTotal: 1_000_000, variableTotal: 1_000_000 }),
    );
    expect(view.body).toContain("실수령액과 같아요");
  });

  it("매달 모자라요: S1은 저축 50만 원 − 남는 돈 46만 5,161원", () => {
    const view = describeWarning(
      { code: "WARN_MONTHLY_SHORTFALL", message: "" },
      summary({ monthlySaving: 500_000, monthlySurplus: 465_161 }),
    );
    expect(view.title).toBe("매달 3만 4,839원이 모자라요");
    expect(view.fields).toEqual(["savingPlan.monthlySaving"]);
  });

  it("이미 목표 금액을 모았어요 → 목표 수정", () => {
    const view = describeWarning({ code: "WARN_GOAL_ALREADY_MET", message: "" }, summary({}));
    expect(view.title).toBe("이미 목표 금액을 모았어요");
    expect(view.editLabel).toBe("목표 수정");
  });

  it("모르는 경고는 서버 문장 그대로", () => {
    const view = describeWarning({ code: "WARN_NEW", message: "새 경고" }, summary({}));
    expect(view.body).toBe("새 경고");
  });
});
