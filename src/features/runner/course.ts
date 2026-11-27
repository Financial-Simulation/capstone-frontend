/**
 * 레이스 거리와 코스 ('인생은 마라톤').
 *  - 거리 = 목표 시점까지의 기간: 10km = 3년 · 하프 = 5년 · 풀코스 = 10년. 고르면 목표 시점(goal.targetDate)을 그만큼 뒤로 정한다.
 *    다른 기간(직접 고른 연월)은 '맞춤 코스'로, 세 거리 사이를 이어 거리를 붙인다 (1년이면 약 3.3km).
 *  - 코스(배경 그림)는 고르지 않고 거리로 정해진다. 서울에서 실제로 열리는 대회 코스를 본떴다 (ROUTES).
 *    레이스 중에는 달린 비율에 맞는 구간 그림(장면)을 보여 준다. 계산에는 쓰지 않는다.
 */
import { addMonths, isYearMonth, monthsBetween } from "@/lib/year-month";
import type { YearMonth } from "@/lib/types";

export type RaceKey = "10K" | "HALF" | "FULL";

export interface RaceDef {
  key: RaceKey;
  label: string;
  months: number;
  km: number;
  /** 카드 아래 짧은 설명 */
  note: string;
}

export const RACES: readonly RaceDef[] = [
  { key: "10K", label: "10km", months: 36, km: 10, note: "가볍게 뛰어 보기" },
  { key: "HALF", label: "하프", months: 60, km: 21.0975, note: "중간 거리 도전" },
  { key: "FULL", label: "풀코스", months: 120, km: 42.195, note: "길게 보는 완주" },
];

export interface RaceView {
  /** 세 거리 중 하나와 기간이 같으면 그 거리, 아니면 null (맞춤 코스) */
  race: RaceDef | null;
  label: string;
  km: number;
  months: number;
}

/** 기간(개월) → 거리(km). 0~36개월은 10km까지, 36~60은 하프까지, 60~120은 풀코스까지 곧게 잇는다 */
export function distanceKm(months: number): number {
  const points: [number, number][] = [[0, 0], ...RACES.map((r) => [r.months, r.km] as [number, number])];
  const m = Math.max(0, Math.min(months, RACES[RACES.length - 1].months));
  for (let i = 1; i < points.length; i++) {
    const [m0, k0] = points[i - 1];
    const [m1, k1] = points[i];
    if (m <= m1) return k0 + ((k1 - k0) * (m - m0)) / (m1 - m0);
  }
  return RACES[RACES.length - 1].km;
}

/** 거리 글자: 42.195km는 그대로, 나머지는 소수 한 자리 ("21.1km", "10km") */
export function formatKm(km: number): string {
  if (Math.abs(km - 42.195) < 1e-9) return "42.195km";
  const rounded = Math.round(km * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}km`;
}

export function raceForMonths(months: number): RaceView {
  const race = RACES.find((r) => r.months === months) ?? null;
  const km = race ? race.km : distanceKm(months);
  return { race, label: race ? race.label : "맞춤 코스", km, months };
}

/** 화면 글자: "10km" · "하프 21.1km" · "맞춤 코스 약 3.3km" (이름이 곧 거리면 한 번만) */
export function raceText(race: RaceView): string {
  if (!race.race) return `맞춤 코스 약 ${formatKm(race.km)}`;
  const km = formatKm(race.km);
  return race.label === km ? km : `${race.label} ${km}`;
}

/** 캐릭터 싱글렛 번호: 거리(km)를 반올림 ("10" · "21" · "42") */
export function bibOf(race: RaceView | null): string {
  return race ? String(Math.round(race.km)) : "42";
}

/** 입력의 목표 시점으로 고른 거리 (기준 달이나 목표 시점이 없으면 null) */
export function raceOfGoal(start: YearMonth | null | undefined, target: YearMonth | null | undefined): RaceView | null {
  if (!isYearMonth(start) || !isYearMonth(target)) return null;
  const months = monthsBetween(start, target);
  return months > 0 ? raceForMonths(months) : null;
}

/** 거리 카드를 누르면 정할 목표 시점 */
export function targetDateFor(start: YearMonth, race: RaceDef): YearMonth {
  return addMonths(start, race.months);
}

// ===== 코스 (배경) =====

/** 배경 장면: 코스 구간마다 하나 */
export type SceneKey = "sangam" | "hangang" | "yeouido" | "gwanghwamun" | "cheonggye" | "dongdaemun" | "jamsil";

/** 길가 그림 종류 */
export type NearKind = "park" | "river" | "blossom" | "palace" | "stream" | "fortress" | "stadium";

export interface SceneDef {
  key: SceneKey;
  /** 구간 이름 (장면 위 칩) */
  name: string;
  /** 하늘 위 · 아래, 땅, 길 색 */
  sky: [string, string];
  ground: string;
  road: string;
  near: NearKind;
}

export const SCENES: Record<SceneKey, SceneDef> = {
  sangam: { key: "sangam", name: "상암 월드컵공원", sky: ["#dff0ff", "#c7e4fa"], ground: "#9fd08f", road: "#8e97a3", near: "park" },
  hangang: { key: "hangang", name: "한강 다리", sky: ["#e2efff", "#cbe0fa"], ground: "#8cc3a0", road: "#949daa", near: "river" },
  yeouido: { key: "yeouido", name: "여의도", sky: ["#e8f1ff", "#d3e5fb"], ground: "#a5d297", road: "#8e97a3", near: "blossom" },
  gwanghwamun: { key: "gwanghwamun", name: "광화문광장", sky: ["#fdf0da", "#f9dfbd"], ground: "#d8c6a0", road: "#8f949b", near: "palace" },
  cheonggye: { key: "cheonggye", name: "청계천", sky: ["#e6f3ff", "#d2e8f8"], ground: "#b7c8b0", road: "#8e97a3", near: "stream" },
  dongdaemun: { key: "dongdaemun", name: "흥인지문", sky: ["#fff0dd", "#fcdcbd"], ground: "#cdbd96", road: "#90959c", near: "fortress" },
  jamsil: { key: "jamsil", name: "잠실종합운동장", sky: ["#e1efff", "#c9e0fb"], ground: "#a2d095", road: "#8e97a3", near: "stadium" },
};

export interface RouteSection {
  scene: SceneKey;
  /** 코스 길이 중 이 구간이 시작하는 자리 (0~1) */
  from: number;
}

export interface RouteDef {
  race: RaceKey;
  /** 본뜬 대회 */
  event: string;
  /** "광화문 → 잠실" */
  title: string;
  sections: readonly RouteSection[];
}

/**
 * 거리마다 정해진 코스 (2025 JTBC 서울마라톤 · 2026 서울마라톤 코스 안내를 본떴다).
 *  - 10km: JTBC 서울마라톤 10km — 상암 월드컵공원에서 양화대교를 건너 여의도공원까지
 *  - 하프: 서울마라톤 풀코스의 앞 절반 — 광화문광장에서 청계천을 따라 흥인지문까지
 *  - 풀코스: 서울마라톤 — 광화문광장 · 청계천 · 흥인지문을 지나 한강을 건너 잠실종합운동장까지
 * 구간 경계(from)는 그림을 바꾸는 자리라 실제 거리와 꼭 같지는 않다.
 */
export const ROUTES: Record<RaceKey, RouteDef> = {
  "10K": {
    race: "10K",
    event: "JTBC 서울마라톤 10km",
    title: "상암 → 여의도",
    sections: [
      { scene: "sangam", from: 0 },
      { scene: "hangang", from: 0.3 },
      { scene: "yeouido", from: 0.7 },
    ],
  },
  HALF: {
    race: "HALF",
    event: "서울마라톤 앞 절반",
    title: "광화문 → 흥인지문",
    sections: [
      { scene: "gwanghwamun", from: 0 },
      { scene: "cheonggye", from: 0.25 },
      { scene: "dongdaemun", from: 0.65 },
    ],
  },
  FULL: {
    race: "FULL",
    event: "서울마라톤",
    title: "광화문 → 잠실",
    sections: [
      { scene: "gwanghwamun", from: 0 },
      { scene: "cheonggye", from: 0.12 },
      { scene: "dongdaemun", from: 0.3 },
      { scene: "hangang", from: 0.5 },
      { scene: "jamsil", from: 0.78 },
    ],
  },
};

/** 거리로 정해지는 코스: 세 거리면 그 코스, 맞춤 거리는 들어가는 코스 (10km 이하 · 하프 이하 · 그 위). 거리를 모르면 풀코스 */
export function routeFor(race: RaceView | null): RouteDef {
  if (!race) return ROUTES.FULL;
  if (race.race) return ROUTES[race.race.key];
  const fits = RACES.find((r) => race.km <= r.km + 1e-9) ?? RACES[RACES.length - 1];
  return ROUTES[fits.key];
}

/** 달린 비율(0~1)에 맞는 장면 */
export function sceneAt(route: RouteDef, ratio: number): SceneDef {
  let key = route.sections[0].scene;
  for (const section of route.sections) if (ratio >= section.from) key = section.scene;
  return SCENES[key];
}

/** 출발 장면 */
export function startScene(route: RouteDef): SceneDef {
  return SCENES[route.sections[0].scene];
}

/** 결승 장면 */
export function finishScene(route: RouteDef): SceneDef {
  return SCENES[route.sections[route.sections.length - 1].scene];
}
