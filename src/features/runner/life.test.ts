import { describe, expect, it } from "vitest";
import type { SimulationInputDraft } from "@/lib/types";
import { lifeMoments } from "./life";

describe("인생 장면", () => {
  const input: SimulationInputDraft = {
    events: [
      { presetKey: "CUSTOM", name: "여행", eventType: "ONE_TIME", occurDate: "2027-03", amount: 2_000_000 },
      { presetKey: "CAR", name: "자동차", eventType: "ONE_TIME", occurDate: "2027-03", amount: 5_000_000 },
      { presetKey: "CAR", name: "자동차", eventType: "SPEND_CHANGE", occurDate: "2027-03", monthlyChange: 300_000 },
      { presetKey: "WEDDING", name: "", eventType: "ONE_TIME", occurDate: "2028-05", amount: 8_000_000 },
      { presetKey: "JOB_CHANGE", name: "이직", eventType: "JOB_CHANGE", occurDate: "2029-01", incomeChangeRate: 0, gapMonths: 0 },
      { presetKey: "INDEPENDENCE", name: "독립", eventType: "MOVE", occurDate: null, deposit: 5_000_000 },
      { presetKey: "JEONSE_MOVE", name: "전세 이사", eventType: "MOVE", occurDate: "2040-01", deposit: 10_000_000 },
    ],
  };

  it("결혼 · 독립 · 이사 · 이직 · 자동차만, 그달 하나씩 (같은 프리셋의 돈은 이어 붙임)", () => {
    const moments = lifeMoments(input, "2026-11");
    expect([...moments.keys()]).toEqual(["2027-03", "2028-05", "2029-01"]);
    expect(moments.get("2027-03")).toEqual({ kind: "CAR", month: "2027-03", title: "자동차", detail: "한 번에 500만 원 · 매달 30만 원 더 나가요" });
    // 이름이 비면 프리셋 이름, 돈 칸이 모두 0이면 설명 없음
    expect(moments.get("2028-05")).toMatchObject({ kind: "WEDDING", title: "결혼 비용", detail: "한 번에 800만 원" });
    expect(moments.get("2029-01")).toMatchObject({ kind: "JOB_CHANGE", detail: "" });
  });

  it("기준 달이 없거나 시점이 없거나 10년 밖이면 장면이 없다", () => {
    expect(lifeMoments(input, null).size).toBe(0);
    expect(lifeMoments({ events: [input.events![5]] }, "2026-11").size).toBe(0);
    expect(lifeMoments({ events: [input.events![6]] }, "2026-11").size).toBe(0);
  });
});
