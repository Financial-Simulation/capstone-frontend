import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import { ApiError, CLIENT_MESSAGES } from "@/lib/api";
import type { SimulationInputDraft } from "@/lib/types";
import {
  causeRows,
  checkpointRows,
  eventMarks,
  failure,
  leverRows,
  probabilityLevel,
  reverseLines,
  riskCards,
  taxView,
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

describe("계산하지 못했을 때 (입력 확인하기 / 다시 계산)", () => {
  it("입력 칸 오류 → 그 칸이 있는 입력 화면", () => {
    const common400 = new ApiError("COMMON400", "입력값이 올바르지 않습니다.", 400, { "input.person.age": "나이는 19세 이상이어야 해요." });
    expect(failure(common400)).toEqual({ kind: "input", step: "BASIC", message: "나이는 19세 이상이어야 해요." });
    expect(failure(new ApiError("GOAL4001", "목표 시점은 시작 달 이후여야 해요.", 400))).toMatchObject({ kind: "input", step: "GOAL" });
    expect(failure(new ApiError("EVENT4002", "예정된 일은 시뮬레이션 기간 안이어야 해요.", 400))).toMatchObject({
      kind: "input",
      step: "EVENTS",
    });
  });

  it("백엔드 꺼짐 · 연결 실패 · 서버 오류 → 다시 계산 (입력 화면으로 보내지 않음)", () => {
    expect(failure(new ApiError("BACKEND_UNAVAILABLE", CLIENT_MESSAGES.backendUnavailable, 500))).toEqual({
      kind: "retry",
      message: CLIENT_MESSAGES.backendUnavailable,
    });
    expect(failure(new ApiError("NETWORK", CLIENT_MESSAGES.network, null))).toMatchObject({ kind: "retry" });
    expect(failure(new ApiError("COMMON500", "서버 에러, 관리자에게 문의 바랍니다.", 500))).toMatchObject({ kind: "retry" });
    expect(failure(new Error("boom"))).toMatchObject({ kind: "retry", message: expect.stringContaining("다시 시도") });
  });
});

describe("세금 블록 (/simulate의 tax, 숫자는 모두 서버 값)", () => {
  const view = (key: string, input?: SimulationInputDraft) => taxView(golden(key).simulate, input ?? (golden(key).input as SimulationInputDraft))!;

  it("T1: 카드 5장 (월세 50만 · 배분 30/10/10)", () => {
    const t1 = view("T1");
    expect(t1.intro).toBe("연말정산으로 돌려받는 세금과 해지할 때 내는 세금이에요. 목표 시점(2031년 11월)까지, 미래 2,000개의 평균이에요.");
    expect(t1.cards.map((c) => [c.title, c.value])).toEqual([
      ["매년 돌려받는 세금", "86만 4,066원"],
      ["목표 시점까지 돌려받는 세금", "432만 332원"],
      ["낸 이자소득세", "3만 6,606원"],
      ["해지로 다시 낸 세금", "7,491원"],
      ["세금으로 본 순이득", "427만 6,235원"],
    ]);
    expect(t1.cards[3].detail).toBe("청약 추징 823원 · 연금 6,668원");
    expect(t1.cards[4].tone).toBe("good");
  });

  it("T1 안내: 연금저축 공제 한도 · 해지 확률 5% 이상 · 우대형 (월세를 넣었으니 월세 안내는 없음)", () => {
    const notes = view("T1").notes;
    expect(notes.map((n) => n.key)).toEqual(["pensionLimit", "pensionBreak", "housingBreak", "preferential"]);
    expect(notes[1].text).toBe("목표 시점까지 연금저축을 중간에 꺼낼 확률이 16.5%예요. 꺼내면 공제받은 돈과 수익의 16.5%를 다시 내요.");
    expect(notes[2].text).toContain("청약을 깰 확률이 48.6%예요. 가입 5년 안에 깨면");
    expect(notes[3].text).toContain("지금 계획 기준으로 약 51만 원을 더 받아요.");
    // 화면에서 계산하던 '내는 세금 연 약 n만 원'은 넣지 않는다
    expect(notes.some((n) => n.text.includes("내는 세금"))).toBe(false);
  });

  it("T2: 지원금이 없으면(총급여 6,000만 원 초과) 우대형 안내 없음, 해지 확률 5% 미만이면 그 안내도 없음", () => {
    expect(view("T2").notes.map((n) => n.key)).toEqual(["pensionLimit", "housingBreak", "rent"]);
  });

  it("S1: 상품 · 월세가 없으면 순이득은 음수(빨강)이고 월세 · 상품 안내", () => {
    const s1 = view("S1");
    expect(s1.cards[4]).toMatchObject({ value: "−4만 6,687원", tone: "danger" });
    expect(s1.notes.map((n) => n.key)).toEqual(["preferential", "rent", "noProducts"]);
    expect(s1.notes[1].link).toEqual({ href: "/input/basic#f-expenses-monthlyRent", label: "그중 월세 넣기" });
  });

  it("월세 세액공제를 못 받으면(무주택 세대주 아님 · 넣은 세전 연봉 8,000만 원 초과) 월세 안내 없음", () => {
    const s1 = golden("S1").input as SimulationInputDraft;
    expect(view("S1", { ...s1, person: { ...s1.person, homelessHouseholder: false } }).notes.map((n) => n.key)).not.toContain("rent");
    expect(view("S1", { ...s1, income: { ...s1.income, annualGrossSalary: 80_000_001 } }).notes.map((n) => n.key)).not.toContain("rent");
  });

  it("v1.6 백엔드처럼 tax가 없으면 블록을 그리지 않는다", () => {
    expect(taxView({ ...golden("S1").simulate, tax: undefined }, {})).toBeNull();
  });
});
