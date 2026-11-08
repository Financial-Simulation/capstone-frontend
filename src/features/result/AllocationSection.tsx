"use client";

/**
 * 결과 화면 '어디에 얼마나' (세금 아래, 명세서 v1.7 9.2). 월 저축액을 상품별로 나눠 보고
 *  - 지금 계획과 비교하기: POST /compare (바꾼 배분 + 예시 배분, 최대 3개)
 *  - 가장 좋은 배분 찾기: POST /allocations/recommend
 *  - 이 배분으로: 내 입력(simInput.v1)의 배분을 바꾼다 → 결과 전체를 새로고침 없이 다시 계산 (tax-addon.js는 새로고침)
 * 04 결과에만 붙인다 (04-E 예시 값은 내 입력으로 옮기지 않는다). 보여 줄 값은 allocation.ts에서 고른다.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { api, formErrorMessage, toFieldErrors } from "@/lib/api";
import { formatKoreanWon, formatWon } from "@/lib/format";
import type { CompareResult, RecommendResult, SimulateResult, SimulationInput } from "@/lib/types";
import {
  ALLOCATION_FIELDS,
  ALLOCATION_HINTS,
  allocationErrors,
  comparePlans,
  compareRows,
  generalRest,
  recommendCards,
  recommendNote,
  restHint,
  sameAllocation,
  toMonthly,
  type CompareRow,
  type MonthlyAllocation,
} from "./allocation";
import { MEANINGFUL_DIFF, goalWhen } from "./result";

type DraftAllocation = Record<keyof MonthlyAllocation, number | null>;

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function errorText(prefix: string, error: unknown): string {
  const detail = formErrorMessage(error) ?? Object.values(toFieldErrors(error))[0] ?? "잠시 후 다시 시도해 주세요.";
  return `${prefix}: ${detail}`;
}

const DIFF_TONES: Record<NonNullable<CompareRow["diff"]>["tone"], string> = {
  up: "text-good",
  down: "text-danger",
  flat: "text-muted",
};

export function AllocationSection({
  result,
  input,
  policyReason,
  onApply,
}: {
  result: SimulateResult;
  input: SimulationInput;
  /** 청년미래적금 비대상 이유 (입력 검사의 policySaving.reason) */
  policyReason: string | null;
  /** '이 배분으로' */
  onApply: (allocation: MonthlyAllocation) => void;
}) {
  const current = toMonthly(result.tax!.allocation);
  const eligible = result.risks.policySaving.eligible;
  const saving = input.savingPlan.monthlySaving;

  const [draft, setDraft] = useState<DraftAllocation>(current);
  const [busy, setBusy] = useState<"compare" | "recommend" | null>(null);
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [recommend, setRecommend] = useState<RecommendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const values: MonthlyAllocation = {
    policyMonthly: eligible ? (draft.policyMonthly ?? 0) : 0,
    housingMonthly: draft.housingMonthly ?? 0,
    pensionMonthly: draft.pensionMonthly ?? 0,
  };
  const errors = allocationErrors(values);
  const invalid = Object.keys(errors).length > 0;
  const rest = generalRest(saving, values);
  const restInfo = restHint(rest, input.savingPlan.generalSavingRate);
  const plans = comparePlans(values, current, saving, eligible);

  async function run<T>(kind: "compare" | "recommend", call: (signal: AbortSignal) => Promise<T>, done: (data: T) => void) {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setError(null);
    setBusy(kind);
    try {
      done(await call(abort.signal));
    } catch (caught) {
      if (isAbort(caught)) return;
      setError(errorText(kind === "compare" ? "비교하지 못했어요" : "배분을 찾지 못했어요", caught));
    } finally {
      if (abortRef.current === abort) setBusy(null);
    }
  }

  const runCompare = () =>
    run(
      "compare",
      (signal) => api.compare({ input, plans }, { signal }),
      ({ data }) => setCompare(data),
    );
  const runRecommend = () =>
    run(
      "recommend",
      (signal) => api.recommendAllocation({ input }, { signal }),
      ({ data }) => setRecommend(data),
    );

  return (
    <section aria-labelledby="alloc-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="alloc-title" className="text-base font-bold">
        어디에 얼마나
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        월 저축액 {formatKoreanWon(saving)}을 상품별로 나눠 봐요. 같은 미래 {result.paths.toLocaleString("ko-KR")}개로 목표 달성
        가능성과 세금을 함께 비교해요.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ALLOCATION_FIELDS.map(({ key, label }) => {
          const id = `alloc-${key}`;
          if (key === "policyMonthly" && !eligible) {
            return (
              <div key={key}>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1.5 text-sm text-muted">{policyReason ?? "나이·소득 기준으로 대상이 아니에요."}</p>
              </div>
            );
          }
          return (
            <Field key={key} id={id} label={label} mark={false} hint={ALLOCATION_HINTS[key]} error={errors[key]}>
              <MoneyInput
                id={id}
                value={draft[key]}
                invalid={Boolean(errors[key])}
                aria-describedby={describedBy(id, errors[key], ALLOCATION_HINTS[key])}
                onChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
              />
            </Field>
          );
        })}
        <div>
          <p className="text-sm font-semibold text-ink">일반 적금 (나머지)</p>
          <p className="mt-1.5 flex h-11 items-center justify-end rounded-lg border border-line bg-canvas px-3 text-[15px] tabular-nums text-ink-soft">
            {formatWon(Math.max(rest, 0))}
          </p>
          <p className={`mt-1.5 text-sm ${restInfo.over ? "text-danger" : "text-muted"}`}>{restInfo.text}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => void runCompare()} disabled={busy !== null || invalid || plans.length === 0}>
          {busy === "compare" ? "비교하는 중…" : "지금 계획과 비교하기"}
        </Button>
        <Button variant="secondary" onClick={() => setDraft(current)} disabled={busy !== null || sameAllocation(values, current)}>
          지금 배분으로 되돌리기
        </Button>
        <Button variant="secondary" onClick={() => void runRecommend()} disabled={busy !== null}>
          {busy === "recommend" ? "찾는 중…" : "가장 좋은 배분 찾기"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div aria-live="polite">
        {recommend && (
          <div className="mt-6">
            <h3 className="text-sm font-bold">가장 좋은 배분</h3>
            <ul className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {recommendCards(recommend).map((card) => (
                <li
                  key={card.key}
                  className={`rounded-xl border p-4 ${card.key === "bestBenefit" ? "border-good-line bg-good-soft/50" : "border-line bg-surface"}`}
                >
                  <p className="text-sm font-semibold text-ink-soft">{card.title}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {card.probability}
                    {card.diff && <span className="ml-1.5 text-sm font-medium text-ink-soft">({card.diff})</span>}
                  </p>
                  <p className="mt-1 text-sm">{card.allocation}</p>
                  <p className="mt-1 text-sm text-ink-soft">{card.benefit}</p>
                  {card.apply && (
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => onApply(card.apply!)}>
                      이 배분으로
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">{recommendNote(recommend, result.paths, goalWhen(result))}</p>
          </div>
        )}

        {compare && (
          <div className="mt-6">
            <h3 className="text-sm font-bold">지금 계획과 비교</h3>
            {/* relative: 표 안의 화면 읽기용 글자(sr-only, absolute)가 이 상자 밖으로 나가 페이지를 가로로 늘리지 않게 */}
            <div className="relative mt-2 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-semibold">계획</th>
                    <th className="py-2 pr-3 font-semibold">월 배분</th>
                    <th className="py-2 pr-3 font-semibold">목표 달성 가능성</th>
                    <th className="py-2 pr-3 font-semibold">세금으로 본 순이득</th>
                    <th className="py-2 pr-3 font-semibold">청년미래적금 중도해지</th>
                    <th className="py-2 pr-3 font-semibold">목표 시점 모은 돈 (중간값)</th>
                    <th className="py-2 font-semibold">
                      <span className="sr-only">적용</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows(compare, current).map((row) => (
                    <tr key={row.name} className={`border-b border-line align-top last:border-0 ${row.isBase ? "bg-system-soft" : ""}`}>
                      <td className="py-2 pr-3 font-semibold">{row.name}</td>
                      <td className="py-2 pr-3">
                        {row.allocation.map((line) => (
                          <span key={line} className="block whitespace-nowrap">
                            {line}
                          </span>
                        ))}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="font-semibold tabular-nums">{row.probability}</span>
                        {row.diff && <span className={`block text-xs ${DIFF_TONES[row.diff.tone]}`}>{row.diff.text}</span>}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{row.taxNetBenefit}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.earlyTermination}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.medianAtGoal}</td>
                      <td className="py-2">
                        {row.apply && (
                          <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => onApply(row.apply!)}>
                            이 배분으로
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-muted">
              차이가 {MEANINGFUL_DIFF}%p보다 작거나 우연일 수 있으면 &lsquo;거의 차이 없음&rsquo;으로 보여요. &lsquo;이 배분으로&rsquo;를 누르면 그
              배분으로 결과 전체를 다시 계산해요.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
