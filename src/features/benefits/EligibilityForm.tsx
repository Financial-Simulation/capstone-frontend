"use client";

/**
 * 결과 화면 맨 아래 '혜택을 받을 수 있을지 더 정확히 알고 싶다면 입력하기' (접고 펼침, 조민석 배치안 11/18).
 * 모두 선택. 답은 브라우저(simEligibility.v1)에 저장하고, 바뀌면 위 혜택 카드가 다시 판정된다 (서버 /benefits).
 * 혜택 카드의 '알려 주면 정확해져요'를 누르면 열리고 그 질문으로 옮겨 간다 (focusKey).
 */
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";
import { YearMonthPicker } from "@/components/ui/YearMonthPicker";
import type { Eligibility, EligibilityKey, YearMonth } from "@/lib/types";
import { QUESTIONS, answeredCount, withAnswer, type Question } from "./questions";

const ELIGIBILITY_FORM_ID = "eligibility-form";

const YES_NO = [
  { value: true, label: "예" },
  { value: false, label: "아니요" },
  { value: null, label: "모름" },
] as const;

export function EligibilityForm({
  eligibility,
  onChange,
  startMonth,
  open,
  onOpenChange,
  focusKey,
  asked,
}: {
  eligibility: Eligibility;
  onChange: (next: Eligibility) => void;
  startMonth: YearMonth;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 이 질문으로 옮겨 간다 (혜택 카드에서 누른 것) */
  focusKey: { key: EligibilityKey; at: number } | null;
  /** 혜택 카드들이 물어보는 질문 (강조) */
  asked: ReadonlySet<EligibilityKey>;
}) {
  useEffect(() => {
    if (!focusKey || !open) return;
    const el = document.getElementById(`elig-${focusKey.key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }, [focusKey, open]);

  const count = answeredCount(eligibility);
  return (
    <details
      id={ELIGIBILITY_FORM_ID}
      open={open}
      onToggle={(event) => onOpenChange((event.currentTarget as HTMLDetailsElement).open)}
      className="group scroll-mt-20 rounded-lg border border-primary/30 bg-primary-soft/40 p-4"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon name="edit" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">더 정확히 알고 싶다면 입력하기</span>
          <span className="block text-xs text-ink-soft">
            선택 · {count}/{QUESTIONS.length} 답함 · 이 브라우저에만 저장
          </span>
        </span>
        <Icon name="chevron" className="size-5 shrink-0 text-ink-soft transition-transform group-open:rotate-90" />
      </summary>
      <p className="mt-3 text-sm text-ink-soft">답하면 혜택 카드가 바로 다시 판정돼요. 모르면 비워 두세요.</p>
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 xl:grid-cols-2">
        {QUESTIONS.map((q) => (
          <QuestionField
            key={q.key}
            q={q}
            value={eligibility[q.key]}
            highlight={asked.has(q.key) && (eligibility[q.key] === null || eligibility[q.key] === undefined)}
            startMonth={startMonth}
            onValue={(value) => onChange(withAnswer(eligibility, q.key, value))}
          />
        ))}
      </div>
      {count > 0 && (
        <button type="button" onClick={() => onChange({})} className="mt-5 text-sm font-semibold text-ink-soft underline hover:text-danger">
          답 모두 지우기
        </button>
      )}
    </details>
  );
}

function QuestionField({
  q,
  value,
  highlight,
  startMonth,
  onValue,
}: {
  q: Question;
  value: Eligibility[EligibilityKey];
  highlight: boolean;
  startMonth: YearMonth;
  onValue: (value: Eligibility[EligibilityKey]) => void;
}) {
  const id = `elig-${q.key}`;
  return (
    <div className={`rounded-lg p-2 ${highlight ? "bg-warn-soft/50 ring-1 ring-warn-line" : ""}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {q.label}
      </label>
      {q.hint && <p className="text-xs text-muted">{q.hint}</p>}
      <div className="mt-2">
        <AnswerInput q={q} id={id} value={value} startMonth={startMonth} onValue={onValue} />
      </div>
    </div>
  );
}

/** 질문 하나의 답 칸 (맨 아래 입력 칸과 혜택 카드 안이 같이 쓴다) */
export function AnswerInput({
  q,
  id,
  value,
  startMonth,
  onValue,
}: {
  q: Question;
  id: string;
  value: Eligibility[EligibilityKey];
  startMonth: YearMonth;
  onValue: (value: Eligibility[EligibilityKey]) => void;
}) {
  return (
    <>
      {q.kind === "yesno" && (
        <div role="radiogroup" aria-label={q.label} className="inline-flex gap-1 rounded-lg border border-line-strong bg-surface p-1">
          {YES_NO.map((option, i) => {
            const checked = (value ?? null) === option.value;
            return (
              <button
                key={option.label}
                id={i === 0 ? id : undefined}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onValue(option.value)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold ${checked ? "bg-primary text-white" : "text-ink-soft hover:bg-canvas"}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
      {q.kind === "month" && (
        <YearMonthPicker
          id={id}
          value={(value as YearMonth | null | undefined) ?? null}
          onChange={(ym) => onValue(ym)}
          start={startMonth}
          minMonths={-120}
          maxMonths={12}
        />
      )}
      {q.kind === "money" && (
        <MoneyInput
          id={id}
          value={(value as number | null | undefined) ?? null}
          onChange={(won) => onValue(won === null ? null : Math.min(won, q.max ?? won))}
        />
      )}
      {q.kind === "months" && (
        <NumberInput
          id={id}
          width="sm"
          unit="개월"
          maxIntegerDigits={3}
          value={(value as number | null | undefined) ?? null}
          onChange={(n) => onValue(n === null ? null : Math.min(120, Math.max(0, n)))}
        />
      )}
    </>
  );
}
