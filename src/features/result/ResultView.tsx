"use client";

/**
 * 결과 본문 (04 결과 · 04-E 예시 결과가 같이 쓴다). 서버 응답을 그대로 보여 주기만 한다.
 *  첫 문장(headline) · 가능성 범위 · 범위 그래프 · 1·3·5·10년 표 · 위험 카드 · 세금 · 어디에 얼마나 · 적금을 처음 깬 이유 ·
 *  이렇게 바꿔 보세요 · 입력값과 가정
 * v1.7 블록(가능성 범위 · 세금 · 어디에 얼마나)은 내 계획에만 붙인다. 04-E 예시는 example로 부르고 붙이지 않는다 (명세서 v1.7 9.1).
 */
import { useState, type ReactNode } from "react";
import { api, type ApiResult } from "@/lib/api";
import { formatKoreanWon, formatManwon, formatPercent, formatWon } from "@/lib/format";
import {
  LEVEL_LABELS,
  causeRows,
  checkpointRows,
  eventMarks,
  leverRows,
  probabilityLevel,
  reverseLines,
  riskCards,
  taxView,
  yearlyRows,
  type QuantileRow,
  type RiskCard,
} from "./result";
import { resolvedExpenseTotal } from "@/lib/rules";
import { INPUT_DEFAULTS, LOAN_DEFAULTS } from "@/config/policy";
import type { MetaResult, ReverseResult, SimulateResult, SimulationInput, SimulationInputDraft } from "@/lib/types";
import { formatDuration, formatYearMonth, monthsBetween } from "@/lib/year-month";
import type { MockMatch } from "@/mocks/handlers";
import { Badge } from "@/components/ui";
import { BandChart, BandLegend } from "./BandChart";
import { TaxSection } from "./TaxSection";
import { AllocationSection } from "./AllocationSection";
import { RobustSection } from "./RobustSection";
import type { MonthlyAllocation } from "./allocation";

export interface ResultData {
  sim: ApiResult<SimulateResult>;
  reverse: ApiResult<ReverseResult> | null;
  /** 개선 포인트 계산 중 */
  reversePending: boolean;
  /** 청년미래적금 비대상 이유 (입력 검사의 policySaving.reason) */
  policyReason: string | null;
}

export function ResultView({
  data,
  input,
  example = false,
  onApplyAllocation,
}: {
  data: ResultData;
  input: SimulationInputDraft;
  /** 04-E 예시 결과: v1.7 블록(세금 등)을 붙이지 않는다 */
  example?: boolean;
  /** '어디에 얼마나'의 '이 배분으로' (04 결과에서만: 내 입력의 배분을 바꾼다) */
  onApplyAllocation?: (allocation: MonthlyAllocation) => void;
}) {
  const result = data.sim.data;
  const tax = example ? null : taxView(result, input);
  return (
    <div className="space-y-6">
      <Hero result={result} />
      {data.sim.source === "mock" && <MockNote match={data.sim.mock} />}
      {!example && <RobustSection input={input as SimulationInput} currentProbability={result.goal.probability} />}
      <ChartCard result={result} input={input} />
      <CheckpointTable result={result} />
      <RiskGrid cards={riskCards(result, data.policyReason)} />
      {tax && <TaxSection view={tax} />}
      {tax && onApplyAllocation && (
        <AllocationSection
          result={result}
          input={input as SimulationInput}
          policyReason={data.policyReason}
          onApply={onApplyAllocation}
        />
      )}
      <CauseBars result={result} />
      <Levers data={data} />
      <Assumptions result={result} input={input} />
    </div>
  );
}

// ===== 첫 문장 =====

const LEVEL_STYLES = {
  good: { badge: "bg-good-soft text-good", dot: "bg-good" },
  fair: { badge: "bg-warn-soft text-warn", dot: "bg-warn" },
  low: { badge: "bg-danger-soft text-danger", dot: "bg-danger" },
} as const;

function Hero({ result }: { result: SimulateResult }) {
  const { goal, deterministic } = result;
  const level = probabilityLevel(goal.probability);
  const style = LEVEL_STYLES[level];
  const goalDate = result.bands[goal.goalMonths]?.month;
  const reach70 = goal.reach70Date;
  const late = reach70 && goalDate ? monthsBetween(goalDate, reach70) : null;

  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <p className="text-5xl font-bold tracking-tight text-ink">{formatPercent(goal.probability)}</p>
        <span className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
          <span aria-hidden className={`size-2 rounded-full ${style.dot}`} />
          {LEVEL_LABELS[level]}
        </span>
        <span className="mb-1.5 text-xs text-muted">오차 ±{goal.probabilityError.toFixed(1)}%p · 미래 {result.paths.toLocaleString("ko-KR")}개</span>
      </div>
      <h1 className="mt-3 text-lg font-bold leading-relaxed text-ink sm:text-xl">{result.headline}</h1>
      <dl className="mt-5 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">계산기 결과 (목표 시점)</dt>
          <dd className="mt-0.5 text-base font-semibold">{formatManwon(deterministic.atGoal)}</dd>
          <dd className="text-xs text-muted">실직·급한 지출이 없다고 칠 때</dd>
        </div>
        <div>
          <dt className="text-muted">미래의 절반이 목표에 닿는 때</dt>
          <dd className="mt-0.5 text-base font-semibold">{goal.medianReachDate ? formatYearMonth(goal.medianReachDate) : "10년 안에 못 닿아요"}</dd>
        </div>
        <div>
          <dt className="text-muted">가능성 70%가 되는 때</dt>
          <dd className="mt-0.5 text-base font-semibold">{reach70 ? formatYearMonth(reach70) : "10년 안에 70%가 안 돼요"}</dd>
          {late !== null && late > 0 && <dd className="text-xs text-muted">목표 시점보다 {formatDuration(late)} 늦어요</dd>}
          {late !== null && late <= 0 && <dd className="text-xs text-muted">목표 시점 안에 70%를 넘어요</dd>}
        </div>
      </dl>
    </section>
  );
}

/** 목업이면 그렇다고 밝힌다 (정할 것 1번) */
function MockNote({ match }: { match?: MockMatch }) {
  const exact = match?.exact ?? false;
  return (
    <div
      role="note"
      className={`rounded-lg border px-4 py-3 text-sm ${exact ? "border-line bg-mock-soft/60" : "border-warn-line bg-warn-soft"}`}
    >
      <p className="font-semibold">
        <Badge tone="mock">목업</Badge>{" "}
        {exact
          ? `정답 파일(analysis_golden.json)의 ${match?.caseKey ?? ""} 계산 결과예요.`
          : "입력한 값과 같은 정답 케이스가 없어 S1 결과를 대신 보여 줘요. 숫자가 내 입력과 달라요."}
      </p>
      <p className="mt-1 text-ink-soft">
        백엔드 /simulate가 붙으면 같은 seed로 같은 숫자가 나와요.{match?.note && exact ? ` ${match.note}.` : ""}
      </p>
    </div>
  );
}

// ===== 범위 그래프 =====

function ChartCard({ result, input }: { result: SimulateResult; input: SimulationInputDraft }) {
  const events = eventMarks(input);
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">앞으로 모을 돈</h2>
      <p className="mt-1 text-sm text-ink-soft">
        실직·급한 지출·물가·연봉이 서로 다르게 펼쳐지는 미래 {result.paths.toLocaleString("ko-KR")}개를 계산했어요. 그래프를
        누르거나 화살표 키로 달을 옮기면 그달의 값을 보여 드려요.
      </p>
      <div className="mt-4">
        <BandLegend hasEvents={events.length > 0} />
      </div>
      <div className="mt-3">
        <BandChart result={result} events={events} />
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-soft">표로 보기 (해마다)</summary>
        <QuantileTable rows={yearlyRows(result)} />
      </details>
    </section>
  );
}

// ===== 1 · 3 · 5 · 10년 표 =====

function CheckpointTable({ result }: { result: SimulateResult }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">1 · 3 · 5 · 10년 뒤 모은 돈</h2>
      <p className="mt-1 text-sm text-ink-soft">모은 돈 = 현금 + 예·적금 + 투자 (대출 잔액은 빼지 않아요)</p>
      <QuantileTable rows={checkpointRows(result)} />
    </section>
  );
}

function money(value: number): ReactNode {
  return <span className={value < 0 ? "text-danger" : undefined}>{formatManwon(value)}</span>;
}

function QuantileTable({ rows }: { rows: QuantileRow[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line text-right text-xs text-muted">
            <th className="py-2 pr-3 text-left font-semibold">시점</th>
            <th className="py-2 pr-3 font-semibold">최악의 경우 (하위 5%)</th>
            <th className="py-2 pr-3 font-semibold">아래 10%</th>
            <th className="py-2 pr-3 font-semibold text-ink">중간값</th>
            <th className="py-2 font-semibold">위 10%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.months} className={`border-b border-line last:border-0 text-right ${row.isGoal ? "bg-primary-soft/50" : ""}`}>
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                {row.label}
                {row.date && <span className="ml-1.5 text-xs font-normal text-muted">{formatYearMonth(row.date)}</span>}
                {row.isGoal && <span className="ml-1.5 text-xs font-semibold text-primary">목표 시점</span>}
              </th>
              <td className="py-2 pr-3">{money(row.p5)}</td>
              <td className="py-2 pr-3">{money(row.p10)}</td>
              <td className="py-2 pr-3 font-semibold">{money(row.p50)}</td>
              <td className="py-2">{money(row.p90)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== 위험 카드 =====

const CARD_TONES: Record<RiskCard["tone"], string> = {
  default: "text-ink",
  danger: "text-danger",
  warn: "text-warn",
  muted: "text-muted",
};

function RiskGrid({ cards }: { cards: RiskCard[] }) {
  return (
    <section>
      <h2 className="text-base font-bold">위험</h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li
            key={card.key}
            className={`rounded-xl border p-4 ${card.key === "cashShort" && card.tone === "warn" ? "border-warn-line bg-warn-soft/60" : "border-line bg-surface"}`}
          >
            <p className="text-sm font-semibold text-ink-soft">{card.title}</p>
            <p className={`mt-1 text-2xl font-bold ${CARD_TONES[card.tone]}`}>{card.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{card.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ===== 적금을 처음 깬 이유 =====

function CauseBars({ result }: { result: SimulateResult }) {
  const { rows, total, empty } = causeRows(result.causes);
  const eligible = result.risks.policySaving.eligible;
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">적금을 처음 깬 이유</h2>
      {!eligible ? (
        <p className="mt-2 text-sm text-ink-soft">청년미래적금 대상이 아니라 해당 없음이에요.</p>
      ) : empty ? (
        <p className="mt-2 text-sm text-ink-soft">적금을 중간에 깬 미래가 없어요.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            적금을 깬 미래{total !== null ? ` ${total.toLocaleString("ko-KR")}개` : ""}에서 처음 깬 이유예요. 네 가지를 더하면 100%예요.
          </p>
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="h-3 rounded-full bg-canvas" aria-hidden>
                  <span className="block h-3 rounded-full bg-primary" style={{ width: `${Math.max(row.share, row.share > 0 ? 1.5 : 0)}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{formatPercent(row.share)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ===== 이렇게 바꿔 보세요 =====

function Levers({ data }: { data: ResultData }) {
  const reverse = data.reverse?.data;
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-bold">이렇게 바꿔 보세요</h2>
      {!reverse ? (
        <p className="mt-2 text-sm text-muted">{data.reversePending ? "하나씩 바꿔 다시 계산하는 중…" : "개선 포인트를 계산하지 못했어요."}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            하나씩 바꿔 같은 미래 {data.sim.data.paths.toLocaleString("ko-KR")}개로 다시 계산했어요. 가능성이 많이 오르는 순서예요.
          </p>
          <ol className="mt-3 divide-y divide-line">
            {leverRows(reverse).map((lever) => (
              <li key={lever.type} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{lever.label}</span>
                {lever.flat ? (
                  <span className="text-sm text-muted">거의 차이 없음 ({lever.probability})</span>
                ) : (
                  <span className="text-sm">
                    <span className="font-semibold">{formatPercent(reverse.currentProbability)} → {lever.probability}</span>{" "}
                    <span className={`font-semibold ${lever.diff.startsWith("+") ? "text-good" : "text-danger"}`}>({lever.diff})</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-lg bg-canvas px-4 py-3 text-sm">
            <p className="font-semibold">가능성 {reverse.targetProbability}%에 닿으려면</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
              {reverseLines(reverse).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {reverse.emergencyStrategies.length > 0 && data.sim.data.risks.policySaving.eligible && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-soft">비상금을 먼저 모으면 (적금 시작 전에)</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-right text-xs text-muted">
                      <th className="py-2 pr-3 text-left font-semibold">먼저 모을 비상금</th>
                      <th className="py-2 pr-3 font-semibold">가능성</th>
                      <th className="py-2 pr-3 font-semibold">중도해지</th>
                      <th className="py-2 font-semibold">정부 지원금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reverse.emergencyStrategies.map((s) => (
                      <tr key={s.amount} className="border-b border-line text-right last:border-0">
                        <th scope="row" className="py-2 pr-3 text-left font-medium">
                          {s.amount === 0 ? "안 모음" : formatManwon(s.amount)}
                        </th>
                        <td className="py-2 pr-3">{formatPercent(s.probability)}</td>
                        <td className="py-2 pr-3">{s.earlyTerminationProbability == null ? "—" : formatPercent(s.earlyTerminationProbability)}</td>
                        <td className="py-2">{s.expectedSubsidy == null ? "—" : formatKoreanWon(s.expectedSubsidy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

// ===== 내 입력값과 적용 가정 =====

function Assumptions({ result, input }: { result: SimulateResult; input: SimulationInputDraft }) {
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
