"use client";

/**
 * 01-2 대출 한 건. 종류를 고르면 평균 금리 · 흔한 갚는 방식을 채우고,
 * 종류 · 남은 원금 · 남은 기간이 차면 입력이 멈추고 0.3초 뒤 첫 달 상환액을 보여 준다 (POST /loans/repayment-preview).
 */
import { Field, describedBy } from "@/components/Field";
import { MoneyInput } from "@/components/MoneyInput";
import { NumberInput } from "@/components/NumberInput";
import { useDebouncedApi, type DebouncedState, type StepForm } from "@/components/step-form";
import { api, isApiError } from "@/lib/api";
import { patchLoan, removeLoan, setLoanType } from "@/lib/draft";
import { formatWon } from "@/lib/format";
import { fieldId } from "@/lib/form";
import {
  LOAN_DEFAULTS,
  REPAYMENT_LABELS,
  type Draft,
  type LoanItem,
  type LoanType,
  type RepaymentPreviewRequest,
  type RepaymentPreviewResult,
  type RepaymentType,
} from "@/lib/types";

const LOAN_TYPES = Object.keys(LOAN_DEFAULTS) as LoanType[];
const REPAYMENT_TYPES = Object.keys(REPAYMENT_LABELS) as RepaymentType[];

const fetchRepayment = (body: RepaymentPreviewRequest, signal: AbortSignal) => api.repaymentPreview(body, { signal });

/** 미리보기를 부를 수 있는 칸이 다 찼고 범위 안이면 요청 본문 */
export function repaymentBody(loan: Draft<LoanItem> | undefined): RepaymentPreviewRequest | null {
  if (!loan?.loanType || loan.principal == null || loan.remainingMonths == null) return null;
  if (loan.principal < 1 || loan.remainingMonths < 1 || loan.remainingMonths > 480) return null;
  if (loan.annualRate != null && (loan.annualRate < 0 || loan.annualRate > 20)) return null;
  return {
    loanType: loan.loanType,
    principal: loan.principal,
    annualRate: loan.annualRate ?? null,
    remainingMonths: loan.remainingMonths,
    repaymentType: loan.repaymentType ?? null,
  };
}

const selectClass = (invalid: boolean) =>
  `h-11 w-full rounded-lg border bg-surface px-3 text-[15px] ${invalid ? "border-danger-line" : "border-line-strong"}`;

export function LoanCard({ form, index, count }: { form: StepForm; index: number; count: number }) {
  const loan = form.input.loans?.items?.[index];
  const base = `loans.items[${index}]`;
  const path = (key: string) => `${base}.${key}`;
  const ids = {
    type: fieldId(path("loanType")),
    principal: fieldId(path("principal")),
    rate: fieldId(path("annualRate")),
    months: fieldId(path("remainingMonths")),
    method: fieldId(path("repaymentType")),
  };
  const errors = {
    type: form.error(path("loanType")),
    principal: form.error(path("principal")),
    rate: form.error(path("annualRate")),
    months: form.error(path("remainingMonths")),
  };
  const cardError = form.error(base, { prefix: true });
  const defaults = loan?.loanType ? LOAN_DEFAULTS[loan.loanType] : null;
  const rateHint = defaults ? `${defaults.label} 평균 ${defaults.annualRate}% (0~20%)` : "종류를 고르면 평균 금리를 채워요 (0~20%)";
  const monthsHint = "1~480개월";

  const preview = useDebouncedApi(repaymentBody(loan), fetchRepayment);

  return (
    <div
      data-field={base}
      className={`rounded-xl border p-4 ${cardError ? "border-danger-line" : "border-line"} bg-canvas/50`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">
          대출 {count > 1 ? index + 1 : ""}
          {loan?.loanType && <span className="ml-1 font-medium text-ink-soft">· {LOAN_DEFAULTS[loan.loanType].label}</span>}
        </h3>
        <button
          type="button"
          onClick={() => form.update((prev) => removeLoan(prev, index))}
          className="rounded-md px-2 py-1 text-sm text-muted hover:bg-surface hover:text-danger"
        >
          삭제
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id={ids.type} path={path("loanType")} label="종류" required error={errors.type}>
          <select
            id={ids.type}
            className={selectClass(Boolean(errors.type))}
            value={loan?.loanType ?? ""}
            aria-invalid={Boolean(errors.type) || undefined}
            aria-describedby={describedBy(ids.type, errors.type)}
            onBlur={form.touch(path("loanType"))}
            onChange={(event) => {
              const type = event.target.value as LoanType;
              if (type) form.update((prev) => setLoanType(prev, index, type));
            }}
          >
            <option value="" disabled>
              종류를 골라 주세요
            </option>
            {LOAN_TYPES.map((type) => (
              <option key={type} value={type}>
                {LOAN_DEFAULTS[type].label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.principal} path={path("principal")} label="남은 원금" required error={errors.principal}>
          <MoneyInput
            id={ids.principal}
            value={loan?.principal}
            invalid={Boolean(errors.principal)}
            aria-describedby={describedBy(ids.principal, errors.principal)}
            onBlur={form.touch(path("principal"))}
            onChange={(principal) => form.update((prev) => patchLoan(prev, index, { principal }))}
          />
        </Field>
        <Field id={ids.rate} path={path("annualRate")} label="금리 (연)" hint={rateHint} error={errors.rate}>
          <NumberInput
            id={ids.rate}
            value={loan?.annualRate}
            decimals={2}
            maxIntegerDigits={2}
            unit="%"
            placeholder={defaults ? String(defaults.annualRate) : undefined}
            invalid={Boolean(errors.rate)}
            aria-describedby={describedBy(ids.rate, errors.rate, rateHint)}
            onBlur={form.touch(path("annualRate"))}
            onChange={(annualRate) => form.update((prev) => patchLoan(prev, index, { annualRate }))}
          />
        </Field>
        <Field id={ids.months} path={path("remainingMonths")} label="남은 기간" required hint={monthsHint} error={errors.months}>
          <NumberInput
            id={ids.months}
            value={loan?.remainingMonths}
            maxIntegerDigits={3}
            unit="개월"
            invalid={Boolean(errors.months)}
            aria-describedby={describedBy(ids.months, errors.months, monthsHint)}
            onBlur={form.touch(path("remainingMonths"))}
            onChange={(remainingMonths) => form.update((prev) => patchLoan(prev, index, { remainingMonths }))}
          />
        </Field>
        <Field
          id={ids.method}
          path={path("repaymentType")}
          label="갚는 방식"
          hint={defaults ? `${defaults.label}은 보통 ${REPAYMENT_LABELS[defaults.repaymentType]}` : undefined}
        >
          <select
            id={ids.method}
            className={selectClass(false)}
            value={loan?.repaymentType ?? defaults?.repaymentType ?? ""}
            onChange={(event) =>
              form.update((prev) => patchLoan(prev, index, { repaymentType: event.target.value as RepaymentType }))
            }
          >
            {!defaults && !loan?.repaymentType && (
              <option value="" disabled>
                종류를 먼저 골라 주세요
              </option>
            )}
            {REPAYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {REPAYMENT_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <RepaymentLine loan={loan} preview={preview} />
    </div>
  );
}

function RepaymentLine({
  loan,
  preview,
}: {
  loan: Draft<LoanItem> | undefined;
  preview: DebouncedState<RepaymentPreviewResult>;
}) {
  const body = repaymentBody(loan);
  let text: string;
  let tone = "text-ink-soft";
  if (!body) {
    text = "종류 · 남은 원금 · 남은 기간을 넣으면 첫 달 상환액을 보여 드려요.";
  } else if (preview.pending) {
    text = "상환액을 계산하는 중…";
  } else if (preview.data) {
    const d = preview.data;
    const method = loan?.repaymentType ?? (loan?.loanType ? LOAN_DEFAULTS[loan.loanType].repaymentType : null);
    text =
      method === "INTEREST_ONLY"
        ? `매달 이자 ${formatWon(d.firstMonthInterest)} · 총이자 ${formatWon(d.totalInterest)} (원금은 만기에 보증금으로 갚아요)`
        : `첫 달 ${formatWon(d.firstMonthPayment)} (원금 ${formatWon(d.firstMonthPrincipal)} + 이자 ${formatWon(d.firstMonthInterest)}) · 총이자 ${formatWon(d.totalInterest)}`;
    tone = "font-semibold text-ink";
  } else if (isApiError(preview.error) && preview.error.code === "MOCK_UNAVAILABLE") {
    text = "목업 모드라 상환액을 계산하지 않아요. (개발 점검에서 repaymentPreview를 real로)";
  } else {
    text = "상환액을 계산하지 못했어요. 백엔드가 켜져 있는지 확인해 주세요.";
    tone = "text-danger";
  }
  return (
    <p aria-live="polite" className={`mt-3 rounded-lg bg-surface px-3 py-2 text-sm tabular-nums ${tone}`}>
      월 상환액 · {text}
    </p>
  );
}
