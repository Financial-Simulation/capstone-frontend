import { describe, expect, it } from "vitest";
import {
  MAX_MONEY_DIGITS,
  caretAfterDigits,
  digitsBeforeCaret,
  formatMoneyText,
  normalizeMoneyText,
} from "./money-input";

describe("금액 칸: 숫자만 · 쉼표 자동", () => {
  it("숫자만 남기고 쉼표를 넣는다", () => {
    expect(normalizeMoneyText("1234567")).toEqual({ text: "1,234,567", value: 1234567 });
    expect(normalizeMoneyText("12a3,4원")).toEqual({ text: "1,234", value: 1234 });
    expect(normalizeMoneyText(" 2 500 000 ")).toEqual({ text: "2,500,000", value: 2500000 });
  });

  it("비우면 null, 0은 0", () => {
    expect(normalizeMoneyText("")).toEqual({ text: "", value: null });
    expect(normalizeMoneyText("abc")).toEqual({ text: "", value: null });
    expect(normalizeMoneyText("0")).toEqual({ text: "0", value: 0 });
  });

  it("앞의 0은 지운다", () => {
    expect(normalizeMoneyText("0005")).toEqual({ text: "5", value: 5 });
    expect(normalizeMoneyText("000")).toEqual({ text: "0", value: 0 });
  });

  it("음수는 허용한 칸에서만", () => {
    expect(normalizeMoneyText("-300000")).toEqual({ text: "300,000", value: 300000 });
    expect(normalizeMoneyText("-300000", { allowNegative: true })).toEqual({ text: "-300,000", value: -300000 });
    expect(normalizeMoneyText("−5000", { allowNegative: true })).toEqual({ text: "-5,000", value: -5000 });
    expect(normalizeMoneyText("-", { allowNegative: true })).toEqual({ text: "-", value: null });
    expect(normalizeMoneyText("30-0", { allowNegative: true })).toEqual({ text: "300", value: 300 });
    const zero = normalizeMoneyText("-0", { allowNegative: true });
    expect(Object.is(zero.value, 0)).toBe(true);
  });

  it("자릿수 제한", () => {
    const long = "9".repeat(MAX_MONEY_DIGITS + 4);
    expect(normalizeMoneyText(long).value).toBe(Number("9".repeat(MAX_MONEY_DIGITS)));
    expect(normalizeMoneyText("123456", { maxDigits: 4 })).toEqual({ text: "1,234", value: 1234 });
  });

  it("값 → 칸 글자", () => {
    expect(formatMoneyText(1234567)).toBe("1,234,567");
    expect(formatMoneyText(-300000)).toBe("-300,000");
    expect(formatMoneyText(0)).toBe("0");
    expect(formatMoneyText(null)).toBe("");
  });
});

describe("커서 위치", () => {
  /** 칸에 raw가 있고 커서가 caret일 때, 쉼표를 다시 넣은 뒤의 글자와 커서 */
  function retype(raw: string, caret: number) {
    const { text } = normalizeMoneyText(raw);
    return { text, caret: caretAfterDigits(text, digitsBeforeCaret(raw, caret)) };
  }

  it("끝에 숫자를 치면 끝에 있다", () => {
    expect(retype("1,2345", 6)).toEqual({ text: "12,345", caret: 6 });
  });

  it("가운데 숫자를 치면 그 숫자 뒤에 있다", () => {
    // "1,|234"에서 9 → "1,9|234" → "19|,234"
    expect(retype("1,9234", 3)).toEqual({ text: "19,234", caret: 2 });
  });

  it("맨 앞", () => {
    expect(retype("51,234", 1)).toEqual({ text: "51,234", caret: 1 });
    expect(caretAfterDigits("-1,000", 0)).toBe(1);
    expect(caretAfterDigits("", 0)).toBe(0);
  });

  it("숫자를 지우면 지운 자리에 있다", () => {
    // "12,3|45"에서 Backspace → "12,|45" → "1,2|45"
    expect(retype("12,45", 3)).toEqual({ text: "1,245", caret: 3 });
  });
});
