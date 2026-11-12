/**
 * 간단한 결과 화면(04 첫 화면) 블록: 결론 · 조심할 점과 받는 혜택 · 이렇게 하면 좋아져요.
 * 문장은 simple.ts가 서버 값에서 고른다. 자세한 숫자는 ResultView의 '숫자 더 보기'와 리포트에 있다.
 */
import { LEVEL_LABELS } from "./result";
import { benefits, cautions, outOfTen, simpleActions, simpleSummary, type Caution } from "./simple";
import type { ResultData } from "./use-result";
import type { SimulateResult } from "@/lib/types";

const LEVEL_STYLES = {
  good: { box: "border-good-line bg-good-soft/50", badge: "bg-good-soft text-good", bar: "bg-good" },
  fair: { box: "border-warn-line bg-warn-soft/50", badge: "bg-warn-soft text-warn", bar: "bg-warn" },
  low: { box: "border-danger-line bg-danger-soft/50", badge: "bg-danger-soft text-danger", bar: "bg-danger" },
} as const;

/** 결론: "5년 뒤 3,000만 원, 10번 중 7번쯤은 모을 수 있어요" + 10칸 막대 */
export function SimpleHero({ result }: { result: SimulateResult }) {
  const s = simpleSummary(result);
  const style = LEVEL_STYLES[s.level];
  const filled = outOfTen(result.goal.probability);
  return (
    <section className={`rounded-xl border p-5 sm:p-6 ${style.box}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink-soft">{s.goal}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>{LEVEL_LABELS[s.level]}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight text-ink sm:text-3xl">
        {s.chance} <span className="align-middle text-base font-semibold text-ink-soft">({s.percent})</span>
      </h1>
      <ol className="mt-4 grid max-w-md grid-cols-10 gap-1" aria-label={`10번 중 ${filled}번`}>
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} aria-hidden className={`h-3 rounded-sm ${i < filled ? style.bar : "bg-line"}`} />
        ))}
      </ol>
      <ul className="mt-4 space-y-1 text-[15px] text-ink">
        {s.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

const CAUTION_STYLES: Record<Caution["tone"], string> = {
  danger: "before:bg-danger",
  warn: "before:bg-warn",
  info: "before:bg-info-line",
};

/** 조심할 점(2~3개) · 받는 혜택(세금 · 지원금) */
export function SimpleNotes({ result }: { result: SimulateResult }) {
  const list = cautions(result);
  const good = benefits(result);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-base font-bold">조심할 점</h2>
        <ul className="mt-3 space-y-3">
          {list.map((c) => (
            <li
              key={c.key}
              className={`relative pl-4 text-[15px] leading-relaxed before:absolute before:left-0 before:top-1.5 before:h-[calc(100%-0.75rem)] before:w-1 before:rounded-full ${CAUTION_STYLES[c.tone]}`}
            >
              {c.text}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-base font-bold">받는 혜택</h2>
        {good.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {good.map((line) => (
              <li
                key={line}
                className="relative pl-4 text-[15px] leading-relaxed before:absolute before:left-0 before:top-1.5 before:h-[calc(100%-0.75rem)] before:w-1 before:rounded-full before:bg-good"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-ink-soft">
            지금 계획에는 세금을 돌려받거나 정부 지원금을 받는 상품이 없어요. 아래 &lsquo;상품별로 나눠 보기&rsquo;에서 넣어 볼 수 있어요.
          </p>
        )}
      </section>
    </div>
  );
}

/** 이렇게 하면 좋아져요: 가능성이 많이 오르는 것 3개 */
export function SimpleActions({ data }: { data: ResultData }) {
  const reverse = data.reverse?.data;
  const actions = reverse ? simpleActions(reverse.levers, reverse.currentProbability) : [];
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">이렇게 하면 좋아져요</h2>
      {!reverse ? (
        <p className="mt-2 text-sm text-muted">{data.reversePending ? "하나씩 바꿔 다시 계산하는 중…" : "바꿔 볼 것을 계산하지 못했어요."}</p>
      ) : actions.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-soft">하나만 바꿔서 크게 달라지는 것은 없어요. 아래 &lsquo;계획 바꿔 보기&rsquo;에서 여러 가지를 함께 바꿔 볼 수 있어요.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {actions.map((a, i) => (
            <li key={a.type} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-canvas px-4 py-3">
              <span className="flex items-center gap-3 font-semibold">
                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-primary text-xs text-white">
                  {i + 1}
                </span>
                {a.label}
              </span>
              <span className="text-sm">
                → <span className="font-semibold">{a.chance}</span> <span className="font-semibold text-good">({a.change})</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
