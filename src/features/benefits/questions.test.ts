import { describe, expect, it } from "vitest";
import { QUESTIONS, answeredCount, withAnswer } from "./questions";

describe("혜택 질문", () => {
  it("서버 Eligibility 칸 8개와 같은 이름", () => {
    expect(QUESTIONS.map((q) => q.key)).toEqual([
      "livingApart",
      "sme",
      "hireMonth",
      "taxReliefNow",
      "militaryMonths",
      "parentsIncomeLow",
      "rentDeposit",
      "monthlyTransit",
    ]);
  });

  it("답을 넣고 지우기 (null은 모름 → 칸을 뺀다)", () => {
    const a = withAnswer({}, "sme", true);
    expect(a).toEqual({ sme: true });
    expect(answeredCount(withAnswer(a, "rentDeposit", 0))).toBe(2);
    expect(withAnswer(a, "sme", null)).toEqual({});
  });
});
