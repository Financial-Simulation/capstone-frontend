/**
 * 간단한 결과 화면(04 첫 화면)에 보여 줄 문장 (순수 함수). 숫자는 모두 서버 값이고, 여기서는 쉬운 말로 바꾸기만 한다.
 * 사회초년생이 처음 보는 화면이라 '미래 2,000개' · '오차' · '하위 5%' · '중간값' 같은 말을 쓰지 않는다.
 * 자세한 숫자(1·3·5·10년 표 · 위험 카드 · 세금 카드 · 적금 깬 이유 · 근거)는 '숫자 더 보기'와 리포트(/report)에 있다.
 */
import type { Lever, SimulateResult } from "@/lib/types";
import { formatManwon } from "@/lib/format";
import { formatYearMonth } from "@/lib/year-month";
import { MEANINGFUL_DIFF, afterLabel, bandAt, causeRows, probabilityLevel, type ProbabilityLevel } from "./result";

/** 이 확률(%)보다 낮은 위험은 '조심할 점'에 넣지 않는다 (20번 중 1번 꼴보다 드문 일) */
export const CAUTION_MIN_PROBABILITY = 5;
/** '이렇게 하면 좋아져요'에 보여 줄 개수 */
export const TOP_ACTIONS = 3;

/** 66.1 → 7 (10번 중 몇 번). 화면에 같이 쓰는 '75%'(정수 반올림)와 어긋나지 않게 정수 %에서 센다: 74.7 → 75% → 8 */
export function outOfTen(probability: number): number {
  return Math.max(0, Math.min(10, Math.round(Math.round(probability) / 10)));
}

/** 목표를 이룰 가능성을 횟수로: "10번 중 7번쯤 모아요" · 95% 이상 "거의 확실하게 모아요" · 5% 미만 "거의 못 모아요" */
export function chancePhrase(probability: number): string {
  if (probability >= 95) return "거의 확실하게 모아요";
  if (probability < 5) return "거의 못 모아요";
  return `10번 중 ${outOfTen(probability)}번쯤 모아요`;
}

/** 위험을 사람 수로: 10% 이상은 "10명 중 2명", 그보다 작으면 "100명 중 4명" */
export function peopleText(probability: number): string {
  if (probability >= 10) return `10명 중 ${outOfTen(probability)}명`;
  return `100명 중 ${Math.max(1, Math.round(probability))}명`;
}

export interface SimpleSummary {
  level: ProbabilityLevel;
  /** "5년 뒤 3,000만 원" */
  goal: string;
  /** "10번 중 7번쯤은 모을 수 있어요" */
  chance: string;
  /** "66%" (작게) */
  percent: string;
  /** 보통이면 · 계획대로면 */
  lines: string[];
}

export function simpleSummary(result: SimulateResult): SimpleSummary {
  const { goal, deterministic } = result;
  const p = goal.probability;
  const middle = bandAt(result, goal.goalMonths)?.p50;
  const chance =
    p >= 95 ? "거의 확실하게 모을 수 있어요" : p < 5 ? "모으기 어려워요" : `10번 중 ${outOfTen(p)}번쯤은 모을 수 있어요`;
  const lines: string[] = [];
  if (middle != null) lines.push(`보통이면 그때 ${formatManwon(middle)}쯤 모여 있어요.`);
  lines.push(`실직이나 급한 지출 없이 계획대로만 가면 ${formatManwon(deterministic.atGoal)}까지 모여요.`);
  return {
    level: probabilityLevel(p),
    goal: `${afterLabel(goal.goalMonths)} ${formatManwon(goal.targetAmount)}`,
    chance,
    percent: `${Math.round(p)}%`,
    lines,
  };
}

// ===== 조심할 점 =====

export interface Caution {
  key: "debt" | "worst" | "termination";
  text: string;
  tone: "danger" | "warn" | "info";
}

/** 적금을 처음 깬 이유를 쉬운 말로 (CAUSE_LABELS의 쉬운 판): "주로 ○○" */
const PLAIN_CAUSES: Record<string, string> = {
  unemployment: "실직 때문이에요",
  prolongedUnemployment: "실직이 길어졌기 때문이에요",
  emergencyExpense: "급한 지출 때문이에요",
  chronicDeficit: "매달 쓰는 돈이 모자랐기 때문이에요",
};

export function cautions(result: SimulateResult): Caution[] {
  const { debt, policySaving } = result.risks;
  const list: Caution[] = [];
  if (debt.probability >= CAUTION_MIN_PROBABILITY) {
    const when = debt.medianFirstDate ? ` 그런 경우 처음 바닥나는 때는 보통 ${formatYearMonth(debt.medianFirstDate)}쯤이에요.` : "";
    list.push({
      key: "debt",
      text: `${peopleText(debt.probability)}은 목표 시점 전에 돈이 바닥나서 빌려 써야 하는 때가 와요.${when}`,
      tone: "warn",
    });
  }
  if (policySaving.eligible && policySaving.earlyTerminationProbability != null && policySaving.earlyTerminationProbability >= CAUTION_MIN_PROBABILITY) {
    const { rows, empty } = causeRows(result.causes);
    const top = empty ? null : rows.reduce((a, b) => (b.share > a.share ? b : a));
    const why = top ? ` 주로 ${PLAIN_CAUSES[top.key]}.` : "";
    list.push({
      key: "termination",
      text: `${peopleText(policySaving.earlyTerminationProbability)}은 청년미래적금을 만기 전에 깨요.${why}`,
      tone: "warn",
    });
  }
  const worst = debt.worstCaseAtGoal;
  list.push(
    worst < 0
      ? { key: "worst", text: `많이 안 풀리면(20번 중 1번) 목표 시점에 오히려 ${formatManwon(-worst)} 빚이 남을 수 있어요.`, tone: "danger" }
      : { key: "worst", text: `많이 안 풀려도(20번 중 1번) 목표 시점에 ${formatManwon(worst)}은 모여요.`, tone: "info" },
  );
  return list;
}

// ===== 받는 혜택 (세금 · 정부 지원금) =====

export function benefits(result: SimulateResult): string[] {
  const lines: string[] = [];
  const tax = result.tax;
  if (tax && tax.refundPerYear > 0) {
    lines.push(`매년 2월 연말정산으로 약 ${formatManwon(tax.refundPerYear)}을 돌려받아요.`);
  }
  const { eligible, expectedSubsidy } = result.risks.policySaving;
  const noMatch = result.warnings?.some((w) => w.code === "INFO_POLICY_NO_MATCH") ?? false;
  if (eligible && !noMatch && expectedSubsidy != null && expectedSubsidy > 0) {
    lines.push(`청년미래적금으로 정부 지원금을 약 ${formatManwon(expectedSubsidy)} 받아요.`);
  }
  return lines;
}

// ===== 이렇게 하면 좋아져요 =====

export interface SimpleAction {
  type: Lever["type"];
  label: string;
  /** "10번 중 8번쯤 모아요" */
  chance: string;
  /** 지금 → 바꾸면: "66% → 75%" ('%p'는 쓰지 않는다) */
  change: string;
}

/** 가능성이 의미 있게(2%p 이상) 오르는 것만, 많이 오르는 순서로 3개 */
export function simpleActions(levers: Lever[], currentProbability: number): SimpleAction[] {
  return levers
    .filter((lever) => !lever.flat && lever.diff >= MEANINGFUL_DIFF)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, TOP_ACTIONS)
    .map((lever) => ({
      type: lever.type,
      label: lever.label,
      chance: chancePhrase(lever.probability),
      change: `${Math.round(currentProbability)}% → ${Math.round(lever.probability)}%`,
    }));
}
