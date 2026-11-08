import { describe, expect, it } from "vitest";
import presetsData from "@/mocks/data/presets.json";
import type { EventPreset, SimulationInputDraft } from "./types";
import { checkCrossRules, checkRequired } from "./rules";
import { eventFields, eventsFromPreset, presetEventIndexes, setEventAmount, setPresetDate, togglePreset } from "./events";

const presets = (presetsData as { presets: EventPreset[] }).presets;
const preset = (key: string) => presets.find((p) => p.presetKey === key)!;

describe("예정된 일 프리셋", () => {
  it("켜면 기본 금액이 채워진다 (전세 이사: 보증금 1,000만 · 주거비 월 −30만 · 이사비 150만)", () => {
    expect(eventsFromPreset(preset("JEONSE_MOVE"))).toEqual([
      {
        presetKey: "JEONSE_MOVE",
        name: "전세 이사",
        eventType: "MOVE",
        occurDate: null,
        deposit: 10_000_000,
        monthlyChange: -300_000,
        amount: 1_500_000,
      },
    ]);
  });

  it("자동차는 일 두 개 (차 값 + 매달 유지비), 시점을 함께 쓴다", () => {
    let input: SimulationInputDraft = { startMonth: "2026-11" };
    input = togglePreset(input, preset("CAR"), true);
    expect(presetEventIndexes(input, "CAR")).toEqual([0, 1]);
    input = setPresetDate(input, "CAR", "2029-11");
    expect(input.events?.map((e) => e.occurDate)).toEqual(["2029-11", "2029-11"]);
    expect(eventFields("CAR", "ONE_TIME")[0].label).toBe("차 값");
    expect(checkCrossRules(input)).toBeNull();
    expect(checkRequired("EVENTS", input)).toEqual({});
  });

  it("끄면 그 프리셋의 일만 빠진다", () => {
    let input: SimulationInputDraft = {};
    input = togglePreset(input, preset("CAR"), true);
    input = togglePreset(input, preset("WEDDING"), true);
    input = togglePreset(input, preset("CAR"), false);
    expect(input.events?.map((e) => e.presetKey)).toEqual(["WEDDING"]);
  });

  it("시점을 안 고르면 '발생 시점' 오류, 금액을 지우면 카드 오류", () => {
    let input: SimulationInputDraft = { startMonth: "2026-11" };
    input = togglePreset(input, preset("JOB_CHANGE"), true);
    expect(checkRequired("EVENTS", input)).toEqual({ "events[0].occurDate": "발생 시점을 입력해 주세요" });
    input = setPresetDate(input, "JOB_CHANGE", "2028-05");
    input = setEventAmount(input, 0, "gapMonths", null);
    expect(checkRequired("EVENTS", input)).toEqual({ "events[0]": "금액 칸을 모두 입력해 주세요" });
    input = setEventAmount(input, 0, "gapMonths", 30);
    expect(checkCrossRules(input)?.code).toBe("EVENT4004");
  });

  it("종류별 칸", () => {
    expect(eventFields("JOB_CHANGE", "JOB_CHANGE").map((f) => f.key)).toEqual(["incomeChangeRate", "gapMonths"]);
    expect(eventFields("JEONSE_MOVE", "MOVE").map((f) => f.key)).toEqual(["deposit", "monthlyChange", "amount"]);
    expect(eventFields(null, null)).toEqual([]);
  });
});
