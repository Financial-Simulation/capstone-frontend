/**
 * 사용자 입력 전체 (백엔드 SimulationInput.java와 같은 모양).
 * 브라우저 localStorage `simInput.v1`에 저장하고, 계산 API에 매번 본문 `input`으로 보낸다.
 *
 * 단위: 금액은 원 단위 정수, 금리·비율은 % 숫자(3.03), 연월은 "YYYY-MM".
 * 서버와 다르면 서버(SimulationInput.java)가 기준이다.
 */

/** "YYYY-MM" */
export type YearMonth = string;

/** 입력 화면 단계 (InputStep.java). 와이어플로 01-1 → 01-2 → 02 → 03 */
export type InputStep = "BASIC" | "ASSETS" | "GOAL" | "EVENTS" | "ALL";

export type EmploymentType = "REGULAR" | "CONTRACT";

/** 지출 입력 방식. DETAIL이면 items 합계, TOTAL이면 total을 쓴다 */
export type InputMode = "DETAIL" | "TOTAL";

/** 대출 종류. 금리·상환 방식을 비워 두면 종류별 기본값 (LOAN_DEFAULTS) */
export type LoanType = "STUDENT" | "JEONSE" | "CREDIT" | "MORTGAGE" | "OTHER";

/** 원리금균등 · 원금균등 · 만기일시 · 이자만(전세자금) */
export type RepaymentType =
  | "EQUAL_PAYMENT"
  | "EQUAL_PRINCIPAL"
  | "BULLET"
  | "INTEREST_ONLY";

export type PresetKey =
  | "INDEPENDENCE"
  | "JEONSE_MOVE"
  | "WEDDING"
  | "JOB_CHANGE"
  | "CAR"
  | "CUSTOM";

/** ONE_TIME: amount / SPEND_CHANGE: monthlyChange / JOB_CHANGE: incomeChangeRate·gapMonths / MOVE: deposit·monthlyChange·amount */
export type EventType = "ONE_TIME" | "SPEND_CHANGE" | "JOB_CHANGE" | "MOVE";

/** 비상금 먼저 모으기: 0 · 100만 · 200만 · 300만 · 500만 원 중 하나 */
export type EmergencyFirstAmount = 0 | 1_000_000 | 2_000_000 | 3_000_000 | 5_000_000;

export interface Person {
  /** 만 나이 19~39 */
  age: number;
  /** 0~10년, 나이 − 15 이하 */
  careerYears: number;
  /** 비우면 REGULAR */
  employmentType?: EmploymentType;
  /** 무주택 세대주 (v1.7, 선택). 비우면 true. 청약 소득공제 · 월세 세액공제 · 주택드림 비과세 조건 */
  homelessHouseholder?: boolean | null;
}

export interface Income {
  /** 1만~3,000만 원 */
  monthlyNetIncome: number;
  /**
   * 세전 연봉 (v1.7, 선택) 0~10억 원. 비우면 서버가 월 실수령액 × 12 ÷ 0.88로 추정한다.
   * 세전 연봉 × 1.1 ≥ 월 실수령액 × 12 (어기면 income.grossConsistentWithNet)
   */
  annualGrossSalary?: number | null;
}

export interface ExpenseItem {
  /** 20자 이내 */
  name?: string;
  amount: number;
}

export interface ExpenseGroup {
  inputMode: InputMode;
  items?: ExpenseItem[];
  /** TOTAL일 때 합계. 0~3,000만 원 */
  total?: number | null;
}

export interface Expenses {
  fixed: ExpenseGroup;
  variable: ExpenseGroup;
  /**
   * 고정지출 중 월세 (v1.7, 선택) 0원 이상, 비우면 0. 월세 세액공제에만 쓰고 현금흐름에 다시 더하지 않는다.
   * 고정지출보다 크면 expenses.rentWithinFixed
   */
  monthlyRent?: number | null;
}

export interface Assets {
  /** 현금·입출금. 예·적금과 합쳐 10억 원 이하 */
  cash: number;
  /** 예·적금 */
  deposits: number;
  /** 투자 자산 0~10억 원, 비우면 0 */
  investments?: number;
}

export interface SavingPlan {
  /** 월 저축액 0~3,000만 원 */
  monthlySaving: number;
  /** 일반 적금 금리 % (0~10), 비우면 3.03 */
  generalSavingRate?: number;
  /** 월 투자액 0~3,000만 원, 비우면 0 */
  monthlyInvestment?: number;
  /** 비우면 0 */
  emergencyFirstAmount?: EmergencyFirstAmount;
  /*
   * 상품별 배분 (v1.7, 선택, 결과 화면 '배분 바꿔 보기'). 월 저축액 안에서 청년미래 → 청약 → 연금저축 순서로 떼고
   * 남는 돈이 일반 적금이다. 합이 월 저축액보다 크면 뒤 상품을 줄인다 (실제 배분은 응답의 allocation).
   */
  /** 청년미래적금 월 납입 0~50만 원. 비우면 min(월 저축액, 50만 원), 대상이 아니면 0 */
  policyMonthly?: number | null;
  /** 주택청약종합저축 월 납입 0~50만 원 (상품 약관 월 2만~50만, 0은 청약 없음). 비우면 0 */
  housingMonthly?: number | null;
  /** 연금저축 월 납입 0~150만 원 (연금계좌 한도 연 1,800만 원). 비우면 0 */
  pensionMonthly?: number | null;
}

export interface Emergency {
  /** 급할 때 버틸 금액 0~1억 원, 비우면 50만 원 */
  breakThreshold?: number;
}

export interface LoanItem {
  /** 20자 이내, 표시용 */
  name?: string;
  loanType: LoanType;
  /** 남은 원금, 1원 이상 */
  principal: number;
  /** 연 % (0~20). 비우면 종류별 기본값 */
  annualRate?: number | null;
  /** 남은 기간 1~480개월 */
  remainingMonths: number;
  /** 비우면 종류별 기본값 */
  repaymentType?: RepaymentType | null;
}

export interface Loans {
  /** true면 items는 빈 배열이어야 한다 (아니면 LOAN4001) */
  hasNoLoan: boolean;
  items?: LoanItem[];
}

export interface Goal {
  /** 30자 이내, 비우면 '내 목표' */
  name?: string;
  /** 1만~10억 원 */
  targetAmount: number;
  /** startMonth + 12 ~ + 120개월 */
  targetDate: YearMonth;
}

/** 예정된 일 (03 시나리오). 종류마다 쓰는 금액 칸이 다르다 */
export interface PlannedEvent {
  presetKey: PresetKey;
  /** 20자 이내 */
  name?: string;
  /** startMonth부터 0~119개월 */
  occurDate: YearMonth;
  eventType: EventType;
  /** ONE_TIME · MOVE(이사 비용). 0원 이상 */
  amount?: number;
  /** SPEND_CHANGE · MOVE(주거비 변화). 음수 가능 */
  monthlyChange?: number;
  /** JOB_CHANGE 연봉 변화율 % (−90~+200) */
  incomeChangeRate?: number;
  /** JOB_CHANGE 쉬는 기간 0~24개월 */
  gapMonths?: number;
  /** MOVE 자기부담 보증금. 0원 이상 */
  deposit?: number;
}

/** 계산 API에 보내는 완성된 입력 */
export interface SimulationInput {
  /** 계산을 시작하는 달. 처음 입력할 때 그달로 정해 함께 저장한다 */
  startMonth: YearMonth;
  person: Person;
  income: Income;
  expenses: Expenses;
  assets: Assets;
  savingPlan: SavingPlan;
  emergency?: Emergency;
  loans: Loans;
  goal: Goal;
  events?: PlannedEvent[];
}

/** 모든 칸을 비워 둘 수 있는(null 포함) 모양 */
export type Draft<T> = T extends (infer U)[]
  ? Draft<U>[]
  : T extends object
    ? { [K in keyof T]?: Draft<T[K]> | null }
    : T;

/** 입력 중인 값. 화면을 하나씩 채워 가는 동안 simInput.v1에 저장되는 모양 */
export type SimulationInputDraft = Draft<SimulationInput>;

/** 대출 종류별 기본값 (LoanType.java, params.json loanDefaults) */
export const LOAN_DEFAULTS: Record<
  LoanType,
  { label: string; annualRate: number; repaymentType: RepaymentType }
> = {
  STUDENT: { label: "학자금대출", annualRate: 1.7, repaymentType: "EQUAL_PAYMENT" },
  JEONSE: { label: "전세자금대출", annualRate: 4.3, repaymentType: "INTEREST_ONLY" },
  CREDIT: { label: "신용대출", annualRate: 6.3, repaymentType: "EQUAL_PAYMENT" },
  MORTGAGE: { label: "주택담보대출", annualRate: 4.7, repaymentType: "EQUAL_PAYMENT" },
  OTHER: { label: "기타 대출", annualRate: 5.0, repaymentType: "EQUAL_PAYMENT" },
};

export const REPAYMENT_LABELS: Record<RepaymentType, string> = {
  EQUAL_PAYMENT: "원리금균등",
  EQUAL_PRINCIPAL: "원금균등",
  BULLET: "만기일시",
  INTEREST_ONLY: "이자만",
};

export const EMERGENCY_FIRST_OPTIONS: readonly EmergencyFirstAmount[] = [
  0, 1_000_000, 2_000_000, 3_000_000, 5_000_000,
];

/** 서버가 비운 칸에 넣는 기본값 (청년미래적금 배분은 월 저축액에 따라 달라서 여기 없음) */
export const INPUT_DEFAULTS = {
  employmentType: "REGULAR" as EmploymentType,
  homelessHouseholder: true,
  investments: 0,
  generalSavingRate: 3.03,
  monthlyInvestment: 0,
  emergencyFirstAmount: 0 as EmergencyFirstAmount,
  breakThreshold: 500_000,
  monthlyRent: 0,
  housingMonthly: 0,
  pensionMonthly: 0,
  goalName: "내 목표",
} as const;
