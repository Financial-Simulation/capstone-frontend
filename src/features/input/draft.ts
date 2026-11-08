/**
 * 입력(Draft)을 고치는 순수 함수. 화면은 update((prev) => patch(prev, "person", { age }))처럼 쓴다.
 */
import type { Draft, ExpenseGroup, ExpenseItem, LoanItem, LoanType, SimulationInputDraft } from "@/lib/types";
import { LOAN_DEFAULTS } from "@/config/policy";

type Section = "person" | "income" | "expenses" | "assets" | "savingPlan" | "emergency" | "goal" | "loans";

/** 묶음 하나의 칸 몇 개를 바꾼다 (지출 묶음 안의 고정 · 변동은 patchExpense) */
export function patch<K extends Section>(
  input: SimulationInputDraft,
  key: K,
  values: NonNullable<SimulationInputDraft[K]>,
): SimulationInputDraft {
  return { ...input, [key]: { ...(input[key] ?? {}), ...values } } as SimulationInputDraft;
}

/** 상품별 배분 3칸 (v1.7, savingPlan). 결과 화면 '어디에 얼마나'(features/tax)에서 넣는다 */
export const ALLOCATION_KEYS = ["policyMonthly", "housingMonthly", "pensionMonthly"] as const;
export type AllocationKey = (typeof ALLOCATION_KEYS)[number];

/**
 * 배분을 내 입력(simInput.v1)에 넣는다. 넘긴 칸만 바꾸고, null은 비움 → 서버 기본값
 * (청년미래는 대상이면 월 저축액 안에서 한도까지, 청약 · 연금저축은 0). 04-E 예시 입력에는 넣지 않는다.
 */
export function setAllocation(
  input: SimulationInputDraft,
  allocation: Partial<Record<AllocationKey, number | null>>,
): SimulationInputDraft {
  return patch(input, "savingPlan", allocation);
}

export type ExpenseKind = "fixed" | "variable";

/** 와이어플로 01-1 '항목별로 입력'의 기본 항목 */
export const DEFAULT_EXPENSE_ITEMS: Record<ExpenseKind, readonly string[]> = {
  fixed: ["월세·관리비", "통신비", "보험료", "구독료", "교통비"],
  variable: ["식비", "쇼핑", "여가·문화", "기타"],
};

export function patchExpense(
  input: SimulationInputDraft,
  kind: ExpenseKind,
  values: Draft<ExpenseGroup>,
): SimulationInputDraft {
  const expenses = input.expenses ?? {};
  return { ...input, expenses: { ...expenses, [kind]: { ...(expenses[kind] ?? {}), ...values } } };
}

/**
 * 합계로 ↔ 항목별로. 항목별로 처음 바꾸면 기본 항목을 넣고, 합계로 돌아갈 때 합계가 비어 있으면 항목 합을 넣는다.
 * 다른 방식의 값은 지우지 않는다 (다시 바꾸면 그대로 보이게). 서버는 inputMode 쪽만 쓴다.
 */
export function setExpenseMode(input: SimulationInputDraft, kind: ExpenseKind, mode: "TOTAL" | "DETAIL"): SimulationInputDraft {
  const group = input.expenses?.[kind] ?? {};
  if (mode === "DETAIL") {
    const items = group.items && group.items.length > 0 ? group.items : DEFAULT_EXPENSE_ITEMS[kind].map((name) => ({ name, amount: null }));
    return patchExpense(input, kind, { inputMode: "DETAIL", items });
  }
  const sum = (group.items ?? []).reduce((total, item) => total + (item?.amount ?? 0), 0);
  const hasAmounts = (group.items ?? []).some((item) => item?.amount != null);
  return patchExpense(input, kind, { inputMode: "TOTAL", total: group.total ?? (hasAmounts ? sum : null) });
}

export function patchExpenseItem(
  input: SimulationInputDraft,
  kind: ExpenseKind,
  index: number,
  values: Draft<ExpenseItem>,
): SimulationInputDraft {
  const items = (input.expenses?.[kind]?.items ?? []).map((item, i) => (i === index ? { ...item, ...values } : item));
  return patchExpense(input, kind, { items });
}

export function addExpenseItem(input: SimulationInputDraft, kind: ExpenseKind): SimulationInputDraft {
  const items = [...(input.expenses?.[kind]?.items ?? []), { name: "", amount: null }];
  return patchExpense(input, kind, { items });
}

export function removeExpenseItem(input: SimulationInputDraft, kind: ExpenseKind, index: number): SimulationInputDraft {
  const items = (input.expenses?.[kind]?.items ?? []).filter((_, i) => i !== index);
  return patchExpense(input, kind, { items });
}

/**
 * '다음'을 누를 때: 항목별 입력에서 비워 둔 금액은 0원으로, 이름도 금액도 없는 줄은 뺀다.
 * (화면에 '비워 둔 항목은 0원으로 계산해요'라고 적어 둔다)
 */
export function fillBlankExpenseItems(input: SimulationInputDraft): SimulationInputDraft {
  let next = input;
  for (const kind of ["fixed", "variable"] as const) {
    const group = next.expenses?.[kind];
    if (group?.inputMode !== "DETAIL" || !group.items) continue;
    const items = group.items
      .filter((item) => item && (item.amount != null || (item.name ?? "").trim() !== ""))
      .map((item) => (item.amount == null ? { ...item, amount: 0 } : item));
    if (JSON.stringify(items) !== JSON.stringify(group.items)) next = patchExpense(next, kind, { items });
  }
  return next;
}

// ===== 대출 =====

export function patchLoan(input: SimulationInputDraft, index: number, values: Draft<LoanItem>): SimulationInputDraft {
  const items = (input.loans?.items ?? []).map((loan, i) => (i === index ? { ...loan, ...values } : loan));
  return { ...input, loans: { ...(input.loans ?? {}), items } };
}

/** 종류를 고르면 평균 금리와 흔한 갚는 방식을 채운다 (예: 전세자금 4.3% · 이자만) */
export function setLoanType(input: SimulationInputDraft, index: number, loanType: LoanType): SimulationInputDraft {
  const defaults = LOAN_DEFAULTS[loanType];
  return patchLoan(input, index, {
    loanType,
    name: defaults.label,
    annualRate: defaults.annualRate,
    repaymentType: defaults.repaymentType,
  });
}

export function addLoan(input: SimulationInputDraft): SimulationInputDraft {
  return { ...input, loans: { ...(input.loans ?? {}), hasNoLoan: false, items: [...(input.loans?.items ?? []), {}] } };
}

export function removeLoan(input: SimulationInputDraft, index: number): SimulationInputDraft {
  const items = (input.loans?.items ?? []).filter((_, i) => i !== index);
  return { ...input, loans: { ...(input.loans ?? {}), items } };
}

/**
 * 대출 있음 / 없음. '없음'이면 목록을 비운다 (서버 규칙 LOAN4001).
 * 지운 대출은 stash로 돌려주니, 화면이 들고 있다가 '있음'으로 돌아오면 다시 넣는다.
 */
export function setHasLoan(
  input: SimulationInputDraft,
  hasLoan: boolean,
  stash: Draft<LoanItem>[] = [],
): { input: SimulationInputDraft; stash: Draft<LoanItem>[] } {
  const items = input.loans?.items ?? [];
  if (!hasLoan) {
    return { input: { ...input, loans: { hasNoLoan: true, items: [] } }, stash: items.length > 0 ? items : stash };
  }
  const restored = items.length > 0 ? items : stash.length > 0 ? stash : [{}];
  return { input: { ...input, loans: { hasNoLoan: false, items: restored } }, stash: [] };
}
