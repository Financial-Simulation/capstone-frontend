import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import { benefits, cautions, chancePhrase, outOfTen, peopleText, simpleActions, simpleSummary } from "./simple";

const golden = (key: string) => goldenCaseByKey(key)!;

describe("확률을 횟수 · 사람 수로", () => {
  it.each([
    [66.1, 7],
    [58, 6],
    [74.7, 8],
    [75, 8],
    [64.4, 6],
    [64.6, 7],
    [1.3, 0],
    [100, 10],
  ] as const)("%d%% → 10번 중 %d번", (p, n) => {
    expect(outOfTen(p)).toBe(n);
  });

  it("95% 이상 · 5% 미만은 횟수 대신 말로", () => {
    expect(chancePhrase(96.6)).toBe("거의 확실하게 모아요");
    expect(chancePhrase(4.9)).toBe("거의 못 모아요");
    expect(chancePhrase(70.5)).toBe("10번 중 7번쯤 모아요");
  });

  it("10% 미만 위험은 100명 기준", () => {
    expect(peopleText(18.3)).toBe("10명 중 2명");
    expect(peopleText(5.5)).toBe("100명 중 6명");
    expect(peopleText(0.4)).toBe("100명 중 1명");
  });
});

describe("결론", () => {
  it("T1: 5년 뒤 3,000만 원, 10번 중 7번쯤", () => {
    const s = simpleSummary(golden("T1").simulate);
    expect(s).toMatchObject({ level: "fair", goal: "5년 뒤 3,000만 원", chance: "10번 중 7번쯤은 모을 수 있어요", percent: "66%" });
    expect(s.lines[1]).toBe("실직이나 급한 지출 없이 계획대로만 가면 4,909만 원까지 모여요.");
  });

  it("S3 96.6% · E4 1.3%는 횟수 대신 말로", () => {
    expect(simpleSummary(golden("S3").simulate).chance).toBe("거의 확실하게 모을 수 있어요");
    expect(simpleSummary(golden("E4").simulate).chance).toBe("모으기 어려워요");
  });

  it("어려운 말을 쓰지 않는다", () => {
    for (const key of ["S1", "S2", "S3", "E1", "E2", "E3", "E4", "E5", "T1", "T2", "T3"]) {
      const sim = golden(key).simulate;
      const text = [simpleSummary(sim).chance, ...simpleSummary(sim).lines, ...cautions(sim).map((c) => c.text), ...benefits(sim)].join(" ");
      expect(text).not.toMatch(/미래 2,000개|중간값|하위|오차|계산기|%p|분위/);
    }
  });
});

describe("조심할 점", () => {
  it("T1: 바닥날 위험 · 청년미래 해지(주로 급한 지출) · 많이 안 풀리면 빚", () => {
    const list = cautions(golden("T1").simulate);
    expect(list.map((c) => c.key)).toEqual(["debt", "termination", "worst"]);
    expect(list[0].text).toMatch(/^10명 중 2명은 목표 시점 전에 돈이 바닥나서/);
    expect(list[1].text).toBe("10명 중 2명은 청년미래적금을 만기 전에 깨요. 주로 급한 지출 때문이에요.");
    expect(list[2]).toEqual({ key: "worst", text: "많이 안 풀리면(20번 중 1번) 목표 시점에 오히려 1,320만 원 빚이 남을 수 있어요.", tone: "danger" });
  });

  it("S3: 위험이 작고 청년미래 대상이 아니면 '많이 안 풀려도' 한 줄만", () => {
    const list = cautions(golden("S3").simulate);
    expect(list).toEqual([{ key: "worst", text: "많이 안 풀려도(20번 중 1번) 목표 시점에 5,763만 원은 모여요.", tone: "info" }]);
  });
});

describe("받는 혜택", () => {
  it("T1: 연말정산 환급 · 정부 지원금", () => {
    expect(benefits(golden("T1").simulate)).toEqual([
      "매년 2월 연말정산으로 약 86만 원을 돌려받아요.",
      "청년미래적금으로 정부 지원금을 약 51만 원 받아요.",
    ]);
  });

  it("S3: 상품이 없으면 빈 목록", () => {
    expect(benefits(golden("S3").simulate)).toEqual([]);
  });
});

describe("이렇게 하면 좋아져요", () => {
  it("T1: 의미 있게 오르는 것 3개, 많이 오르는 순서", () => {
    const actions = simpleActions(golden("T1").reverse.levers, 66.1);
    expect(actions.map((a) => [a.chance, a.change])).toEqual([
      ["10번 중 8번쯤 모아요", "66% → 75%"],
      ["10번 중 8번쯤 모아요", "66% → 75%"],
      ["10번 중 7번쯤 모아요", "66% → 71%"],
    ]);
  });

  it("E5: 오르는 것이 없으면 빈 목록", () => {
    expect(simpleActions(golden("E5").reverse.levers, 0)).toEqual([]);
  });
});
