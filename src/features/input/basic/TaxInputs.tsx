"use client";

/**
 * 01-1의 v1.7 선택 칸 (구현 명세서 v1.7 9.3, tax-addon.js의 입력 칸을 옮김).
 *  - 소득 아래 '더 정확하게 넣기': 세전 연봉 · 무주택 세대주
 *  - 고정지출 아래 '그중 월세'
 * 비워 두면 서버 기본값으로 계산한다 (세전 연봉은 실수령액으로 어림, 무주택 세대주는 예, 월세는 0).
 * 오류(세전 연봉이 실수령액보다 작음 · 월세가 고정지출보다 큼)는 서버 키를 이 칸으로 바꿔 칸 아래에 보여 준다 (lib/api/errors.ts).
 */
import { useState } from "react";
import { Choice } from "@/components/ui/Choice";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import type { StepForm } from "@/features/input/step-form";
import { patch } from "@/features/input/draft";
import { RENT_TAX_CREDIT, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { formatManwon } from "@/lib/format";
import { fieldId } from "@/lib/form";

const GROSS = "income.annualGrossSalary";
const HOMELESS = "person.homelessHouseholder";
const RENT = "expenses.monthlyRent";

export const GROSS_HINT =
  `세금을 떼기 전 1년 급여(총급여)예요. 비우면 월 실수령액 × 12 ÷ ${YOUTH_FUTURE_SAVING.netToGrossRatio}로 어림해요. ` +
  `연말정산과 청년미래적금 지원금(총급여 ${formatManwon(YOUTH_FUTURE_SAVING.matchMaxGrossSalary)} 이하) 판정에 써요.`;

export const HOMELESS_HINT = "청약 소득공제·월세 세액공제를 받으려면 집이 없는 세대의 세대주여야 해요. 혼자 살면 대부분 해당돼요.";

export const RENT_HINT =
  `고정지출에 들어 있는 월세예요. 무주택 세대주라면 낸 월세의 ${RENT_TAX_CREDIT.lowRate}~${RENT_TAX_CREDIT.highRate}%를 ` +
  `연말정산에서 돌려받을 수 있어요 (총급여 ${formatManwon(RENT_TAX_CREDIT.maxGrossSalary)} 이하).`;

const HOMELESS_OPTIONS = [
  { value: "YES", label: "예" },
  { value: "NO", label: "아니요" },
] as const;

/** 소득 아래 '더 정확하게 넣기' (세전 연봉 · 무주택 세대주) */
export function MoreAccurateIncome({ form }: { form: StepForm }) {
  const { input } = form;
  const grossId = fieldId(GROSS);
  const grossError = form.error(GROSS);
  const homelessId = fieldId(HOMELESS);
  const filled = input.income?.annualGrossSalary != null || input.person?.homelessHouseholder != null;
  // 값이 있으면 펼쳐 두고, 사용자가 한 번 열거나 닫으면 그대로 둔다.
  // 접어 둔 채 '다음'을 눌러 안의 칸에 오류가 나면 focusFirstField(step-form.tsx)가 펼친다
  const [open, setOpen] = useState<boolean | null>(null);

  return (
    <details
      open={open ?? filled}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-lg border border-line px-4 py-3"
    >
      <summary className="cursor-pointer list-none text-sm font-semibold">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>더 정확하게 넣기
        <span className="ml-1 text-xs font-medium text-muted">(선택 · 비워 두면 기본값)</span>
      </summary>
      <div className="mt-4 space-y-5 pb-1">
        <Field id={grossId} path={GROSS} label="세전 연봉" hint={GROSS_HINT} error={grossError}>
          <MoneyInput
            id={grossId}
            value={input.income?.annualGrossSalary}
            invalid={Boolean(grossError)}
            aria-describedby={describedBy(grossId, grossError, GROSS_HINT)}
            onBlur={form.touch(GROSS)}
            onChange={(annualGrossSalary) => form.update((prev) => patch(prev, "income", { annualGrossSalary }))}
          />
        </Field>
        <Field id={homelessId} path={HOMELESS} label="무주택 세대주" group hint={HOMELESS_HINT}>
          <Choice
            id={homelessId}
            name="homelessHouseholder"
            label="무주택 세대주"
            describedBy={`${homelessId}-hint`}
            value={input.person?.homelessHouseholder === false ? "NO" : "YES"}
            options={HOMELESS_OPTIONS}
            onChange={(choice) => form.update((prev) => patch(prev, "person", { homelessHouseholder: choice === "YES" }))}
          />
        </Field>
      </div>
    </details>
  );
}

/** 고정지출 아래 '그중 월세' */
export function RentField({ form }: { form: StepForm }) {
  const id = fieldId(RENT);
  const error = form.error(RENT);
  return (
    <div className="border-l-2 border-line pl-4">
      <Field id={id} path={RENT} label="그중 월세" hint={RENT_HINT} error={error}>
        <MoneyInput
          id={id}
          value={form.input.expenses?.monthlyRent}
          invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, RENT_HINT)}
          onBlur={form.touch(RENT)}
          onChange={(monthlyRent) => form.update((prev) => patch(prev, "expenses", { monthlyRent }))}
        />
      </Field>
    </div>
  );
}
