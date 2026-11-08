"use client";

/**
 * 01-1 나와 소득/지출.
 * 다음 → 필수 칸 확인 → POST /inputs/validate (step=BASIC) → 지출이 소득 이상이면 경고 모달 (WARN_EXPENSE_OVER_INCOME)
 * v1.7 선택 칸: 소득 아래 '더 정확하게 넣기'(세전 연봉 · 무주택 세대주), 고정지출 아래 '그중 월세' (TaxInputs.tsx)
 */
import { Choice } from "@/components/ui/Choice";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";
import { StepScreen } from "@/features/input/StepScreen";
import { FormNoticeBox, StepWarningModal, useStepForm } from "@/features/input/step-form";
import { FormSection } from "@/components/ui";
import { fillBlankExpenseItems, patch } from "@/features/input/draft";
import { MINUS, formatKoreanWon, formatWon } from "@/lib/format";
import { fieldId } from "@/lib/form";
import { resolvedExpenseTotal } from "@/lib/rules";
import { formatYearMonth } from "@/lib/year-month";
import { ExpenseEditor } from "./ExpenseEditor";
import { MoreAccurateIncome, RentField } from "./TaxInputs";

const EMPLOYMENT_OPTIONS = [
  { value: "REGULAR", label: "정규직" },
  { value: "CONTRACT", label: "계약직" },
] as const;

export function BasicStep() {
  const form = useStepForm("BASIC", { prepare: fillBlankExpenseItems });
  const { input } = form;

  const ageId = fieldId("person.age");
  const careerId = fieldId("person.careerYears");
  const incomeId = fieldId("income.monthlyNetIncome");
  const ageError = form.error("person.age");
  const careerError = form.error("person.careerYears");
  const incomeError = form.error("income.monthlyNetIncome");
  const ageHint = "만 나이, 19~39세";
  const careerHint = "0~10년, 나이 − 15년까지";
  const incomeHint = "세금·4대 보험을 뗀 뒤 통장에 들어오는 돈 (1만~3,000만 원)";

  return (
    <StepScreen
      step="BASIC"
      description="월 실수령액과 지출을 넣으면 매달 남는 돈을 바로 보여 드려요."
      onNext={form.submit}
      busy={form.busy}
    >
      <FormNoticeBox form={form} />

      <FormSection title="나" description="실직 위험과 연봉 상승률을 고르고, 청년미래적금 대상인지 판정하는 데 써요.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id={ageId} path="person.age" label="나이" required hint={ageHint} error={ageError}>
            <NumberInput
              id={ageId}
              value={input.person?.age}
              unit="세"
              maxIntegerDigits={2}
              invalid={Boolean(ageError)}
              aria-describedby={describedBy(ageId, ageError, ageHint)}
              onBlur={form.touch("person.age")}
              onChange={(age) => form.update((prev) => patch(prev, "person", { age }))}
            />
          </Field>
          <Field id={careerId} path="person.careerYears" label="경력" required hint={careerHint} error={careerError}>
            <NumberInput
              id={careerId}
              value={input.person?.careerYears}
              unit="년"
              maxIntegerDigits={2}
              invalid={Boolean(careerError)}
              aria-describedby={describedBy(careerId, careerError, careerHint)}
              onBlur={form.touch("person.careerYears")}
              onChange={(careerYears) => form.update((prev) => patch(prev, "person", { careerYears }))}
            />
          </Field>
        </div>
        <Field
          id={fieldId("person.employmentType")}
          path="person.employmentType"
          label="고용형태"
          group
          hint="계약직이면 실직 위험을 더 높게 계산해요."
        >
          <Choice
            id={fieldId("person.employmentType")}
            name="employmentType"
            label="고용형태"
            value={input.person?.employmentType ?? "REGULAR"}
            options={EMPLOYMENT_OPTIONS}
            onChange={(employmentType) => form.update((prev) => patch(prev, "person", { employmentType }))}
          />
        </Field>
      </FormSection>

      <FormSection title="소득">
        <Field id={incomeId} path="income.monthlyNetIncome" label="월 실수령액" required hint={incomeHint} error={incomeError}>
          <MoneyInput
            id={incomeId}
            value={input.income?.monthlyNetIncome}
            invalid={Boolean(incomeError)}
            aria-describedby={describedBy(incomeId, incomeError, incomeHint)}
            onBlur={form.touch("income.monthlyNetIncome")}
            onChange={(monthlyNetIncome) => form.update((prev) => patch(prev, "income", { monthlyNetIncome }))}
          />
        </Field>
        <MoreAccurateIncome form={form} />
      </FormSection>

      <FormSection title="지출" description="한 달 기준으로 넣어요. 합계로 넣어도, 항목별로 넣어도 돼요.">
        <ExpenseEditor form={form} kind="fixed" label="고정지출" hint="월세·관리비·통신비·보험료처럼 매달 거의 같은 돈." />
        <RentField form={form} />
        <div className="border-t border-line" />
        <ExpenseEditor form={form} kind="variable" label="변동지출" hint="식비·쇼핑·여가처럼 달마다 달라지는 돈." />
      </FormSection>

      <MonthlyFreeCash
        income={input.income?.monthlyNetIncome}
        fixed={resolvedExpenseTotal(input.expenses?.fixed)}
        variable={resolvedExpenseTotal(input.expenses?.variable)}
      />

      {form.hydrated && input.startMonth && (
        <p className="text-sm text-muted">
          기준 연월: {formatYearMonth(input.startMonth)} (처음 입력한 달이에요. 목표와 예정된 일의 시점을 여기서부터 세요)
        </p>
      )}

      <StepWarningModal form={form} />
    </StepScreen>
  );
}

/** 월 여유자금 = 실수령액 − 고정지출 − 변동지출 (입력하는 대로, 화면 표시용 합계) */
function MonthlyFreeCash({
  income,
  fixed,
  variable,
}: {
  income: number | null | undefined;
  fixed: number | null;
  variable: number | null;
}) {
  const ready = income != null && fixed != null && variable != null;
  const free = ready ? income - fixed - variable : null;
  return (
    <section aria-live="polite" className="rounded-xl border border-info-line bg-system-soft px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">월 여유자금</h2>
        <p className={`text-xl font-bold tabular-nums ${free !== null && free < 0 ? "text-danger" : "text-ink"}`}>
          {free === null ? "—" : formatWon(free)}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {ready
          ? `실수령액 ${formatWon(income)} ${MINUS} 고정지출 ${formatWon(fixed)} ${MINUS} 변동지출 ${formatWon(variable)}`
          : "실수령액과 지출을 넣으면 바로 보여 드려요."}
      </p>
      {free !== null && free < 0 && (
        <p className="mt-1 text-sm font-semibold text-danger">
          매달 {formatKoreanWon(-free)}이 모자라요. 다음으로 넘어갈 때 한 번 더 물어볼게요.
        </p>
      )}
    </section>
  );
}
