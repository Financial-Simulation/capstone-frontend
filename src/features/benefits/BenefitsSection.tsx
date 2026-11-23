/**
 * 결과 화면 '받을 수 있는 혜택' (멘토 피드백 11/16 · 조민석 배치안 11/18 · 글 줄이기 11/18).
 * 카드에는 핵심만: 상태 · 이름 · 받는 돈 · 짧은 한 줄(서버 summary) · '받으면 65% → 82%'.
 * 설명 · 신청 방법 · 2027년 바뀔 수 있는 내용 · 출처는 '자세히'를 눌러야 보인다.
 * 못 받는 혜택은 맨 아래 접힌 목록에 한 줄씩 (이름 — 이유).
 * 판정 · 문장 · 출처는 서버(/benefits, benefits.json) 것 그대로. 여기서는 배치만 한다.
 */
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatManwon } from "@/lib/format";
import type { BenefitItem, BenefitsResult, BenefitStatus, Eligibility, YearMonth } from "@/lib/types";
import { AnswerInput } from "./EligibilityForm";
import { QUESTION_BY_KEY, STATUS_LABELS, withAnswer } from "./questions";

const STATUS_STYLES: Record<BenefitStatus, { card: string; panel: string; chip: string; icon: IconName }> = {
  YES: { card: "border-good-line", panel: "border-good-line", chip: "bg-good-soft text-good", icon: "check" },
  CHECK: { card: "border-warn-line", panel: "border-warn-line", chip: "bg-warn-soft text-warn", icon: "help" },
  LATER: { card: "border-line", panel: "border-line", chip: "bg-primary-soft text-primary", icon: "clock" },
  NO: { card: "border-line", panel: "border-line", chip: "bg-line text-ink-soft", icon: "close" },
};

const CATEGORY_ICONS: Record<BenefitItem["category"], IconName> = {
  CASH: "cash",
  TAX: "tax",
  SAVING: "saving",
  LOAN: "loan",
  SAFETY: "safety",
};

export function BenefitsSection({
  result,
  loading,
  error,
  answers,
  children,
}: {
  result: BenefitsResult | null;
  loading: boolean;
  error: string | null;
  /** 카드 안에서 바로 답하는 칸 (04-E 예시는 질문 칸이 없어 null) */
  answers: { eligibility: Eligibility; onChange: (next: Eligibility) => void; startMonth: YearMonth } | null;
  /** 카드 아래 새 칸 (정확히 알고 싶다면 입력하기) */
  children?: ReactNode;
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
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => (
              <BenefitCard key={item.key} item={item} base={result.probability} answers={answers} />
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
          {children && <div className="mt-4">{children}</div>}
          <p className="mt-3 text-xs text-muted">{result.asOf} 기준 · 실제 대상 여부는 신청하는 곳에서 확정돼요</p>
        </>
      )}
    </section>
  );
}

function BenefitCard({ item, base, answers }: { item: BenefitItem; base: number; answers: Parameters<typeof BenefitsSection>[0]["answers"] }) {
  const style = STATUS_STYLES[item.status];
  const links = item.sources.filter((s) => s.url);
  return (
    <li
      className={`group relative rounded-lg border bg-surface p-4 hover:z-10 hover:rounded-b-none hover:border-b-transparent hover:shadow-lg ${style.card}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full ${style.chip}`}>
          <Icon name={CATEGORY_ICONS[item.category]} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{item.name}</p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${style.chip.split(" ")[1]}`}>
            <Icon name={style.icon} className="size-3.5" />
            {STATUS_LABELS[item.status]}
          </p>
        </div>
        {item.effect && (
          <span className="shrink-0 text-right text-sm tabular-nums">
            <span className="block text-xs text-muted">가능성</span>
            <span className="font-bold text-good">+{Math.max(0, Math.round(item.effect.probability - base))}%p</span>
          </span>
        )}
      </div>
      {item.amount && <p className="mt-2 text-lg font-bold tabular-nums">{item.amount}</p>}

      <div
        className={`absolute inset-x-[-1px] top-full z-10 -mt-px hidden space-y-3 rounded-b-lg border border-t-0 ${style.panel} bg-surface px-4 pb-4 pt-1 text-sm text-ink-soft shadow-lg group-hover:block`}
      >
        <p className="text-ink">{item.detail}</p>
        {item.effect && (
          <p>
            받으면 목표 달성 가능성 {Math.round(base)}% → {Math.round(item.effect.probability)}% ({signed(item.effect.diff)}%p)
            {item.effect.assumption && <span className="text-muted"> · {item.effect.assumption}</span>}
          </p>
        )}
        {answers && item.ask.length > 0 && (
          <div className="space-y-3 rounded-md bg-canvas p-3">
            {item.ask.map((key) => {
              const q = QUESTION_BY_KEY[key];
              if (!q) return null;
              const id = `card-${item.key}-${key}`;
              return (
                <div key={key}>
                  <label htmlFor={id} className="text-sm font-semibold">
                    {q.label}
                  </label>
                  <div className="mt-1.5">
                    <AnswerInput
                      q={q}
                      id={id}
                      value={answers.eligibility[key]}
                      startMonth={answers.startMonth}
                      onValue={(value) => answers.onChange(withAnswer(answers.eligibility, key, value))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p>
          <span className="font-semibold text-ink">신청 </span>
          {item.how}
        </p>
        {links.length > 0 && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {links.map((s) => (
              <a
                key={s.title}
                href={s.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <Icon name="link" className="size-3.5" />
                {s.title}
              </a>
            ))}
          </p>
        )}
        {item.notice && (
          <p className="rounded-md bg-warn-soft/60 px-2 py-1 text-warn">
            <span className="font-semibold">2027 바뀔 수 있어요 · </span>
            {item.notice}
          </p>
        )}
      </div>
    </li>
  );
}

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;
}
