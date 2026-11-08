/**
 * '다음'을 눌렀을 때 서버가 준 경고 → 와이어플로의 경고 모달 문구.
 * 숫자는 서버의 확정 합계(summary)에서 꺼낸다. 화면에서는 뺄셈으로 차이만 보여 준다.
 */
import type { ApiWarning, ValidateSummary } from "./types";
import { formatKoreanWon } from "./format";

export interface WarningView {
  code: string;
  title: string;
  body: string;
  /** '수정하기'를 누르면 강조할 칸 */
  fields: string[];
  editLabel: string;
  proceedLabel: string;
}

export function describeWarning(warning: ApiWarning, summary: ValidateSummary): WarningView {
  const proceedLabel = "그대로 진행";
  switch (warning.code) {
    case "WARN_EXPENSE_OVER_INCOME": {
      const { fixedTotal, variableTotal, monthlyNetIncome } = summary;
      const over =
        fixedTotal != null && variableTotal != null && monthlyNetIncome != null
          ? fixedTotal + variableTotal - monthlyNetIncome
          : null;
      return {
        code: warning.code,
        title: "지출이 소득보다 많아요",
        body:
          over === null
            ? warning.message
            : over > 0
              ? `고정지출과 변동지출을 더한 금액이 실수령액보다 ${formatKoreanWon(over)} 많아요. 그대로 두면 매달 현금이 줄어드는 것으로 계산해요.`
              : "고정지출과 변동지출을 더한 금액이 실수령액과 같아요. 그대로 두면 매달 남는 돈 없이 계산해요.",
        fields: ["expenses.fixed", "expenses.variable"],
        editLabel: "수정하기",
        proceedLabel,
      };
    }
    case "WARN_MONTHLY_SHORTFALL": {
      const { monthlySaving, monthlySurplus } = summary;
      const short = monthlySaving != null && monthlySurplus != null ? monthlySaving - monthlySurplus : null;
      return {
        code: warning.code,
        title: short !== null && short > 0 ? `매달 ${formatKoreanWon(short)}이 모자라요` : "매달 모자라요",
        body: "모자란 만큼은 가진 현금에서 빠져나가 납입하고, 현금이 바닥나면 그달 저축은 넣을 수 있는 만큼만 넣는 것으로 계산해요.",
        fields: ["savingPlan.monthlySaving"],
        editLabel: "수정하기",
        proceedLabel,
      };
    }
    case "WARN_GOAL_ALREADY_MET":
      return {
        code: warning.code,
        title: "이미 목표 금액을 모았어요",
        body: "목표 금액을 높이거나 기간을 줄여서 다시 볼 수 있어요.",
        fields: ["goal.targetAmount", "goal.targetDate"],
        editLabel: "목표 수정",
        proceedLabel,
      };
    default:
      return { code: warning.code, title: "확인해 주세요", body: warning.message, fields: [], editLabel: "수정하기", proceedLabel };
  }
}
