/**
 * 입력 칸 규칙. 백엔드 SimulationInput.java · InputValidationService.java를 그대로 옮겼다.
 * 서버와 다르면 서버가 기준이고, 여기 규칙은 다음 두 곳에서만 쓴다.
 *  - '다음' 버튼: 그 화면의 필수 칸이 찼는지 (checkRequired)
 *  - 목업 모드: 서버가 했을 검사를 흉내 낸다 (checkFields · checkCrossRules)
 * 오류 경로와 문장은 서버 응답과 같게 맞췄다 (예: "person.age" → "19~39 사이로 입력해 주세요").
 */
import type {
  ErrorCode,
  ExpenseGroup,
  FieldErrorMap,
  InputStep,
  PlannedEvent,
  SimulationInputDraft,
  Draft,
} from "./types";
import { EMERGENCY_FIRST_OPTIONS } from "@/config/policy";
import { isYearMonth, monthsBetween } from "./year-month";

type Num = number | null | undefined;

export const MESSAGES = {
  yearMonth: "YYYY-MM 형식으로 입력해 주세요",
  age: "19~39 사이로 입력해 주세요",
  careerYears: "0~10년 사이로 입력해 주세요",
  monthlyNetIncome: "1만 원 ~ 3,000만 원 사이로 입력해 주세요",
  annualGrossSalary: "0원 ~ 10억 원 사이로 입력해 주세요",
  grossConsistentWithNet: "세전 연봉이 월 실수령액 × 12보다 작아요. 세금을 떼기 전 금액을 넣어 주세요",
  nonNegative: "0원 이상으로 입력해 주세요",
  name20: "20자 이내로 입력해 주세요",
  name30: "30자 이내로 입력해 주세요",
  amountRequired: "금액을 입력해 주세요",
  expenseTotalRange: "합계는 0원 ~ 3,000만 원 사이여야 해요",
  rentWithinFixed: "그중 월세는 고정지출보다 클 수 없어요",
  investments: "0원 ~ 10억 원 사이로 입력해 주세요",
  cashAndDeposits: "현금과 예·적금을 합쳐 10억 원 이하로 입력해 주세요",
  monthlyAmount: "0원 ~ 3,000만 원 사이로 입력해 주세요",
  allocationMonthly: "0원 ~ 50만 원 사이로 입력해 주세요",
  pensionMonthly: "0원 ~ 150만 원 사이로 입력해 주세요 (연금계좌 한도 연 1,800만 원)",
  generalSavingRate: "0~10% 사이로 입력해 주세요",
  emergencyFirst: "0 / 100만 / 200만 / 300만 / 500만 원 중에서 골라 주세요",
  breakThreshold: "0원 ~ 1억 원 사이로 입력해 주세요",
  loanType: "대출 종류를 골라 주세요",
  principalRequired: "남은 원금을 입력해 주세요",
  principalMin: "1원 이상으로 입력해 주세요",
  annualRate: "0~20% 사이로 입력해 주세요",
  remainingRequired: "남은 기간을 입력해 주세요",
  remainingRange: "1~480개월 사이로 입력해 주세요",
  goalAmount: "1만 원 ~ 10억 원 사이로 입력해 주세요",
  presetKey: "프리셋을 골라 주세요",
  occurDateRequired: "발생 시점을 입력해 주세요",
  eventType: "종류를 골라 주세요",
} as const;

/**
 * 칸 범위 (원 · % · 개월 · 년). 아래 검사와 화면 안내(칸 아래 '19~39세' 같은 글자)가 같이 쓴다.
 * 서버 SimulationInput.java의 @Min · @Max · @DecimalMax와 같게 맞춘다.
 */
export const LIMITS = {
  age: { min: 19, max: 39 },
  careerYears: { min: 0, max: 10 },
  /** 경력은 나이 − 15년까지 (INPUT4001) */
  careerStartAge: 15,
  monthlyNetIncome: { min: 10_000, max: 30_000_000 },
  annualGrossSalary: { min: 0, max: 1_000_000_000 },
  expenseTotal: { min: 0, max: 30_000_000 },
  monthlyRent: { min: 0 },
  cashAndDeposits: { min: 0, max: 1_000_000_000 },
  investments: { min: 0, max: 1_000_000_000 },
  monthlySaving: { min: 0, max: 30_000_000 },
  monthlyInvestment: { min: 0, max: 30_000_000 },
  policyMonthly: { min: 0, max: 500_000 },
  housingMonthly: { min: 0, max: 500_000 },
  pensionMonthly: { min: 0, max: 1_500_000 },
  generalSavingRate: { min: 0, max: 10 },
  breakThreshold: { min: 0, max: 100_000_000 },
  loanPrincipal: { min: 1 },
  loanAnnualRate: { min: 0, max: 20 },
  loanRemainingMonths: { min: 1, max: 480 },
  goalTargetAmount: { min: 10_000, max: 1_000_000_000 },
  /** 기준 달부터 개월 */
  goalMonths: { min: 12, max: 120 },
  eventMonths: { min: 0, max: 119 },
  jobChangeRate: { min: -90, max: 200 },
  jobChangeGapMonths: { min: 0, max: 24 },
  /** 이름 칸: 지출 항목 · 대출 · 예정된 일, 비교 계획 이름(PlanSpec.name) */
  nameLength: 20,
  goalNameLength: 30,
} as const;

/** 0원 이상 (금액 칸 대부분) */
const NON_NEGATIVE = { min: 0 } as const;

/** 값이 있고 범위 밖이면 true (값이 없으면 검사하지 않는다) */
const outside = (v: Num, range: { min?: number; max?: number }) =>
  v != null && ((range.min != null && v < range.min) || (range.max != null && v > range.max));

/** DETAIL이면 items 합계, TOTAL이면 total. 아직 모르면 null (ExpenseGroup.resolvedTotal) */
export function resolvedExpenseTotal(group: Draft<ExpenseGroup> | null | undefined): number | null {
  if (!group) return null;
  if (group.inputMode === "DETAIL") {
    return (group.items ?? []).reduce((sum, item) => sum + (item?.amount ?? 0), 0);
  }
  return group.total ?? null;
}

// ===== 1. 칸별 규칙 (값이 있을 때만 검사, COMMON400) =====

export function checkFields(input: SimulationInputDraft): FieldErrorMap {
  const errors: FieldErrorMap = {};
  const add = (path: string, message: string) => {
    if (!(path in errors)) errors[path] = message;
  };

  if (input.startMonth != null && !isYearMonth(input.startMonth)) add("startMonth", MESSAGES.yearMonth);

  const person = input.person;
  if (outside(person?.age, LIMITS.age)) add("person.age", MESSAGES.age);
  if (outside(person?.careerYears, LIMITS.careerYears)) add("person.careerYears", MESSAGES.careerYears);

  const income = input.income;
  if (outside(income?.monthlyNetIncome, LIMITS.monthlyNetIncome)) add("income.monthlyNetIncome", MESSAGES.monthlyNetIncome);
  if (outside(income?.annualGrossSalary, LIMITS.annualGrossSalary)) add("income.annualGrossSalary", MESSAGES.annualGrossSalary);
  // 세전 연봉 × 1.1 ≥ 월 실수령액 × 12 (서버는 정수로 gross × 11 ≥ net × 120). 화면 칸은 세전 연봉
  if (
    income?.annualGrossSalary != null &&
    income.monthlyNetIncome != null &&
    income.annualGrossSalary * 11 < income.monthlyNetIncome * 120
  ) {
    add("income.grossConsistentWithNet", MESSAGES.grossConsistentWithNet);
  }

  for (const key of ["fixed", "variable"] as const) {
    const group = input.expenses?.[key];
    if (!group) continue;
    const base = `expenses.${key}`;
    (group.items ?? []).forEach((item, i) => {
      if (!item) return;
      if (item.name != null && item.name.length > LIMITS.nameLength) add(`${base}.items[${i}].name`, MESSAGES.name20);
      if (item.amount == null) add(`${base}.items[${i}].amount`, MESSAGES.amountRequired);
      else if (item.amount < 0) add(`${base}.items[${i}].amount`, MESSAGES.nonNegative);
    });
    if (outside(group.total, NON_NEGATIVE)) add(`${base}.total`, MESSAGES.nonNegative);
    if (outside(resolvedExpenseTotal(group), LIMITS.expenseTotal)) {
      add(`${base}.resolvedTotalInRange`, MESSAGES.expenseTotalRange);
    }
  }

  // 그중 월세: 고정지출 안에 든 돈이라 고정지출보다 클 수 없다. 화면 칸은 그중 월세
  const rent = input.expenses?.monthlyRent;
  const fixedTotal = resolvedExpenseTotal(input.expenses?.fixed);
  if (outside(rent, LIMITS.monthlyRent)) add("expenses.monthlyRent", MESSAGES.nonNegative);
  if (rent != null && fixedTotal != null && rent > fixedTotal) add("expenses.rentWithinFixed", MESSAGES.rentWithinFixed);

  const assets = input.assets;
  if (assets) {
    if (outside(assets.cash, NON_NEGATIVE)) add("assets.cash", MESSAGES.nonNegative);
    if (outside(assets.deposits, NON_NEGATIVE)) add("assets.deposits", MESSAGES.nonNegative);
    if (outside(assets.investments, LIMITS.investments)) add("assets.investments", MESSAGES.investments);
    if (assets.cash != null && assets.deposits != null && assets.cash + assets.deposits > LIMITS.cashAndDeposits.max) {
      add("assets.cashAndDepositsInRange", MESSAGES.cashAndDeposits);
    }
  }

  const plan = input.savingPlan;
  if (plan) {
    if (outside(plan.monthlySaving, LIMITS.monthlySaving)) add("savingPlan.monthlySaving", MESSAGES.monthlyAmount);
    if (outside(plan.generalSavingRate, LIMITS.generalSavingRate)) add("savingPlan.generalSavingRate", MESSAGES.generalSavingRate);
    if (outside(plan.monthlyInvestment, LIMITS.monthlyInvestment)) add("savingPlan.monthlyInvestment", MESSAGES.monthlyAmount);
    // 상품별 배분 (v1.7): 청년미래 · 청약 월 50만 원, 연금저축 월 150만 원까지
    if (outside(plan.policyMonthly, LIMITS.policyMonthly)) add("savingPlan.policyMonthly", MESSAGES.allocationMonthly);
    if (outside(plan.housingMonthly, LIMITS.housingMonthly)) add("savingPlan.housingMonthly", MESSAGES.allocationMonthly);
    if (outside(plan.pensionMonthly, LIMITS.pensionMonthly)) add("savingPlan.pensionMonthly", MESSAGES.pensionMonthly);
    const first = plan.emergencyFirstAmount ?? 0;
    if (!(EMERGENCY_FIRST_OPTIONS as readonly number[]).includes(first)) {
      add("savingPlan.emergencyFirstAmountAllowed", MESSAGES.emergencyFirst);
    }
  }

  if (outside(input.emergency?.breakThreshold, LIMITS.breakThreshold)) {
    add("emergency.breakThreshold", MESSAGES.breakThreshold);
  }

  (input.loans?.items ?? []).forEach((loan, i) => {
    if (!loan) return;
    const base = `loans.items[${i}]`;
    if (loan.name != null && loan.name.length > LIMITS.nameLength) add(`${base}.name`, MESSAGES.name20);
    if (loan.loanType == null) add(`${base}.loanType`, MESSAGES.loanType);
    if (loan.principal == null) add(`${base}.principal`, MESSAGES.principalRequired);
    else if (loan.principal < LIMITS.loanPrincipal.min) add(`${base}.principal`, MESSAGES.principalMin);
    if (outside(loan.annualRate, LIMITS.loanAnnualRate)) add(`${base}.annualRate`, MESSAGES.annualRate);
    if (loan.remainingMonths == null) add(`${base}.remainingMonths`, MESSAGES.remainingRequired);
    else if (outside(loan.remainingMonths, LIMITS.loanRemainingMonths)) add(`${base}.remainingMonths`, MESSAGES.remainingRange);
  });

  const goal = input.goal;
  if (goal) {
    if (goal.name != null && goal.name.length > LIMITS.goalNameLength) add("goal.name", MESSAGES.name30);
    if (outside(goal.targetAmount, LIMITS.goalTargetAmount)) add("goal.targetAmount", MESSAGES.goalAmount);
    if (goal.targetDate != null && !isYearMonth(goal.targetDate)) add("goal.targetDate", MESSAGES.yearMonth);
  }

  (input.events ?? []).forEach((event, i) => {
    if (!event) return;
    const base = `events[${i}]`;
    if (event.presetKey == null) add(`${base}.presetKey`, MESSAGES.presetKey);
    if (event.name != null && event.name.length > LIMITS.nameLength) add(`${base}.name`, MESSAGES.name20);
    if (event.occurDate == null) add(`${base}.occurDate`, MESSAGES.occurDateRequired);
    else if (!isYearMonth(event.occurDate)) add(`${base}.occurDate`, MESSAGES.yearMonth);
    if (event.eventType == null) add(`${base}.eventType`, MESSAGES.eventType);
    if (outside(event.amount, NON_NEGATIVE)) add(`${base}.amount`, MESSAGES.nonNegative);
    if (outside(event.deposit, NON_NEGATIVE)) add(`${base}.deposit`, MESSAGES.nonNegative);
  });

  return errors;
}

// ===== 2. 여러 칸을 같이 보는 규칙 (관련 칸이 다 있을 때만, 서버와 같은 순서로 첫 번째만) =====

export interface CrossRuleError {
  code: Extract<ErrorCode, "INPUT4001" | "LOAN4001" | "GOAL4001" | "GOAL4002" | "EVENT4001" | "EVENT4002" | "EVENT4004">;
  message: string;
}

/** ErrorStatus.java의 문장 */
export const CROSS_RULE_MESSAGES: Record<CrossRuleError["code"], string> = {
  INPUT4001: "경력은 나이 − 15년을 넘을 수 없어요.",
  LOAN4001: "'대출 없음'과 대출 목록이 서로 맞지 않아요.",
  GOAL4001: "목표 시점은 시작 달부터 12개월 이후여야 해요.",
  GOAL4002: "목표 시점은 시작 달부터 120개월 이내여야 해요.",
  EVENT4001: "예정된 일의 종류와 금액 항목이 맞지 않아요.",
  EVENT4002: "예정된 일의 시점은 시작 달부터 119개월 이내여야 해요.",
  EVENT4004: "이직 연봉 변화율은 −90~+200%, 공백은 0~24개월이어야 해요.",
};

/** 종류마다 꼭 있어야 하는 금액 칸이 다 있는지 (EVENT4001) */
export function eventFieldsMatch(event: Draft<PlannedEvent>): boolean {
  switch (event.eventType) {
    case "ONE_TIME":
      return event.amount != null;
    case "SPEND_CHANGE":
      return event.monthlyChange != null;
    case "JOB_CHANGE":
      return event.incomeChangeRate != null && event.gapMonths != null;
    case "MOVE":
      return event.deposit != null && event.monthlyChange != null && event.amount != null;
    default:
      return false;
  }
}

/** 기준 달부터 0~119개월 안인지 (EVENT4002). 기준 달이 없으면 검사하지 않는다 */
export function eventDateInRange(startMonth: string | null | undefined, event: Draft<PlannedEvent>): boolean {
  if (!isYearMonth(startMonth) || !isYearMonth(event.occurDate)) return true;
  const months = monthsBetween(startMonth, event.occurDate);
  return !outside(months, LIMITS.eventMonths);
}

/** 이직 연봉 변화율 −90~+200%, 쉬는 기간 0~24개월 (EVENT4004) */
export function jobChangeInRange(event: Draft<PlannedEvent>): boolean {
  if (event.eventType !== "JOB_CHANGE") return true;
  const { incomeChangeRate: rate, gapMonths: gap } = event;
  return rate != null && gap != null && !outside(rate, LIMITS.jobChangeRate) && !outside(gap, LIMITS.jobChangeGapMonths);
}

export function checkCrossRules(input: SimulationInputDraft): CrossRuleError | null {
  const fail = (code: CrossRuleError["code"]): CrossRuleError => ({ code, message: CROSS_RULE_MESSAGES[code] });

  const person = input.person;
  if (person?.age != null && person.careerYears != null && person.careerYears > person.age - LIMITS.careerStartAge) {
    return fail("INPUT4001");
  }

  // '대출 없음'과 '목록이 비었는지'가 서로 다르면
  const loans = input.loans;
  if (loans?.hasNoLoan != null && loans.hasNoLoan !== ((loans.items ?? []).length === 0)) {
    return fail("LOAN4001");
  }

  const start = isYearMonth(input.startMonth) ? input.startMonth : null;
  const target = input.goal?.targetDate;
  if (start && isYearMonth(target)) {
    const months = monthsBetween(start, target);
    if (months < LIMITS.goalMonths.min) return fail("GOAL4001");
    if (months > LIMITS.goalMonths.max) return fail("GOAL4002");
  }

  for (const event of input.events ?? []) {
    if (!event) continue;
    if (!eventFieldsMatch(event)) return fail("EVENT4001");
    if (!eventDateInRange(start, event)) return fail("EVENT4002");
    if (!jobChangeInRange(event)) return fail("EVENT4004");
  }
  return null;
}

// ===== 3. 필수 칸 ('다음' 버튼, 계산 직전) =====

function expenseGroupRequired(group: Draft<ExpenseGroup> | null | undefined, base: string, errors: FieldErrorMap) {
  if (!group) return;
  if (group.inputMode == null) {
    errors[`${base}.inputMode`] = "입력 방식을 골라 주세요";
  } else if (group.inputMode === "TOTAL" && group.total == null) {
    errors[`${base}.total`] = "합계를 입력해 주세요";
  } else if (group.inputMode === "DETAIL") {
    const items = group.items ?? [];
    if (items.length === 0) errors[`${base}.items`] = "항목을 하나 이상 입력해 주세요";
    items.forEach((item, i) => {
      if (item?.amount == null) errors[`${base}.items[${i}].amount`] = MESSAGES.amountRequired;
    });
  }
}

/**
 * 그 단계의 필수 칸 중 빈 것. cumulative면 앞 단계까지 함께 본다 (ALL = 계산 직전).
 * 문장은 서버(@NotNull 꼬리표)와 같고, 서버에 없는 '대출 칸이 하나도 없을 때'만 와이어플로 문장을 쓴다.
 */
export function checkRequired(
  step: InputStep,
  input: SimulationInputDraft,
  options: { cumulative?: boolean } = {},
): FieldErrorMap {
  const order: InputStep[] = ["BASIC", "ASSETS", "GOAL", "EVENTS"];
  const upTo = step === "ALL" ? order : options.cumulative ? order.slice(0, order.indexOf(step) + 1) : [step];
  const errors: FieldErrorMap = {};

  if (upTo.includes("BASIC")) {
    if (!isYearMonth(input.startMonth)) errors.startMonth = "기준 연월을 입력해 주세요";
    if (input.person?.age == null) errors["person.age"] = "나이를 입력해 주세요";
    if (input.person?.careerYears == null) errors["person.careerYears"] = "경력을 입력해 주세요";
    if (input.income?.monthlyNetIncome == null) errors["income.monthlyNetIncome"] = "월 실수령액을 입력해 주세요";
    if (input.expenses?.fixed == null) errors["expenses.fixed.total"] = "고정지출을 입력해 주세요";
    if (input.expenses?.variable == null) errors["expenses.variable.total"] = "변동지출을 입력해 주세요";
    expenseGroupRequired(input.expenses?.fixed, "expenses.fixed", errors);
    expenseGroupRequired(input.expenses?.variable, "expenses.variable", errors);
  }

  if (upTo.includes("ASSETS")) {
    if (input.assets?.cash == null) errors["assets.cash"] = "현금·입출금 금액을 입력해 주세요";
    if (input.assets?.deposits == null) errors["assets.deposits"] = "예·적금 금액을 입력해 주세요";
    if (input.savingPlan?.monthlySaving == null) errors["savingPlan.monthlySaving"] = "월 저축액을 입력해 주세요";
    const loans = input.loans;
    if (loans?.hasNoLoan == null) errors["loans.hasNoLoan"] = "대출이 있는지 골라 주세요";
    else if (!loans.hasNoLoan) {
      const items = loans.items ?? [];
      if (items.length === 0) errors["loans.items"] = "대출 정보를 하나 이상 입력해 주세요";
      items.forEach((loan, i) => {
        if (loan?.loanType == null) errors[`loans.items[${i}].loanType`] = MESSAGES.loanType;
        if (loan?.principal == null) errors[`loans.items[${i}].principal`] = MESSAGES.principalRequired;
        if (loan?.remainingMonths == null) errors[`loans.items[${i}].remainingMonths`] = MESSAGES.remainingRequired;
      });
    }
  }

  if (upTo.includes("GOAL")) {
    if (input.goal?.targetAmount == null) errors["goal.targetAmount"] = "목표 금액을 입력해 주세요";
    if (input.goal?.targetDate == null) errors["goal.targetDate"] = "목표 시점을 입력해 주세요";
  }

  if (upTo.includes("EVENTS")) {
    (input.events ?? []).forEach((event, i) => {
      if (!event) return;
      if (event.occurDate == null) errors[`events[${i}].occurDate`] = MESSAGES.occurDateRequired;
      if (event.eventType != null && !eventFieldsMatch(event)) {
        errors[`events[${i}]`] = "금액 칸을 모두 입력해 주세요";
      }
    });
  }

  return errors;
}
