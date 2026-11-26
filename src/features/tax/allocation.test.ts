import { describe, expect, it } from "vitest";
import { HOUSING_SUBSCRIPTION, PENSION_SAVING, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { LIMITS } from "@/lib/rules";
import { goldenCaseByKey } from "@/mocks/golden";
import { recommendCards, recommendNote } from "./allocation";

const golden = (key: string) => goldenCaseByKey(key)!;
const alloc = (policyMonthly: number, housingMonthly: number, pensionMonthly: number) => ({
  policyMonthly,
  housingMonthly,
  pensionMonthly,
});

describe("배분 한도", () => {
  it("입력 칸 규칙(LIMITS)과 제도 한도(config)가 같다: 청년미래 · 청약 50만, 연금저축 150만 원", () => {
    expect([LIMITS.policyMonthly.max, LIMITS.housingMonthly.max, LIMITS.pensionMonthly.max]).toEqual([
      YOUTH_FUTURE_SAVING.monthlyLimit,
      HOUSING_SUBSCRIPTION.monthlyLimit,
      PENSION_SAVING.monthlyLimit,
    ]);
  });
});

describe("가장 좋은 배분 찾기 (/allocations/recommend, 서버 값 그대로)", () => {
  it("S1: 지금 · 가능성 최고 · 세금·지원금 최고, 2%p보다 작은 차이는 '지금과 거의 같음'", () => {
    const cards = recommendCards(golden("S1").recommend);
    expect(cards.map((c) => [c.title, c.probability, c.diff])).toEqual([
      ["지금 배분", "58.0%", null],
      ["목표 달성 가능성이 가장 높은 배분", "58.9%", "지금과 거의 같음"],
      ["세금·지원금이 가장 큰 배분", "57.4%", "지금과 거의 같음"],
    ]);
    expect(cards[0]).toMatchObject({
      allocation: "청년미래 50만 원 · 청약 0원 · 연금 0원 · 일반 0원",
      benefit: "세금 순이득 −4만 6,625원 + 정부 지원금 75만 7,949원 = 71만 1,324원",
      apply: null,
    });
    expect(cards[2].apply).toEqual(alloc(100_000, 100_000, 300_000));
    expect(cards[2].benefit).toBe("세금 순이득 176만 2,063원 + 정부 지원금 18만 9,870원 = 195만 1,933원");
  });

  it("설명: 서버 규칙 문장 + 지원금 기간이 다르다는 안내 (위험 카드는 4년)", () => {
    const note = recommendNote(golden("S1").recommend, 2000, "2031년 11월");
    expect(note.startsWith("배분 39가지를 같은 미래 2,000개로 계산했어요. 청년미래 0~50만 원(10만 원 간격)")).toBe(true);
    expect(note).toContain("세금·지원금은 목표 시점(2031년 11월)까지 받는 돈의 평균이에요.");
    expect(note.endsWith("위 '위험'의 정부 지원금은 4년 안에 받는 돈이라 숫자가 다를 수 있어요.")).toBe(true);
  });

  it("추천 기준이 같은 배분을 고르면 기준을 한 카드에 모은다", () => {
    const rec = golden("S1").recommend;
    expect(recommendCards({ ...rec, bestBenefit: rec.bestProbability }).map(({ title }) => title)).toEqual([
      "지금 배분",
      "목표 달성 가능성과 혜택이 가장 높은 배분",
    ]);
    expect(recommendCards({ ...rec, bestProbability: rec.current, bestBenefit: rec.current }).map(({ title }) => title)).toEqual([
      "지금 배분 · 가능성 최고 · 혜택 최대",
    ]);
  });
});
