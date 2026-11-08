/**
 * API 공통 모양과 입력 쪽 API(입력 검사 · 대출 상환액 · 프리셋 · 예시)의 요청·응답.
 * 기준: v1.7 합본 백엔드의 DTO(…/dto/*.java)와 API_CHANGES_v1.7.md, 노션 「선빈 api 명세서」.
 */
import type {
  EventType,
  InputStep,
  LoanType,
  PresetKey,
  RepaymentType,
  SimulationInput,
  SimulationInputDraft,
} from "./input";

/** 모든 API가 돌려주는 공통 응답 (ApiResponse.java) */
export interface ApiResponse<T> {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
}

/** COMMON400일 때 result: 칸 경로 → 사용자에게 보여 줄 문장. 예) { "person.age": "19~39 사이로 입력해 주세요" } */
export type FieldErrorMap = Record<string, string>;

/** ErrorStatus.java */
export type ErrorCode =
  | "COMMON400"
  | "COMMON404"
  | "COMMON500"
  | "INPUT4001"
  | "LOAN4001"
  | "GOAL4001"
  | "GOAL4002"
  | "EVENT4001"
  | "EVENT4002"
  | "EVENT4004"
  | "SIM4003"
  | "JOB404"
  | "JOB4001";

/** 프론트에서만 쓰는 오류 코드 */
export type ClientErrorCode =
  | "NETWORK"
  | "BACKEND_UNAVAILABLE"
  | "BAD_RESPONSE"
  | "MOCK_UNAVAILABLE";

export type WarningCode =
  | "WARN_EXPENSE_OVER_INCOME"
  | "WARN_MONTHLY_SHORTFALL"
  | "WARN_GOAL_ALREADY_MET"
  | "INFO_POLICY_INELIGIBLE"
  /** v1.7: 청년미래적금 가입은 되지만 총급여가 정부 지원금 기준을 넘음 */
  | "INFO_POLICY_NO_MATCH";

/** 계산을 막지 않는 경고·안내 (Warning.java) */
export interface ApiWarning {
  code: WarningCode | (string & {});
  message: string;
}

// ===== POST /api/inputs/validate =====

export interface ValidateRequest {
  /** 검사 범위에는 영향 없음. 응답에 그대로 돌아온다 */
  step?: InputStep;
  /** 들어온 값만 검사한다. 빈 칸은 오류가 아니다 */
  input: SimulationInputDraft;
}

/** 확정 합계 (원). 계산에 필요한 값이 아직 없으면 null */
export interface ValidateSummary {
  monthlyNetIncome: number | null;
  fixedTotal: number | null;
  variableTotal: number | null;
  /** 첫 달 대출 상환액 합계 */
  monthlyLoanPayment: number | null;
  /** 매달 남는 돈 = 실수령액 − 고정 − 변동 − 대출 상환 */
  monthlySurplus: number | null;
  monthlySaving: number | null;
  /** 현금 + 예적금 + 투자 */
  totalAssets: number | null;
  totalLoanBalance: number | null;
}

/** 청년미래적금 자격과 월 저축액 배분 */
export interface PolicySavingAllocation {
  eligible: boolean;
  /** 대상이 아니면 이유, 대상이면 null */
  reason: string | null;
  /** 청년미래적금으로 넣는 돈 */
  policyMonthly: number;
  /** 일반 적금으로 넣는 돈 (v1.7: 청년미래 → 청약 → 연금저축을 떼고 남는 돈) */
  generalMonthly: number;
}

export interface ValidateResult {
  step: InputStep | null;
  summary: ValidateSummary;
  /** 나이·실수령액·저축액이 다 있어야 나온다 */
  policySaving: PolicySavingAllocation | null;
  warnings: ApiWarning[];
}

// ===== POST /api/loans/repayment-preview =====

export interface RepaymentPreviewRequest {
  loanType: LoanType;
  principal: number;
  /** 비우면 종류별 기본 금리 */
  annualRate?: number | null;
  remainingMonths: number;
  /** 비우면 종류별 기본 상환 방식 */
  repaymentType?: RepaymentType | null;
}

/** 대출 한 건의 상환 요약 (원) */
export interface RepaymentPreviewResult {
  firstMonthPayment: number;
  firstMonthPrincipal: number;
  firstMonthInterest: number;
  lastMonthPayment: number;
  totalInterest: number;
}

// ===== GET /api/events/presets =====

/** 예정된 일 한 건의 기본값. 종류에 맞는 칸만 온다 */
export interface EventTemplate {
  eventType: EventType;
  amount?: number;
  monthlyChange?: number;
  incomeChangeRate?: number;
  gapMonths?: number;
  deposit?: number;
}

export interface EventPreset {
  presetKey: PresetKey;
  name: string;
  /** 기본 금액의 근거 (지금은 모두 가정값) */
  basis: string;
  /** 자동차처럼 한 프리셋이 일 여러 개를 만들 수 있다 */
  events: EventTemplate[];
}

export interface PresetsResult {
  presets: EventPreset[];
}

// ===== GET /api/examples =====

export type ExampleKey = "S1" | "S2" | "S3";

export interface ExampleInput {
  key: ExampleKey | (string & {});
  /** 화면에 보이는 이름 */
  label: string;
  /** 이 값으로 /simulate를 부른다. 내 입력(simInput.v1)에는 저장하지 않는다 */
  input: SimulationInput;
}

export interface ExamplesResult {
  examples: ExampleInput[];
}
