"use client";

/**
 * 금액 칸: 숫자만 받고 천 단위 쉼표를 자동으로 넣는다. 값은 원 단위 정수(비우면 null).
 * 쉼표가 들어가도 커서는 친 숫자 바로 뒤에 남는다. 붙여넣기("2,500,000원")도 숫자만 남긴다.
 *
 *   <MoneyInput id="net" value={income} onChange={setIncome} />
 */
import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { formatKoreanWon } from "@/lib/format";
import {
  caretAfterDigits,
  digitsBeforeCaret,
  formatMoneyText,
  normalizeMoneyText,
} from "@/lib/money-input";

export interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "inputMode"> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** 맨 앞 '-' 허용 (예: 주거비 변화) */
  allowNegative?: boolean;
  /** 칸 오른쪽 단위 */
  unit?: string;
  /** 칸 아래에 '46만 5,161원'처럼 읽기 쉬운 금액을 보여 준다 */
  showReading?: boolean;
  invalid?: boolean;
}

export function MoneyInput({
  value,
  onChange,
  allowNegative = false,
  unit = "원",
  showReading = true,
  invalid = false,
  id,
  className = "",
  "aria-describedby": describedBy,
  ...inputProps
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const external = value ?? null;
  const [text, setText] = useState(() => formatMoneyText(external));
  const [syncedValue, setSyncedValue] = useState<number | null>(external);

  // 밖에서 값이 바뀌면(저장값 불러오기, 초기화) 글자를 다시 맞춘다
  if (external !== syncedValue) {
    setSyncedValue(external);
    if (normalizeMoneyText(text, { allowNegative }).value !== external) {
      setText(formatMoneyText(external));
    }
  }

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && pendingCaret.current !== null && document.activeElement === el) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  const readingId = id ? `${id}-reading` : undefined;
  const reading = showReading && external !== null && Math.abs(external) >= 10_000 ? formatKoreanWon(external) : "";

  return (
    <div>
      <div
        className={[
          "flex h-11 items-center rounded-lg border bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2",
          invalid
            ? "border-danger-line focus-within:outline-danger"
            : "border-line-strong focus-within:outline-primary",
        ].join(" ")}
      >
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          // 기본 size(20자)만큼의 최소 너비가 좁은 화면에서 칸을 밀어내지 않게
          size={1}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, reading ? readingId : undefined].filter(Boolean).join(" ") || undefined}
          className={`min-w-0 flex-1 bg-transparent text-right text-[15px] tabular-nums outline-none ${className}`}
          value={text}
          onChange={(event) => {
            const raw = event.target.value;
            const caret = event.target.selectionStart ?? raw.length;
            const digits = digitsBeforeCaret(raw, caret);
            const next = normalizeMoneyText(raw, { allowNegative });
            pendingCaret.current = caretAfterDigits(next.text, digits);
            setText(next.text);
            setSyncedValue(next.value);
            if (next.value !== external) onChange(next.value);
          }}
        />
        {unit && <span className="ml-2 shrink-0 text-sm text-muted">{unit}</span>}
      </div>
      {reading && (
        <p id={readingId} className="mt-1 text-right text-xs text-muted">
          {reading}
        </p>
      )}
    </div>
  );
}
