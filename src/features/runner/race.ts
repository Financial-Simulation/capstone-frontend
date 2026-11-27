/**
 * 레이스 장면에 보여 줄 값 (순수 함수). 돈 숫자는 모두 입력 값이나 서버(/simulate/story) 값이고,
 * 여기서는 '코스 위 장애물 · 아이템'과 '캐릭터 자세 · 말풍선 · 메달'을 고르기만 한다 (새로 계산하지 않음).
 *
 *  - 레이스는 시간으로 달린다: 결승선 = 목표 시점. 지난 달 ÷ 목표 개월만큼 코스를 지나고(raceClock), 목표 시점에 '완주'한다.
 *  - 목표 금액은 결승선과 따로: 서버가 목표 달성(GOAL_REACHED)을 알린 달에 금빛 '목표 달성' 문을 지나며 '러너스 하이'가 되어,
 *    금빛 기운을 크게 내뿜으며 결승선까지 달린다. 메달은 결승선(목표 시점)을 지날 때 건다: 그 전에 목표 금액을 모았으면 금메달,
 *    못 모았으면 완주 메달(은). 결승선을 지난 뒤에 목표 금액을 넘으면 '늦었지만 목표 달성'으로 금메달로 바꿔 단다.
 *  - 예정된 일(입력 events[]) → 코스 위 표시: 한 번에 드는 돈은 허들, 매달 지출이 늘면 오르막, 줄면 급수대,
 *    이직 공백은 물웅덩이, 연봉이 오르면 에너지 젤. (결혼 · 독립 · 이사 · 이직 · 자동차는 그달 인생 장면, life.ts)
 *  - 미래 다시 보기의 한 달 → 캐릭터 자세: 실직 · 급한 지출 · 빌리기 · 적금 해지 · 빌린 돈이 남아 있음 · 석 달 전보다 줄어듦이면
 *    무릎을 짚고 쉬고, 목표 페이스(지금 가진 돈 → 목표 금액을 목표 시점까지 곧게 이은 선)보다 두 달 내리 앞서면 빠르게 달린다.
 */
import { plannedEventName } from "@/features/input/events";
import { formatManwon, formatSigned } from "@/lib/format";
import type { PlannedEvent, PresetKey, SimulationInputDraft, StoryEvent, StoryMonth, Draft, YearMonth } from "@/lib/types";
import { isYearMonth, monthsBetween } from "@/lib/year-month";

export type SpriteKind = "hurdle" | "hill" | "puddle" | "rock" | "mud" | "pack" | "gel" | "water" | "cheer" | "tape";
export type SpriteTone = "bad" | "good";

/** 장애물 · 아이템 이름 (그림 옆 글자 · 대체 글) */
export const SPRITES: Record<SpriteKind, { name: string; tone: SpriteTone }> = {
  hurdle: { name: "허들", tone: "bad" },
  hill: { name: "오르막", tone: "bad" },
  puddle: { name: "물웅덩이", tone: "bad" },
  rock: { name: "돌부리", tone: "bad" },
  mud: { name: "진흙탕", tone: "bad" },
  pack: { name: "비상 식량", tone: "bad" },
  gel: { name: "에너지 젤", tone: "good" },
  water: { name: "급수대", tone: "good" },
  cheer: { name: "응원", tone: "good" },
  tape: { name: "결승 테이프", tone: "good" },
};

export interface CourseMarker {
  key: string;
  /** 기준 달부터 몇 달 뒤 (0~119) */
  months: number;
  month: YearMonth;
  kind: SpriteKind;
  tone: SpriteTone;
  /** 예정된 일 이름 (비었으면 프리셋 이름: 이직 · 전세 이사 …) */
  title: string;
  /** "한 번에 800만 원" */
  detail: string;
  /** 어느 프리셋의 일인지 (인생 장면을 고르는 데 쓴다) */
  preset: PresetKey | null;
}

function eventMarkers(event: Draft<PlannedEvent>, months: number, month: YearMonth, index: number): CourseMarker[] {
  const title = plannedEventName(event);
  const out: CourseMarker[] = [];
  const add = (kind: SpriteKind, detail: string) =>
    out.push({ key: `${index}-${kind}-${out.length}`, months, month, kind, tone: SPRITES[kind].tone, title, detail, preset: event.presetKey ?? null });
  const monthly = (change: number) =>
    change > 0 ? add("hill", `매달 ${formatManwon(change)} 더 나가요`) : add("water", `매달 ${formatManwon(-change)} 덜 나가요`);

  switch (event.eventType) {
    case "ONE_TIME":
      if ((event.amount ?? 0) > 0) add("hurdle", `한 번에 ${formatManwon(event.amount)}`);
      break;
    case "SPEND_CHANGE":
      if (event.monthlyChange) monthly(event.monthlyChange);
      break;
    case "JOB_CHANGE":
      if ((event.gapMonths ?? 0) > 0) add("puddle", `${event.gapMonths}개월 쉬어 가요`);
      if (event.incomeChangeRate) {
        add(event.incomeChangeRate > 0 ? "gel" : "hill", `연봉 ${formatSigned(event.incomeChangeRate)}%`);
      }
      break;
    case "MOVE": {
      const once = (event.deposit ?? 0) + (event.amount ?? 0);
      if (once > 0) add("hurdle", `보증금 · 이사 비용 ${formatManwon(once)}`);
      if (event.monthlyChange) monthly(event.monthlyChange);
      break;
    }
  }
  return out;
}

/** 입력의 예정된 일 → 코스 위 표시 (시점이 없거나 기준 달 밖이면 뺀다). 시점 순서 */
export function plannedMarkers(input: SimulationInputDraft | null | undefined, start: YearMonth | null): CourseMarker[] {
  if (!start) return [];
  return (input?.events ?? [])
    .flatMap((event, index) => {
      if (!event || !isYearMonth(event.occurDate)) return [];
      const months = monthsBetween(start, event.occurDate);
      if (months < 0 || months > 119) return [];
      return eventMarkers(event, months, event.occurDate, index);
    })
    .sort((a, b) => a.months - b.months);
}

// ===== 미래 다시 보기: 캐릭터 자세 =====

export type Pose = "ready" | "jog" | "sprint" | "rest" | "celebrate" | "walk" | "carry" | "pull" | "stand" | "drive";

export const POSE_LABELS: Record<Pose, string> = {
  ready: "출발선에서 몸 푸는 중",
  jog: "꾸준히 달리는 중",
  sprint: "빠르게 달리는 중",
  rest: "무릎을 짚고 숨 고르는 중",
  celebrate: "두 팔을 활짝 펴고 기뻐하는 중",
  walk: "걷는 중",
  carry: "이삿짐 상자를 들고 걷는 중",
  pull: "여행 가방을 끌고 걷는 중",
  stand: "서서 웃는 중",
  drive: "차를 모는 중",
};

/** 결승선(목표 시점)을 지나며 거는 메달: 그 전에 목표 금액을 모았으면 금, 못 모았으면 완주 메달(은) */
export type Medal = "gold" | "silver";

/** 코스 위 문: 목표 달성(금빛 문) · 결승 아치. ahead는 캐릭터보다 몇 달 앞인지 (0 = 지금 지나는 중, −1 = 막 지나 뒤로 멀어짐) */
export interface RaceGate {
  kind: "goal" | "finish";
  ahead: number;
  /** 결승 아치를 금빛으로 (목표 금액을 모으고 들어옴) */
  gold: boolean;
}

export interface PaceView {
  pose: Pose;
  /** 이번 달 캐릭터 앞에 나타나는 장애물 · 아이템 */
  sprite: SpriteKind | null;
  /** 말풍선 (빈 글이면 말풍선을 띄우지 않는다) */
  say: string;
  tone: "good" | "bad" | "info";
  /** 지금 건 메달 (결승선을 지난 뒤에만) */
  medal: Medal | null;
  /** 러너스 하이: 결승 전에 목표 금액을 모은 달부터 결승선까지 금빛 기운을 내뿜는다 */
  high: boolean;
  /** 이번 달 꽃가루 (목표 달성 · 금메달 완주) */
  confetti: boolean;
  gate: RaceGate | null;
}

export interface RacePlan {
  /** 출발할 때 모은 돈 (그래프 0개월 값) */
  startTotal: number;
  targetAmount: number;
  goalMonths: number;
  /** 예정된 일의 코스 표시 (그달의 첫 표시를 보여 준다) */
  planned?: readonly CourseMarker[];
}

const BREAKS: readonly StoryEvent[] = ["BREAK_GENERAL", "BREAK_HOUSING", "BREAK_POLICY", "BREAK_POLICY_SPECIAL", "BREAK_PENSION"];

/** 목표 페이스: 지금 가진 돈에서 목표 금액까지 목표 시점에 닿도록 곧게 이은 선 위의 값 */
export function paceLine(plan: RacePlan, afterMonths: number): number {
  const goal = Math.max(plan.goalMonths, 1);
  return plan.startTotal + ((plan.targetAmount - plan.startTotal) * Math.min(afterMonths, goal)) / goal;
}

/** 서버가 목표 달성(GOAL_REACHED)을 알린 첫 달의 자리 (없으면 null) */
export function goalIndexOf(months: readonly StoryMonth[]): number | null {
  const index = months.findIndex((m) => m.events.includes("GOAL_REACHED"));
  return index >= 0 ? index : null;
}

type Base = Pick<PaceView, "medal" | "high" | "confetti" | "gate">;

/** months[index] 달의 자세 · 말풍선 · 메달 · 러너스 하이 */
export function paceOf(months: readonly StoryMonth[], index: number, plan: RacePlan): PaceView {
  const m = months[index];
  const has = (e: StoryEvent) => m.events.includes(e);
  const planned = plan.planned?.find((p) => p.month === m.month) ?? null;
  const goalIndex = goalIndexOf(months);
  const reached = goalIndex !== null && index >= goalIndex;
  const finished = m.afterMonths >= plan.goalMonths;
  const base: Base = {
    medal: finished ? (reached ? "gold" : "silver") : null,
    high: reached && !finished,
    confetti: false,
    gate: gateOf(months, index, plan, goalIndex),
  };
  const target = formatManwon(plan.targetAmount);

  // 목표 금액을 처음 넘은 달: 결승 전이면 러너스 하이, 결승선에서 · 결승 뒤면 금메달
  if (index === goalIndex) {
    const early = plan.goalMonths - m.afterMonths;
    const say =
      early > 0
        ? `목표 ${target} 달성! 결승 ${early}개월 전 러너스 하이 발동`
        : early === 0
          ? `결승선에서 목표 ${target} 달성! 금메달 완주`
          : `목표 시점보다 ${-early}개월 늦었지만 목표 달성! 금메달`;
    return { ...base, pose: "celebrate", sprite: null, say, tone: "good", confetti: true };
  }
  // 결승선(목표 시점): 완주하며 메달을 건다. 목표 금액을 먼저 모았으면 금메달, 아니면 완주 메달(은)
  if (m.afterMonths === plan.goalMonths) {
    if (reached && goalIndex !== null) {
      const lead = plan.goalMonths - months[goalIndex].afterMonths;
      return { ...base, pose: "celebrate", sprite: null, say: `완주! 목표 금액을 ${lead}개월 먼저 모아 금메달이에요`, tone: "good", confetti: true };
    }
    return { ...base, pose: "rest", sprite: null, say: `완주! 목표까지 ${formatManwon(plan.targetAmount - m.total)} 남아 완주 메달이에요`, tone: "info" };
  }
  if (has("JOB_LOSS")) return { ...base, pose: "rest", sprite: "puddle", say: "일을 잃어 잠깐 멈췄어요", tone: "bad" };
  if (has("SHOCK")) {
    // 서버가 준 유형 이름(경조사비 · 병원비 · 교통사고 자기부담금)을 그래프 위 배너와 같이 쓴다. 이름이 없으면 '급한 지출'
    return { ...base, pose: "rest", sprite: "rock", say: `${m.shockLabel ?? "급한 지출"} ${formatManwon(m.shock)}에 발이 걸렸어요`, tone: "bad" };
  }
  if (has("OVERDRAFT")) return { ...base, pose: "rest", sprite: "mud", say: "현금이 바닥나 마이너스 통장을 썼어요", tone: "bad" };
  if (BREAKS.some(has)) return { ...base, pose: "rest", sprite: "pack", say: "적금을 깨서 버티는 중이에요", tone: "bad" };
  if (has("MATURE_POLICY")) return { ...base, pose: "sprint", sprite: "water", say: "청년미래적금 만기! 보급을 받았어요", tone: "good" };
  if (has("DEBT_CLEARED")) return { ...base, pose: "sprint", sprite: "cheer", say: "빌린 돈을 다 갚아 몸이 가벼워요", tone: "good" };
  if (has("REHIRE")) return { ...base, pose: "sprint", sprite: "gel", say: "다시 일을 시작했어요. 다시 달려요!", tone: "good" };

  const state = { ...base, ...stateOf(months, index, plan, reached) };
  if (has("PLANNED") && planned) {
    return { ...state, sprite: planned.kind, say: `${planned.title}: ${planned.detail}`, tone: planned.tone === "good" ? "good" : "info" };
  }
  if (has("REFUND")) return { ...state, sprite: "cheer", say: "연말정산 환급으로 응원을 받았어요", tone: "good" };
  if (m.afterMonths <= 1) return { ...state, say: "출발!" };
  return state;
}

/** 큰 일이 없는 달: 지금 형편으로 자세를 정한다 */
function stateOf(months: readonly StoryMonth[], index: number, plan: RacePlan, reached: boolean): Omit<PaceView, keyof Base> {
  const m = months[index];
  if (!m.employed) return { pose: "rest", sprite: null, say: "일을 찾는 중이라 숨을 고르고 있어요", tone: "bad" };
  if (m.balances.overdraft > 0) return { pose: "rest", sprite: null, say: `빌린 돈 ${formatManwon(m.balances.overdraft)}이 있어 힘들어요`, tone: "bad" };
  const before = index >= 3 ? months[index - 3] : null;
  if (before && m.total < before.total) return { pose: "rest", sprite: null, say: "지출이 많아 숨이 차요", tone: "bad" };

  const toFinish = plan.goalMonths - m.afterMonths;
  if (toFinish < 0) {
    return reached
      ? { pose: "jog", sprite: null, say: "완주 후 금메달을 걸고 쿨다운 중", tone: "good" }
      : { pose: "jog", sprite: null, say: "완주했어요. 목표 금액까지 계속 달려요", tone: "info" };
  }
  // 러너스 하이로 달리는 달은 말풍선 없이 불꽃 머리 · 금빛 기운만 (남은 달은 위쪽 칩이 알려 준다)
  if (reached) return { pose: "sprint", sprite: null, say: "", tone: "good" };
  const ahead = (i: number) => months[i].total >= paceLine(plan, months[i].afterMonths);
  if (ahead(index) && index > 0 && ahead(index - 1)) return { pose: "sprint", sprite: null, say: "목표 페이스보다 앞서 달려요", tone: "good" };
  return { pose: "jog", sprite: null, say: "꾸준히 달리는 중", tone: "info" };
}

/**
 * 코스 위 문. 목표 달성 달 한 달 전부터 금빛 '목표 달성' 문이 다가오고(ahead 1 → 0),
 * 결승(목표 시점) 두 달 전부터 결승 아치가 다가와 그달에 지나고 다음 달 뒤로 멀어진다 (2 → 1 → 0 → −1).
 * 목표 달성이 결승 달과 같으면 금빛 결승 아치 하나로.
 */
function gateOf(months: readonly StoryMonth[], index: number, plan: RacePlan, goalIndex: number | null): RaceGate | null {
  const finishAhead = plan.goalMonths - months[index].afterMonths;
  if (goalIndex !== null && months[goalIndex].afterMonths !== plan.goalMonths) {
    const goalAhead = goalIndex - index;
    if (goalAhead === 0 || goalAhead === 1) return { kind: "goal", ahead: goalAhead, gold: true };
  }
  if (finishAhead >= -1 && finishAhead <= 2) return { kind: "finish", ahead: finishAhead, gold: goalIndex !== null && index >= goalIndex };
  return null;
}

/**
 * 시간으로 잰 레이스 자리: 지난 달 ÷ 목표 개월 (0~1)과 그만큼의 거리, 결승(목표 시점)까지 남은 달.
 * 결승선이 곧 목표 시점이라 돈을 빨리 모아도 결승선은 당겨지지 않는다 (목표 금액은 러너스 하이 · 금메달로 따로 보여 준다).
 */
export function raceClock(afterMonths: number, goalMonths: number, raceKm: number): { ratio: number; km: number; toFinish: number } {
  const ratio = goalMonths > 0 ? Math.min(Math.max(afterMonths / goalMonths, 0), 1) : 1;
  return { ratio, km: ratio * raceKm, toFinish: Math.max(goalMonths - afterMonths, 0) };
}
