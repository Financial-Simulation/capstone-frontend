import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { SimulationInputDraft } from "@/lib/types";
import { taxView } from "./tax";

const golden = (key: string) => goldenCaseByKey(key)!;

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
