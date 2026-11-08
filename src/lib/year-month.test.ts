import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentYearMonth,
  formatDuration,
  formatYearMonth,
  isWithinMonths,
  isYearMonth,
  monthsBetween,
  selectableYears,
  splitYearMonth,
  toYearMonth,
} from "./year-month";

describe("연월 고르기 범위", () => {
  it("목표: 기준 달부터 12~120개월", () => {
    expect(isWithinMonths("2026-10", "2027-09", 12, 120)).toBe(false);
    expect(isWithinMonths("2026-10", "2027-10", 12, 120)).toBe(true);
    expect(isWithinMonths("2026-10", "2036-10", 12, 120)).toBe(true);
    expect(isWithinMonths("2026-10", "2036-11", 12, 120)).toBe(false);
    expect(selectableYears("2026-10", 12, 120)).toEqual([2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036]);
  });

  it("예정된 일: 0~119개월 (이번 달부터)", () => {
    expect(isWithinMonths("2026-10", "2026-10", 0, 119)).toBe(true);
    expect(isWithinMonths("2026-10", "2036-09", 0, 119)).toBe(true);
    expect(isWithinMonths("2026-10", "2036-10", 0, 119)).toBe(false);
    expect(selectableYears("2026-10", 0, 119)[0]).toBe(2026);
    expect(isWithinMonths("2026-10", "bad", 0, 119)).toBe(false);
  });

  it("연 · 월 나누기", () => {
    expect(toYearMonth(2031, 11)).toBe("2031-11");
    expect(toYearMonth(2027, 1)).toBe("2027-01");
    expect(splitYearMonth("2031-11")).toEqual({ year: 2031, month: 11 });
  });
});

describe("year-month", () => {
  it("YYYY-MM 형식만", () => {
    expect(isYearMonth("2026-11")).toBe(true);
    expect(isYearMonth("2026-13")).toBe(false);
    expect(isYearMonth("2026-1")).toBe(false);
    expect(isYearMonth("2026-00")).toBe(false);
    expect(isYearMonth(202611)).toBe(false);
    expect(isYearMonth(null)).toBe(false);
  });

  it("지금 달은 기기 시간 기준", () => {
    expect(currentYearMonth(new Date(2026, 9, 27))).toBe("2026-10");
    expect(currentYearMonth(new Date(2026, 0, 1))).toBe("2026-01");
    expect(currentYearMonth(new Date(2026, 11, 31, 23, 59))).toBe("2026-12");
  });

  it("개월 더하기 · 빼기", () => {
    expect(addMonths("2026-11", 60)).toBe("2031-11");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 119)).toBe("2036-10");
  });

  it("두 달 사이 개월 수", () => {
    expect(monthsBetween("2026-11", "2031-11")).toBe(60);
    expect(monthsBetween("2026-11", "2027-10")).toBe(11);
    expect(monthsBetween("2026-11", "2026-10")).toBe(-1);
  });

  it("보여 주는 모양", () => {
    expect(formatYearMonth("2031-11")).toBe("2031년 11월");
    expect(formatYearMonth("2027-01")).toBe("2027년 1월");
    expect(formatYearMonth(null)).toBe("");
    expect(formatDuration(60)).toBe("5년");
    expect(formatDuration(30)).toBe("2년 6개월");
    expect(formatDuration(7)).toBe("7개월");
    expect(formatDuration(0)).toBe("0개월");
  });
});
