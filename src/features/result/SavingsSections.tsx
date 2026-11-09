/**
 * 모은 돈: '앞으로 모을 돈'(범위 그래프 + 해마다 표) · '1 · 3 · 5 · 10년 뒤 모은 돈' 표.
 * 그래프는 BandChart.tsx, 표의 줄은 result.ts(checkpointRows · yearlyRows)가 서버 값에서 고른다.
 */
import type { ReactNode } from "react";
import { formatManwon } from "@/lib/format";
import type { SimulateResult, SimulationInputDraft } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { BandChart, BandLegend } from "./BandChart";
import { checkpointRows, eventMarks, yearlyRows, type QuantileRow } from "./result";

export function ChartCard({ result, input }: { result: SimulateResult; input: SimulationInputDraft }) {
  const events = eventMarks(input);
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">앞으로 모을 돈</h2>
      <p className="mt-1 text-sm text-ink-soft">
        실직·급한 지출·물가·연봉이 서로 다르게 펼쳐지는 미래 {result.paths.toLocaleString("ko-KR")}개를 계산했어요. 그래프를
        누르거나 화살표 키로 달을 옮기면 그달의 값을 보여 드려요.
      </p>
      <div className="mt-4">
        <BandLegend hasEvents={events.length > 0} />
      </div>
      <div className="mt-3">
        <BandChart result={result} events={events} />
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-soft">표로 보기 (해마다)</summary>
        <QuantileTable rows={yearlyRows(result)} />
      </details>
    </section>
  );
}

export function CheckpointTable({ result }: { result: SimulateResult }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">1 · 3 · 5 · 10년 뒤 모은 돈</h2>
      <p className="mt-1 text-sm text-ink-soft">모은 돈 = 현금 + 예·적금 + 투자 (대출 잔액은 빼지 않아요)</p>
      <QuantileTable rows={checkpointRows(result)} />
    </section>
  );
}

function money(value: number): ReactNode {
  return <span className={value < 0 ? "text-danger" : undefined}>{formatManwon(value)}</span>;
}

function QuantileTable({ rows }: { rows: QuantileRow[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line text-right text-xs text-muted">
            <th className="py-2 pr-3 text-left font-semibold">시점</th>
            <th className="py-2 pr-3 font-semibold">최악의 경우 (하위 5%)</th>
            <th className="py-2 pr-3 font-semibold">아래 10%</th>
            <th className="py-2 pr-3 font-semibold text-ink">중간값</th>
            <th className="py-2 font-semibold">위 10%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.months} className={`border-b border-line last:border-0 text-right ${row.isGoal ? "bg-primary-soft/50" : ""}`}>
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                {row.label}
                {row.date && <span className="ml-1.5 text-xs font-normal text-muted">{formatYearMonth(row.date)}</span>}
                {row.isGoal && <span className="ml-1.5 text-xs font-semibold text-primary">목표 시점</span>}
              </th>
              <td className="py-2 pr-3">{money(row.p5)}</td>
              <td className="py-2 pr-3">{money(row.p10)}</td>
              <td className="py-2 pr-3 font-semibold">{money(row.p50)}</td>
              <td className="py-2">{money(row.p90)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
