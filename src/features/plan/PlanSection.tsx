"use client";

/**
 * 결과 화면 '계획 바꿔 보기' (04-2, 명세서 v1.7 9.2 '직접 바꿔 보기'). '이렇게 바꿔 보세요' 아래, 맨 아래 버튼으로 펼친다.
 *  - 값 7개를 바꿔 '바꾼 계획 미리보기': POST /simulate/preview
 *  - '비교에 담기'(최대 3개, simPlans.v1에 저장) → '담은 계획 비교': POST /compare
 *  - '가정을 바꿔도 결론이 같은지 보기': POST /robust (plans) + 1.5초마다 진행률
 * 내 입력(simInput.v1)은 바꾸지 않는다. 04 결과에만. 보여 줄 값은 plan.ts에서 고른다.
 */
import { useState } from "react";
import { Button } from "@/components/ui";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { DiffText, StatCard } from "@/components/ui/Stat";
import { YearMonthPicker } from "@/components/ui/YearMonthPicker";
import { api, runRobust } from "@/lib/api";
import { useApiTask, useSavedPlans } from "@/lib/hooks";
import { LIMITS } from "@/lib/rules";
import { MAX_SAVED_PLANS } from "@/lib/storage";
import type { Adjustments, CompareResult, EmergencyFirstAmount, PreviewResult, RobustJobResult, SimulationInput } from "@/lib/types";
import {
  EMERGENCY_CHOICES,
  PLAN_COMPARE_HEADERS,
  PLAN_MONEY_FIELDS,
  baseHint,
  describeChanges,
  hasChanges,
  planBase,
  planChanges,
  planCompareRows,
  planLabels,
  planRequests,
  previewView,
  robustPlanLines,
  sameAdjustments,
  type PlanDraft,
  type PlanLabel,
} from "./plan";

const selectClass = "h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px]";

export const PLAN_SECTION_ID = "plan-section";

export function PlanSection({ input, onClose }: { input: SimulationInput; onClose: () => void }) {
  const base = planBase(input);
  const [draft, setDraft] = useState<PlanDraft>(base);
  const adjustments = planChanges(draft, base);
  const changed = hasChanges(adjustments);

  const { plans: basket, setPlans } = useSavedPlans();
  const inBasket = basket.some((plan) => sameAdjustments(plan.adjustments, adjustments));

  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ result: PreviewResult; adjustments: Adjustments } | null>(null);
  // 결과와 함께 보낸 계획의 이름표를 둔다 (서버에는 20자로 줄인 이름이 가고, 화면에는 담은 계획 이름)
  const [compare, setCompare] = useState<{ result: CompareResult; labels: PlanLabel[] } | null>(null);
  const [robust, setRobust] = useState<{ result: RobustJobResult; labels: PlanLabel[] } | null>(null);
  const { busy, error, run } = useApiTask<"preview" | "compare" | "robust">();

  const sent = planRequests(basket);
  const labels = planLabels(basket);
  const failText = "계산하지 못했어요";

  const runPreview = () =>
    run("preview", failText, async (signal) => {
      const snapshot = adjustments;
      const { data } = await api.preview({ input, adjustments: snapshot }, { signal });
      setPreview({ result: data, adjustments: snapshot });
    });
  const runCompare = () =>
    run("compare", failText, async (signal) => {
      const { data } = await api.compare({ input, plans: sent }, { signal });
      setCompare({ result: data, labels });
    });
  const runRobustCheck = () =>
    run("robust", failText, async (signal) => {
      setProgress(0);
      const result = await runRobust(input, { plans: sent, signal, onProgress: setProgress });
      setRobust({ result, labels });
    });

  /** 담은 계획이 바뀌면 앞의 비교 결과는 지운다 */
  const changeBasket = (next: typeof basket) => {
    setPlans(next);
    setCompare(null);
    setRobust(null);
  };
  const addToBasket = () =>
    changeBasket([
      ...basket,
      {
        id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: describeChanges(adjustments),
        adjustments,
        savedAt: new Date().toISOString(),
      },
    ]);

  const view = preview ? previewView(preview.result, preview.adjustments) : null;

  return (
    <section id={PLAN_SECTION_ID} aria-labelledby="plan-title" className="scroll-mt-20 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="plan-title" tabIndex={-1} className="text-base font-bold outline-none">
            계획 바꿔 보기
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            값을 바꾸면 같은 미래로 다시 계산해 지금 계획과 나란히 보여 줘요. 마음에 드는 계획은 담아 두고 최대 {MAX_SAVED_PLANS}개까지 함께
            비교해요. 내 입력은 바뀌지 않아요.
          </p>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0" onClick={onClose}>
          접기
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PLAN_MONEY_FIELDS.map(({ key, label, hint }) => {
          const id = `plan-${key}`;
          const text = baseHint(key, base, hint);
          return (
            <Field key={key} id={id} label={label} mark={false} hint={text}>
              <MoneyInput
                id={id}
                value={draft[key]}
                aria-describedby={describedBy(id, undefined, text)}
                onChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
              />
            </Field>
          );
        })}
        <Field id="plan-goalTargetDate" label="목표 시점" mark={false} group hint={baseHint("goalTargetDate", base)}>
          <YearMonthPicker
            id="plan-goalTargetDate"
            value={draft.goalTargetDate}
            start={input.startMonth}
            minMonths={LIMITS.goalMonths.min}
            maxMonths={LIMITS.goalMonths.max}
            describedBy="plan-goalTargetDate-hint"
            onChange={(goalTargetDate) => setDraft((prev) => ({ ...prev, goalTargetDate }))}
          />
        </Field>
        <Field id="plan-emergencyFirstAmount" label="비상금 먼저 모으기" mark={false} hint={baseHint("emergencyFirstAmount", base)}>
          <select
            id="plan-emergencyFirstAmount"
            className={selectClass}
            value={draft.emergencyFirstAmount ?? base.emergencyFirstAmount}
            aria-describedby="plan-emergencyFirstAmount-hint"
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, emergencyFirstAmount: Number(event.target.value) as EmergencyFirstAmount }))
            }
          >
            {EMERGENCY_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => void runPreview()} disabled={!changed || busy !== null}>
          {busy === "preview" ? "계산하는 중…" : "바꾼 계획 미리보기"}
        </Button>
        <Button
          variant="secondary"
          onClick={addToBasket}
          disabled={!changed || inBasket || basket.length >= MAX_SAVED_PLANS || busy !== null}
        >
          비교에 담기 ({basket.length}/{MAX_SAVED_PLANS})
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(base);
            setPreview(null);
          }}
          disabled={busy !== null || (!changed && !preview)}
        >
          지금 값으로 되돌리기
        </Button>
      </div>
      {changed && inBasket && <p className="mt-2 text-sm text-muted">이 계획은 이미 담겨 있어요.</p>}

      <div aria-live="polite">
        {view && (
          <div className="mt-6">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard title="지금 계획" box="system" value={view.current.probability} detail={view.current.detail} />
              <StatCard title={view.adjusted.title} box={view.adjusted.tone} value={view.adjusted.probability} detail={view.adjusted.detail} />
            </ul>
            <div className="relative mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-semibold">항목</th>
                    <th className="py-2 pr-3 font-semibold">지금</th>
                    <th className="py-2 pr-3 font-semibold">바꾼 계획</th>
                    <th className="py-2 font-semibold">차이</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row) => (
                    <tr key={row.metric} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3">{row.label}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.current}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.adjusted}</td>
                      <td className="py-2 tabular-nums">{row.diff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {basket.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-bold">
              담은 계획 ({basket.length}/{MAX_SAVED_PLANS})
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {basket.map((plan) => (
                <li key={plan.id} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface py-1 pl-3 pr-1 text-sm">
                  <span>{plan.name}</span>
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
              <Button onClick={() => void runCompare()} disabled={busy !== null}>
                {busy === "compare" ? "비교하는 중…" : "담은 계획 비교"}
              </Button>
              <Button variant="secondary" onClick={() => void runRobustCheck()} disabled={busy !== null}>
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
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
