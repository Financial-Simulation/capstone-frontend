import type { YearMonth } from "./types";

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === "string" && YEAR_MONTH.test(value);
}

function toIndex(ym: YearMonth): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

function fromIndex(index: number): YearMonth {
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** 이 기기의 지금 달 ("YYYY-MM", 기기 시간대 기준) */
export function currentYearMonth(now: Date = new Date()): YearMonth {
  return fromIndex(now.getFullYear() * 12 + now.getMonth());
}

export function addMonths(ym: YearMonth, months: number): YearMonth {
  return fromIndex(toIndex(ym) + months);
}

/** to − from (개월). '2026-11' → '2031-11' = 60 */
export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return toIndex(to) - toIndex(from);
}

export function toYearMonth(year: number, month: number): YearMonth {
  return fromIndex(year * 12 + (month - 1));
}

export function splitYearMonth(ym: YearMonth): { year: number; month: number } {
  const [year, month] = ym.split("-").map(Number);
  return { year, month };
}

/** 기준 달부터 min~max개월 안인지 (목표 12~120, 예정된 일 0~119) */
export function isWithinMonths(start: YearMonth, ym: YearMonth, min: number, max: number): boolean {
  if (!isYearMonth(start) || !isYearMonth(ym)) return false;
  const months = monthsBetween(start, ym);
  return months >= min && months <= max;
}

/** 고를 수 있는 연도 (기준 달 + min ~ 기준 달 + max) */
export function selectableYears(start: YearMonth, min: number, max: number): number[] {
  const from = splitYearMonth(addMonths(start, min)).year;
  const to = splitYearMonth(addMonths(start, max)).year;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** '2031-11' → '2031년 11월' */
export function formatYearMonth(ym: YearMonth | null | undefined): string {
  if (!isYearMonth(ym)) return "";
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}

/** 기준 달부터 n개월 뒤를 '○년 ○개월'로. 60 → '5년', 30 → '2년 6개월' */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}개월`;
  return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`;
}
