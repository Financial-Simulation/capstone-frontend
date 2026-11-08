/**
 * 위험: 카드 5장(빚질 가능성 · 최악의 경우 · 적금 중도해지 · 정부 지원금 · 현금 부족 시점) · '적금을 처음 깬 이유' 막대.
 * 보여 줄 값은 result.ts(riskCards · causeRows)가 서버 값에서 고른다.
 */
import { StatCard } from "@/components/ui/Stat";
import { formatPercent } from "@/lib/format";
import type { SimulateResult } from "@/lib/types";
import { causeRows, type RiskCard } from "./result";

export function RiskGrid({ cards }: { cards: RiskCard[] }) {
  return (
    <section>
      <h2 className="text-base font-bold">위험</h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            tone={card.tone}
            box={card.key === "cashShort" && card.tone === "warn" ? "warn" : "default"}
            detail={card.detail}
          />
        ))}
      </ul>
    </section>
  );
}

export function CauseBars({ result }: { result: SimulateResult }) {
  const { rows, total, empty } = causeRows(result.causes);
  const eligible = result.risks.policySaving.eligible;
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">적금을 처음 깬 이유</h2>
      {!eligible ? (
        <p className="mt-2 text-sm text-ink-soft">청년미래적금 대상이 아니라 해당 없음이에요.</p>
      ) : empty ? (
        <p className="mt-2 text-sm text-ink-soft">적금을 중간에 깬 미래가 없어요.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            적금을 깬 미래{total !== null ? ` ${total.toLocaleString("ko-KR")}개` : ""}에서 처음 깬 이유예요. 네 가지를 더하면 100%예요.
          </p>
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="h-3 rounded-full bg-canvas" aria-hidden>
                  <span className="block h-3 rounded-full bg-primary" style={{ width: `${Math.max(row.share, row.share > 0 ? 1.5 : 0)}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{formatPercent(row.share)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
