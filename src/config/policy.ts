/**
 * 제도 숫자 · 기본값 가운데 서버(API)가 주지 않는 것만 여기 모아요. 값마다 출처를 적어 두었어요.
 *
 * 서버가 주는 값은 여기 두지 않고 API 응답을 그대로 써요:
 *   입력 검사 요약(매달 남는 돈 등) · 청년미래적금 대상 판정과 이유 · 지원금 없음 안내 = /inputs/validate,
 *   근거와 가정값 = /meta, 예정된 일 기본 금액 = /events/presets, 결과의 경로 수 = /simulate의 paths.
 * 여기 값은 화면 안내 문장, 빈 칸의 placeholder, 목업이 서버와 같은 기준을 쓰는 데만 써요. 계산은 서버가 해요.
 * 백엔드 값이 바뀌면 출처 파일을 확인하고 여기와 출처 줄을 같이 고쳐요 (src/config/policy.test.ts가 일부를 대조해요).
 */
import type { EmergencyFirstAmount, EmploymentType, LoanType, RepaymentType } from "@/lib/types";

/**
 * 서버가 비운 칸에 넣는 기본값.
 * 출처: 백엔드 SimulationInput.java (record의 기본값), 일반 적금 금리는 params.json general.rate
 */
export const INPUT_DEFAULTS = {
  employmentType: "REGULAR" as EmploymentType,
  homelessHouseholder: true,
  investments: 0,
  /** 연 %, 2025년 은행 정기적금 평균 (params.json general.rate, /meta의 rates) */
  generalSavingRate: 3.03,
  monthlyInvestment: 0,
  emergencyFirstAmount: 0 as EmergencyFirstAmount,
  /** 급할 때 버틸 금액 (원) */
  breakThreshold: 500_000,
  monthlyRent: 0,
  housingMonthly: 0,
  pensionMonthly: 0,
  goalName: "내 목표",
} as const;

/** 일반 적금 금리 기본값의 근거 (화면 안내용) */
export const GENERAL_SAVING_RATE_BASIS = "2025년 은행 정기적금 평균";

/** 비상금 먼저 모으기 선택지 (원). 출처: SimulationInput.java SavingPlan.EMERGENCY_FIRST_OPTIONS */
export const EMERGENCY_FIRST_OPTIONS: readonly EmergencyFirstAmount[] = [0, 1_000_000, 2_000_000, 3_000_000, 5_000_000];

/** 대출 종류별 기본값. 금리 · 상환 방식을 비우면 서버가 이 값을 쓴다. 출처: LoanType.java, params.json loanDefaults */
export const LOAN_DEFAULTS: Record<LoanType, { label: string; annualRate: number; repaymentType: RepaymentType }> = {
  STUDENT: { label: "학자금대출", annualRate: 1.7, repaymentType: "EQUAL_PAYMENT" },
  JEONSE: { label: "전세자금대출", annualRate: 4.3, repaymentType: "INTEREST_ONLY" },
  CREDIT: { label: "신용대출", annualRate: 6.3, repaymentType: "EQUAL_PAYMENT" },
  MORTGAGE: { label: "주택담보대출", annualRate: 4.7, repaymentType: "EQUAL_PAYMENT" },
  OTHER: { label: "기타 대출", annualRate: 5.0, repaymentType: "EQUAL_PAYMENT" },
};

/** 상환 방식 이름. 출처: RepaymentType.java */
export const REPAYMENT_LABELS: Record<RepaymentType, string> = {
  EQUAL_PAYMENT: "원리금균등",
  EQUAL_PRINCIPAL: "원금균등",
  BULLET: "만기일시",
  INTEREST_ONLY: "이자만",
};

/**
 * 청년미래적금 기준. 대상인지 · 얼마를 넣는지는 서버(/inputs/validate의 policySaving)가 판정한다.
 * 여기 값은 판정 전 안내 문장과 목업에만 쓴다.
 * 출처: InputValidationService.java (v1.7), params.json policy (age_max · gross_max_y · match_gross_max_y · cap),
 *       정부 지원금 소득 기준은 우리은행 상품설명서 (/meta의 youthFutureMatchIncome)
 */
export const YOUTH_FUTURE_SAVING = {
  /** 만 나이 이 값까지 가입 */
  maxAge: 34,
  /** 총급여 이 값까지 가입 (원) */
  maxGrossSalary: 75_000_000,
  /** 총급여 이 값까지만 정부 지원금 (원, v1.7) */
  matchMaxGrossSalary: 60_000_000,
  /** 월 납입 한도 (원). 배분을 비우면 min(월 저축액, 이 값) */
  monthlyLimit: 500_000,
  /** 세전 연봉을 비우면 총급여 = 월 실수령액 × 12 ÷ 이 값 */
  netToGrossRatio: 0.88,
} as const;

/** 시뮬레이션 경로 수. 결과가 오기 전 안내 문장에만 쓴다 (결과 화면은 /simulate의 paths). 출처: params.json simulation.paths */
export const SIMULATION_PATHS = 2_000;

/**
 * 월세 세액공제 (v1.7). 돌려받는 세금은 서버가 연말정산으로 계산하고, 여기 값은 01-1 '그중 월세' 안내 문장에만 쓴다.
 * 출처: 백엔드 engine/YearEndTax.java — 무주택 세대주 · 총급여 8,000만 원 이하면
 *       min(연 월세, 1,000만 원) × 17% (총급여 5,500만 원 초과면 15%). /meta의 yearEndTax(근거 A)
 */
export const RENT_TAX_CREDIT = {
  /** 총급여 이 값까지 공제 (원) */
  maxGrossSalary: 80_000_000,
  /** 공제받는 연 월세 한도 (원) */
  annualRentCap: 10_000_000,
  /** 공제율 %: 총급여 lowerRateFromGross 이하면 high, 넘으면 low */
  highRate: 17,
  lowRate: 15,
  lowerRateFromGross: 55_000_000,
} as const;
