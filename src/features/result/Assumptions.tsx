"use client";

/**
 * '내 입력값과 적용 가정' (결과 맨 아래, 접어 둠). 내 입력을 한 줄씩 보여 주고,
 * 펼치면 GET /meta로 적용 가정과 근거 등급을 불러온다. 비운 칸은 서버 기본값(config/policy.ts)으로 적는다.
 */
import { useState } from "react";
import { INPUT_DEFAULTS, LOAN_DEFAULTS } from "@/config/policy";
import { api } from "@/lib/api";
import { formatManwon, formatWon } from "@/lib/format";
import { resolvedExpenseTotal } from "@/lib/rules";
import type { MetaResult, SimulateResult, SimulationInputDraft } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";

export function Assumptions({ result, input }: { result: SimulateResult; input: SimulationInputDraft }) {
  const [meta, setMeta] = useState<MetaResult | null | "loading" | "error">(null);
  const fixed = resolvedExpenseTotal(input.expenses?.fixed);
  const variable = resolvedExpenseTotal(input.expenses?.variable);
  const rent = input.expenses?.monthlyRent;
  const gross = input.income?.annualGrossSalary;
  const loans = input.loans?.hasNoLoan ? [] : (input.loans?.items ?? []);
  const rows: [string, string][] = [
    ["기준 연월", input.startMonth ? formatYearMonth(input.startMonth) : "—"],
    [
      "나",
      `${input.person?.age ?? "—"}세 · 경력 ${input.person?.careerYears ?? "—"}년 · ${input.person?.employmentType === "CONTRACT" ? "계약직" : "정규직"} · 무주택 세대주 ${input.person?.homelessHouseholder === false ? "아님" : "예"}`,
    ],
    ["월 실수령액", formatWon(input.income?.monthlyNetIncome) || "—"],
    ["세전 연봉", gross != null ? formatWon(gross) : "넣지 않음 (월 실수령액으로 어림)"],
    [
      "월 지출",
      fixed != null && variable != null
        ? `고정 ${formatWon(fixed)}${rent ? ` (그중 월세 ${formatWon(rent)})` : ""} · 변동 ${formatWon(variable)}`
        : "—",
    ],
    [
      "가진 돈",
      input.assets ? `현금 ${formatWon(input.assets.cash)} · 예·적금 ${formatWon(input.assets.deposits)} · 투자 ${formatWon(input.assets.investments ?? 0)}` : "—",
    ],
    [
      "대출",
      loans.length === 0
        ? "없음"
        : loans
            .map((l) => `${l.loanType ? LOAN_DEFAULTS[l.loanType].label : "대출"} ${formatManwon(l.principal ?? 0)} (${l.annualRate ?? (l.loanType ? LOAN_DEFAULTS[l.loanType].annualRate : "—")}%, ${l.remainingMonths}개월)`)
            .join(" · "),
    ],
    [
      "저축",
      `월 ${formatWon(input.savingPlan?.monthlySaving) || "—"} · 일반 적금 연 ${input.savingPlan?.generalSavingRate ?? INPUT_DEFAULTS.generalSavingRate}% · 버틸 금액 ${formatWon(input.emergency?.breakThreshold ?? INPUT_DEFAULTS.breakThreshold)}`,
    ],
    [
      "목표",
      `${input.goal?.name || INPUT_DEFAULTS.goalName} · ${formatWon(input.goal?.targetAmount)} · ${input.goal?.targetDate ? formatYearMonth(input.goal.targetDate) : "—"}`,
    ],
    ["예정된 일", (input.events ?? []).map((e) => `${e.name ?? "일"} ${e.occurDate ? formatYearMonth(e.occurDate) : ""}`).join(" · ") || "없음"],
  ];

  return (
    <details
      className="rounded-xl border border-line bg-surface p-5"
      onToggle={(event) => {
        if (!event.currentTarget.open || meta !== null) return;
        setMeta("loading");
        api.meta().then(
          ({ data }) => setMeta(data),
          () => setMeta("error"),
        );
      }}
    >
      <summary className="cursor-pointer text-base font-bold">내 입력값과 적용 가정</summary>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="mb-1 sm:mb-0">{value}</dd>
          </div>
        ))}
        <dt className="text-muted">계산 방식</dt>
        <dd>
          미래 {result.paths.toLocaleString("ko-KR")}개 · 10년(120개월) · 난수 시드 {result.seed}
          {result.modelVersion ? ` · 모델 ${result.modelVersion}` : typeof meta === "object" && meta ? ` · 모델 ${meta.modelVersion}` : ""}
        </dd>
      </dl>
      {meta === "loading" && <p className="mt-3 text-sm text-muted">적용 가정을 불러오는 중…</p>}
      {meta === "error" && <p className="mt-3 text-sm text-muted">적용 가정을 불러오지 못했어요.</p>}
      {typeof meta === "object" && meta && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-semibold">적용 가정</th>
                <th className="py-2 pr-3 font-semibold">값</th>
                <th className="py-2 font-semibold">근거 등급</th>
              </tr>
            </thead>
            <tbody>
              {meta.parameters.map((p) => (
                <tr key={p.key} className="border-b border-line last:border-0 align-top">
                  <td className="py-2 pr-3 font-medium">{p.label}</td>
                  <td className="py-2 pr-3">{p.value}</td>
                  <td className="py-2">
                    <span className="font-semibold">{p.grade}</span>
                    {meta.gradeLegend?.[p.grade] && <span className="ml-1 text-muted">{meta.gradeLegend[p.grade]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
