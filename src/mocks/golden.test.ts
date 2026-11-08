import { describe, expect, it } from "vitest";
import type { SimulationInputDraft } from "@/lib/types";
import examplesData from "./data/examples.json";
import { addMonths } from "@/lib/year-month";
import { GOLDEN, adjustmentsKey, engineKey, findGoldenCase, goldenCaseByKey, shiftDates } from "./golden";

function golden(key: string): SimulationInputDraft {
  return structuredClone(goldenCaseByKey(key)!.input) as SimulationInputDraft;
}

describe("정답 파일", () => {
  it("8개 케이스, 결과 모양", () => {
    expect(GOLDEN.cases.map((c) => c.key)).toEqual(["S1", "S2", "S3", "E1", "E2", "E3", "E4", "E5"]);
    expect(GOLDEN.seed).toBe(20261007);
    expect(GOLDEN.paths).toBe(2000);
    for (const c of GOLDEN.cases) {
      expect(c.simulate.bands).toHaveLength(121);
      expect(c.simulate.checkpoints.map((p) => p.afterMonths)).toEqual([12, 36, 60, 120]);
      expect(c.compare.plans[0].isBase).toBe(true);
    }
  });

  it("S1은 명세 예시와 같다", () => {
    const s1 = goldenCaseByKey("S1")!;
    expect(s1.simulate.goal.probability).toBe(58);
    expect(s1.simulate.headline).toContain("4,440만 원");
    expect(s1.preview.adjustments).toEqual({ monthlyVariableExpense: 850000 });
    expect(s1.preview.adjusted.probability).toBe(70.5);
  });
});

describe("같은 입력 찾기 (엔진이 쓰는 값으로)", () => {
  it("각 케이스는 자기 자신을 찾는다 (8개 모두 다른 입력)", () => {
    for (const c of GOLDEN.cases) expect(findGoldenCase(c.input)?.golden.key).toBe(c.key);
    expect(new Set(GOLDEN.cases.map((c) => engineKey(c.input))).size).toBe(8);
  });

  it("백엔드 /examples의 S1~S3(기본값이 채워진 모양)도 같은 케이스", () => {
    for (const example of examplesData.examples) {
      expect(findGoldenCase(example.input as SimulationInputDraft)?.golden.key).toBe(example.key);
    }
  });

  it("이름·프리셋 이름은 보지 않는다", () => {
    const input = golden("S1");
    input.goal!.name = "다른 이름";
    input.loans!.items![0]!.name = "내 학자금";
    expect(findGoldenCase(input)?.golden.key).toBe("S1");
  });

  it("항목별(DETAIL) 지출은 합계로 비교한다", () => {
    const input = golden("E5");
    // E5 고정지출 = 70만 + 10만 + 50만
    input.expenses!.fixed = { inputMode: "TOTAL", items: [], total: 1_300_000 };
    expect(findGoldenCase(input)?.golden.key).toBe("E5");
  });

  it("비운 금리·상환 방식은 대출 종류 기본값으로 채워 비교한다", () => {
    const input = golden("E4");
    expect(input.loans!.items![0]!.annualRate).toBeNull();
    input.loans!.items![0]!.annualRate = 6.3;
    input.loans!.items![0]!.repaymentType = "EQUAL_PAYMENT";
    expect(findGoldenCase(input)?.golden.key).toBe("E4");
  });

  it("예정된 일은 달 순서로 비교한다", () => {
    const input = golden("E3");
    const [jobChange, ...car] = input.events!;
    input.events = [...car, jobChange];
    expect(findGoldenCase(input)?.golden.key).toBe("E3");
  });

  it("엔진 값이 하나라도 다르면 없음", () => {
    const input = golden("S1");
    input.income!.monthlyNetIncome = 2_600_000;
    expect(findGoldenCase(input)).toBeNull();

    // 기준 달만 바꾸면 목표까지 59개월이 되어 다른 입력
    const later = golden("S1");
    later.startMonth = "2026-12";
    expect(findGoldenCase(later)).toBeNull();
  });

  it("기준 달이 달라도 목표·예정된 일까지의 개월 수가 같으면 같은 입력 (날짜만 옮김)", () => {
    // 10월에 S1 값을 직접 넣으면: 기준 2026-10, 5년 뒤 = 2031-10
    const october = golden("S1");
    october.startMonth = "2026-10";
    october.goal!.targetDate = "2031-10";
    expect(findGoldenCase(october)).toMatchObject({ golden: { key: "S1" }, shift: -1 });

    const e3 = golden("E3");
    e3.startMonth = "2027-01";
    e3.goal!.targetDate = addMonths(e3.goal!.targetDate!, 2);
    e3.events = e3.events!.map((e) => ({ ...e, occurDate: addMonths(e.occurDate!, 2) }));
    expect(findGoldenCase(e3)).toMatchObject({ golden: { key: "E3" }, shift: 2 });
  });

  it("응답의 연월만 옮긴다", () => {
    const s1 = goldenCaseByKey("S1")!.simulate;
    const shifted = shiftDates(s1, -1);
    expect(shifted.startMonth).toBe("2026-10");
    expect(shifted.goal.medianReachDate).toBe("2031-05");
    expect(shifted.bands[0].month).toBe("2026-10");
    expect(shifted.risks.debt.medianFirstDate).toBe("2028-03");
    expect(shifted.goal.probability).toBe(58);
    expect(shifted.headline).toBe(s1.headline);
    expect(shiftDates(s1, 0)).toBe(s1);
  });

  it("조정값 비교는 순서·빈 값을 무시", () => {
    expect(adjustmentsKey({ monthlySaving: 1, monthlyVariableExpense: 2 })).toBe(
      adjustmentsKey({ monthlyVariableExpense: 2, monthlySaving: 1, goalTargetDate: undefined }),
    );
    expect(adjustmentsKey({})).toBe("[]");
    expect(adjustmentsKey(null)).toBe("[]");
  });
});
