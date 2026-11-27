/**
 * 계산 API의 요청·응답
 * (/simulate · /simulate/preview · /compare · /reverse · /robust · /allocations/recommend · /reports · /meta).
 * 기준: 백엔드 GitHub main(v1.7, 11/8 PR #3)의 DTO(simulation/dto · report/dto)와 v1.7 정답 파일(analysis_golden.json, 11개 입력),
 * docs/tasks/tax-module-v1.7/api-changes.md, 노션 API 명세.
 * 정답 파일에만 있는 값, 명세에만 있는 값, v1.7에서 생긴 응답 칸(v1.6 백엔드에는 없음)은 선택(?) 필드로 두었다.
 *
 * 단위: 금액은 원, 확률·비율은 % (소수 1자리), 연월은 "YYYY-MM". "모은 돈"은 대출 잔액을 빼지 않는다.
 */
import type { ApiWarning, ValidateSummary } from "./api";
import type { EmergencyFirstAmount, LoanType, PlannedEvent, SimulationInput, YearMonth } from "./input";

/** 그 달 모은 돈의 5%·10%·50%·90% 분위 (p5 = 최악의 경우) */
export interface Quantiles {
  p5: number;
  p10: number;
  p50: number;
  p90: number;
}

// ===== POST /api/simulate =====

export interface SimulateRequest {
  input: SimulationInput;
  /** 결과 화면 '계획 바꿔 보기' 막대에서 바꾼 값. 있으면 바꾼 계획으로 계산한다 (/simulate · /simulate/story) */
  adjustments?: Adjustments;
  /** 비우면 20261007 */
  seed?: number | null;
}

/** 1·3·5·10년 뒤 */
export interface Checkpoint extends Quantiles {
  afterMonths: number;
}

/** 0~120개월, 121개 */
export interface Band extends Quantiles {
  month: YearMonth;
}

export interface GoalResult {
  targetAmount: number;
  /** 명세 예시에만 있음 */
  targetDate?: YearMonth;
  goalMonths: number;
  /** 목표 시점에 목표 이상인 경로 수 (정답 파일) */
  hits?: number;
  probability: number;
  /** √(p(1−p)/N), %p */
  probabilityError: number;
  medianReachMonths?: number | null;
  /** 처음 목표에 닿는 달의 중앙값. 끝까지 못 닿으면 null */
  medianReachDate: YearMonth | null;
  reach70Months?: number | null;
  /** 달성 확률이 처음 70%를 넘는 달. 120개월 안에 못 넘으면 null */
  reach70Date: YearMonth | null;
}

/** 무작위 요소를 모두 끈 한 경로 = 계산기 결과 */
export interface DeterministicResult {
  atGoal: number;
  at120: number;
}

export interface DebtRisk {
  count?: number;
  /** 목표 시점까지 한 번이라도 모은 돈이 0 아래로 내려가는 확률 */
  probability: number;
  medianFirstMonths?: number | null;
  /** 그런 경로에서 처음 내려가는 달의 중앙값 */
  medianFirstDate: YearMonth | null;
  /** 목표 시점의 하위 5% */
  worstCaseAtGoal: number;
}

/** 청년미래적금 첫 계좌 기준. 비대상이면 eligible=false와 나머지 null */
export interface PolicySavingRisk {
  eligible: boolean;
  earlyTerminationCount?: number | null;
  /** 36개월 안에 일반해지할 확률 */
  earlyTerminationProbability: number | null;
  /** 실제로 받은 정부 지원금 평균 (원) */
  expectedSubsidy: number | null;
}

export interface CauseCounts {
  unemployment: number;
  prolongedUnemployment: number;
  emergencyExpense: number;
  chronicDeficit: number;
}

/** 적금을 처음 깬 이유의 비율 (합 100%) */
export interface Causes extends CauseCounts {
  counts?: CauseCounts;
}

/** 그래프 위 예정된 일 마커 (명세에는 있지만 정답 파일에는 없음, 구현 명세 9.3) */
export interface EventMarker {
  name: string;
  month: YearMonth;
}

/** 월 저축액을 실제로 나눈 결과 (원). 청년미래 → 청약 → 연금저축 순서로 떼고 남는 돈이 일반 적금 */
export interface Allocation {
  policyMonthly: number;
  housingMonthly: number;
  pensionMonthly: number;
  generalMonthly: number;
}

/**
 * 세금 (v1.7). 목표 시점까지, 미래 2,000개의 평균 (원).
 * 돌려받는 세금은 청약 · 연금저축 · 월세가 없을 때와의 차이다 (매년 2월 연말정산).
 */
export interface TaxResult {
  /** 돌려받는 세금 합계 */
  refundTotal: number;
  /** 돌려받는 세금 연평균 */
  refundPerYear: number;
  /** 낸 이자소득세 (일반 적금 · 청약 · 청년미래 일반해지) */
  interestTax: number;
  /** 청약을 5년 안에 해지해서 도로 낸 소득공제분 */
  clawback: number;
  /** 연금저축 중도 인출 기타소득세 16.5% */
  pensionTax: number;
  /** refundTotal − interestTax − clawback − pensionTax */
  netBenefit: number;
  /** 목표 시점까지 청약을 깰 확률 (%). 청약이 없으면 null */
  housingBreakProbability: number | null;
  /** 목표 시점까지 연금저축을 깰 확률 (%). 연금저축이 없으면 null */
  pensionBreakProbability: number | null;
  allocation: Allocation;
}

export interface SimulateResult {
  seed: number;
  paths: number;
  modelVersion?: string;
  startMonth: YearMonth;
  /** 결과 화면 첫 문장. 그대로 보여 준다 */
  headline: string;
  goal: GoalResult;
  deterministic: DeterministicResult;
  checkpoints: Checkpoint[];
  bands: Band[];
  risks: {
    debt: DebtRisk;
    policySaving: PolicySavingRisk;
  };
  causes: Causes;
  /** v1.7부터 (v1.6 백엔드에는 없음) */
  tax?: TaxResult;
  eventMarkers?: EventMarker[];
  warnings?: ApiWarning[];
}

// ===== 계획 조정값 (preview · compare · robust · reports) =====

/** '지금 계획'에 덮어쓸 값만 담는다 */
export interface Adjustments {
  monthlyNetIncome?: number;
  monthlyFixedExpense?: number;
  monthlyVariableExpense?: number;
  monthlySaving?: number;
  monthlyInvestment?: number;
  emergencyFirstAmount?: EmergencyFirstAmount;
  breakThreshold?: number;
  goalTargetAmount?: number;
  goalTargetDate?: YearMonth;
  /** 목록 전체 교체 */
  events?: PlannedEvent[];
  /** v1.7 배분 바꿔 보기 → savingPlan.policyMonthly */
  policyMonthly?: number;
  /** → savingPlan.housingMonthly */
  housingMonthly?: number;
  /** → savingPlan.pensionMonthly */
  pensionMonthly?: number;
}

/** 변경 요약 한 줄 (Change.java) */
export interface Change {
  field: string;
  label: string;
  before: number | string;
  after: number | string;
  delta: number;
}

// ===== POST /api/simulate/preview =====

export interface PreviewRequest {
  input: SimulationInput;
  adjustments: Adjustments;
  seed?: number | null;
}

export interface PlanSnapshot {
  probability: number;
  reach70Date: YearMonth | null;
  /** 1년, 2년, … 목표 시점까지 모은 돈 중앙값 */
  yearlyP50: number[];
}

export type ComparisonMetric =
  | "PROBABILITY"
  | "DEBT_PROBABILITY"
  | "WORST_CASE_AT_GOAL"
  | "EARLY_TERMINATION"
  | "EXPECTED_SUBSIDY";

/** 청년미래적금 비대상이면 EARLY_TERMINATION · EXPECTED_SUBSIDY 값이 모두 null */
export interface ComparisonRow {
  metric: ComparisonMetric;
  current: number | null;
  adjusted: number | null;
  diff: number | null;
}

/** |z| ≥ 1.96 그리고 |차이| ≥ 2%p 이면 meaningful */
export interface Significance {
  z: number;
  meaningful: boolean;
  rule?: string;
}

export interface PreviewResult {
  seed?: number;
  /** 정답 파일에만 있음 (요청한 조정값) */
  adjustments?: Adjustments;
  current: PlanSnapshot;
  adjusted: PlanSnapshot;
  table: ComparisonRow[];
  significance: Significance;
  changes?: Change[];
}

// ===== POST /api/compare =====

export interface PlanRequest {
  /** 20자 이내 (PlanSpec, 넘으면 COMMON400 "plans[0].name"). 담은 계획은 plan.ts의 planRequests로 줄여 보낸다 */
  name: string;
  adjustments: Adjustments;
}

export interface CompareRequest {
  input: SimulationInput;
  /** 1~3개 (아니면 SIM4003) */
  plans: PlanRequest[];
  seed?: number | null;
}

export interface ComparePlanResult {
  name: string;
  /** 첫 항목은 항상 '지금 계획' */
  isBase: boolean;
  /** 정답 파일에만 있음 (요청한 조정값). 서버 응답에는 없다 */
  adjustments?: Adjustments;
  diffFromBase: number;
  z: number | null;
  meaningful: boolean | null;
  probability: number;
  reach70Date: YearMonth | null;
  debtProbability: number;
  worstCaseAtGoal: number;
  earlyTerminationProbability: number | null;
  expectedSubsidy: number | null;
  yearlyP50: number[];
  /** v1.7: 목표 시점에 모은 돈 중간값 */
  medianAtGoal?: number;
  /** v1.7: 세금 순이득 (/simulate의 tax.netBenefit) */
  taxNetBenefit?: number;
  /** v1.7: 실제 월 배분 */
  allocation?: Allocation;
}

export interface CompareResult {
  seed?: number;
  goalMonths: number;
  plans: ComparePlanResult[];
}

// ===== POST /api/reverse =====

export interface ReverseRequest {
  input: SimulationInput;
  /** 기본 70, 50~95 */
  targetProbability?: number;
  seed?: number | null;
}

export type LeverType =
  | "REDUCE_VARIABLE_EXPENSE"
  | "DELAY_GOAL"
  | "LOWER_GOAL"
  | "EMERGENCY_FIRST"
  | "REDUCE_SAVING";

/** '이렇게 바꿔 보세요' 한 줄. 확률이 많이 오르는 순서 */
export interface Lever {
  type: LeverType;
  label: string;
  probability: number;
  diff: number;
  /** 차이가 2%p 미만 → '거의 차이 없음' */
  flat: boolean;
}

export interface ReverseResult {
  seed?: number;
  currentProbability: number;
  targetProbability: number;
  monthlySurplus: number;
  requiredVariableExpenseCut: {
    amount: number | null;
    probability: number | null;
    searched?: string;
  };
  requiredMonthlySaving: {
    amount: number | null;
    maxProbability: number | null;
    atAmount: number | null;
    grid: { amount: number; probability: number }[];
    searched?: string;
    reason?: string;
    note?: string;
  };
  requiredPeriod: {
    months: number | null;
    reach70Date: YearMonth | null;
  };
  /** 비상금 0·100·200·300·500만 원을 먼저 모은 뒤 적금을 시작하는 전략별 비교 */
  emergencyStrategies: {
    amount: number;
    probability: number;
    earlyTerminationProbability: number | null;
    expectedSubsidy: number | null;
  }[];
  levers: Lever[];
}

// ===== POST /api/robust → GET /api/robust/{jobId} =====

export interface RobustRequest {
  input: SimulationInput;
  /** 0~3개. 보내면 결론 유지 횟수를 계산 */
  plans?: PlanRequest[];
}

export type RobustStatus = "RUNNING" | "DONE" | "FAILED";

/** HTTP 202 */
export interface RobustStartResult {
  jobId: string;
  status: RobustStatus;
  trials: number;
}

export interface RobustPlanResult {
  name: string;
  diffMedian: number;
  diffLow: number;
  diffHigh: number;
  /** 60번 중 결론(차이의 방향)이 유지된 횟수 */
  conclusionKept: number;
  trials: number;
}

/** RUNNING이면 progress(0~100)만 있고 결과 필드는 null */
export interface RobustJobResult {
  jobId: string;
  status: RobustStatus;
  progress: number;
  trials: number;
  pathsPerTrial?: number;
  probability: { median: number; low: number; high: number; range?: string } | null;
  plans: RobustPlanResult[] | null;
  message: string | null;
}

// ===== POST /api/allocations/recommend (v1.7) =====

export interface RecommendRequest {
  input: SimulationInput;
}

/** 배분 하나를 같은 미래 2,000개로 계산한 결과. 세금 · 지원금은 목표 시점까지 평균 (원) */
export interface AllocationOption {
  allocation: Allocation;
  /** 목표 시점에 목표 이상인 경로 수 */
  hits: number;
  probability: number;
  /** 세금 순이득 (/simulate의 tax.netBenefit과 같은 계산) */
  taxNetBenefit: number;
  /** 청년미래적금 정부 지원금 */
  subsidy: number;
  /** taxNetBenefit + subsidy */
  totalBenefit: number;
  /** 청년미래적금을 일반해지할 확률. 청년미래에 넣지 않으면 null */
  policyBreakProbability: number | null;
  /** 지금 배분과의 확률 차이 (%p) */
  diffFromBase: number;
}

/**
 * 청년미래 0~50만(10만 간격) · 청약 0·10·25만 · 연금저축 0·10·20·30·50만 중 합이 월 저축액 이하인 배분을 모두 계산.
 * 지원금은 목표 시점까지라 /simulate의 risks.policySaving.expectedSubsidy(48개월)와 다를 수 있다.
 */
export interface RecommendResult {
  monthlySaving: number;
  /** 계산한 배분 수 */
  evaluated: number;
  /** 지금 입력의 배분 */
  current: AllocationOption;
  /** 목표 달성 수가 가장 많은 배분 (같으면 totalBenefit이 큰 쪽) */
  bestProbability: AllocationOption;
  /** totalBenefit이 가장 큰 배분. 단 목표 달성 확률이 지금보다 2%p 넘게 줄지 않는 것 중에서 */
  bestBenefit: AllocationOption;
  /** 고른 규칙 (화면에 그대로) */
  rule: string;
}

// ===== POST /api/reports (v1.7) =====

export interface ReportRequest {
  input: SimulationInput;
  /** 0~3개. 보내면 comparison에 /compare와 같은 줄이 들어간다 */
  plans?: PlanRequest[];
  /** 비우면 20261007 (목업은 20261007만) */
  seed?: number | null;
}

/**
 * 리포트 한 장에 들어갈 숫자 전부. 각 칸은 다른 API 결과 그대로다
 * (전망 · 위험 · 원인 · 세금 = /simulate, levers = /reverse 상위 3개, comparison = /compare, parameters = /meta).
 * PDF는 서버가 만들지 않는다. 화면이 인쇄용으로 그리고 브라우저 인쇄(PDF로 저장)를 쓴다.
 */
export interface ReportResult {
  /** 서울 시각 "YYYY-MM-DDTHH:mm:ss" */
  generatedAt: string;
  seed: number;
  modelVersion: string;
  startMonth: YearMonth;
  inputSummary: ValidateSummary;
  headline: string;
  goal: GoalResult;
  forecast: {
    checkpoints: Checkpoint[];
    deterministicAtGoal: number;
  };
  risks: SimulateResult["risks"];
  causes: Causes;
  tax: TaxResult;
  levers: Lever[];
  /** plans를 안 보내면 빈 목록. 첫 줄은 '지금 계획' */
  comparison: ComparePlanResult[];
  parameters: MetaParameter[];
  warnings: ApiWarning[];
  disclaimer: string;
}

// ===== GET /api/meta =====

/** A 법령·제도 / B 공공통계 직접 / C 공공통계를 모델로 변환 / D 보정 / E 가정 */
export type EvidenceGrade = "A" | "B" | "C" | "D" | "E";

export interface MetaParameter {
  key: string;
  label: string;
  value: string;
  /** 두 등급이 섞이면 "D·E"처럼 온다 */
  grade: EvidenceGrade | (string & {});
  source: string;
  asOf: string | null;
  /** params.json에서 이 값이 있는 곳 (예: "params.unemp.exit_m") */
  paths?: string[];
}

export interface MetaResult {
  modelVersion: string;
  paths: number;
  defaultSeed: number;
  horizonMonths: number;
  /** 사용자가 바꿀 수 있는 입력. 지금은 일반 적금 금리 하나 */
  editableInputs: string[];
  /** 등급 글자(A~E) → 뜻 */
  gradeLegend?: Record<string, string>;
  parameters: MetaParameter[];
  validation?: Record<string, string>;
  /** 비운 금리 칸에 서버가 넣는 값. 백엔드 금리 자동 갱신(market-rates) 전 버전에는 없다 */
  defaultRates?: DefaultRates;
}

/**
 * 비운 금리 칸에 서버가 넣는 값 (연 %): 일반 적금, 대출 종류별.
 * 백엔드에 ECOS 키가 있으면 한국은행 최신 금리이고 asOf가 그 기준 달, 코드 기본값이면 asOf는 null
 */
export interface DefaultRates {
  generalSavingRate: number;
  loanRates: Record<LoanType, number>;
  asOf: YearMonth | null;
  source: string;
}

// ===== POST /api/simulate/story (데모 '미래 다시 보기') =====

export type StoryKind = "BEST" | "MIDDLE" | "WORST";

export type StoryShockType = "CEREMONY" | "MEDICAL" | "TRAFFIC_ACCIDENT";
export type StoryShockLabel = "경조사비" | "병원비" | "교통사고 자기부담금";

export type StoryEvent =
  | "JOB_LOSS"
  | "REHIRE"
  | "SHOCK"
  | "PLANNED"
  | "REFUND"
  | "BREAK_GENERAL"
  | "BREAK_HOUSING"
  | "BREAK_POLICY"
  | "BREAK_POLICY_SPECIAL"
  | "BREAK_PENSION"
  | "MATURE_POLICY"
  | "REJOIN_POLICY"
  | "OVERDRAFT"
  | "DEBT_CLEARED"
  | "GOAL_REACHED";

/** 한 달 (원). balances의 청약 · 연금저축은 지금 깨면 받는 세후 금액, overdraft는 빌린 돈 */
export interface StoryMonth {
  /** 지금부터 몇 달 뒤 상태 (1~120, bands의 칸 번호) */
  afterMonths: number;
  /** 그 일이 일어난 달 */
  month: YearMonth;
  employed: boolean;
  unemploymentBenefit: boolean;
  events: StoryEvent[];
  salary: number;
  income: number;
  living: number;
  shock: number;
  shockType: StoryShockType | null;
  shockLabel: StoryShockLabel | null;
  planned: number;
  loan: number;
  refund: number;
  subsidy: number;
  received: number;
  taxPaid: number;
  deposits: { policy: number; housing: number; pension: number; general: number; invest: number };
  balances: { cash: number; overdraft: number; policy: number; housing: number; pension: number; general: number; invest: number; deposit: number };
  total: number;
  /** 그해 물가 상승률 (%) */
  inflation: number;
}

export interface Story {
  kind: StoryKind;
  quantile: number;
  path: number;
  atGoal: number;
  reached: boolean;
  months: StoryMonth[];
}

export interface StoryResult {
  seed: number;
  paths: number;
  startMonth: YearMonth;
  goalMonths: number;
  targetAmount: number;
  stories: Story[];
}

// ===== 받을 수 있는 혜택 (POST /benefits) =====

/** 혜택 판정에만 쓰는 선택 질문. 모두 비워도 된다 (null · 없음 = 모름). 계산 입력과 따로 저장한다 */
export interface Eligibility {
  /** 부모님과 따로 사나요 */
  livingApart?: boolean | null;
  /** 지금 회사가 중소기업인가요 */
  sme?: boolean | null;
  /** 지금 회사에 들어간 달 YYYY-MM */
  hireMonth?: YearMonth | null;
  /** 이미 중소기업 소득세 감면을 받고 있나요 */
  taxReliefNow?: boolean | null;
  /** 군 복무 개월 0~120 */
  militaryMonths?: number | null;
  /** 부모님 가구 소득 중위 100% 이하 · 재산 4.7억 이하인가요 */
  parentsIncomeLow?: boolean | null;
  /** 지금 집 보증금 (원) */
  rentDeposit?: number | null;
  /** 한 달 대중교통비 (원) */
  monthlyTransit?: number | null;
}

export type EligibilityKey = keyof Eligibility;

export interface BenefitsRequest {
  input: SimulationInput;
  adjustments?: Adjustments;
  eligibility?: Eligibility;
  seed?: number;
}

/** 받아요 · 확인해 보세요 · 실직하면 · 못 받아요 (서버가 이 순서로 보낸다) */
export type BenefitStatus = "YES" | "CHECK" | "LATER" | "NO";
export type BenefitCategory = "CASH" | "TAX" | "SAVING" | "LOAN" | "SAFETY";

export interface BenefitEffect {
  /** 받으면 목표 달성 가능성 % */
  probability: number;
  /** 지금(바꾼) 계획보다 몇 %p */
  diff: number;
  /** 계산에 넣은 가정 한 줄 */
  assumption: string | null;
}

export interface BenefitItem {
  key: string;
  name: string;
  category: BenefitCategory;
  status: BenefitStatus;
  /** 받는 돈 한 줄 (모르면 null) */
  amount: string | null;
  /** 카드에 바로 보이는 짧은 한 줄 (판정 이유) */
  summary: string;
  /** 자세한 설명 ('자세히'를 눌러야 보인다) */
  detail: string;
  /** 어디서 · 언제 신청하는지 */
  how: string;
  /** 더 알려 주면 판정이 정확해지는 질문 */
  ask: EligibilityKey[];
  effect: BenefitEffect | null;
  /** 2027년에 바뀔 수 있는 내용 (확정 전) */
  notice: string | null;
  sources: { title: string; url: string | null }[];
}

export interface BenefitsResult {
  /** 규칙표(benefits.json) 기준일 */
  asOf: string;
  /** 지금(바꾼) 계획의 목표 달성 가능성 % */
  probability: number;
  /** 연말정산으로 매년 돌려받는 돈 (원, 없으면 null) */
  refundPerYear: number | null;
  items: BenefitItem[];
}
