/**
 * 결과 화면 첫 블록: 결론(SimpleHero) · 그래프 밑 조심할 점(CautionStrip). 문장은 simple.ts가 서버 값에서 고른다.
 * 계획을 바꾸면(막대) 바꾼 계획의 결과로 보여 주고, 지금 계획과의 차이를 한 줄 붙인다.
 */
import { LEVEL_LABELS } from "./result";
import { cautions, outOfTen, simpleSummary, type Caution } from "./simple";
import type { SimulateResult } from "@/lib/types";

const LEVEL_STYLES = {
  good: { box: "border-good-line bg-good-soft/50", badge: "bg-good-soft text-good", bar: "bg-good" },
  fair: { box: "border-warn-line bg-warn-soft/50", badge: "bg-warn-soft text-warn", bar: "bg-warn" },
  low: { box: "border-danger-line bg-danger-soft/50", badge: "bg-danger-soft text-danger", bar: "bg-danger" },
} as const;

/** 결론: "5년 뒤 3,000만 원, 10번 중 7번쯤은 모을 수 있어요" + 10칸 막대. base가 있으면 '바꾼 계획' 표시 */
export function SimpleHero({ result, base }: { result: SimulateResult; base?: SimulateResult | null }) {
  const s = simpleSummary(result);
  const style = LEVEL_STYLES[s.level];
  const filled = outOfTen(result.goal.probability);
  return (
    <section className={`rounded-xl border p-5 sm:p-6 ${style.box}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink-soft">{s.goal}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>{LEVEL_LABELS[s.level]}</span>
        {base && (
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
            바꾼 계획 · 지금 계획은 {Math.round(base.goal.probability)}%
          </span>
        )}
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

const CAUTION_DOT: Record<Caution["tone"], string> = {
  danger: "bg-danger",
  warn: "bg-warn",
  info: "bg-info-line",
};

/** 조심할 점: 그래프 바로 밑에 작은 줄 2~3개 (멘토 피드백 11/16) */
export function CautionStrip({ result }: { result: SimulateResult }) {
  return (
    <section aria-label="조심할 점" className="rounded-xl border border-line bg-surface px-5 py-3">
      <ul className="space-y-1.5 text-sm">
        {cautions(result).map((c) => (
          <li key={c.key} className="flex gap-2">
            <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${CAUTION_DOT[c.tone]}`} />
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
