import { describe, expect, it } from "vitest";
import type { SimulationInputDraft, StoryEvent, StoryMonth } from "@/lib/types";
import { goalIndexOf, paceLine, paceOf, plannedMarkers, raceClock, type RacePlan } from "./race";

function month(afterMonths: number, total: number, extra: Partial<StoryMonth> & { events?: StoryEvent[] } = {}): StoryMonth {
  // 기준 달 2026-11: afterMonths 1 = 2026-11 (StoryMonth.month는 그 일이 일어난 달)
  const index = 10 + afterMonths - 1;
  const y = 2026 + Math.floor(index / 12);
  const mm = (index % 12) + 1;
  return {
    afterMonths,
    month: `${y}-${String(mm).padStart(2, "0")}`,
    employed: true,
    unemploymentBenefit: false,
    events: [],
    salary: 2_500_000,
    income: 2_500_000,
    living: 1_900_000,
    shock: 0,
    shockType: null,
    shockLabel: null,
    planned: 0,
    loan: 0,
    refund: 0,
    subsidy: 0,
    received: 0,
    taxPaid: 0,
    deposits: { policy: 500_000, housing: 0, pension: 0, general: 0, invest: 0 },
    balances: { cash: 0, overdraft: 0, policy: 0, housing: 0, pension: 0, general: 0, invest: 0, deposit: 0 },
    total,
    inflation: 2,
    ...extra,
  };
}

/** 200만 원에서 시작해 60개월 뒤 3,000만 원 */
const PLAN: RacePlan = { startTotal: 2_000_000, targetAmount: 30_000_000, goalMonths: 60 };

describe("예정된 일 → 코스 위 표시", () => {
  const input: SimulationInputDraft = {
    events: [
      { presetKey: "WEDDING", name: "결혼 비용", eventType: "ONE_TIME", occurDate: "2028-05", amount: 8_000_000 },
      { presetKey: "CAR", name: "자동차", eventType: "ONE_TIME", occurDate: "2027-11", amount: 5_000_000 },
      { presetKey: "CAR", name: "자동차", eventType: "SPEND_CHANGE", occurDate: "2027-11", monthlyChange: 300_000 },
      { presetKey: "JOB_CHANGE", name: "이직", eventType: "JOB_CHANGE", occurDate: "2029-03", incomeChangeRate: 10, gapMonths: 2 },
      { presetKey: "JEONSE_MOVE", name: "전세 이사", eventType: "MOVE", occurDate: "2030-01", deposit: 10_000_000, monthlyChange: -300_000, amount: 1_500_000 },
      { presetKey: "INDEPENDENCE", name: "독립", eventType: "MOVE", occurDate: null, deposit: 5_000_000 },
    ],
  };

  it("한 번에 드는 돈은 허들, 매달 늘면 오르막, 줄면 급수대, 이직은 물웅덩이 + 에너지 젤", () => {
    const markers = plannedMarkers(input, "2026-11");
    expect(markers.map((m) => [m.months, m.kind])).toEqual([
      [12, "hurdle"],
      [12, "hill"],
      [18, "hurdle"],
      [28, "puddle"],
      [28, "gel"],
      [38, "hurdle"],
      [38, "water"],
    ]);
    expect(markers[0]).toMatchObject({ title: "자동차", detail: "한 번에 500만 원", tone: "bad", preset: "CAR" });
    expect(markers[4]).toMatchObject({ detail: "연봉 +10%", tone: "good" });
    expect(markers[5].detail).toBe("보증금 · 이사 비용 1,150만 원");
    expect(markers[6].detail).toBe("매달 30만 원 덜 나가요");
  });

  it("시점이 없거나 기준 달이 없으면 빼고, 연봉이 줄면 오르막 (이름이 비면 프리셋 이름)", () => {
    expect(plannedMarkers(input, null)).toEqual([]);
    const cut = plannedMarkers(
      { events: [{ presetKey: "JOB_CHANGE", eventType: "JOB_CHANGE", occurDate: "2027-01", incomeChangeRate: -20, gapMonths: 0 }] },
      "2026-11",
    );
    expect(cut).toMatchObject([{ kind: "hill", detail: "연봉 −20%", title: "이직" }]);
  });
});

describe("캐릭터 자세", () => {
  it("실직 · 급한 지출 · 빌리기 · 적금 해지는 무릎을 짚고 쉰다", () => {
    for (const [event, sprite] of [
      ["JOB_LOSS", "puddle"],
      ["SHOCK", "rock"],
      ["OVERDRAFT", "mud"],
      ["BREAK_POLICY", "pack"],
    ] as const) {
      const months = [month(1, 2_500_000), month(2, 2_000_000, { events: [event], shock: 1_000_000 })];
      expect(paceOf(months, 1, PLAN)).toMatchObject({ pose: "rest", sprite, tone: "bad" });
    }
  });

  it("급한 지출 말풍선은 서버가 준 유형 이름을 쓰고, 이름이 없으면 '급한 지출'", () => {
    const say = (extra: Partial<StoryMonth>) =>
      paceOf([month(1, 2_500_000), month(2, 1_700_000, { events: ["SHOCK"], shock: 800_000, ...extra })], 1, PLAN).say;
    expect(say({ shockType: "TRAFFIC_ACCIDENT", shockLabel: "교통사고 자기부담금" })).toBe("교통사고 자기부담금 80만 원에 발이 걸렸어요");
    expect(say({})).toBe("급한 지출 80만 원에 발이 걸렸어요");
  });

  it("만기 · 빚 다 갚음 · 재취업은 빠르게 달린다", () => {
    for (const event of ["MATURE_POLICY", "DEBT_CLEARED", "REHIRE"] as const) {
      expect(paceOf([month(1, 1), month(2, 2, { events: [event] })], 1, PLAN).pose).toBe("sprint");
    }
  });

  it("빌린 돈이 남아 있거나 일을 쉬는 중이면 쉰다", () => {
    const owing = month(5, 1_000_000, { balances: { cash: 0, overdraft: 3_000_000, policy: 0, housing: 0, pension: 0, general: 0, invest: 0, deposit: 0 } });
    expect(paceOf([owing], 0, PLAN).pose).toBe("rest");
    expect(paceOf([month(5, 9_000_000, { employed: false })], 0, PLAN).pose).toBe("rest");
  });

  it("석 달 전보다 줄었으면 숨이 차다", () => {
    const months = [month(1, 5_000_000), month(2, 5_100_000), month(3, 5_200_000), month(4, 4_900_000)];
    expect(paceOf(months, 3, PLAN)).toMatchObject({ pose: "rest", say: "지출이 많아 숨이 차요" });
  });

  it("목표 페이스보다 두 달 내리 앞서면 빠르게, 아니면 꾸준히", () => {
    const fast = [month(10, paceLine(PLAN, 10) + 1), month(11, paceLine(PLAN, 11) + 1)];
    expect(paceOf(fast, 1, PLAN).pose).toBe("sprint");
    const slow = [month(10, paceLine(PLAN, 10) - 1), month(11, paceLine(PLAN, 11) + 1)];
    expect(paceOf(slow, 1, PLAN).pose).toBe("jog");
  });

  it("예정된 일이 있는 달은 그 표시를 보여 준다", () => {
    const planned = plannedMarkers(
      { events: [{ presetKey: "WEDDING", name: "결혼 비용", eventType: "ONE_TIME", occurDate: "2027-01", amount: 8_000_000 }] },
      "2026-11",
    );
    const months = [month(2, 5_000_000), month(3, 5_100_000, { events: ["PLANNED"] })];
    expect(months[1].month).toBe("2027-01");
    expect(paceOf(months, 1, { ...PLAN, planned })).toMatchObject({ sprite: "hurdle", say: "결혼 비용: 한 번에 800만 원" });
  });
});

describe("결승선 = 목표 시점, 목표 금액 = 러너스 하이 · 금메달", () => {
  /** 1개월째부터 n개월째까지 조금씩 느는 미래. goalAt개월째에 서버가 목표 달성(GOAL_REACHED)을 알린다 */
  const run = (n: number, goalAt: number | null) =>
    Array.from({ length: n }, (_, i) => month(i + 1, 5_000_000 + (i + 1) * 10_000, { events: goalAt === i + 1 ? ["GOAL_REACHED"] : [] }));

  it("결승 전에 목표 금액을 넘은 달: 금빛 문을 지나며 꽃가루 속 러너스 하이, 그 뒤로는 메달 · 말풍선 없이 러너스 하이로 결승까지", () => {
    const months = run(70, 40);
    expect(goalIndexOf(months)).toBe(39);
    expect(paceOf(months, 38, PLAN)).toMatchObject({ medal: null, high: false, confetti: false, gate: { kind: "goal", ahead: 1 } });
    expect(paceOf(months, 39, PLAN)).toMatchObject({
      pose: "celebrate",
      sprite: null,
      medal: null,
      high: true,
      confetti: true,
      tone: "good",
      gate: { kind: "goal", ahead: 0, gold: true },
      say: "목표 3,000만 원 달성! 결승 20개월 전 러너스 하이 발동",
    });
    expect(paceOf(months, 44, PLAN)).toMatchObject({
      pose: "sprint",
      medal: null,
      high: true,
      confetti: false,
      gate: null,
      say: "",
    });
  });

  it("러너스 하이 중에도 힘든 달은 쉬지만 기운은 이어진다", () => {
    const months = run(70, 40);
    months[44] = { ...months[44], events: ["SHOCK"], shock: 500_000 };
    expect(paceOf(months, 44, PLAN)).toMatchObject({ pose: "rest", sprite: "rock", medal: null, high: true });
  });

  it("결승 아치는 두 달 전부터 다가와 결승 달에 지나고 다음 달 뒤로 멀어진다. 결승선에서 러너스 하이가 끝나고 금메달을 건다", () => {
    const months = run(70, 40);
    expect([57, 58, 59, 60, 61].map((i) => paceOf(months, i, PLAN).gate)).toEqual([
      { kind: "finish", ahead: 2, gold: true },
      { kind: "finish", ahead: 1, gold: true },
      { kind: "finish", ahead: 0, gold: true },
      { kind: "finish", ahead: -1, gold: true },
      null,
    ]);
    expect(paceOf(months, 58, PLAN)).toMatchObject({ medal: null, high: true });
    expect(paceOf(months, 59, PLAN)).toMatchObject({
      pose: "celebrate",
      medal: "gold",
      high: false,
      confetti: true,
      say: "완주! 목표 금액을 20개월 먼저 모아 금메달이에요",
    });
    expect(paceOf(months, 65, PLAN)).toMatchObject({ pose: "jog", medal: "gold", high: false, say: "완주 후 금메달을 걸고 쿨다운 중" });
  });

  it("목표 금액을 못 모은 채 결승선이면 완주 메달(은), 결승 뒤에라도 모으면 금메달로 바꾼다 (러너스 하이 없음)", () => {
    const short = run(70, null);
    expect(paceOf(short, 58, PLAN)).toMatchObject({ medal: null, high: false });
    expect(paceOf(short, 59, PLAN)).toMatchObject({
      pose: "rest",
      medal: "silver",
      high: false,
      confetti: false,
      tone: "info",
      gate: { kind: "finish", ahead: 0, gold: false },
      say: "완주! 목표까지 2,440만 원 남아 완주 메달이에요",
    });
    expect(paceOf(short, 64, PLAN)).toMatchObject({ medal: "silver", say: "완주했어요. 목표 금액까지 계속 달려요" });

    const late = run(80, 70);
    expect(paceOf(late, 65, PLAN).medal).toBe("silver");
    expect(paceOf(late, 69, PLAN)).toMatchObject({
      pose: "celebrate",
      medal: "gold",
      high: false,
      confetti: true,
      say: "목표 시점보다 10개월 늦었지만 목표 달성! 금메달",
    });
  });

  it("목표 시점에 딱 맞춰 모으면 금빛 결승 아치 하나로 바로 금메달", () => {
    const months = run(70, 60);
    expect(paceOf(months, 58, PLAN).gate).toEqual({ kind: "finish", ahead: 1, gold: false });
    expect(paceOf(months, 59, PLAN)).toMatchObject({
      pose: "celebrate",
      medal: "gold",
      high: false,
      gate: { kind: "finish", ahead: 0, gold: true },
      say: "결승선에서 목표 3,000만 원 달성! 금메달 완주",
    });
  });
});

describe("레이스 자리 (시간)", () => {
  it("지난 달 ÷ 목표 개월 × 레이스 거리, 결승까지 남은 달 (0~1로 자른다)", () => {
    expect(raceClock(30, 60, 21.0975)).toEqual({ ratio: 0.5, km: 21.0975 / 2, toFinish: 30 });
    expect(raceClock(0, 60, 10)).toEqual({ ratio: 0, km: 0, toFinish: 60 });
    expect(raceClock(70, 60, 10)).toEqual({ ratio: 1, km: 10, toFinish: 0 });
  });
});
