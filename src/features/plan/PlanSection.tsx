"use client";

/**
 * 결과 화면 '계획 바꿔 보기' (그래프 오른쪽, 조민석 배치안 11/18 · 멘토 피드백 11/16).
 *  - 가장 좋은 배분 버튼 3개(/allocations/recommend: 지금 · 가능성 최고 · 세금·지원금 최고) → 배분 막대가 그 값으로
 *  - 배분 막대: 월 저축액을 청년미래적금 · 주택청약 · 연금저축에 나누기 (남는 돈은 일반 적금)
 *  - '이렇게 하면 좋아져요'(/reverse의 levers)는 누르면 아래 계획 막대가 그 값으로 옮겨 가는 버튼
 *  - 저축 · 지출 · 목표 막대(접힘), 계획 담아 비교하기(접힘)
 * 어떤 막대든 움직이면 ResultView가 POST /simulate(+adjustments)로 다시 계산해 그래프 · 결론 · 혜택이 바로 바뀐다.
 * 내 입력(simInput.v1)은 바꾸지 않는다. 04 결과에만. 막대 범위는 sliders.ts · allocation-sliders.ts, 비교 표는 plan.ts에서 고른다.
 */
import { useState } from "react";
import { Button } from "@/components/ui";
import { DiffText } from "@/components/ui/Stat";
import { simpleActions } from "@/features/result/simple";
import { api, runRobust } from "@/lib/api";
import { formatManwon } from "@/lib/format";
import { useApiTask, useSavedPlans } from "@/lib/hooks";
import { MAX_SAVED_PLANS } from "@/lib/storage";
import { ALLOCATION_KEYS } from "@/features/input/draft";
import { recommendCards, sameAllocation, toMonthly, type MonthlyAllocation } from "@/features/tax/allocation";
import type { Adjustments, CompareResult, EmergencyFirstAmount, Lever, RecommendResult, RobustJobResult, SimulationInput } from "@/lib/types";
import { addMonths, formatYearMonth } from "@/lib/year-month";
import {
  EMERGENCY_CHOICES,
  PLAN_COMPARE_HEADERS,
  describeChanges,
  hasChanges,
  planBase,
  planChanges,
  planCompareRows,
  planLabels,
  planRequests,
  robustPlanLines,
  sameAdjustments,
  type PlanLabel,
  type PlanValues,
} from "./plan";
import { ALLOCATION_SLIDERS, generalOf, withAllocation } from "./allocation-sliders";
import { applyLever, sliderSpecs, sliderValue, withSlider } from "./sliders";

const PLAN_SECTION_ID = "plan-section";

export function PlanSection({
  input,
  values,
  onValues,
  allocation,
  baseAllocation,
  onAllocation,
  policyEligible,
  recommend,
  recommendError,
  adjustments,
  levers,
  currentProbability,
  adjustedProbability,
  loading,
  error: calcError,
}: {
  input: SimulationInput;
  /** 지금 막대 값 (ResultView가 갖고, 바뀌면 다시 계산한다) */
  values: PlanValues;
  onValues: (values: PlanValues) => void;
  /** 지금 배분 막대 값 (월 저축액에 맞춘 것) */
  allocation: MonthlyAllocation;
  /** 지금 계획의 배분 (서버 tax.allocation) */
  baseAllocation: MonthlyAllocation;
  onAllocation: (allocation: MonthlyAllocation) => void;
  /** 청년미래적금 대상인지 (아니면 그 막대는 0에 고정) */
  policyEligible: boolean;
  /** 가장 좋은 배분 (아직이면 null) */
  recommend: RecommendResult | null;
  recommendError: string | null;
  /** 계획 막대 + 배분 막대를 합친 바꾼 값 (서버로 보내는 것) */
  adjustments: Adjustments;
  /** /reverse의 개선 포인트 (아직이면 null) */
  levers: Lever[] | null;
  currentProbability: number;
  /** 바꾼 계획의 달성 가능성 (안 바꿨거나 계산 전이면 null) */
  adjustedProbability: number | null;
  loading: boolean;
  error: string | null;
}) {
  const base = planBase(input);
  const changed = hasChanges(adjustments);
  const planChanged = hasChanges(planChanges(values, base));
  const [planOpen, setPlanOpen] = useState(false);
  const specs = sliderSpecs(base, input.startMonth);
  const actions = levers ? simpleActions(levers, currentProbability) : [];

  const { plans: basket, setPlans } = useSavedPlans();
  const inBasket = basket.some((plan) => sameAdjustments(plan.adjustments, adjustments));
  const [progress, setProgress] = useState(0);
  const [compare, setCompare] = useState<{ result: CompareResult; labels: PlanLabel[] } | null>(null);
  const [robust, setRobust] = useState<{ result: RobustJobResult; labels: PlanLabel[] } | null>(null);
  const { busy, error, run } = useApiTask<"compare" | "robust">();
  const sent = planRequests(basket);
  const labels = planLabels(basket);

  const changeBasket = (next: typeof basket) => {
    setPlans(next);
    setCompare(null);
    setRobust(null);
  };

  const saving = values.monthlySaving;
  const cards = recommend ? recommendCards(recommend) : [];
  const SHORT_TITLES = { current: "지금 배분", bestProbability: "가능성 최고", bestBenefit: "세금·지원금 최고" } as const;

  return (
    <section id={PLAN_SECTION_ID} aria-labelledby="plan-title" className="scroll-mt-20 rounded-xl border border-line bg-surface p-5">
      <h2 id="plan-title" tabIndex={-1} className="text-base font-bold outline-none">
        계획 바꿔 보기
      </h2>
      <p className="mt-1 text-sm" aria-live="polite">
        {changed ? (
          <>
            지금 {Math.round(currentProbability)}% →{" "}
            <span className="font-semibold text-primary">
              {loading || adjustedProbability === null ? "계산 중…" : `바꾼 계획 ${Math.round(adjustedProbability)}%`}
            </span>
          </>
        ) : (
          <span className="text-ink-soft">막대를 움직이면 왼쪽 그래프와 위 결론이 바로 바뀌어요. 내 입력은 바뀌지 않아요.</span>
        )}
      </p>

      <div className="mt-4">
        <p className="text-sm font-semibold">가장 좋은 배분</p>
        {recommendError ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            배분을 찾지 못했어요: {recommendError}
          </p>
        ) : !recommend ? (
          <p className="mt-2 text-sm text-muted">배분 39가지를 모두 계산하는 중… (몇 초 걸려요)</p>
        ) : (
          <div role="group" aria-label="가장 좋은 배분" className="mt-2 grid grid-cols-3 gap-2">
            {cards.map((card) => {
              const option = recommend[card.key];
              const target = card.key === "current" ? baseAllocation : toMonthly(option.allocation);
              const active = sameAllocation(allocation, target);
              return (
                <button
                  key={card.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onAllocation(target)}
                  className={`rounded-lg border px-2 py-2 text-left text-xs ${active ? "border-primary bg-primary-soft" : "border-line-strong hover:border-primary"}`}
                >
                  <span className="block font-semibold text-ink">{SHORT_TITLES[card.key]}</span>
                  <span className="mt-0.5 block text-base font-bold tabular-nums">{card.probability}</span>
                  <span className="block text-muted tabular-nums">혜택 {formatManwon(option.totalBenefit)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {ALLOCATION_SLIDERS.map((slider) => {
          const id = `alloc-${slider.key}`;
          const disabled = slider.key === "policyMonthly" && !policyEligible;
          return (
            <div key={slider.key}>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-sm font-semibold">
                  {slider.label}
                </label>
                <span className={`text-sm tabular-nums ${allocation[slider.key] !== baseAllocation[slider.key] ? "font-bold text-primary" : ""}`}>
                  {disabled ? "대상 아님" : `월 ${formatManwon(allocation[slider.key])}`}
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={0}
                max={Math.max(slider.limit, 10_000)}
                step={10_000}
                value={allocation[slider.key]}
                disabled={disabled}
                onChange={(event) => onAllocation(withAllocation(allocation, slider.key, Number(event.target.value), saving))}
                className="mt-1 w-full accent-[var(--color-primary)] disabled:opacity-40"
                aria-valuetext={`월 ${formatManwon(allocation[slider.key])}`}
              />
              <p className="flex justify-between text-xs text-muted tabular-nums">
                <span>0원</span>
                <span>지금 {formatManwon(baseAllocation[slider.key])}</span>
                <span>{formatManwon(slider.limit)}</span>
              </p>
            </div>
          );
        })}
        <p className="text-sm text-ink-soft">
          남는 돈 → 일반 적금 <span className="font-semibold tabular-nums text-ink">월 {formatManwon(generalOf(allocation, saving))}</span>
          <span className="text-muted"> (월 저축액 {formatManwon(saving)} 안에서 나눠요. 한 상품을 늘리려면 다른 상품을 줄여 주세요)</span>
        </p>
      </div>

      {actions.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-semibold">이렇게 하면 좋아져요</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {actions.map((a) => (
              <li key={a.type}>
                <button
                  type="button"
                  onClick={() => {
                    onValues(applyLever(base, a.type));
                    setPlanOpen(true);
                  }}
                  className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm hover:border-primary hover:bg-primary-soft"
                >
                  {a.label} <span className="font-semibold text-good">{a.change}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details
        open={planOpen || planChanged}
        onToggle={(event) => setPlanOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="mt-5 border-t border-line pt-4"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          저축 · 지출 · 목표 바꾸기{planChanged && <span className="ml-1 text-primary">(바꿈)</span>}
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-y-5">
          {specs.map((spec) => {
            const id = `plan-${spec.key}`;
            const value = sliderValue(values, spec.key, input.startMonth);
            const now = sliderValue(base, spec.key, input.startMonth);
            const show = (v: number) =>
              spec.key === "goalTargetDate" ? formatYearMonth(addMonths(input.startMonth, v)) : formatManwon(v);
            return (
              <div key={spec.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={id} className="text-sm font-semibold">
                    {spec.label}
                  </label>
                  <span className={`text-sm tabular-nums ${value !== now ? "font-bold text-primary" : "text-ink"}`}>{show(value)}</span>
                </div>
                <input
                  id={id}
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  onChange={(event) => onValues(withSlider(values, spec.key, Number(event.target.value), input.startMonth))}
                  className="mt-1 w-full accent-[var(--color-primary)]"
                  aria-valuetext={show(value)}
                />
                <p className="flex justify-between text-xs text-muted tabular-nums">
                  <span>{show(spec.min)}</span>
                  <span>지금 {show(now)}</span>
                  <span>{show(spec.max)}</span>
                </p>
              </div>
            );
          })}
          <div>
            <label htmlFor="plan-emergencyFirstAmount" className="text-sm font-semibold">
              비상금 먼저 모으기
            </label>
            <select
              id="plan-emergencyFirstAmount"
              className="mt-2 h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px]"
              value={values.emergencyFirstAmount}
              onChange={(event) => onValues({ ...values, emergencyFirstAmount: Number(event.target.value) as EmergencyFirstAmount })}
            >
              {EMERGENCY_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onValues(base);
            onAllocation(baseAllocation);
          }}
          disabled={!changed}
        >
          지금 계획으로 되돌리기
        </Button>
      </div>
      {calcError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {calcError}
        </p>
      )}

      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink-soft">
          계획 담아 비교하기 (최대 {MAX_SAVED_PLANS}개, 리포트에도 들어가요)
        </summary>
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              changeBasket([
                ...basket,
                {
                  id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                  name: describeChanges(adjustments),
                  adjustments,
                  savedAt: new Date().toISOString(),
                },
              ])
            }
            disabled={!changed || inBasket || basket.length >= MAX_SAVED_PLANS || busy !== null}
          >
            지금 막대 값 담기 ({basket.length}/{MAX_SAVED_PLANS})
          </Button>
          {changed && inBasket && <p className="mt-2 text-sm text-muted">이 계획은 이미 담겨 있어요.</p>}
          {!changed && <p className="mt-2 text-sm text-muted">막대를 움직인 뒤 담을 수 있어요.</p>}

          {basket.length > 0 && (
            <div className="mt-4">
              <ul className="flex flex-wrap gap-2">
                {basket.map((plan) => (
                  <li key={plan.id} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface py-1 pl-3 pr-1 text-sm">
                    <button
                      type="button"
                      className="hover:text-primary"
                      onClick={() => {
                        const saved = plan.adjustments as Record<string, unknown>;
                        onValues(Object.fromEntries(Object.entries(base).map(([k, v]) => [k, saved[k] ?? v])) as unknown as PlanValues);
                        onAllocation(Object.fromEntries(ALLOCATION_KEYS.map((k) => [k, (saved[k] as number | undefined) ?? baseAllocation[k]])) as MonthlyAllocation);
                      }}
                    >
                      {plan.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`${plan.name} 빼기`}
                      disabled={busy !== null}
                      onClick={() => changeBasket(basket.filter((p) => p.id !== plan.id))}
                      className="rounded-full px-2 text-muted hover:bg-canvas hover:text-danger disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    void run("compare", "계산하지 못했어요", async (signal) => {
                      const { data } = await api.compare({ input, plans: sent }, { signal });
                      setCompare({ result: data, labels });
                    })
                  }
                  disabled={busy !== null}
                >
                  {busy === "compare" ? "비교하는 중…" : "담은 계획 비교"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void run("robust", "계산하지 못했어요", async (signal) => {
                      setProgress(0);
                      const result = await runRobust(input, { plans: sent, signal, onProgress: setProgress });
                      setRobust({ result, labels });
                    })
                  }
                  disabled={busy !== null}
                >
                  {busy === "robust" ? `가정을 바꿔 보는 중… ${progress}%` : "가정을 바꿔도 결론이 같은지 보기"}
                </Button>
              </div>
            </div>
          )}

          {compare && (
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    {PLAN_COMPARE_HEADERS.map((label, i) => (
                      <th key={label} className={i < PLAN_COMPARE_HEADERS.length - 1 ? "py-2 pr-3 font-semibold" : "py-2 font-semibold"}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planCompareRows(compare.result, compare.labels).map((row) => (
                    <tr key={row.name} className={`border-b border-line align-top last:border-0 ${row.isBase ? "bg-system-soft" : ""}`}>
                      <td className="py-2 pr-3 font-semibold">{row.name}</td>
                      <td className="py-2 pr-3">
                        <span className="font-semibold tabular-nums">{row.probability}</span>
                        <DiffText diff={row.diff} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{row.debt}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.worst}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.earlyTermination}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.subsidy}</td>
                      <td className="py-2 tabular-nums">{row.taxNetBenefit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {robust && (
            <ul className="mt-4 list-disc space-y-1.5 rounded-xl border border-line bg-canvas py-3 pl-8 pr-4 text-sm">
              {robustPlanLines(robust.result, robust.labels).map((line) => (
                <li key={line.name}>
                  <span className="font-semibold">{line.name}</span>: {line.text}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
