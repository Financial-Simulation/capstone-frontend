"use client";

/**
 * 결과 화면 '받을 수 있는 혜택' (멘토 피드백 11/16 · 조민석 배치안 11/18 · 글 줄이기 11/18).
 * 카드에는 핵심만: 상태 · 이름 · 받는 돈 · 짧은 한 줄(서버 summary) · '받으면 65% → 82%'.
 * 설명 · 신청 방법 · 2027년 바뀔 수 있는 내용 · 출처는 '자세히 보기'로 연다.
 * 못 받는 혜택도 같은 그리드에 카드로 표시하고, 이유는 카드 안에 항상 보인다.
 * 판정 · 문장 · 출처는 서버(/benefits, benefits.json) 것 그대로. 여기서는 배치만 한다.
 */
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { YOUTH_FUTURE_SAVING } from "@/config/policy";
import { formatManwon } from "@/lib/format";
import type { BenefitItem, BenefitsResult, BenefitStatus, Eligibility, YearMonth } from "@/lib/types";
import { AnswerInput } from "./EligibilityForm";
import { QUESTION_BY_KEY, STATUS_LABELS, withAnswer } from "./questions";

const STATUS_STYLES: Record<BenefitStatus, { card: string; chip: string; icon: IconName }> = {
  YES: { card: "border-good-line", chip: "bg-good-soft text-good", icon: "check" },
  CHECK: { card: "border-warn-line", chip: "bg-warn-soft text-warn", icon: "help" },
  LATER: { card: "border-line", chip: "bg-primary-soft text-primary", icon: "clock" },
  NO: { card: "border-line", chip: "bg-line text-ink-soft", icon: "close" },
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
  headerAction,
  children,
}: {
  result: BenefitsResult | null;
  loading: boolean;
  error: string | null;
  /** 카드 안에서 바로 답하는 칸 (04-E 예시는 질문 칸이 없어 null) */
  answers: { eligibility: Eligibility; onChange: (next: Eligibility) => void; startMonth: YearMonth } | null;
  headerAction?: ReactNode;
  children?: ReactNode;
}) {
  const shown = result?.items.filter((item) => item.status !== "NO") ?? [];
  const missed = result?.items.filter((item) => item.status === "NO") ?? [];
  const yes = shown.filter((item) => item.status === "YES").length;
  return (
    <section aria-labelledby="benefits-title" className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="benefits-title" className="text-base font-bold">
          받을 수 있는 혜택
        </h2>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {loading && result && <span className="text-sm text-muted">다시 계산 중…</span>}
          {headerAction}
        </div>
      </div>
      {result && (
        <p className="mt-1 text-sm text-ink-soft">
          혜택 {result.items.length}개 중 <span className="font-semibold text-good">{yes}개</span>를 받을 수 있어요
          {result.refundPerYear ? ` · 연말정산 환급 매년 약 ${formatManwon(result.refundPerYear)}` : ""}
        </p>
      )}
      {children}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          혜택을 불러오지 못했어요: {error}
        </p>
      )}
      {!result && !error && <p className="mt-3 text-sm text-muted">정책을 확인하는 중…</p>}

      {result && (
        <>
          {result.items.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...shown, ...missed].map((item) => (
                <BenefitCard key={item.key} item={item} base={result.probability} answers={answers} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">{result.asOf} 기준 · 실제 대상 여부는 신청하는 곳에서 확정돼요</p>
        </>
      )}
    </section>
  );
}

function BenefitCard({ item, base, answers }: { item: BenefitItem; base: number; answers: Parameters<typeof BenefitsSection>[0]["answers"] }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const closeDetail = () => setDetailOpen(false);
  const style = STATUS_STYLES[item.status];
  const unavailable = item.status === "NO";
  const links = item.sources.filter((s) => s.url);
  const headline = unavailable ? null : cardHeadline(item);
  return (
    <li
      className={`rounded-lg border p-4 ${style.card} ${unavailable ? "bg-canvas" : "bg-surface"}`}
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
        {!unavailable && item.effect && (
          <span className="shrink-0 text-right text-sm tabular-nums">
            <span className="block text-xs text-muted">가능성</span>
            <span className="font-bold text-good">+{Math.max(0, Math.round(item.effect.probability - base))}%p</span>
          </span>
        )}
      </div>
      {headline ? (
        <>
          <p className="mt-2 truncate text-lg font-bold tabular-nums">
            {headline.big}
            {headline.limit && <span className="ml-2 text-sm font-semibold text-ink-soft">{headline.limit}</span>}
          </p>
          {headline.sub && <p className="truncate text-sm text-ink-soft">{headline.sub}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{item.detail || item.summary}</p>
      )}

      {!unavailable && (
        <Button type="button" size="sm" variant="ghost" className="mt-2" aria-label={`${item.name} 자세히 보기`} aria-haspopup="dialog" onClick={() => setDetailOpen(true)}>
          자세히 보기
        </Button>
      )}
      {!unavailable && <Modal
        open={detailOpen}
        title={item.name}
        onClose={closeDetail}
        actions={<Button type="button" variant="secondary" onClick={closeDetail}>닫기</Button>}
      >
        <div className="space-y-3">
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
      </Modal>}
    </li>
  );
}

/** 금액이 없으면 요약의 첫 비율(40% · 12~15%)을 크게, 설명의 '연 N만 원까지'(한도)를 옆에, 요약은 아래 한 줄로 */
function cardHeadline(item: BenefitItem): { big: string; limit: string | null; sub: string | null } {
  if (item.key === "youthFuture" || item.key === "youthFuturePreferential") {
    return { big: item.amount ?? item.summary, limit: `월 ${formatManwon(YOUTH_FUTURE_SAVING.monthlyLimit)}까지`, sub: null };
  }
  if (item.amount) return { big: item.amount, limit: null, sub: null };
  const rate = item.summary.match(/\d[\d.,~]*%/)?.[0];
  const limit = item.detail.match(/[연월] [\d,]+만 원까지/)?.[0] ?? null;
  return rate ? { big: rate, limit, sub: item.summary } : { big: item.summary, limit: null, sub: null };
}

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;
}
