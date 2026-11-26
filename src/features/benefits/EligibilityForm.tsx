"use client";

/**
 * 혜택 질문 모음. 답을 바꾸면 혜택 카드가 다시 판정된다 (서버 /benefits).
 */
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";
import { YearMonthPicker } from "@/components/ui/YearMonthPicker";
import type { Eligibility, EligibilityKey, YearMonth } from "@/lib/types";
import { QUESTIONS, answeredCount, withAnswer, type Question } from "./questions";

export const ELIGIBILITY_FORM_ID = "eligibility-form";

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
}: {
  eligibility: Eligibility;
  onChange: (next: Eligibility) => void;
  startMonth: YearMonth;
  open: boolean;
}) {
  const count = answeredCount(eligibility);
  return (
    <div
      id={ELIGIBILITY_FORM_ID}
      hidden={!open}
      className="mt-4 rounded-lg border border-primary/30 bg-primary-soft/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 xl:grid-cols-2">
        {QUESTIONS.map((q) => (
          <QuestionField
            key={q.key}
            q={q}
            value={eligibility[q.key]}
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
    </div>
  );
}

function QuestionField({
  q,
  value,
  startMonth,
  onValue,
}: {
  q: Question;
  value: Eligibility[EligibilityKey];
  startMonth: YearMonth;
  onValue: (value: Eligibility[EligibilityKey]) => void;
}) {
  const id = `elig-${q.key}`;
  return (
    <div className="p-2">
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
