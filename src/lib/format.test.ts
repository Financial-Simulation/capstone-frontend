import { describe, expect, it } from "vitest";
import {
  MINUS,
  formatKoreanWon,
  formatManwon,
  formatManwonRange,
  formatPercent,
  formatPercentPoint,
  formatRange,
  formatSigned,
  formatSignedRange,
  formatWon,
  groupDigits,
  roundHalfUp,
} from "./format";

describe("음수 기호", () => {
  it("하이픈이 아니라 U+2212", () => {
    expect(MINUS).toBe("−");
    expect(formatWon(-1234)).toBe("−1,234원");
  });
});

describe("groupDigits · roundHalfUp", () => {
  it("천 단위 쉼표", () => {
    expect(groupDigits(0)).toBe("0");
    expect(groupDigits(999)).toBe("999");
    expect(groupDigits(1000)).toBe("1,000");
    expect(groupDigits(1234567)).toBe("1,234,567");
    expect(groupDigits(-1234567)).toBe("1,234,567");
  });

  it("HALF_UP: 0.5는 0에서 멀어지는 쪽", () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.4)).toBe(2);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(-2.4)).toBe(-2);
  });
});

describe("formatWon", () => {
  it("원 단위 그대로", () => {
    expect(formatWon(134839)).toBe("134,839원");
    expect(formatWon(0)).toBe("0원");
  });
  it("값이 없으면 빈 글자", () => {
    expect(formatWon(null)).toBe("");
    expect(formatWon(undefined)).toBe("");
    expect(formatWon(Number.NaN)).toBe("");
  });
});

describe("formatKoreanWon (백엔드 Money.toKorean + 억)", () => {
  it.each([
    [465161, "46만 5,161원"],
    [500000, "50만 원"],
    [3000, "3,000원"],
    [0, "0원"],
    [127452602, "1억 2,745만 2,602원"],
    [100000000, "1억 원"],
    [100000500, "1억 500원"],
    [-465161, "−46만 5,161원"],
  ])("%d → %s", (value, expected) => {
    expect(formatKoreanWon(value)).toBe(expected);
  });
});

describe("formatManwon (구현 명세 7.6)", () => {
  it.each([
    [44396264, "4,440만 원"],
    [127452602, "1억 2,745만 원"],
    [100000000, "1억 원"],
    [-15684865, "−1,568만 원"],
    [4999, "0원"],
    [5000, "1만 원"],
    [-5000, "−1만 원"],
    [99995000, "1억 원"],
  ])("%d → %s", (value, expected) => {
    expect(formatManwon(value)).toBe(expected);
  });
});

describe("확률", () => {
  it("formatPercent", () => {
    expect(formatPercent(58)).toBe("58.0%");
    expect(formatPercent(70.5)).toBe("70.5%");
    expect(formatPercent(-3.1)).toBe("−3.1%");
    expect(formatPercent(null)).toBe("");
  });
  it("formatPercentPoint", () => {
    expect(formatPercentPoint(12.5)).toBe("+12.5%p");
    expect(formatPercentPoint(-3.1)).toBe("−3.1%p");
    expect(formatPercentPoint(0)).toBe("0.0%p");
  });
});

describe("범위 안내 (LIMITS → 칸 아래 글자)", () => {
  it("숫자 범위 · 부호 붙은 범위", () => {
    expect(formatRange({ min: 19, max: 39 }, "세")).toBe("19~39세");
    expect(formatRange({ min: 1, max: 480 }, "개월")).toBe("1~480개월");
    expect(formatSignedRange({ min: -90, max: 200 }, "%")).toBe("−90~+200%");
    expect([formatSigned(10), formatSigned(-3), formatSigned(0)]).toEqual(["+10", "−3", "0"]);
  });
  it("만 원 단위 금액 범위", () => {
    expect(formatManwonRange({ min: 10_000, max: 30_000_000 })).toBe("1만~3,000만 원");
    expect(formatManwonRange({ min: 10_000, max: 1_000_000_000 })).toBe("1만~10억 원");
    expect(formatManwonRange({ min: 0, max: 30_000_000 })).toBe("0~3,000만 원");
  });
});
