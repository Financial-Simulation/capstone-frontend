/**
 * 결과 화면(04 · 04-E)에 보여 줄 값 (순수 함수). 계산은 하지 않고 서버 응답을 고르고 이름 붙이기만 한다.
 *
 * 팀에서 정할 것(노션 6번)을 우선 이렇게 정했다:
 *  - 달성 가능성 색: 70% 이상 '높음' · 50~70% '보통' · 50% 미만 '낮음' (70%는 역산의 목표 확률 기본값과 같게)
 *  - 차이가 2%p보다 작으면 '거의 차이 없음' (보고서 7.5)
 *  - 계산기 결과는 API가 주는 두 값(목표 시점 · 10년 뒤)을 점으로만 그린다 (월별 값이 없어 선은 긋지 않는다)
 *  - 예정된 일은 응답에 eventMarkers가 없어서 입력의 occurDate로 그린다
 */
import type {
  Band,
  CauseCounts,
  Causes,
  Lever,
  ReverseResult,
  SimulateResult,
  SimulationInputDraft,
  YearMonth,
} from "@/lib/types";
import { formatKoreanWon, formatManwon, formatPercent, formatPercentPoint } from "@/lib/format";
import { normalizeErrors, stepOfPath } from "@/lib/form";
import { checkCrossRules, checkFields, checkRequired } from "@/lib/rules";
import type { StepKey } from "@/lib/steps";
import { hasAnyValue } from "@/lib/storage";
import { formatDuration, formatYearMonth, isYearMonth, monthsBetween } from "@/lib/year-month";

export const PROBABILITY_GOOD = 70;
export const PROBABILITY_FAIR = 50;
export const MEANINGFUL_DIFF = 2;

export type ProbabilityLevel = "good" | "fair" | "low";

export const LEVEL_LABELS: Record<ProbabilityLevel, string> = {
  good: "가능성 높음",
  fair: "가능성 보통",
  low: "가능성 낮음",
};

export function probabilityLevel(probability: number): ProbabilityLevel {
  if (probability >= PROBABILITY_GOOD) return "good";
  if (probability >= PROBABILITY_FAIR) return "fair";
  return "low";
}

/** 60 → "5년 뒤", 0 → "지금" */
export function afterLabel(months: number): string {
  return months === 0 ? "지금" : `${formatDuration(months)} 뒤`;
}

export function bandAt(result: SimulateResult, months: number): Band | undefined {
  return result.bands[Math.max(0, Math.min(result.bands.length - 1, months))];
}

// ===== 1 · 3 · 5 · 10년 표 =====

export interface QuantileRow {
  months: number;
  label: string;
  date: YearMonth | null;
  p5: number;
  p10: number;
  p50: number;
  p90: number;
  isGoal: boolean;
}

/** checkpoints(12 · 36 · 60 · 120개월) + 목표 시점이 그 사이에 없으면 목표 시점 줄도 (bands에서) */
export function checkpointRows(result: SimulateResult): QuantileRow[] {
  const gm = result.goal.goalMonths;
  const rows: QuantileRow[] = result.checkpoints.map((c) => ({
    months: c.afterMonths,
    label: afterLabel(c.afterMonths),
    date: bandAt(result, c.afterMonths)?.month ?? null,
    p5: c.p5,
    p10: c.p10,
    p50: c.p50,
    p90: c.p90,
    isGoal: c.afterMonths === gm,
  }));
  if (!rows.some((r) => r.isGoal)) {
    const band = bandAt(result, gm);
    if (band) {
      rows.push({ months: gm, label: afterLabel(gm), date: band.month, p5: band.p5, p10: band.p10, p50: band.p50, p90: band.p90, isGoal: true });
      rows.sort((a, b) => a.months - b.months);
    }
  }
  return rows;
}

/** 표로 보기: 지금부터 1년마다 (그래프의 표 버전) */
export function yearlyRows(result: SimulateResult): QuantileRow[] {
  const gm = result.goal.goalMonths;
  return result.bands
    .map((band, months) => ({ band, months }))
    .filter(({ months }) => months % 12 === 0 || months === gm)
    .map(({ band, months }) => ({
      months,
      label: afterLabel(months),
      date: band.month,
      p5: band.p5,
      p10: band.p10,
      p50: band.p50,
      p90: band.p90,
      isGoal: months === gm,
    }));
}

// ===== 위험 카드 =====

export interface RiskCard {
  key: "debt" | "worst" | "termination" | "subsidy" | "cashShort";
  title: string;
  value: string;
  detail: string;
  /** danger: 음수 금액 / warn: 현금 부족 시점(주황) / muted: 해당 없음·없음 */
  tone: "default" | "danger" | "warn" | "muted";
}

export function riskCards(result: SimulateResult, policyReason?: string | null): RiskCard[] {
  const { debt, policySaving } = result.risks;
  const goalDate = bandAt(result, result.goal.goalMonths)?.month;
  const goalWhen = goalDate ? formatYearMonth(goalDate) : afterLabel(result.goal.goalMonths);
  const notEligible = policySaving.eligible === false;
  const reason = policyReason ?? "청년미래적금 대상이 아니에요 (만 34세 초과 또는 총급여 7,500만 원 초과).";

  return [
    {
      key: "debt",
      title: "빚질 가능성",
      value: formatPercent(debt.probability),
      detail: `목표 시점(${goalWhen})까지 모은 돈이 한 번이라도 0원 아래로 내려가는 미래`,
      tone: "default",
    },
    {
      key: "worst",
      title: "최악의 경우",
      value: formatManwon(debt.worstCaseAtGoal),
      detail: `하위 5% 미래에서 목표 시점(${goalWhen})에 모은 돈`,
      tone: debt.worstCaseAtGoal < 0 ? "danger" : "default",
    },
    notEligible || policySaving.earlyTerminationProbability == null
      ? { key: "termination", title: "적금 중도해지", value: "해당 없음", detail: reason, tone: "muted" }
      : {
          key: "termination",
          title: "적금 중도해지",
          value: formatPercent(policySaving.earlyTerminationProbability),
          detail: "청년미래적금을 만기 전에 깨는 미래",
          tone: "default",
        },
    notEligible || policySaving.expectedSubsidy == null
      ? { key: "subsidy", title: "정부 지원금", value: "해당 없음", detail: reason, tone: "muted" }
      : {
          key: "subsidy",
          title: "정부 지원금",
          value: formatKoreanWon(policySaving.expectedSubsidy),
          detail: "청년미래적금으로 받는 정부 지원금 (미래 2,000개의 평균)",
          tone: "default",
        },
    debt.probability > 0 && debt.medianFirstDate
      ? {
          key: "cashShort",
          title: "현금 부족 시점",
          value: formatYearMonth(debt.medianFirstDate),
          detail: `모은 돈이 0원 아래로 내려가는 미래(${formatPercent(debt.probability)})에서 처음 내려가는 때의 중간값`,
          tone: "warn",
        }
      : { key: "cashShort", title: "현금 부족 시점", value: "현금 부족 없음", detail: "모은 돈이 0원 아래로 내려가는 미래가 없어요", tone: "muted" },
  ];
}

// ===== 주요 원인 (적금을 처음 깬 이유) =====

export interface CauseRow {
  key: keyof CauseCounts;
  label: string;
  /** % (네 개의 합 100) */
  share: number;
  /** 그 이유로 처음 적금을 깬 미래 수 */
  count: number | null;
}

const CAUSE_LABELS: Record<keyof CauseCounts, string> = {
  unemployment: "실직 직후",
  prolongedUnemployment: "실업 장기화",
  emergencyExpense: "급한 지출",
  chronicDeficit: "매달 부족",
};

/** total: 적금을 깬 미래 수 (개수가 없으면 null), empty: 깬 미래가 없음 (모두 0) */
export function causeRows(causes: Causes): { rows: CauseRow[]; total: number | null; empty: boolean } {
  const keys = Object.keys(CAUSE_LABELS) as (keyof CauseCounts)[];
  const rows = keys.map((key) => ({ key, label: CAUSE_LABELS[key], share: causes[key], count: causes.counts?.[key] ?? null }));
  const total = causes.counts ? rows.reduce((sum, r) => sum + (r.count ?? 0), 0) : null;
  return { rows, total, empty: rows.every((r) => r.share === 0) };
}

// ===== 이렇게 바꿔 보세요 (역산) =====

export interface LeverRow {
  type: Lever["type"];
  label: string;
  probability: string;
  diff: string;
  /** 2%p보다 작은 차이 */
  flat: boolean;
}

export function leverRows(reverse: ReverseResult): LeverRow[] {
  return reverse.levers.map((lever) => ({
    type: lever.type,
    label: lever.label,
    probability: formatPercent(lever.probability),
    diff: formatPercentPoint(lever.diff),
    flat: lever.flat || Math.abs(lever.diff) < MEANINGFUL_DIFF,
  }));
}

/** 가능성 70%에 닿으려면 (역산 요약 문장) */
export function reverseLines(reverse: ReverseResult): string[] {
  const target = `${reverse.targetProbability}%`;
  const lines: string[] = [];
  const cut = reverse.requiredVariableExpenseCut;
  if (reverse.currentProbability >= reverse.targetProbability) {
    lines.push(`지금 계획으로 이미 ${target} 이상이에요.`);
  } else if (cut.amount != null && cut.probability != null) {
    lines.push(`변동지출을 월 ${formatKoreanWon(cut.amount)} 줄이면 ${formatPercent(cut.probability)}가 돼요.`);
  } else {
    lines.push(`변동지출만 줄여서는 ${target}에 닿지 않아요.`);
  }
  const period = reverse.requiredPeriod;
  if (period.months != null && period.reach70Date) {
    lines.push(`지금 계획 그대로라면 ${formatYearMonth(period.reach70Date)}(${afterLabel(period.months)})에 ${target}가 돼요.`);
  } else {
    lines.push(`지금 계획 그대로는 10년 안에 ${target}에 닿지 않아요.`);
  }
  const saving = reverse.requiredMonthlySaving;
  if (saving.amount == null && saving.maxProbability != null && saving.atAmount != null && reverse.currentProbability < reverse.targetProbability) {
    lines.push(
      `월 저축액만 바꿔서는 ${target}에 닿지 않아요 (가장 높을 때 월 ${formatKoreanWon(saving.atAmount)}에서 ${formatPercent(saving.maxProbability)}).`,
    );
  }
  return lines;
}

// ===== 예정된 일 표시 (입력의 occurDate) =====

export interface EventMark {
  months: number;
  label: string;
}

export function eventMarks(input: SimulationInputDraft | null | undefined): EventMark[] {
  const start = input?.startMonth;
  if (!isYearMonth(start)) return [];
  const byMonth = new Map<number, string[]>();
  for (const event of input?.events ?? []) {
    if (!isYearMonth(event?.occurDate)) continue;
    const months = monthsBetween(start, event.occurDate);
    if (months < 0 || months > 120) continue;
    const names = byMonth.get(months) ?? [];
    const name = event.name || "예정된 일";
    if (!names.includes(name)) names.push(name);
    byMonth.set(months, names);
  }
  return [...byMonth.entries()].sort(([a], [b]) => a - b).map(([months, names]) => ({ months, label: names.join(" · ") }));
}

// ===== 결과를 계산할 수 있는 입력인지 =====

export type Readiness =
  | { ok: true }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "incomplete"; step: StepKey; message: string };

const CROSS_RULE_STEP: Record<string, StepKey> = {
  INPUT4001: "BASIC",
  LOAN4001: "ASSETS",
  GOAL4001: "GOAL",
  GOAL4002: "GOAL",
  EVENT4001: "EVENTS",
  EVENT4002: "EVENTS",
  EVENT4004: "EVENTS",
};

/** 04 결과: 계산 API를 부르기 전에 (서버의 checkRequired처럼) 필수 칸 → 칸 규칙 → 교차 규칙 */
export function readiness(input: SimulationInputDraft | null): Readiness {
  if (!input || !hasAnyValue(input)) return { ok: false, reason: "empty" };
  const errors = { ...checkRequired("ALL", input), ...normalizeErrors(checkFields(input)) };
  const first = Object.keys(errors)[0];
  if (first) return { ok: false, reason: "incomplete", step: stepOfPath(first) ?? "BASIC", message: errors[first] };
  const cross = checkCrossRules(input);
  if (cross) return { ok: false, reason: "incomplete", step: CROSS_RULE_STEP[cross.code] ?? "BASIC", message: cross.message };
  return { ok: true };
}
