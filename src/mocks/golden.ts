/**
 * 정답 파일(engine/analysis_golden.json v1.7) 읽기와 '같은 입력' 찾기.
 *
 * 11개 입력(S1~S3 예시, E1~E5 경계, T1~T3 세금)마다 /simulate · preview · compare · reverse · robust ·
 * allocations/recommend 응답이 API 모양 그대로 들어 있다. seed가 같아서 백엔드 숫자가 이 파일과 똑같아야 한다.
 *
 * '같은 입력'은 계산 엔진이 실제로 쓰는 값으로 비교한다. 이름·표시용 칸·입력 방식(합계/항목별)은 보지 않고,
 * 서버가 채우는 기본값(일반 적금 금리 3.03, 무주택 세대주 예, 청년미래 min(월 저축액, 50만 원) 등)은 채운 뒤 비교한다.
 *
 * 엔진은 기준 달부터 센 개월 수(t)만 쓴다 (구현 명세 5.3: '연초'도 t mod 12 = 0, 달력의 1월이 아니다).
 * 그래서 목표 · 예정된 일은 기준 달부터 몇 개월 뒤인지로 비교하고, 기준 달이 다르면 응답의 연월만 그만큼 옮긴다.
 * (10월에 S1 값을 직접 넣어도 정답 S1과 같은 숫자, 날짜만 한 달 앞)
 */
import type {
  Adjustments,
  CompareResult,
  PreviewResult,
  RecommendResult,
  ReverseResult,
  RobustPlanResult,
  SimulateResult,
  SimulationInput,
  SimulationInputDraft,
} from "@/lib/types";
import { INPUT_DEFAULTS, LOAN_DEFAULTS, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { resolvedExpenseTotal } from "@/lib/rules";
import { addMonths, isYearMonth, monthsBetween } from "@/lib/year-month";
import goldenData from "./data/analysis_golden.json";

export interface GoldenRobust {
  trials: number;
  pathsPerTrial: number;
  probability: { median: number; low: number; high: number };
  plans: RobustPlanResult[];
  message: string;
}

export interface GoldenCase {
  key: string;
  note: string;
  input: SimulationInput;
  simulate: SimulateResult;
  preview: PreviewResult & { adjustments: Adjustments };
  compare: CompareResult;
  reverse: ReverseResult;
  robust: GoldenRobust;
  recommend: RecommendResult;
}

interface GoldenFile {
  seed: number;
  paths: number;
  horizon: number;
  cases: GoldenCase[];
}

export const GOLDEN = goldenData as unknown as GoldenFile;

const n = (value: number | null | undefined): number | null => (value == null ? null : Number(value));

/** 엔진이 쓰는 값만 뽑은 비교용 문자열 */
export function engineKey(input: SimulationInputDraft): string {
  const loans = input.loans?.hasNoLoan
    ? []
    : (input.loans?.items ?? []).map((loan) => {
        const defaults = loan?.loanType ? LOAN_DEFAULTS[loan.loanType] : null;
        return {
          principal: n(loan?.principal),
          rate: n(loan?.annualRate ?? defaults?.annualRate),
          months: n(loan?.remainingMonths),
          method: loan?.repaymentType ?? defaults?.repaymentType ?? null,
        };
      });

  // 기준 달부터 몇 개월 뒤인지 (엔진이 쓰는 값)
  const start = isYearMonth(input.startMonth) ? input.startMonth : null;
  const offset = (ym: string | null | undefined) => (start && isYearMonth(ym) ? monthsBetween(start, ym) : null);

  // 같은 달 일은 입력 순서대로 적용되므로, 달 순서로만 정렬한다 (안정 정렬)
  const events = (input.events ?? [])
    .map((event, order) => ({ event, order }))
    .sort((a, b) => (a.event?.occurDate ?? "").localeCompare(b.event?.occurDate ?? "") || a.order - b.order)
    .map(({ event }) => ({
      type: event?.eventType ?? null,
      at: offset(event?.occurDate),
      amount: n(event?.amount),
      monthlyChange: n(event?.monthlyChange),
      rate: n(event?.incomeChangeRate),
      gap: n(event?.gapMonths),
      deposit: n(event?.deposit),
    }));

  const cash = input.assets?.cash;
  const deposits = input.assets?.deposits;
  const save = n(input.savingPlan?.monthlySaving);
  // 청년미래 배분을 비우면 월 저축액 전부 (한도까지)
  const policyBase = n(input.savingPlan?.policyMonthly) ?? save;

  return JSON.stringify({
    started: start !== null,
    age: n(input.person?.age),
    career: n(input.person?.careerYears),
    employment: input.person?.employmentType ?? INPUT_DEFAULTS.employmentType,
    net: n(input.income?.monthlyNetIncome),
    fixed: resolvedExpenseTotal(input.expenses?.fixed),
    variable: resolvedExpenseTotal(input.expenses?.variable),
    cash0: cash == null || deposits == null ? null : cash + deposits,
    invest0: n(input.assets?.investments ?? INPUT_DEFAULTS.investments),
    save,
    generalRate: n(input.savingPlan?.generalSavingRate ?? INPUT_DEFAULTS.generalSavingRate),
    investMonthly: n(input.savingPlan?.monthlyInvestment ?? INPUT_DEFAULTS.monthlyInvestment),
    emergencyFirst: n(input.savingPlan?.emergencyFirstAmount ?? INPUT_DEFAULTS.emergencyFirstAmount),
    threshold: n(input.emergency?.breakThreshold ?? INPUT_DEFAULTS.breakThreshold),
    loans,
    events,
    goal: n(input.goal?.targetAmount),
    goalMonths: offset(input.goal?.targetDate),
    // v1.7 세금 칸 (비우면 서버 기본값)
    gross: n(input.income?.annualGrossSalary),
    rent: n(input.expenses?.monthlyRent ?? INPUT_DEFAULTS.monthlyRent),
    homeless: input.person?.homelessHouseholder ?? INPUT_DEFAULTS.homelessHouseholder,
    policy: policyBase === null ? null : Math.min(policyBase, YOUTH_FUTURE_SAVING.monthlyLimit),
    housing: n(input.savingPlan?.housingMonthly ?? INPUT_DEFAULTS.housingMonthly),
    pension: n(input.savingPlan?.pensionMonthly ?? INPUT_DEFAULTS.pensionMonthly),
  });
}

const CASE_BY_KEY = new Map<string, GoldenCase>(GOLDEN.cases.map((c) => [engineKey(c.input), c]));

export interface GoldenHit {
  golden: GoldenCase;
  /** 입력의 기준 달 − 정답 케이스의 기준 달 (개월). 응답의 연월을 이만큼 옮긴다 */
  shift: number;
}

/** 엔진 값이 같은 정답 케이스. 없으면 null */
export function findGoldenCase(input: SimulationInputDraft): GoldenHit | null {
  const golden = CASE_BY_KEY.get(engineKey(input));
  if (!golden) return null;
  const shift = isYearMonth(input.startMonth) ? monthsBetween(golden.input.startMonth, input.startMonth) : 0;
  return { golden, shift };
}

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 응답 안의 "YYYY-MM"을 모두 months만큼 옮긴다 (기준 달이 다른 같은 입력) */
export function shiftDates<T>(value: T, months: number): T {
  if (months === 0) return value;
  if (typeof value === "string") return (YEAR_MONTH.test(value) ? addMonths(value, months) : value) as T;
  if (Array.isArray(value)) return value.map((item) => shiftDates(item, months)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftDates(v, months)])) as T;
  }
  return value;
}

export function goldenCaseByKey(key: string): GoldenCase | undefined {
  return GOLDEN.cases.find((c) => c.key === key);
}

/** 조정값 비교용 문자열 (빈 값은 무시) */
export function adjustmentsKey(adjustments: Adjustments | null | undefined): string {
  const entries = Object.entries(adjustments ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}
