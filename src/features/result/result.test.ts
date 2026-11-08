import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { SimulationInputDraft } from "@/lib/types";
import {
  causeRows,
  checkpointRows,
  eventMarks,
  leverRows,
  probabilityLevel,
  reverseLines,
  riskCards,
  yearlyRows,
} from "./result";

const golden = (key: string) => goldenCaseByKey(key)!;

describe("달성 가능성 색 기준 (70 / 50)", () => {
  it.each([
    [96.6, "good"],
    [70, "good"],
    [69.9, "fair"],
    [58, "fair"],
    [50, "fair"],
    [49.9, "low"],
    [1.3, "low"],
  ] as const)("%d%% → %s", (p, level) => {
    expect(probabilityLevel(p)).toBe(level);
  });
});

describe("1 · 3 · 5 · 10년 표", () => {
  it("S1: 5년 뒤가 목표 시점", () => {
    const rows = checkpointRows(golden("S1").simulate);
    expect(rows.map((r) => r.label)).toEqual(["1년 뒤", "3년 뒤", "5년 뒤", "10년 뒤"]);
    expect(rows.find((r) => r.isGoal)).toMatchObject({ months: 60, date: "2031-11", p50: 33_101_927, p5: -15_684_865 });
  });

  it("E1: 목표(2년 뒤)가 눈금에 없으면 그 줄을 끼워 넣는다", () => {
    const rows = checkpointRows(golden("E1").simulate);
    expect(rows.map((r) => r.months)).toEqual([12, 24, 36, 60, 120]);
    expect(rows[1].isGoal).toBe(true);
  });

  it("표로 보기는 1년마다 + 목표 시점", () => {
    const rows = yearlyRows(golden("E1").simulate);
    expect(rows.map((r) => r.months)).toEqual([0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120]);
    expect(rows[0].label).toBe("지금");
  });
});

describe("위험 카드", () => {
  it("S1: 빚질 18.9% · 최악 −1,568만 원 · 중도해지 43.9% · 지원금 · 현금 부족 2028년 4월", () => {
    const cards = riskCards(golden("S1").simulate);
    expect(cards.map((c) => c.value)).toEqual(["18.9%", "−1,568만 원", "43.9%", "57만 40원", "2028년 4월"]);
    expect(cards[1].tone).toBe("danger");
    expect(cards[4].tone).toBe("warn");
  });

  it("S3(36세): 청년미래적금 비대상 → 해당 없음 + 이유", () => {
    const cards = riskCards(golden("S3").simulate, "만 34세를 넘어 청년미래적금 대상이 아니에요.");
    expect(cards[2]).toMatchObject({ value: "해당 없음", detail: "만 34세를 넘어 청년미래적금 대상이 아니에요.", tone: "muted" });
    expect(cards[3].value).toBe("해당 없음");
  });

  it("E1: 0원 아래로 내려가는 미래가 없으면 회색 '현금 부족 없음'", () => {
    const cash = riskCards(golden("E1").simulate)[4];
    expect(cash).toMatchObject({ value: "현금 부족 없음", tone: "muted" });
  });

  it("서버 이유가 없을 때만 기준 숫자(config)로 문장을 만든다", () => {
    expect(riskCards(golden("S3").simulate)[2].detail).toBe(
      "청년미래적금 대상이 아니에요 (만 34세 초과 또는 총급여 7,500만 원 초과).",
    );
  });

  it("지원금 설명의 경로 수는 응답의 paths", () => {
    expect(riskCards(golden("S1").simulate)[3].detail).toBe("청년미래적금으로 받는 정부 지원금 (미래 2,000개의 평균)");
  });

  it("v1.7 T2(세전 6,500만 원): 가입은 되지만 지원금 없음 → 서버 안내 문장", () => {
    const message = "총급여가 6,000만 원을 넘어 청년미래적금 정부 지원금은 없어요. 가입과 이자는 그대로예요.";
    const t2 = { ...golden("T2").simulate, warnings: [{ code: "INFO_POLICY_NO_MATCH", message }] };
    const cards = riskCards(t2);
    expect(cards[2].value).toBe("1.3%");
    expect(cards[3]).toMatchObject({ value: "없음", detail: message, tone: "muted" });
  });
});

describe("주요 원인 · 이렇게 바꿔 보세요", () => {
  it("S1: 적금을 처음 깬 이유 (합 100%)", () => {
    const { rows, total, empty } = causeRows(golden("S1").simulate.causes);
    expect(rows.map((r) => `${r.label} ${r.share}`)).toEqual(["실직 직후 21.9", "실업 장기화 0", "급한 지출 75.9", "매달 부족 2.2"]);
    expect(total).toBe(1123);
    expect(empty).toBe(false);
    expect(causeRows(golden("S3").simulate.causes).empty).toBe(true);
  });

  it("S1 levers: 변동지출 10만 원 줄이기 → 70.5% (+12.5%p), 저축 줄이기는 거의 차이 없음", () => {
    const rows = leverRows(golden("S1").reverse);
    expect(rows[0]).toMatchObject({ label: "변동지출을 월 10만 원 줄이기", probability: "70.5%", diff: "+12.5%p", flat: false });
    expect(rows.at(-1)).toMatchObject({ type: "REDUCE_SAVING", flat: true });
  });

  it("역산 요약 문장", () => {
    expect(reverseLines(golden("S1").reverse)).toEqual([
      "변동지출을 월 10만 원 줄이면 70.5%가 돼요.",
      "지금 계획 그대로라면 2032년 12월(6년 1개월 뒤)에 70%가 돼요.",
      "월 저축액만 바꿔서는 70%에 닿지 않아요 (가장 높을 때 월 45만 원에서 57.6%).",
    ]);
    expect(reverseLines(golden("S3").reverse)[0]).toBe("지금 계획으로 이미 70% 이상이에요.");
    expect(reverseLines(golden("E5").reverse)).toContain("변동지출만 줄여서는 70%에 닿지 않아요.");
    expect(reverseLines(golden("E3").reverse)).toContain("지금 계획 그대로는 10년 안에 70%에 닿지 않아요.");
  });
});

describe("예정된 일 표시 (입력의 occurDate)", () => {
  it("기준 달부터 개월 수, 같은 달은 묶는다", () => {
    const input = golden("E3").input as SimulationInputDraft;
    expect(eventMarks(input)).toEqual([
      { months: 18, label: "이직" },
      { months: 36, label: "자동차" },
    ]);
    expect(eventMarks({ events: [] })).toEqual([]);
  });
});
