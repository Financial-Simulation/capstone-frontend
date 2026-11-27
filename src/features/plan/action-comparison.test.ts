import { afterEach, describe, expect, it, vi } from "vitest";
import { eventsFromPreset } from "@/features/input/events";
import { api } from "@/lib/api";
import presets from "@/mocks/data/presets.json";
import { goldenCaseByKey } from "@/mocks/golden";
import type { EventPreset, PlannedEvent, StoryMonth, StoryResult, YearMonth } from "@/lib/types";
import { changedMoveMonth, comparisonEvents, lowestMoveCash, simulateScenario } from "./action-comparison";

const move = {
  eventType: "MOVE", presetKey: "JEONSE_MOVE", occurDate: "2027-01",
  deposit: 5_000_000, monthlyChange: -200_000, amount: 0,
} satisfies PlannedEvent;

describe("시나리오 비교", () => {
  afterEach(() => vi.restoreAllMocks());

  it("자동차는 차 값과 월 유지비를 모두 보내고 기존 이사는 유지한다", () => {
    const car = (presets.presets as EventPreset[]).find((preset) => preset.presetKey === "CAR")!;
    const events = comparisonEvents([move, ...eventsFromPreset(car, "2027-04")]);
    expect(events).toEqual([move, ...eventsFromPreset(car, "2027-04")]);
    expect(events?.map((event) => event.eventType)).toEqual(["MOVE", "ONE_TIME", "SPEND_CHANGE"]);
    expect(changedMoveMonth([move], events ?? [])).toBeUndefined();
  });

  it("시점이나 금액이 비면 보내지 않고, 여러 시나리오 중 바뀐 이사만 현금 요약에 쓴다", () => {
    expect(comparisonEvents([{ ...move, occurDate: null }])).toBeNull();
    expect(comparisonEvents([{ ...move, deposit: null }])).toBeNull();
    expect(changedMoveMonth([move], [{ ...move, occurDate: "2027-04" }])).toBe("2027-04");
  });

  it("그래프와 이사 현금 요약에 같은 시나리오·막대 변경·시드를 보낸다", async () => {
    const sample = goldenCaseByKey("S3")!;
    const request = {
      input: { ...sample.input, events: [move] },
      adjustments: { monthlySaving: 500_000, monthlyVariableExpense: 400_000 },
      seed: sample.simulate.seed,
    };
    const signal = new AbortController().signal;
    const simulate = vi.spyOn(api, "simulate").mockResolvedValue({ source: "real", data: sample.simulate });
    const story = vi.spyOn(api, "story").mockResolvedValue({
      source: "real",
      data: { seed: request.seed, paths: 2, startMonth: sample.input.startMonth, goalMonths: 24, targetAmount: 1, stories: [] },
    });

    await expect(simulateScenario(request, move.occurDate, signal)).resolves.toMatchObject({ move: { month: move.occurDate } });
    expect(simulate).toHaveBeenCalledWith(request, { signal });
    expect(story).toHaveBeenCalledWith(request, { signal });
  });

  it("이사 후 첫 12개월의 중간 경로에서 보증금이 아닌 현금만 비교한다", () => {
    const month = (month: YearMonth, cash: number): StoryMonth => ({
      month, afterMonths: 1, employed: true, unemploymentBenefit: false, events: [],
      salary: 0, income: 0, living: 0, shock: 0, shockType: null, shockLabel: null,
      planned: 0, loan: 0, refund: 0, subsidy: 0, received: 0, taxPaid: 0,
      deposits: { policy: 0, housing: 0, pension: 0, general: 0, invest: 0 },
      balances: { cash, deposit: 5_000_000, overdraft: 0, policy: 0, housing: 0, pension: 0, general: 0, invest: 0 },
      total: 5_000_000, inflation: 0,
    });
    const common = { quantile: 0, path: 0, atGoal: 0, reached: false };
    const result: StoryResult = {
      seed: 1, paths: 2, startMonth: "2026-11", goalMonths: 24, targetAmount: 1,
      stories: [
        { ...common, kind: "WORST", months: [month("2027-01", 0)] },
        { ...common, kind: "MIDDLE", months: [month("2026-12", 0), month("2027-01", 100), month("2027-12", 50), month("2028-01", 0)] },
      ],
    };
    expect(lowestMoveCash(result, "2027-01")).toEqual({ month: "2027-12", cash: 50 });
    expect(lowestMoveCash(result, "2028-02")).toBeNull();
  });
});
