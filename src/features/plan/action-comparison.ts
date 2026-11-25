import { api, ApiError } from "@/lib/api";
import { eventFieldsMatch } from "@/lib/rules";
import type { Draft, PlannedEvent, SimulateRequest, StoryResult, YearMonth } from "@/lib/types";
import { isYearMonth, monthsBetween } from "@/lib/year-month";

export function comparisonEvents(draft: readonly Draft<PlannedEvent>[]): PlannedEvent[] | null {
  const events: PlannedEvent[] = [];
  for (const event of draft) {
    const { presetKey, eventType, occurDate, name, amount, deposit, monthlyChange, gapMonths, incomeChangeRate } = event;
    if (!presetKey || !eventType || !isYearMonth(occurDate) || !eventFieldsMatch(event)) return null;
    events.push({
      presetKey, eventType, occurDate, name: name ?? undefined, amount: amount ?? undefined, deposit: deposit ?? undefined,
      monthlyChange: monthlyChange ?? undefined, gapMonths: gapMonths ?? undefined, incomeChangeRate: incomeChangeRate ?? undefined,
    });
  }
  return events;
}

export function changedMoveMonth(saved: readonly PlannedEvent[], events: readonly PlannedEvent[]): YearMonth | undefined {
  return events.filter((event) => event.eventType === "MOVE" && !saved.some((old) =>
    old.eventType === "MOVE" && old.presetKey === event.presetKey && old.occurDate === event.occurDate &&
    old.deposit === event.deposit && old.monthlyChange === event.monthlyChange && old.amount === event.amount,
  )).map((event) => event.occurDate).sort()[0];
}

export async function simulateScenario(request: SimulateRequest, moveMonth: YearMonth | undefined, signal: AbortSignal) {
  const [sim, story] = await Promise.all([
    api.simulate(request, { signal }),
    moveMonth ? api.story(request, { signal }) : null,
  ]);
  if (sim.source === "mock" || story?.source === "mock") {
    throw new ApiError("ACTIONS_REQUIRE_REAL_API", "실제 계산 서버에 연결해야 비교할 수 있어요.", null);
  }
  return { result: sim.data, move: moveMonth && story ? { month: moveMonth, lowest: lowestMoveCash(story.data, moveMonth) } : null };
}

/** 이사한 달부터 첫 12개월의 현금만 본다. 보증금과 적금은 합치지 않는다. */
export function lowestMoveCash(result: StoryResult, moveMonth: YearMonth) {
  const months = result.stories.find(({ kind }) => kind === "MIDDLE")?.months ?? [];
  let lowest: { month: YearMonth; cash: number } | null = null;
  for (const { month, balances } of months) {
    const offset = monthsBetween(moveMonth, month);
    if (offset >= 0 && offset < 12 && (!lowest || balances.cash < lowest.cash)) {
      lowest = { month, cash: balances.cash };
    }
  }
  return lowest;
}
