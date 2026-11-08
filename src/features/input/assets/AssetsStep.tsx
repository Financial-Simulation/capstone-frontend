"use client";

/**
 * 01-2 자산/대출/저축.
 *  - 입력하는 동안 0.3초 뒤 POST /inputs/validate로 매달 남는 돈(대출 상환액 포함)과 청년미래적금 대상 여부를 보여 준다
 *  - 다음 → 필수 칸 확인 → validate (step=ASSETS) → 매달 모자라면 경고 모달 (WARN_MONTHLY_SHORTFALL)
 */
import { useState } from "react";
import { Choice } from "@/components/ui/Choice";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";
import { StepScreen } from "@/features/input/StepScreen";
import { FormNoticeBox, StepWarningModal, useDebouncedApi, useStepForm, type DebouncedState } from "@/features/input/step-form";
import { Button, FormSection } from "@/components/ui";
import { api, isApiError } from "@/lib/api";
import { addLoan, patch, setHasLoan } from "@/features/input/draft";
import { MINUS, formatKoreanWon, formatWon } from "@/lib/format";
import { fieldId, scopeInput } from "@/lib/form";
import { INPUT_DEFAULTS, type Draft, type LoanItem, type ValidateRequest, type ValidateResult } from "@/lib/types";
import { LoanCard } from "./LoanCard";

const LOAN_OPTIONS = [
  { value: "YES", label: "대출 있음" },
  { value: "NO", label: "대출 없음" },
] as const;

const fetchSummary = (body: ValidateRequest, signal: AbortSignal) => api.validate(body, { signal });

export function AssetsStep() {
  const form = useStepForm("ASSETS");
  const { input } = form;
  const [loanStash, setLoanStash] = useState<Draft<LoanItem>[]>([]);

  const live = useDebouncedApi(
    form.hydrated && input.income?.monthlyNetIncome != null ? { step: "ASSETS" as const, input: scopeInput(input, "ASSETS") } : null,
    fetchSummary,
  );

  const loans = input.loans;
  const hasLoan = loans?.hasNoLoan === true ? "NO" : loans?.hasNoLoan === false ? "YES" : null;
  const loanItems = loans?.items ?? [];

  const money = (path: string, label: string, hint: string, value: number | null | undefined, onChange: (v: number | null) => void, required = true) => {
    const id = fieldId(path);
    const error = form.error(path);
    return (
      <Field id={id} path={path} label={label} required={required} hint={hint} error={error} highlight={form.highlighted(path)}>
        <MoneyInput
          id={id}
          value={value}
          invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          onBlur={form.touch(path)}
          onChange={onChange}
        />
      </Field>
    );
  };

  const rateId = fieldId("savingPlan.generalSavingRate");
  const rateError = form.error("savingPlan.generalSavingRate");
  const rateHint = "가입한 상품이 있으면 그 금리로 고쳐요 (0~10%). 비워 두면 연 3.03% (2025년 은행 정기적금 평균)";
  const optionalFilled =
    input.assets?.investments != null ||
    input.savingPlan?.monthlyInvestment != null ||
    input.savingPlan?.generalSavingRate != null ||
    input.emergency?.breakThreshold != null;
  // 사용자가 한 번 열거나 닫으면 그대로 둔다 (값을 지웠다고 저절로 닫히지 않게)
  const [optionalOpen, setOptionalOpen] = useState<boolean | null>(null);

  return (
    <StepScreen
      step="ASSETS"
      description="지금 가진 돈과 대출, 매달 저축할 금액을 넣어요."
      onNext={form.submit}
      busy={form.busy}
    >
      <FormNoticeBox form={form} />

      <FormSection title="가진 돈" description="계산에서는 현금과 예·적금을 합쳐 시작 잔액으로 써요.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {money("assets.cash", "현금·입출금", "지금 통장에 있는 돈 (예·적금과 합쳐 10억 원 이하)", input.assets?.cash, (cash) =>
            form.update((prev) => patch(prev, "assets", { cash })),
          )}
          {money("assets.deposits", "예·적금", "지금 넣어 둔 예금·적금. 없으면 0", input.assets?.deposits, (deposits) =>
            form.update((prev) => patch(prev, "assets", { deposits })),
          )}
        </div>
      </FormSection>

      <FormSection title="대출">
        <Field
          id={fieldId("loans.hasNoLoan")}
          path="loans.hasNoLoan"
          label="대출이 있나요?"
          required
          group
          error={form.error("loans.hasNoLoan")}
          hint={hasLoan === "NO" ? "대출 상환액 0원으로 계산해요." : undefined}
        >
          <Choice
            id={fieldId("loans.hasNoLoan")}
            name="hasLoan"
            label="대출이 있나요?"
            value={hasLoan}
            options={LOAN_OPTIONS}
            invalid={Boolean(form.error("loans.hasNoLoan"))}
            onChange={(value) => {
              // '없음'으로 지운 대출은 이 화면에서 들고 있다가 '있음'으로 돌아오면 다시 넣는다
              const next = setHasLoan(input, value === "YES", loanStash);
              setLoanStash(next.stash);
              form.update(next.input);
            }}
          />
        </Field>
        {hasLoan === "YES" && (
          <div data-field="loans.items" className="space-y-3">
            {loanItems.map((_, index) => (
              <LoanCard key={index} form={form} index={index} count={loanItems.length} />
            ))}
            {form.error("loans.items") && <p className="text-sm text-danger">{form.error("loans.items")}</p>}
            <Button size="sm" variant="secondary" onClick={() => form.update((prev) => addLoan(prev))}>
              + 대출 하나 더 추가
            </Button>
          </div>
        )}
      </FormSection>

      <FormSection title="저축">
        {money(
          "savingPlan.monthlySaving",
          "월 저축액",
          "매달 적금에 넣을 돈. 청년미래적금 대상이면 월 50만 원까지 청년미래적금, 넘는 돈은 일반 적금으로 계산해요.",
          input.savingPlan?.monthlySaving,
          (monthlySaving) => form.update((prev) => patch(prev, "savingPlan", { monthlySaving })),
        )}
        <PolicyNotice live={live} />
      </FormSection>

      <MonthlySurplus live={live} saving={input.savingPlan?.monthlySaving} />

      <details
        open={optionalOpen ?? optionalFilled}
        onToggle={(event) => setOptionalOpen(event.currentTarget.open)}
        className="group rounded-xl border border-line bg-surface p-5"
      >
        <summary className="cursor-pointer list-none text-base font-bold">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>더 정확하게 넣기
          <span className="ml-1 text-xs font-medium text-muted">(선택 · 비워 두면 기본값)</span>
        </summary>
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {money(
              "assets.investments",
              "투자 자산",
              "주식·펀드 등 지금 가치. 오르내림은 넣지 않아요",
              input.assets?.investments,
              (investments) => form.update((prev) => patch(prev, "assets", { investments })),
              false,
            )}
            {money(
              "savingPlan.monthlyInvestment",
              "월 투자액",
              "매달 투자에 넣는 돈 (0~3,000만 원)",
              input.savingPlan?.monthlyInvestment,
              (monthlyInvestment) => form.update((prev) => patch(prev, "savingPlan", { monthlyInvestment })),
              false,
            )}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id={rateId} path="savingPlan.generalSavingRate" label="일반 적금 금리 (연)" hint={rateHint} error={rateError}>
              <NumberInput
                id={rateId}
                value={input.savingPlan?.generalSavingRate}
                decimals={2}
                maxIntegerDigits={2}
                unit="%"
                placeholder={String(INPUT_DEFAULTS.generalSavingRate)}
                invalid={Boolean(rateError)}
                aria-describedby={describedBy(rateId, rateError, rateHint)}
                onBlur={form.touch("savingPlan.generalSavingRate")}
                onChange={(generalSavingRate) => form.update((prev) => patch(prev, "savingPlan", { generalSavingRate }))}
              />
            </Field>
            {money(
              "emergency.breakThreshold",
              "급할 때 버틸 금액",
              "마이너스가 이 금액을 넘으면 적금을 깬다고 보고 계산해요. 비워 두면 50만 원",
              input.emergency?.breakThreshold,
              (breakThreshold) => form.update((prev) => patch(prev, "emergency", { breakThreshold })),
              false,
            )}
          </div>
        </div>
      </details>

      <StepWarningModal form={form} />
    </StepScreen>
  );
}

type LiveSummary = DebouncedState<ValidateResult>;

/** 입력이 막혀서(빈 대출 칸 등) 합계를 못 낼 때의 안내 */
function liveProblem(live: LiveSummary): string | null {
  if (live.data || live.pending) return null;
  const error = live.error;
  if (!error) return null;
  if (isApiError(error) && error.code === "COMMON400") {
    return Object.keys(error.fieldErrors).some((k) => k.startsWith("loans"))
      ? "대출 칸을 다 채우면 계산해요."
      : "빨간 칸을 고치면 다시 계산해요.";
  }
  if (isApiError(error) && ["INPUT4001", "LOAN4001", "GOAL4001", "GOAL4002"].includes(error.code)) return error.message;
  return "서버에 연결하지 못해서 지금은 합계를 보여 드릴 수 없어요.";
}

function PolicyNotice({ live }: { live: LiveSummary }) {
  const policy = live.data?.policySaving;
  if (!policy) {
    const text = live.pending
      ? "청년미래적금 대상인지 확인하는 중…"
      : liveProblem(live)
        ? "입력을 고치면 청년미래적금 대상인지 다시 확인해요."
        : "나이 · 월 실수령액 · 월 저축액이 있으면 청년미래적금 대상인지 알려 드려요.";
    return <p className="rounded-lg bg-canvas px-4 py-3 text-sm text-ink-soft">{text}</p>;
  }
  return policy.eligible ? (
    <div role="status" className="rounded-lg border border-info-line bg-system-soft px-4 py-3 text-sm">
      <p className="font-semibold">청년미래적금 대상이에요</p>
      <p className="mt-1 text-ink-soft">
        월 저축액 중 청년미래적금 {formatWon(policy.policyMonthly)} · 일반 적금 {formatWon(policy.generalMonthly)}으로 계산해요.
      </p>
    </div>
  ) : (
    <div role="status" className="rounded-lg border border-warn-line bg-warn-soft px-4 py-3 text-sm">
      <p className="font-semibold">일반 적금으로 계산해요</p>
      <p className="mt-1 text-ink-soft">{policy.reason}</p>
    </div>
  );
}

/** 매달 남는 돈 = 실수령액 − 지출 − 대출 상환액 (서버의 확정 합계) */
function MonthlySurplus({ live, saving }: { live: LiveSummary; saving: number | null | undefined }) {
  const summary = live.data?.summary;
  const problem = liveProblem(live);
  const surplus = summary?.monthlySurplus ?? null;
  const expense =
    summary?.fixedTotal != null && summary.variableTotal != null ? summary.fixedTotal + summary.variableTotal : null;
  const mockedLoan = live.source === "mock" && summary?.monthlyLoanPayment === null;

  let detail: string;
  if (problem) detail = problem;
  else if (live.pending && !summary) detail = "계산하는 중…";
  else if (mockedLoan) detail = "목업 모드라 대출 상환액을 계산하지 않아요. (개발 점검에서 validate를 real로)";
  else if (summary && surplus !== null)
    detail = `실수령액 ${formatWon(summary.monthlyNetIncome)} ${MINUS} 지출 ${formatWon(expense)} ${MINUS} 대출 상환액 ${formatWon(summary.monthlyLoanPayment)}`;
  else detail = "대출이 있는지 고르면 보여 드려요.";

  const short = surplus !== null && saving != null && saving > surplus ? saving - surplus : null;

  return (
    <section aria-live="polite" className="rounded-xl border border-info-line bg-system-soft px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">매달 남는 돈</h2>
        <p className={`text-xl font-bold tabular-nums ${surplus !== null && surplus < 0 ? "text-danger" : ""} ${live.pending ? "opacity-60" : ""}`}>
          {surplus === null ? "—" : formatWon(surplus)}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      {short !== null && (
        <p className="mt-1 text-sm font-semibold text-warn">
          월 저축액이 매달 남는 돈보다 {formatKoreanWon(short)} 많아요. 다음으로 넘어갈 때 한 번 더 물어볼게요.
        </p>
      )}
    </section>
  );
}
