import { describe, expect, it } from "vitest";
import { clearance, formatAxisWon, monthTicks, niceStep, niceTicks, pickLabels, textBox, textWidth, type Obstacle } from "./chart";

describe("그래프 눈금", () => {
  it("1 · 2 · 5 × 10^k 간격", () => {
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(183_000_000, 5)).toBe(50_000_000);
    expect(niceStep(48_000_000, 5)).toBe(10_000_000);
    expect(niceStep(0, 5)).toBe(1);
  });

  it("S1 범위(−1,568만 ~ 1억 6,832만)는 0이 들어간 깔끔한 눈금", () => {
    const { ticks, min, max } = niceTicks(-15_684_865, 168_319_800, 5);
    expect(ticks).toContain(0);
    expect(min).toBeLessThanOrEqual(-15_684_865);
    expect(max).toBeGreaterThanOrEqual(168_319_800);
    expect(ticks).toEqual([-50_000_000, 0, 50_000_000, 100_000_000, 150_000_000, 200_000_000]);
  });

  it("값이 하나뿐이어도 눈금이 생긴다", () => {
    expect(niceTicks(0, 0).ticks.length).toBeGreaterThan(1);
  });

  it("축 글자", () => {
    expect(formatAxisWon(0)).toBe("0");
    expect(formatAxisWon(50_000_000)).toBe("5,000만");
    expect(formatAxisWon(100_000_000)).toBe("1억");
    expect(formatAxisWon(150_000_000)).toBe("1.5억");
    expect(formatAxisWon(-10_000_000)).toBe("−1,000만");
    expect(formatAxisWon(5_000)).toBe("5,000");
  });

  it("가로축은 1년마다, 좁으면 2년마다", () => {
    expect(monthTicks(120, false)).toEqual([0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120]);
    expect(monthTicks(120, true)).toEqual([0, 24, 48, 72, 96, 120]);
  });
});

describe("그래프 라벨 자리", () => {
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 300 };

  it("글자 폭 어림: 한글 1em, 숫자 0.6em, 공백·쉼표 0.3em", () => {
    expect(textWidth("목표", 10)).toBe(20);
    expect(textWidth("1,000", 10)).toBeCloseTo(27);
    expect(textWidth("계산기 4,440만 원", 12)).toBeGreaterThan(80);
  });

  it("text-anchor에 따라 상자가 놓인다", () => {
    expect(textBox(100, 50, 40, "start")).toMatchObject({ x0: 100, x1: 140 });
    expect(textBox(100, 50, 40, "middle")).toMatchObject({ x0: 80, x1: 120 });
    expect(textBox(100, 50, 40, "end")).toMatchObject({ x0: 60, x1: 100 });
  });

  it("선과 상자 사이 거리 (가로지르면 0)", () => {
    const box = { x0: 100, y0: 100, x1: 200, y1: 120 };
    expect(clearance(box, { kind: "hline", y: 110 })).toBe(0);
    expect(clearance(box, { kind: "hline", y: 130 })).toBe(10);
    expect(clearance(box, { kind: "vline", x: 90 })).toBe(10);
    expect(clearance(box, { kind: "box", box: { x0: 210, y0: 100, x1: 250, y1: 120 } })).toBe(10);
    // 상자 아래 5px로 지나가는 수평선 → 5
    expect(clearance(box, { kind: "line", points: [[0, 125], [300, 125]] })).toBe(5);
    // 상자를 비스듬히 가로지르는 선 → 0
    expect(clearance(box, { kind: "line", points: [[0, 0], [300, 300]] })).toBe(0);
    // 상자 폭 밖에서 끝나는 선 → 끝점까지 거리
    expect(clearance(box, { kind: "line", points: [[0, 110], [90, 110]] })).toBe(10);
  });

  const group = <T extends { box: ReturnType<typeof textBox> }>(candidates: T[], hard: Obstacle[] = [], soft: Obstacle[] = []) => ({ candidates, hard, soft });
  const spare = group([{ name: "spare", box: textBox(380, 290, 10, "end") }]);

  it("좋아하는 순서대로 보고, 선과 겹치면 다음 후보", () => {
    const line: Obstacle = { kind: "line", points: [[0, 50], [400, 50]] };
    const above = { name: "above", box: textBox(200, 52, 60, "middle") }; // 선이 상자를 지난다
    const below = { name: "below", box: textBox(200, 80, 60, "middle") };
    expect(pickLabels(group([above, below], [line]), spare, bounds)[0]?.name).toBe("below");
  });

  it("기준 점선(soft)만 겹치면 피할 수 있을 때만 피한다", () => {
    const dashed: Obstacle = { kind: "hline", y: 52 };
    const first = { name: "first", box: textBox(200, 56, 60, "middle") };
    const second = { name: "second", box: textBox(200, 90, 60, "middle") };
    expect(pickLabels(group([first, second], [], [dashed]), spare, bounds)[0]?.name).toBe("second");
    // 두 번째 후보가 데이터 선과 겹치면 점선을 가로지르는 첫 후보를 쓴다
    const line: Obstacle = { kind: "line", points: [[0, 88], [400, 88]] };
    expect(pickLabels(group([first, second], [line], [dashed]), spare, bounds)[0]?.name).toBe("first");
  });

  it("영역 밖 후보는 빼고, 모두 겹치면 가장 덜 겹치는 후보", () => {
    const outside = { name: "outside", box: textBox(200, 5, 60, "middle") };
    const near = { name: "near", box: textBox(200, 60, 60, "middle") };
    const far = { name: "far", box: textBox(200, 100, 60, "middle") };
    const lines: Obstacle[] = [
      { kind: "line", points: [[0, 102], [400, 102]] },
      { kind: "line", points: [[0, 63], [400, 63]] },
    ];
    // 첫 번째 라벨은 자리가 없으면 빼고(null), 두 번째 라벨은 가장 덜 겹치는 자리
    expect(pickLabels(group([outside, near, far], lines), spare, bounds)[0]).toBeNull();
    expect(pickLabels(spare, group([outside, near, far], lines), bounds)[1].name).toBe("near");
  });

  it("두 라벨은 서로도 피한다: 두 번째 라벨이 비켜 준다", () => {
    const calc = group([{ name: "calc-left", box: textBox(150, 100, 80, "end") }]);
    const target = group([
      { name: "target-left", box: textBox(70, 104, 80, "start") }, // calc와 겹침
      { name: "target-right", box: textBox(390, 104, 80, "end") },
    ]);
    const [a, b] = pickLabels(calc, target, bounds);
    expect([a?.name, b.name]).toEqual(["calc-left", "target-right"]);
  });
});
