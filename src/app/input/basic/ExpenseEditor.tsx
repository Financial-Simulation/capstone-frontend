"use client";

/** 01-1 고정지출 · 변동지출 한 묶음: 합계로 입력 / 항목별로 입력 (inputMode TOTAL / DETAIL) */
import { Choice } from "@/components/Choice";
import { Field, describedBy } from "@/components/Field";
import { MoneyInput } from "@/components/MoneyInput";
import type { StepForm } from "@/components/step-form";
import { Button, textInputClass } from "@/components/ui";
import {
  addExpenseItem,
  patchExpense,
  patchExpenseItem,
  removeExpenseItem,
  setExpenseMode,
  type ExpenseKind,
} from "@/lib/draft";
import { formatWon } from "@/lib/format";
import { fieldId } from "@/lib/form";
import { resolvedExpenseTotal } from "@/lib/rules";

const MODE_OPTIONS = [
  { value: "TOTAL", label: "합계로 입력" },
  { value: "DETAIL", label: "항목별로 입력" },
] as const;

export function ExpenseEditor({
  form,
  kind,
  label,
  hint,
}: {
  form: StepForm;
  kind: ExpenseKind;
  label: string;
  hint: string;
}) {
  const base = `expenses.${kind}`;
  const group = form.input.expenses?.[kind];
  const mode = group?.inputMode ?? "TOTAL";
  const items = group?.items ?? [];
  const totalPath = `${base}.total`;
  const totalId = fieldId(totalPath);
  const totalError = form.error(totalPath);
  const highlighted = form.highlighted(base);

  return (
    <div
      data-field={base}
      className={`space-y-3 ${highlighted ? "rounded-lg outline-2 outline-offset-4 outline-warn-line [outline-style:solid]" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {label}
          <span className="ml-1 text-xs font-medium text-muted">(필수)</span>
        </h3>
        <Choice
          id={fieldId(`${base}.inputMode`)}
          name={`${base}.inputMode`}
          label={`${label} 입력 방식`}
          value={mode}
          options={MODE_OPTIONS}
          onChange={(next) => form.update((prev) => setExpenseMode(prev, kind, next))}
        />
      </div>

      {mode === "TOTAL" ? (
        <Field
          id={totalId}
          path={totalPath}
          label={
            <>
              <span className="sr-only">{label} </span>한 달 합계
            </>
          }
          required
          mark={false}
          hint={hint}
          error={totalError}
        >
          <MoneyInput
            id={totalId}
            value={group?.total}
            invalid={Boolean(totalError)}
            aria-describedby={describedBy(totalId, totalError, hint)}
            onBlur={form.touch(totalPath)}
            onChange={(total) => form.update((prev) => patchExpense(prev, kind, { inputMode: "TOTAL", total }))}
          />
        </Field>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted">{hint} 비워 둔 항목은 0원으로 계산해요.</p>
          <ul className="space-y-2">
            {items.map((item, index) => {
              const itemPath = `${base}.items[${index}]`;
              const nameError = form.error(`${itemPath}.name`);
              const amountError = form.error(`${itemPath}.amount`);
              const amountId = fieldId(`${itemPath}.amount`);
              return (
                <li key={index} data-field={itemPath}>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-start gap-2">
                    <input
                      id={fieldId(`${itemPath}.name`)}
                      aria-label={`${label} 항목 ${index + 1} 이름`}
                      className={textInputClass(Boolean(nameError))}
                      value={item.name ?? ""}
                      maxLength={20}
                      placeholder="항목 이름"
                      onBlur={form.touch(`${itemPath}.name`)}
                      onChange={(event) =>
                        form.update((prev) => patchExpenseItem(prev, kind, index, { name: event.target.value }))
                      }
                    />
                    <MoneyInput
                      id={amountId}
                      aria-label={`${item.name || `항목 ${index + 1}`} 금액`}
                      value={item.amount}
                      invalid={Boolean(amountError)}
                      showReading={false}
                      placeholder="0"
                      onBlur={form.touch(`${itemPath}.amount`)}
                      onChange={(amount) => form.update((prev) => patchExpenseItem(prev, kind, index, { amount }))}
                    />
                    <button
                      type="button"
                      onClick={() => form.update((prev) => removeExpenseItem(prev, kind, index))}
                      aria-label={`${item.name || `항목 ${index + 1}`} 지우기`}
                      className="h-11 rounded-lg px-3 text-muted hover:bg-canvas hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                  {(nameError || amountError) && <p className="mt-1 text-sm text-danger">{nameError ?? amountError}</p>}
                </li>
              );
            })}
          </ul>
          {form.error(`${base}.items`) && <p className="text-sm text-danger">{form.error(`${base}.items`)}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <Button size="sm" variant="secondary" onClick={() => form.update((prev) => addExpenseItem(prev, kind))}>
              + 항목 추가
            </Button>
            <p className="text-sm">
              합계 <strong className="tabular-nums">{formatWon(resolvedExpenseTotal(group)) || "0원"}</strong>
            </p>
          </div>
          {totalError && (
            <p id={`${totalId}-error`} className="text-sm text-danger">
              {totalError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
