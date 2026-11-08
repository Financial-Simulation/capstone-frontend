import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { SimulationInputDraft } from "./types";
import { STEPS, finishedSteps, nextHref, prevHref, stepByPath } from "./steps";

const ALL = STEPS.map((s) => s.key);

function s1(): SimulationInputDraft {
  return structuredClone(goldenCaseByKey("S1")!.input) as SimulationInputDraft;
}

describe("화면 주소", () => {
  it("단계마다 주소가 있다", () => {
    expect(STEPS.map((s) => s.href)).toEqual(["/input/basic", "/input/assets", "/input/goal", "/input/scenario"]);
  });

  it("이전 · 다음", () => {
    expect(prevHref("BASIC")).toBe("/");
    expect(prevHref("GOAL")).toBe("/input/assets");
    expect(nextHref("BASIC")).toBe("/input/assets");
    expect(nextHref("EVENTS")).toBe("/result");
  });

  it("주소 → 단계", () => {
    expect(stepByPath("/input/goal")?.key).toBe("GOAL");
    expect(stepByPath("/input/goal/edit")?.key).toBe("GOAL");
    expect(stepByPath("/input/goalx")).toBeUndefined();
    expect(stepByPath("/")).toBeUndefined();
    expect(stepByPath(null)).toBeUndefined();
  });
});

describe("끝낸 단계 (단계 표시에서 누를 수 있는 것)", () => {
  it("다 채우고 다 들어가 봤으면 4개 모두", () => {
    expect([...finishedSteps(s1(), ALL)]).toEqual(ALL);
  });

  it("들어가 보지 않은 단계에서 멈춘다 (뒤 단계는 채워져 있어도)", () => {
    expect([...finishedSteps(s1(), ["BASIC", "GOAL", "EVENTS"])]).toEqual(["BASIC"]);
  });

  it("필수 칸이 빈 단계에서 멈춘다", () => {
    const input = s1();
    delete input.goal;
    expect([...finishedSteps(input, ALL)]).toEqual(["BASIC", "ASSETS"]);
  });

  it("입력이 없으면 하나도 없다", () => {
    expect(finishedSteps(null, ALL).size).toBe(0);
    expect(finishedSteps({}, ALL).size).toBe(0);
  });
});
