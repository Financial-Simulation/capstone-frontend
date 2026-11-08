/**
 * 결과 맨 위: 달성 가능성 · 첫 문장 · 계산기 결과 · 목표에 닿는 때 (Hero).
 * 목업 응답이면 그렇다고 밝힌다 (MockNote, 정할 것 1번).
 */
import { Badge } from "@/components/ui";
import { formatManwon, formatPercent } from "@/lib/format";
import type { SimulateResult } from "@/lib/types";
import { formatDuration, formatYearMonth, monthsBetween } from "@/lib/year-month";
import type { MockMatch } from "@/mocks/handlers";
import { LEVEL_LABELS, probabilityLevel } from "./result";

const LEVEL_STYLES = {
  good: { badge: "bg-good-soft text-good", dot: "bg-good" },
  fair: { badge: "bg-warn-soft text-warn", dot: "bg-warn" },
  low: { badge: "bg-danger-soft text-danger", dot: "bg-danger" },
} as const;

export function Hero({ result }: { result: SimulateResult }) {
  const { goal, deterministic } = result;
  const level = probabilityLevel(goal.probability);
  const style = LEVEL_STYLES[level];
  const goalDate = result.bands[goal.goalMonths]?.month;
  const reach70 = goal.reach70Date;
  const late = reach70 && goalDate ? monthsBetween(goalDate, reach70) : null;

  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <p className="text-5xl font-bold tracking-tight text-ink">{formatPercent(goal.probability)}</p>
        <span className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
          <span aria-hidden className={`size-2 rounded-full ${style.dot}`} />
          {LEVEL_LABELS[level]}
        </span>
        <span className="mb-1.5 text-xs text-muted">오차 ±{goal.probabilityError.toFixed(1)}%p · 미래 {result.paths.toLocaleString("ko-KR")}개</span>
      </div>
      <h1 className="mt-3 text-lg font-bold leading-relaxed text-ink sm:text-xl">{result.headline}</h1>
      <dl className="mt-5 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">계산기 결과 (목표 시점)</dt>
          <dd className="mt-0.5 text-base font-semibold">{formatManwon(deterministic.atGoal)}</dd>
          <dd className="text-xs text-muted">실직·급한 지출이 없다고 칠 때</dd>
        </div>
        <div>
          <dt className="text-muted">미래의 절반이 목표에 닿는 때</dt>
          <dd className="mt-0.5 text-base font-semibold">{goal.medianReachDate ? formatYearMonth(goal.medianReachDate) : "10년 안에 못 닿아요"}</dd>
        </div>
        <div>
          <dt className="text-muted">가능성 70%가 되는 때</dt>
          <dd className="mt-0.5 text-base font-semibold">{reach70 ? formatYearMonth(reach70) : "10년 안에 70%가 안 돼요"}</dd>
          {late !== null && late > 0 && <dd className="text-xs text-muted">목표 시점보다 {formatDuration(late)} 늦어요</dd>}
          {late !== null && late <= 0 && <dd className="text-xs text-muted">목표 시점 안에 70%를 넘어요</dd>}
        </div>
      </dl>
    </section>
  );
}

/** 목업이면 그렇다고 밝힌다 (정할 것 1번) */
export function MockNote({ match }: { match?: MockMatch }) {
  const exact = match?.exact ?? false;
  return (
    <div
      role="note"
      className={`rounded-lg border px-4 py-3 text-sm ${exact ? "border-line bg-mock-soft/60" : "border-warn-line bg-warn-soft"}`}
    >
      <p className="font-semibold">
        <Badge tone="mock">목업</Badge>{" "}
        {exact
          ? `정답 파일(analysis_golden.json)의 ${match?.caseKey ?? ""} 계산 결과예요.`
          : "입력한 값과 같은 정답 케이스가 없어 S1 결과를 대신 보여 줘요. 숫자가 내 입력과 달라요."}
      </p>
      <p className="mt-1 text-ink-soft">
        백엔드 /simulate가 붙으면 같은 seed로 같은 숫자가 나와요.{match?.note && exact ? ` ${match.note}.` : ""}
      </p>
    </div>
  );
}
