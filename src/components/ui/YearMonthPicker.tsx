"use client";

/**
 * 연 · 월 고르기. 기준 달부터 min~max개월 안만 고를 수 있고, 그 밖의 달은 목록에서 회색으로 잠긴다.
 * (02 목표: 12~120개월, 03 예정된 일: 0~119개월)
 */
import { useState } from "react";
import type { YearMonth } from "@/lib/types";
import { addMonths, isWithinMonths, isYearMonth, selectableYears, splitYearMonth, toYearMonth } from "@/lib/year-month";

export interface QuickPick {
  label: string;
  /** 기준 달부터 몇 개월 뒤 */
  months: number;
}

export function YearMonthPicker({
  id,
  value,
  onChange,
  start,
  minMonths,
  maxMonths,
  invalid = false,
  quickPicks = [],
  describedBy,
  onBlur,
}: {
  /** 연도 select의 id (라벨이 가리킴). 월 select는 `${id}-month` */
  id: string;
  value: YearMonth | null | undefined;
  onChange: (value: YearMonth | null) => void;
  start: YearMonth;
  minMonths: number;
  maxMonths: number;
  invalid?: boolean;
  quickPicks?: QuickPick[];
  describedBy?: string;
  onBlur?: () => void;
}) {
  const selected = isYearMonth(value) ? splitYearMonth(value) : null;
  // 연도만 고르고 월은 아직인 상태는 칸에만 둔다 (입력값은 둘 다 골라야 정해진다)
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  const year = selected?.year ?? pendingYear;
  const years = selectableYears(start, minMonths, maxMonths);
  // 저장된 값이 범위 밖이면(기준 달을 바꾼 뒤 등) 그 연도도 보여 주고 오류로 알린다
  const yearOptions =
    selected && !years.includes(selected.year) ? [selected.year, ...years].sort((a, b) => a - b) : years;
  const outOfRange = isYearMonth(value) && !isWithinMonths(start, value, minMonths, maxMonths);

  const allowed = (y: number, m: number) => isWithinMonths(start, toYearMonth(y, m), minMonths, maxMonths);

  const selectClass = [
    "h-11 rounded-lg border bg-surface px-3 text-[15px] tabular-nums",
    invalid || outOfRange ? "border-danger-line" : "border-line-strong",
  ].join(" ");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" onBlur={onBlur}>
        <select
          id={id}
          aria-label="연도"
          aria-invalid={invalid || outOfRange || undefined}
          aria-describedby={describedBy}
          className={`${selectClass} w-32`}
          value={year ?? ""}
          onChange={(event) => {
            const nextYear = event.target.value ? Number(event.target.value) : null;
            if (nextYear === null) {
              setPendingYear(null);
              onChange(null);
              return;
            }
            // 같은 월을 그 연도에서 고를 수 있으면 유지, 아니면 월을 다시 고르게
            if (selected && allowed(nextYear, selected.month)) {
              setPendingYear(null);
              onChange(toYearMonth(nextYear, selected.month));
            } else {
              setPendingYear(nextYear);
              if (selected) onChange(null);
            }
          }}
        >
          <option value="">연도</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select
          id={`${id}-month`}
          aria-label="월"
          aria-invalid={invalid || outOfRange || undefined}
          aria-describedby={describedBy}
          className={`${selectClass} w-28`}
          value={selected?.month ?? ""}
          disabled={year === null}
          onChange={(event) => {
            const month = event.target.value ? Number(event.target.value) : null;
            if (year === null || month === null) {
              onChange(null);
              return;
            }
            setPendingYear(null);
            onChange(toYearMonth(year, month));
          }}
        >
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m} disabled={year === null || !allowed(year, m)}>
              {m}월
            </option>
          ))}
        </select>
      </div>
      {quickPicks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickPicks.map((pick) => {
            const target = addMonths(start, pick.months);
            const active = value === target;
            return (
              <button
                key={pick.label}
                type="button"
                onClick={() => {
                  setPendingYear(null);
                  onChange(target);
                }}
                aria-pressed={active}
                className={[
                  "rounded-full border px-3 py-1 text-sm",
                  active ? "border-primary bg-primary-soft font-semibold text-primary" : "border-line bg-surface text-ink-soft hover:border-primary",
                ].join(" ")}
              >
                {pick.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
