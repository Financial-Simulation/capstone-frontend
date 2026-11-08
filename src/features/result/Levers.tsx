/**
 * '이렇게 바꿔 보세요': 하나씩 바꿔 다시 계산한 가능성(/reverse의 levers) · 70%에 닿으려면 · 비상금을 먼저 모으면.
 * 보여 줄 값은 result.ts(leverRows · reverseLines)가 서버 값에서 고른다.
 */
import { formatKoreanWon, formatManwon, formatPercent } from "@/lib/format";
import { leverRows, reverseLines } from "./result";
import type { ResultData } from "./use-result";

export function Levers({ data }: { data: ResultData }) {
  const reverse = data.reverse?.data;
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">이렇게 바꿔 보세요</h2>
      {!reverse ? (
        <p className="mt-2 text-sm text-muted">{data.reversePending ? "하나씩 바꿔 다시 계산하는 중…" : "개선 포인트를 계산하지 못했어요."}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            하나씩 바꿔 같은 미래 {data.sim.data.paths.toLocaleString("ko-KR")}개로 다시 계산했어요. 가능성이 많이 오르는 순서예요.
          </p>
          <ol className="mt-3 divide-y divide-line">
            {leverRows(reverse.levers).map((lever) => (
              <li key={lever.type} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{lever.label}</span>
                {lever.flat ? (
                  <span className="text-sm text-muted">거의 차이 없음 ({lever.probability})</span>
                ) : (
                  <span className="text-sm">
                    <span className="font-semibold">{formatPercent(reverse.currentProbability)} → {lever.probability}</span>{" "}
                    <span className={`font-semibold ${lever.diff.startsWith("+") ? "text-good" : "text-danger"}`}>({lever.diff})</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-lg bg-canvas px-4 py-3 text-sm">
            <p className="font-semibold">가능성 {reverse.targetProbability}%에 닿으려면</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
              {reverseLines(reverse).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {reverse.emergencyStrategies.length > 0 && data.sim.data.risks.policySaving.eligible && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-soft">비상금을 먼저 모으면 (적금 시작 전에)</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-right text-xs text-muted">
                      <th className="py-2 pr-3 text-left font-semibold">먼저 모을 비상금</th>
                      <th className="py-2 pr-3 font-semibold">가능성</th>
                      <th className="py-2 pr-3 font-semibold">중도해지</th>
                      <th className="py-2 font-semibold">정부 지원금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reverse.emergencyStrategies.map((s) => (
                      <tr key={s.amount} className="border-b border-line text-right last:border-0">
                        <th scope="row" className="py-2 pr-3 text-left font-medium">
                          {s.amount === 0 ? "안 모음" : formatManwon(s.amount)}
                        </th>
                        <td className="py-2 pr-3">{formatPercent(s.probability)}</td>
                        <td className="py-2 pr-3">{s.earlyTerminationProbability == null ? "—" : formatPercent(s.earlyTerminationProbability)}</td>
                        <td className="py-2">{s.expectedSubsidy == null ? "—" : formatKoreanWon(s.expectedSubsidy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
