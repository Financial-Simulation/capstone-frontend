/**
 * 결과 화면 '받을 수 있는 혜택' (멘토 피드백 11/16 · 조민석 배치안 11/18 · 글 줄이기 11/18).
 * 카드에는 핵심만: 상태 · 이름 · 받는 돈 · 짧은 한 줄(서버 summary) · '받으면 65% → 82%'.
 * 설명 · 신청 방법 · 2027년 바뀔 수 있는 내용 · 출처는 '자세히'를 눌러야 보인다.
 * 못 받는 혜택은 맨 아래 접힌 목록에 한 줄씩 (이름 — 이유).
 * 판정 · 문장 · 출처는 서버(/benefits, benefits.json) 것 그대로. 여기서는 배치만 한다.
 */
import { formatManwon } from "@/lib/format";
import type { BenefitItem, BenefitsResult, BenefitStatus, EligibilityKey } from "@/lib/types";
import { CATEGORY_LABELS, QUESTION_BY_KEY, STATUS_LABELS } from "./questions";

const STATUS_STYLES: Record<BenefitStatus, { card: string; chip: string }> = {
  YES: { card: "border-good-line", chip: "bg-good-soft text-good" },
  CHECK: { card: "border-warn-line", chip: "bg-warn-soft text-warn" },
  LATER: { card: "border-line", chip: "bg-primary-soft text-primary" },
  NO: { card: "border-line", chip: "bg-line text-ink-soft" },
};

export function BenefitsSection({
  result,
  loading,
  error,
  onAsk,
}: {
  result: BenefitsResult | null;
  loading: boolean;
  error: string | null;
  /** '알려 주면 정확해져요'의 질문을 누르면 아래 질문 칸을 연다 (04-E 예시는 질문 칸이 없어 null) */
  onAsk: ((key: EligibilityKey) => void) | null;
}) {
  const shown = result?.items.filter((item) => item.status !== "NO") ?? [];
  const missed = result?.items.filter((item) => item.status === "NO") ?? [];
  const yes = shown.filter((item) => item.status === "YES").length;
  return (
    <section aria-labelledby="benefits-title" className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="benefits-title" className="text-base font-bold">
          받을 수 있는 혜택
        </h2>
        {loading && result && <span className="text-sm text-muted">다시 계산 중…</span>}
      </div>
      {result && (
        <p className="mt-1 text-sm text-ink-soft">
          혜택 {result.items.length}개 중 <span className="font-semibold text-good">{yes}개</span>를 받을 수 있어요
          {result.refundPerYear ? ` · 연말정산 환급 매년 약 ${formatManwon(result.refundPerYear)}` : ""}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          혜택을 불러오지 못했어요: {error}
        </p>
      )}
      {!result && !error && <p className="mt-3 text-sm text-muted">정책을 확인하는 중…</p>}

      {result && (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((item) => (
              <BenefitCard key={item.key} item={item} base={result.probability} onAsk={onAsk} />
            ))}
          </ul>
          {missed.length > 0 && (
            <details className="mt-3 rounded-lg border border-line px-4 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-ink-soft">못 받는 혜택 {missed.length}개</summary>
              <ul className="mt-2 space-y-1.5 pb-1 text-sm">
                {missed.map((item) => (
                  <li key={item.key} className="flex flex-wrap gap-x-2">
                    <span className="font-semibold text-ink-soft">{item.name}</span>
                    <span className="text-muted">{item.summary}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="mt-3 text-xs text-muted">{result.asOf} 기준 · 실제 대상 여부는 신청하는 곳에서 확정돼요</p>
        </>
      )}
    </section>
  );
}

function BenefitCard({ item, base, onAsk }: { item: BenefitItem; base: number; onAsk: ((key: EligibilityKey) => void) | null }) {
  const style = STATUS_STYLES[item.status];
  return (
    <li className={`flex flex-col gap-1 rounded-lg border bg-surface p-4 ${style.card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.chip}`}>{STATUS_LABELS[item.status]}</span>
        {item.effect && (
          <span className="text-sm tabular-nums">
            <span className="text-muted">{Math.round(base)}% → </span>
            <span className="font-bold text-good">{Math.round(item.effect.probability)}%</span>
          </span>
        )}
      </div>
      <p className="mt-1 font-bold">{item.name}</p>
      {item.amount && <p className="text-[15px] font-semibold tabular-nums">{item.amount}</p>}
      <p className="text-sm text-ink-soft">{item.summary}</p>
      {item.ask.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted">답하면 확정:</span>
          {item.ask.map((key) =>
            onAsk ? (
              <button
                key={key}
                type="button"
                onClick={() => onAsk(key)}
                className="rounded-full border border-line-strong px-2 py-0.5 font-semibold text-primary hover:border-primary hover:bg-primary-soft"
              >
                {QUESTION_BY_KEY[key]?.short ?? key}
              </button>
            ) : (
              <span key={key} className="rounded-full border border-line px-2 py-0.5 text-ink-soft">
                {QUESTION_BY_KEY[key]?.short ?? key}
              </span>
            ),
          )}
        </p>
      )}
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-ink-soft hover:text-primary">
          자세히{item.notice && <span className="ml-1.5 rounded bg-warn-soft px-1.5 py-0.5 font-semibold text-warn">2027 변경 예정</span>}
        </summary>
        <div className="mt-2 space-y-2 text-ink-soft">
          <p className="text-xs text-muted">{CATEGORY_LABELS[item.category]}</p>
          <p>{item.detail}</p>
          {item.effect && (
            <p>
              받으면 목표 달성 가능성 {Math.round(base)}% → {Math.round(item.effect.probability)}% ({signed(item.effect.diff)}%p)
              {item.effect.assumption && <span className="text-muted"> · {item.effect.assumption}</span>}
            </p>
          )}
          <p>
            <span className="font-semibold text-ink">신청 </span>
            {item.how}
          </p>
          {item.notice && (
            <p className="rounded-md bg-warn-soft/60 px-2 py-1 text-warn">
              <span className="font-semibold">바뀔 수 있어요 · </span>
              {item.notice}
            </p>
          )}
          <ul className="space-y-0.5 text-xs">
            {item.sources.map((s) => (
              <li key={s.title}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </li>
  );
}

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;
}
