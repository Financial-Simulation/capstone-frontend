import { describe, expect, it } from "vitest";
import { formatNumberText, normalizeNumberText } from "./number-input";

describe("숫자 칸 (쉼표 없음)", () => {
  it("정수만", () => {
    expect(normalizeNumberText("27")).toEqual({ text: "27", value: 27 });
    expect(normalizeNumberText("2a7세")).toEqual({ text: "27", value: 27 });
    expect(normalizeNumberText("1.9")).toEqual({ text: "19", value: 19 });
    expect(normalizeNumberText("")).toEqual({ text: "", value: null });
    expect(normalizeNumberText("007")).toEqual({ text: "7", value: 7 });
    expect(normalizeNumberText("0")).toEqual({ text: "0", value: 0 });
  });

  it("소수 (금리)", () => {
    const rate = { decimals: 2 };
    expect(normalizeNumberText("1.9", rate)).toEqual({ text: "1.9", value: 1.9 });
    expect(normalizeNumberText("3.", rate)).toEqual({ text: "3.", value: 3 });
    expect(normalizeNumberText(".5", rate)).toEqual({ text: "0.5", value: 0.5 });
    expect(normalizeNumberText("3.031", rate)).toEqual({ text: "3.03", value: 3.03 });
    expect(normalizeNumberText("1.2.3", rate)).toEqual({ text: "1.23", value: 1.23 });
    expect(normalizeNumberText("00.5", rate)).toEqual({ text: "0.5", value: 0.5 });
  });

  it("음수는 허용한 칸에서만 (연봉 변화율)", () => {
    expect(normalizeNumberText("-10")).toEqual({ text: "10", value: 10 });
    expect(normalizeNumberText("-10", { allowNegative: true })).toEqual({ text: "-10", value: -10 });
    expect(normalizeNumberText("−90", { allowNegative: true })).toEqual({ text: "-90", value: -90 });
    expect(normalizeNumberText("-", { allowNegative: true })).toEqual({ text: "-", value: null });
    expect(Object.is(normalizeNumberText("-0", { allowNegative: true }).value, 0)).toBe(true);
  });

  it("자릿수 제한", () => {
    expect(normalizeNumberText("12345", { maxIntegerDigits: 3 })).toEqual({ text: "123", value: 123 });
  });

  it("값 → 글자", () => {
    expect(formatNumberText(27)).toBe("27");
    expect(formatNumberText(1.9, 2)).toBe("1.9");
    expect(formatNumberText(3.03, 2)).toBe("3.03");
    expect(formatNumberText(4.3, 2)).toBe("4.3");
    expect(formatNumberText(null)).toBe("");
    expect(normalizeNumberText(formatNumberText(0.07, 2), { decimals: 2 }).value).toBe(0.07);
  });
});
