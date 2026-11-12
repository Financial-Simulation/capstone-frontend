import { describe, expect, it } from "vitest";
import storyData from "@/mocks/data/story.json";
import type { StoryResult } from "@/lib/types";
import { accountRows, eventViews, plannedNames, variableRows } from "./story";

const cases = (storyData as unknown as { cases: Record<string, StoryResult> }).cases;
const story = (key: string, kind: string) => cases[key].stories.find((s) => s.kind === kind)!;

describe("미래 다시 보기: 사건 문장", () => {
  it("T1 최악: 첫 달 실직 → 빌리기 시작 → 다시 취업", () => {
    const s = story("T1", "WORST");
    const views = s.months.flatMap((m) => eventViews(m, cases.T1.targetAmount, new Map()));
    const titles = views.slice(0, 4).map((v) => [v.afterMonths, v.title]);
    expect(titles[0]).toEqual([1, "실직"]);
    expect(titles).toContainEqual([7, "빌리기 시작"]);
    expect(views.find((v) => v.title === "다시 취업")).toMatchObject({ afterMonths: 22, tone: "good" });
  });

  it("같은 달 여러 적금 해지는 한 줄로, 받은 돈을 보여 준다", () => {
    const m = story("S2", "WORST").months.find((mm) => mm.events.includes("BREAK_GENERAL") && mm.events.includes("BREAK_POLICY"))!;
    const view = eventViews(m, cases.S2.targetAmount, new Map()).find((v) => v.key.endsWith("break"))!;
    expect(view.title).toBe("일반 적금 · 청년미래적금 해지");
    expect(view.detail).toMatch(/^모자란 돈을 메우려고 깼어요\. 받은 돈 .+만 원\./);
  });

  it("목표 달성 달은 한 번만", () => {
    const views = story("S1", "MIDDLE").months.flatMap((m) => eventViews(m, cases.S1.targetAmount, new Map()));
    expect(views.filter((v) => v.title === "목표 달성")).toHaveLength(1);
  });

  it("예정된 일 이름은 입력의 occurDate로", () => {
    expect(plannedNames({ events: [{ name: "이사", occurDate: "2027-03" }, { name: "", occurDate: "2027-03" }] } as never)).toEqual(
      new Map([["2027-03", "이사 · 예정된 일"]]),
    );
  });
});

describe("미래 다시 보기: 변수 · 계좌", () => {
  it("실직한 달: 일 상태가 바뀐 것으로 표시", () => {
    const s = story("T1", "WORST");
    const rows = variableRows(s.months[1], s.months[0]);
    expect(rows.find((r) => r.key === "job")).toMatchObject({ tone: "bad" });
  });

  it("계좌는 현금과 0원이 아닌 것만, 빌린 돈은 음수", () => {
    const m = story("T1", "WORST").months[10];
    const rows = accountRows(m);
    expect(rows[0].key).toBe("cash");
    expect(rows.find((r) => r.key === "overdraft")!.value).toBe(-m.balances.overdraft);
    expect(rows.every((r) => r.key === "cash" || r.value !== 0)).toBe(true);
  });
});
