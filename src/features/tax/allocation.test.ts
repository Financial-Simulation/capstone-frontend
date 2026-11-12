import { describe, expect, it } from "vitest";
import { HOUSING_SUBSCRIPTION, PENSION_SAVING, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { LIMITS } from "@/lib/rules";
import { goldenCaseByKey } from "@/mocks/golden";
import {
  ALLOCATION_HINTS,
  allocationErrors,
  comparePlans,
  compareRows,
  generalRest,
  recommendCards,
  recommendNote,
  restHint,
  toMonthly,
} from "./allocation";

const golden = (key: string) => goldenCaseByKey(key)!;
const alloc = (policyMonthly: number, housingMonthly: number, pensionMonthly: number) => ({
  policyMonthly,
  housingMonthly,
  pensionMonthly,
});

describe("칸 안내 · 일반 적금(나머지) · 범위", () => {
  it("안내 문장 (숫자는 config, tax-addon.js와 같은 문장)", () => {
    expect(ALLOCATION_HINTS).toEqual({
      policyMonthly: "월 50만 원까지, 정부 지원금 6%",
      housingMonthly: "월 50만 원까지. 납입액 연 300만 원까지 40% 소득공제, 5년 안에 깨면 추징",
      pensionMonthly: "월 150만 원까지. 연 600만 원까지 세액공제, 55세 전에 꺼내면 16.5%",
    });
  });

  it("나머지는 일반 적금, 합이 월 저축액보다 많으면 빨간 안내", () => {
    expect(generalRest(500_000, alloc(300_000, 100_000, 50_000))).toBe(50_000);
    expect(restHint(50_000)).toEqual({ text: "남는 돈은 일반 적금(연 3.03%)에 넣어요.", over: false });
    expect(restHint(0, 4.2).text).toBe("남는 돈은 일반 적금(연 4.2%)에 넣어요.");
    expect(restHint(generalRest(500_000, alloc(300_000, 250_000, 0)))).toEqual({
      text: "합이 월 저축액보다 5만 원 많아요. 계산할 때 연금저축 → 청약 순서로 줄여요.",
      over: true,
    });
  });

  it("칸 범위: 청년미래 · 청약 50만, 연금저축 150만 원 (입력 칸 규칙과 같은 문장)", () => {
    // 칸 아래 안내(제도 한도, config)와 칸 규칙(LIMITS)이 같은 한도인지
    expect([LIMITS.policyMonthly.max, LIMITS.housingMonthly.max, LIMITS.pensionMonthly.max]).toEqual([
      YOUTH_FUTURE_SAVING.monthlyLimit,
      HOUSING_SUBSCRIPTION.monthlyLimit,
      PENSION_SAVING.monthlyLimit,
    ]);
    expect(allocationErrors(alloc(500_000, 500_000, 1_500_000))).toEqual({});
    expect(allocationErrors(alloc(500_001, 0, 1_500_001))).toEqual({
      policyMonthly: "0원 ~ 50만 원 사이로 입력해 주세요",
      pensionMonthly: "0원 ~ 150만 원 사이로 입력해 주세요 (연금계좌 한도 연 1,800만 원)",
    });
  });
});

describe("지금 계획과 비교할 배분 (최대 3개)", () => {
  it("S1(청년미래 50만)이면 지금과 같은 예시는 빼고 '청약·연금저축 10만 원씩'만", () => {
    const current = alloc(500_000, 0, 0);
    expect(comparePlans(current, current, 500_000, true)).toEqual([
      { name: "청약·연금저축 10만 원씩", adjustments: alloc(300_000, 100_000, 100_000) },
    ]);
  });

  it("T1(30/10/10)에서 배분을 바꾸면 '바꾼 배분'이 맨 앞, 겹치는 예시는 하나만", () => {
    const plans = comparePlans(alloc(200_000, 0, 300_000), alloc(300_000, 100_000, 100_000), 500_000, true);
    expect(plans.map((p) => p.name)).toEqual(["바꾼 배분", "청년미래·일반 적금만"]);
    // 정답 파일 T1의 비교 계획과 같은 배분
    expect(plans[1].adjustments).toEqual(golden("T1").compare.plans[3].adjustments);
  });

  it("청년미래 대상이 아니면 예시에서 청년미래를 0으로", () => {
    const plans = comparePlans(alloc(0, 0, 0), alloc(0, 0, 0), 600_000, false);
    expect(plans).toEqual([
      { name: "일반 적금 + 연금저축", adjustments: alloc(0, 0, 500_000) },
      { name: "청약·연금저축 10만 원씩", adjustments: alloc(0, 100_000, 100_000) },
    ]);
  });

  it("합이 월 저축액을 넘는 예시는 빼고, 보낼 게 없으면 빈 목록 (버튼을 끈다)", () => {
    const current = alloc(150_000, 0, 0);
    expect(comparePlans(current, current, 150_000, true)).toEqual([]);
  });

  it("3개를 넘지 않는다", () => {
    const plans = comparePlans(alloc(0, 250_000, 0), alloc(100_000, 100_000, 100_000), 500_000, true);
    expect(plans.map((p) => p.name)).toEqual(["바꾼 배분", "청년미래·일반 적금만", "청약·연금저축 10만 원씩"]);
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
});

describe("지금 계획과 비교 표 (/compare, 서버 값 그대로)", () => {
  it("T1: 지금 계획 · 의미 있는 차이 · 거의 차이 없음, 배분이 다른 줄만 '이 배분으로'", () => {
    const t1 = golden("T1");
    const rows = compareRows(t1.compare, toMonthly(t1.simulate.tax!.allocation));
    expect(rows.map((r) => [r.name, r.probability, r.diff?.text ?? null, r.apply !== null])).toEqual([
      ["지금 계획", "66.1%", null, false],
      ["변동지출 10만 원 줄이기", "74.7%", "+8.6%p", false],
      ["목표 1년 늦추기", "75.0%", "+8.9%p", false],
      ["청년미래·일반 적금만", "66.2%", "거의 차이 없음", true],
    ]);
    expect(rows[0]).toMatchObject({
      allocation: ["청년미래 30만 원", "청약 10만 원 · 연금 10만 원", "일반 0원"],
      taxNetBenefit: "427만 6,268원",
      earlyTermination: "16.8%",
      medianAtGoal: "3,766만 원",
    });
    expect(rows[3].diff?.tone).toBe("flat");
  });
});
