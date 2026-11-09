"use client";

/**
 * 숫자 칸 (쉼표 없음): 나이 · 경력 · 금리 · 개월 · 변화율. 값은 숫자(비우면 null).
 * 금액은 MoneyInput을 쓴다.
 *
 *   <NumberInput id="age" value={age} onChange={setAge} unit="세" />
 *   <NumberInput id="rate" value={rate} onChange={setRate} decimals={2} unit="%" />
 */
import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { formatNumberText, normalizeNumberText } from "./number-input";

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "inputMode"> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** 소수 자릿수 (금리는 2) */
  decimals?: number;
  allowNegative?: boolean;
  maxIntegerDigits?: number;
  unit?: string;
  invalid?: boolean;
  /** 칸 너비 (기본: 칸 전체) */
  width?: "full" | "sm";
}

export function NumberInput({
  value,
  onChange,
  decimals = 0,
  allowNegative = false,
  maxIntegerDigits,
  unit,
  invalid = false,
  width = "full",
  id,
  className = "",
  ...inputProps
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const external = value ?? null;
  const options = { decimals, allowNegative, maxIntegerDigits };
  const [text, setText] = useState(() => formatNumberText(external, decimals));
  const [syncedValue, setSyncedValue] = useState<number | null>(external);

  // 밖에서 값이 바뀌면(종류를 고르면 기본 금리 채움 등) 글자를 다시 맞춘다
  if (external !== syncedValue) {
    setSyncedValue(external);
    if (normalizeNumberText(text, options).value !== external) setText(formatNumberText(external, decimals));
  }

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && pendingCaret.current !== null && document.activeElement === el) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  return (
    <div
      className={[
        "flex h-11 items-center rounded-lg border bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2",
        width === "sm" ? "w-36" : "w-full",
        invalid ? "border-danger-line focus-within:outline-danger" : "border-line-strong focus-within:outline-primary",
      ].join(" ")}
    >
      <input
        {...inputProps}
        ref={inputRef}
        id={id}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        size={1}
        aria-invalid={invalid || undefined}
        className={`min-w-0 flex-1 bg-transparent text-right text-[15px] tabular-nums outline-none ${className}`}
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          const caret = event.target.selectionStart ?? raw.length;
          const next = normalizeNumberText(raw, options);
          // 받지 않은 글자만큼 커서를 앞으로
          pendingCaret.current = Math.max(0, Math.min(next.text.length, caret - (raw.length - next.text.length)));
          setText(next.text);
          setSyncedValue(next.value);
          if (next.value !== external) onChange(next.value);
        }}
      />
      {unit && <span className="ml-2 shrink-0 text-sm text-muted">{unit}</span>}
    </div>
  );
}
