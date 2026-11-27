/**
 * '인생은 마라톤' 러너 장비 (입력 화면 옆 캐릭터 · 결과 화면 레이스).
 * 화면 놀이용 점수라 서버 계산 결과와 섞지 않는다. 입력 값(실수령 · 지출 · 저축)만 보고 코인을 정하고,
 * 장비는 사용자가 고르지 않고 코인 안에서 저절로 입는다 (bestSet). 저축을 늘리거나 지출을 줄이면 바로 더 좋은 장비로 바뀐다.
 *
 * 러닝 코인 = 남는 돈 점수(최대 60) + 저축 점수(최대 40)
 *  - 남는 돈 점수: 월 실수령액 중 지출하고 남는 몫 × 60
 *  - 저축 점수: 월 실수령액 중 저축하는 몫 × 40 (저축은 남는 돈까지만 센다)
 * 장비 7칸은 칸마다 3단계(기본 0코인 · 러너 · 프로).
 */
import { resolvedExpenseTotal } from "@/lib/rules";
import type { SimulationInputDraft } from "@/lib/types";

export const GEAR_SLOTS = ["headband", "sunglasses", "watch", "top", "bottoms", "socks", "shoes"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export type GearTier = 0 | 1 | 2;
export type GearSet = Record<GearSlot, GearTier>;

export interface GearItem {
  name: string;
  /** 러닝 코인 */
  price: number;
}

export interface SlotDef {
  slot: GearSlot;
  label: string;
  items: readonly [GearItem, GearItem, GearItem];
}

export const GEAR: Record<GearSlot, SlotDef> = {
  headband: {
    slot: "headband",
    label: "헤어밴드",
    items: [
      { name: "없음", price: 0 },
      { name: "면 헤어밴드", price: 3 },
      { name: "쿨링 헤어밴드", price: 6 },
    ],
  },
  sunglasses: {
    slot: "sunglasses",
    label: "선글라스",
    items: [
      { name: "없음", price: 0 },
      { name: "스포츠 선글라스", price: 5 },
      { name: "미러 고글", price: 10 },
    ],
  },
  watch: {
    slot: "watch",
    label: "스마트워치",
    items: [
      { name: "없음", price: 0 },
      { name: "스마트밴드", price: 6 },
      { name: "GPS 스마트워치", price: 12 },
    ],
  },
  top: {
    slot: "top",
    label: "상의",
    items: [
      { name: "면 티셔츠", price: 0 },
      { name: "기능성 티셔츠", price: 4 },
      { name: "레이싱 싱글렛", price: 8 },
    ],
  },
  bottoms: {
    slot: "bottoms",
    label: "하의",
    items: [
      { name: "트레이닝 바지", price: 0 },
      { name: "러닝 쇼츠", price: 4 },
      { name: "레이싱 쇼츠", price: 8 },
    ],
  },
  socks: {
    slot: "socks",
    label: "양말",
    items: [
      { name: "면 양말", price: 0 },
      { name: "러닝 양말", price: 2 },
      { name: "압박 양말", price: 5 },
    ],
  },
  shoes: {
    slot: "shoes",
    label: "런닝화",
    items: [
      { name: "운동화", price: 0 },
      { name: "쿠션 러닝화", price: 8 },
      { name: "카본 레이싱화", price: 15 },
    ],
  },
};

export const BASIC_SET: GearSet = { headband: 0, sunglasses: 0, watch: 0, top: 0, bottoms: 0, socks: 0, shoes: 0 };

/** 코인 점수 비중: 남는 돈 60 + 저축 40 = 최대 100코인 */
const COIN_WEIGHTS = { spare: 60, saving: 40 } as const;
export const MAX_COINS = COIN_WEIGHTS.spare + COIN_WEIGHTS.saving;

export interface Coins {
  total: number;
  /** 남는 돈 점수 */
  spare: number;
  /** 저축 점수 */
  saving: number;
  /** 월 실수령액 중 지출하고 남는 몫 (0~1) */
  spareRate: number;
  /** 월 실수령액 중 저축하는 몫 (0~1, 남는 돈까지만) */
  savingRate: number;
  /** 지출이 실수령액보다 많음 */
  overspent: boolean;
}

/** 실수령 · 지출을 다 넣어야 코인이 생긴다 (아직이면 null). 저축을 비웠으면 저축 점수만 0 */
export function runnerCoins(input: SimulationInputDraft | null | undefined): Coins | null {
  const net = input?.income?.monthlyNetIncome;
  const fixed = resolvedExpenseTotal(input?.expenses?.fixed);
  const variable = resolvedExpenseTotal(input?.expenses?.variable);
  if (net == null || net <= 0 || fixed == null || variable == null) return null;
  const left = net - fixed - variable;
  const spareMoney = Math.max(left, 0);
  const saved = Math.min(Math.max(input?.savingPlan?.monthlySaving ?? 0, 0), spareMoney);
  const spareRate = spareMoney / net;
  const savingRate = saved / net;
  const spare = Math.round(spareRate * COIN_WEIGHTS.spare);
  const saving = Math.round(savingRate * COIN_WEIGHTS.saving);
  return { total: spare + saving, spare, saving, spareRate, savingRate, overspent: left < 0 };
}

export function itemOf(slot: GearSlot, tier: GearTier): GearItem {
  return GEAR[slot].items[tier];
}

export function spentCoins(set: GearSet): number {
  return GEAR_SLOTS.reduce((sum, slot) => sum + itemOf(slot, set[slot]).price, 0);
}

/** 코인으로 사는 순서: 달리기에 중요한 것부터 */
const PRIORITY: readonly GearSlot[] = ["shoes", "top", "bottoms", "watch", "socks", "sunglasses", "headband"];

/** 코인 안에서 입는 장비: 우선순위대로 러너 단계를 먼저 사고, 남으면 같은 순서로 프로로 올린다 */
export function bestSet(coins: number): GearSet {
  const set: GearSet = { ...BASIC_SET };
  for (const tier of [1, 2] as const) {
    for (const slot of PRIORITY) {
      if (set[slot] >= tier) continue;
      if (spentCoins({ ...set, [slot]: tier }) <= coins) set[slot] = tier;
    }
  }
  return set;
}

export function sameSet(a: GearSet, b: GearSet): boolean {
  return GEAR_SLOTS.every((slot) => a[slot] === b[slot]);
}

export interface GearChange {
  /** 입은 장비 값이 늘었으면 up, 줄었으면 down */
  kind: "up" | "down";
  slot: GearSlot;
  /** 바뀐 뒤 단계와 장비 */
  tier: GearTier;
  item: GearItem;
}

/**
 * 코인이 바뀌어 장비가 바뀐 칸 하나 (말풍선용).
 * 코인 안에서 다시 고르면 한 칸은 오르고 다른 칸은 내려갈 수도 있어서(22 → 19코인: 스마트워치 대신 양말),
 * 입은 장비 값이 늘었는지 줄었는지로 방향을 정하고 그 방향으로 바뀐 칸을 우선순위대로 하나 고른다.
 */
export function gearChange(prev: GearSet, next: GearSet): GearChange | null {
  if (sameSet(prev, next)) return null;
  const kind = spentCoins(next) >= spentCoins(prev) ? "up" : "down";
  const slot = PRIORITY.find((s) => (kind === "up" ? next[s] > prev[s] : next[s] < prev[s]));
  if (!slot) return null;
  return { kind, slot, tier: next[slot], item: itemOf(slot, next[slot]) };
}

/** 아무것도 안 입은 칸 (헤어밴드 · 선글라스 · 스마트워치의 기본 단계) */
export function isEmptySlot(slot: GearSlot, tier: GearTier): boolean {
  return tier === 0 && GEAR[slot].items[0].name === "없음";
}

/** 캐릭터 그림의 대체 글: "쿠션 러닝화 · 기능성 티셔츠 · 러닝 쇼츠" (기본 장비는 뺀다) */
export function gearSummary(set: GearSet): string {
  const items = PRIORITY.filter((slot) => set[slot] > 0).map((slot) => itemOf(slot, set[slot]).name);
  return items.length > 0 ? items.join(" · ") : "기본 운동복";
}
