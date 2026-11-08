"use client";

/**
 * 02 목표 설정: 이름(선택) · 금액 · 연월 (기준 달부터 12~120개월만 고를 수 있게).
 * 다음 → 필수 칸 확인 → validate (step=GOAL) → 이미 목표 이상이면 안내 모달 (WARN_GOAL_ALREADY_MET)
 */
import Link from "next/link";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { StepScreen } from "@/features/input/StepScreen";
import { YearMonthPicker } from "@/components/ui/YearMonthPicker";
import { FormNoticeBox, StepWarningModal, useStepForm } from "@/features/input/step-form";
import { FormSection, textInputClass } from "@/components/ui";
import { patch } from "@/features/input/draft";
import { formatManwonRange, formatRange, formatWon } from "@/lib/format";
import { fieldId } from "@/lib/form";
import { useCurrentMonth } from "@/lib/hooks";
import { LIMITS, resolvedExpenseTotal } from "@/lib/rules";
import { STEPS } from "@/lib/steps";
import { INPUT_DEFAULTS } from "@/config/policy";
import type { SimulationInputDraft } from "@/lib/types";
import { formatDuration, formatYearMonth, isWithinMonths, isYearMonth, monthsBetween } from "@/lib/year-month";

/** 목표 시점 범위 '1~10년' · '12~120개월'과 금액 범위 (lib/rules.ts의 LIMITS) */
const GOAL_YEARS = formatRange({ min: LIMITS.goalMonths.min / 12, max: LIMITS.goalMonths.max / 12 }, "년");
const GOAL_MONTHS = formatRange(LIMITS.goalMonths, "개월");
const AMOUNT_HINT = formatManwonRange(LIMITS.goalTargetAmount);

const QUICK_PICKS = [
  { label: "1년 뒤", months: 12 },
  { label: "3년 뒤", months: 36 },
  { label: "5년 뒤", months: 60 },
  { label: "10년 뒤", months: 120 },
];

export function GoalStep() {
  const form = useStepForm("GOAL");
  const { input } = form;
  const currentMonth = useCurrentMonth();
  const start = isYearMonth(input.startMonth) ? input.startMonth : currentMonth;

  const nameId = fieldId("goal.name");
  const amountId = fieldId("goal.targetAmount");
  const dateId = fieldId("goal.targetDate");
  const nameError = form.error("goal.name");
  const nameHint = "비워 두면 '내 목표'로 표시해요.";
  const amountError = form.error("goal.targetAmount");
  const target = input.goal?.targetDate;
  const outOfRange =
    start !== null && isYearMonth(target) && !isWithinMonths(start, target, LIMITS.goalMonths.min, LIMITS.goalMonths.max);
  const dateError =
    form.error("goal.targetDate") ?? (outOfRange ? `기준 연월부터 ${GOAL_YEARS}(${GOAL_MONTHS}) 사이로 골라 주세요` : undefined);
  const dateHint = `기준 연월${start ? `(${formatYearMonth(start)})` : ""}부터 ${GOAL_YEARS} 사이만 고를 수 있어요.`;

  return (
    <StepScreen step="GOAL" description="언제까지 얼마를 모으고 싶은지 정해요." onNext={form.submit} busy={form.busy}>
      <FormNoticeBox form={form} />
      <InputSummary input={input} />

      <FormSection title="목표">
        <Field id={nameId} path="goal.name" label="목표 이름" hint={nameHint} error={nameError}>
          <input
            id={nameId}
            className={textInputClass(Boolean(nameError))}
            value={input.goal?.name ?? ""}
            maxLength={30}
            placeholder={INPUT_DEFAULTS.goalName}
            aria-describedby={describedBy(nameId, nameError, nameHint)}
            onBlur={form.touch("goal.name")}
            onChange={(event) => form.update((prev) => patch(prev, "goal", { name: event.target.value }))}
          />
        </Field>
        <Field
          id={amountId}
          path="goal.targetAmount"
          label="목표 금액"
          required
          hint={AMOUNT_HINT}
          error={amountError}
          highlight={form.highlighted("goal.targetAmount")}
        >
          <MoneyInput
            id={amountId}
            value={input.goal?.targetAmount}
            invalid={Boolean(amountError)}
            aria-describedby={describedBy(amountId, amountError, AMOUNT_HINT)}
            onBlur={form.touch("goal.targetAmount")}
            onChange={(targetAmount) => form.update((prev) => patch(prev, "goal", { targetAmount }))}
          />
        </Field>
        <Field
          id={dateId}
          path="goal.targetDate"
          label="목표 시점"
          required
          group
          hint={dateHint}
          error={dateError}
          highlight={form.highlighted("goal.targetDate")}
        >
          {start ? (
            <YearMonthPicker
              id={dateId}
              value={target}
              start={start}
              minMonths={LIMITS.goalMonths.min}
              maxMonths={LIMITS.goalMonths.max}
              quickPicks={QUICK_PICKS}
              invalid={Boolean(dateError)}
              describedBy={describedBy(dateId, dateError, dateHint)}
              onBlur={form.touch("goal.targetDate")}
              onChange={(targetDate) => form.update((prev) => patch(prev, "goal", { targetDate }))}
            />
          ) : (
            <div className="h-11 w-60 animate-pulse rounded-lg bg-canvas" />
          )}
        </Field>
        {start && isYearMonth(target) && !outOfRange && (
          <p className="text-sm text-ink-soft">
            지금부터 {formatDuration(monthsBetween(start, target))} 뒤 ({formatYearMonth(target)}) 목표예요.
          </p>
        )}
      </FormSection>

      <StepWarningModal form={form} />
    </StepScreen>
  );
}

/** 입력 요약 · 수정 (와이어플로 02: 값이 채워진 채로 01-1로 이동) */
function InputSummary({ input }: { input: SimulationInputDraft }) {
  const fixed = resolvedExpenseTotal(input.expenses?.fixed);
  const variable = resolvedExpenseTotal(input.expenses?.variable);
  const expense = fixed != null && variable != null ? fixed + variable : null;
  const assets = input.assets;
  const owned =
    assets?.cash != null && assets.deposits != null ? assets.cash + assets.deposits + (assets.investments ?? 0) : null;
  const loanCount = input.loans?.hasNoLoan ? 0 : (input.loans?.items ?? []).length;
  const rows = [
    ["월 실수령액", formatWon(input.income?.monthlyNetIncome)],
    ["월 지출", formatWon(expense)],
    ["월 저축액", formatWon(input.savingPlan?.monthlySaving)],
    ["지금 가진 돈", formatWon(owned)],
    ["대출", input.loans?.hasNoLoan == null ? "" : loanCount === 0 ? "없음" : `${loanCount}건`],
  ] as const;

  return (
    <section className="rounded-xl border border-line bg-surface px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">입력 요약</h2>
        <Link href={STEPS[0].href} className="text-sm font-semibold text-primary hover:underline">
          수정
        </Link>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 sm:block">
            <dt className="text-muted">{label}</dt>
            <dd className="font-medium tabular-nums">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
