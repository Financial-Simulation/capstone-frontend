/**
 * 계산 API의 요청·응답 (/simulate · /simulate/preview · /compare · /reverse · /robust · /meta).
 * 백엔드에 아직 없어서 engine/analysis_golden.json(정답 파일)과 노션 API 명세를 기준으로 했다.
 * 정답 파일에만 있는 값, 명세에만 있는 값은 선택(?) 필드로 두었다.
 *
 * 단위: 금액은 원, 확률·비율은 % (소수 1자리), 연월은 "YYYY-MM". "모은 돈"은 대출 잔액을 빼지 않는다.
 */
import type { ApiWarning } from "./api";
import type { EmergencyFirstAmount, PlannedEvent, SimulationInput, YearMonth } from "./input";

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
  /** 20자 이내 */
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

// ===== GET /api/meta =====

/** A 법령·제도 / B 공공통계 직접 / C 공공통계를 모델로 변환 / D 보정 / E 가정 */
export type EvidenceGrade = "A" | "B" | "C" | "D" | "E";

export interface MetaParameter {
  key: string;
  label: string;
  value: string;
  grade: EvidenceGrade;
  source: string;
  asOf: string | null;
}

export interface MetaResult {
  modelVersion: string;
  paths: number;
  defaultSeed: number;
  horizonMonths: number;
  /** 사용자가 바꿀 수 있는 입력. 지금은 일반 적금 금리 하나 */
  editableInputs: string[];
  gradeLegend?: Partial<Record<EvidenceGrade, string>>;
  parameters: MetaParameter[];
  validation?: Record<string, string>;
}
