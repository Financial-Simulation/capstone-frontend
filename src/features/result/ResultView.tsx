"use client";

/**
 * 결과 본문 (04 결과 · 04-E 예시 결과가 같이 쓴다). 서버 응답을 보여 주기만 하고, 블록 배치와 막대 값 · 혜택 질문 답만 여기서 갖는다.
 *
 * 배치 (조민석 배치안 11/18 · 멘토 피드백 11/10 · 11/16):
 *  결론(SimpleHero)
 *  [왼쪽: 그래프 + 미래 다시 보기(ChartPanel) · 조심할 점(CautionStrip), 화면에 고정 | 오른쪽(스크롤): 계획 바꿔 보기(PlanSection) · 상품별로 나눠 보기(원그래프 3개)]
 *  받을 수 있는 혜택(카드) · 혜택 질문(접힘) · 숫자 더 보기(접힘)
 * 막대를 움직이면 바꾼 계획으로 다시 계산해(use-adjusted.ts) 결론 · 그래프 · 조심할 점 · 혜택이 바로 바뀐다. 그래프에는 지금 계획을 회색 점선으로 남긴다.
 * 자세한 숫자(1·3·5·10년 표 · 위험 · 세금 카드 · 적금 깬 이유 · 바꿔 본 것 전체와 70% 역산 · 가능성 범위 · 입력값과 가정)는 '숫자 더 보기'와 리포트(/report)에.
 * v1.7 블록(가능성 범위 · 세금 · 상품별로 나눠 보기 · 계획 바꿔 보기)은 내 계획에만 붙인다 (04-E 예시는 example, 명세서 v1.7 9.1).
 * 받을 수 있는 혜택은 예시에도 보여 준다 (질문 칸 없이, 예시에 들어 있는 답으로. 11/18 S4 '혼자 월세' 예시로 청년월세 지원을 보여 주려고).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { YOUTH_FUTURE_SAVING } from "@/config/policy";
import { BenefitsSection } from "@/features/benefits/BenefitsSection";
import { ELIGIBILITY_FORM_ID, EligibilityForm } from "@/features/benefits/EligibilityForm";
import { useBenefits } from "@/features/benefits/use-benefits";
import { ActionComparison, type ActionComparisonResult } from "@/features/plan/ActionComparison";
import { PlanSection } from "@/features/plan/PlanSection";
import { ALLOCATION_KEYS } from "@/features/input/draft";
import { allocationChanges, fitAllocation } from "@/features/plan/allocation-sliders";
import { planBase, planChanges, type PlanValues } from "@/features/plan/plan";
import { AllocationSection } from "@/features/tax/AllocationSection";
import { TaxSection } from "@/features/tax/TaxSection";
import { toMonthly, type MonthlyAllocation } from "@/features/tax/allocation";
import { taxView } from "@/features/tax/tax";
import { api, errorMessage, isAbortError } from "@/lib/api";
import { formatWon } from "@/lib/format";
import { useEligibility } from "@/lib/hooks";
import type { Adjustments, Eligibility, RecommendResult, SimulationInput, SimulationInputDraft } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { Assumptions } from "./Assumptions";
import { ChartPanel } from "./ChartPanel";
import { MockNote } from "./Hero";
import { Levers } from "./Levers";
import { CauseBars, RiskGrid } from "./RiskSections";
import { RobustSection } from "./RobustSection";
import { CheckpointTable, YearlyTable } from "./SavingsSections";
import { CautionStrip, SimpleHero } from "./SimpleSections";
import { riskCards } from "./result";
import { useAdjustedResult } from "./use-adjusted";
import type { ResultData } from "./use-result";

export function ResultView({
  data,
  input,
  example = false,
  exampleEligibility,
}: {
  data: ResultData;
  input: SimulationInputDraft;
  /** 04-E 예시 결과: v1.7 블록(세금 · 계획 바꿔 보기 등)을 붙이지 않는다 */
  example?: boolean;
  /** 04-E 예시의 혜택 질문 답 (S4만) */
  exampleEligibility?: Eligibility;
}) {
  if (example) return <ExampleBody data={data} input={input as SimulationInput} eligibility={exampleEligibility ?? NO_ANSWERS} />;
  return <MyResultBody data={data} input={input as SimulationInput} />;
}

function MyResultBody({ data, input }: { data: ResultData; input: SimulationInput }) {
  const base = data.sim.data;
  const basePlan = planBase(input);
  // tax는 v1.7 서버면 늘 온다. 없으면 입력 값 (청년미래는 비웠으면 서버 기본값 min(저축액, 50만 원))
  const baseAllocation = base.tax
    ? toMonthly(base.tax.allocation)
    : {
        policyMonthly: input.savingPlan.policyMonthly ?? Math.min(input.savingPlan.monthlySaving, YOUTH_FUTURE_SAVING.monthlyLimit),
        housingMonthly: input.savingPlan.housingMonthly ?? 0,
        pensionMonthly: input.savingPlan.pensionMonthly ?? 0,
      };
  const [values, setValues] = useState<PlanValues>(basePlan);
  const [allocation, setAllocation] = useState<MonthlyAllocation>(baseAllocation);
  const [action, setAction] = useState<ActionComparisonResult | null>(null);

  // 월 저축액을 바꾸면 배분을 남는 만큼만으로 맞추고, 세 칸을 모두 보낸다 (서버 기본값 '청년미래 = min(저축액, 50만)'이 끼어들지 않게)
  const fitted = fitAllocation(allocation, values.monthlySaving);
  const savingChanged = values.monthlySaving !== basePlan.monthlySaving;
  const adjustments: Adjustments = {
    ...planChanges(values, basePlan),
    ...(savingChanged ? (Object.fromEntries(ALLOCATION_KEYS.map((k) => [k, fitted[k]])) as Adjustments) : allocationChanges(fitted, baseAllocation)),
  };
  const activeInput = action?.input ?? input;
  const adjusted = useAdjustedResult(activeInput, adjustments, base.seed, action ? { moveMonth: action.move?.month } : undefined);
  const shown = adjusted.result ?? action?.result ?? base;
  const move = adjusted.result ? adjusted.move : action?.move;
  const ghost = action || adjusted.result ? base : null;

  const recommend = useRecommend(input);
  const { eligibility, setEligibility } = useEligibility();
  const benefits = useBenefits(activeInput, adjustments, eligibility);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-5">
      <SimpleHero result={shown} base={ghost} />
      {data.sim.source === "mock" && <MockNote match={data.sim.mock} />}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-5">
          {action ? (
            <div className="space-y-5">
              {move && <div role="status" className="border-l-4 border-primary bg-primary-soft px-4 py-3">
                <p className="text-sm font-bold">이사 후 현금이 가장 적은 달</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  {move.lowest ? `${formatYearMonth(move.lowest.month)} · ${formatWon(move.lowest.cash)}` : "비교할 현금 내역이 없어요."}
                </p>
                <p className="mt-1 text-xs text-ink-soft">중간 시나리오에서 {formatYearMonth(move.month)} 이사부터 최대 12개월을 봐요. 보증금은 현금에 넣지 않아요.</p>
              </div>}
              <ChartPanel key="actions" result={shown} base={base} input={activeInput} adjustments={adjustments} storyEnabled={false} actionComparison />
            </div>
          ) : (
            <ChartPanel key="plan" result={shown} base={ghost} input={input} adjustments={adjustments} storyEnabled />
          )}
          <CautionStrip result={shown} />
        </div>
        {/* 오른쪽은 왼쪽 높이에 맞추고 안에서 스크롤 */}
        <div className="relative min-h-[28rem] min-w-0">
          <div className="space-y-5 lg:absolute lg:inset-0 lg:overflow-y-auto lg:pr-1">
            <PlanSection
              input={input}
              values={values}
              onValues={setValues}
              baseAllocation={baseAllocation}
              onAllocation={setAllocation}
              adjustments={adjustments}
              levers={data.reverse?.data.levers ?? null}
              currentProbability={base.goal.probability}
              adjustedProbability={adjusted.result && !adjusted.loading ? adjusted.result.goal.probability : null}
              loading={adjusted.loading}
              error={adjusted.error}
            >
              <ActionComparison input={input} seed={base.seed} active={action !== null} onResult={setAction} />
            </PlanSection>
            <AllocationSection result={base} recommend={recommend.data} error={recommend.error} allocation={fitted} onPick={setAllocation} />
          </div>
        </div>
      </div>
      <BenefitsSection
        result={benefits.result?.data ?? null}
        loading={benefits.loading}
        error={benefits.error}
        answers={{ eligibility, onChange: setEligibility, startMonth: input.startMonth }}
        headerAction={
          <Button type="button" size="sm" variant="secondary" aria-expanded={formOpen} aria-controls={ELIGIBILITY_FORM_ID} onClick={() => setFormOpen((open) => !open)}>
            <Icon name="edit" className="size-4" />
            더 정확히 알고 싶다면 입력하기
          </Button>
        }
      >
        <EligibilityForm
          eligibility={eligibility}
          onChange={setEligibility}
          startMonth={input.startMonth}
          open={formOpen}
        />
      </BenefitsSection>
      {benefits.result?.source === "mock" && benefits.result.mock?.note && <p className="text-xs text-muted">목업: {benefits.result.mock.note}</p>}
      <MoreNumbers data={data} input={input} example={false} />
    </div>
  );
}

/** 가장 좋은 배분 (/allocations/recommend): 계획 바꿔 보기 버튼 3개와 원그래프 3개가 같이 쓴다. 지금 계획 기준으로 한 번만 */
function useRecommend(input: SimulationInput) {
  const body = JSON.stringify(input);
  const [state, setState] = useState<{
    key: string;
    data: RecommendResult | null;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    api.recommendAllocation({ input: JSON.parse(body) as SimulationInput }, { signal: abort.signal }).then(
      ({ data }) => setState({ key: body, data, error: null }),
      (error: unknown) => {
        if (!isAbortError(error)) setState({ key: body, data: null, error: errorMessage(error) });
      },
    );
    return () => abort.abort();
  }, [body]);
  return {
    data: state?.key === body ? state.data : null,
    error: state?.key === body ? state.error : null,
  };
}

const NO_ANSWERS: Eligibility = {};
const NO_ADJUSTMENTS: Adjustments = {};

function ExampleBody({ data, input, eligibility }: { data: ResultData; input: SimulationInput; eligibility: Eligibility }) {
  const result = data.sim.data;
  const benefits = useBenefits(input, NO_ADJUSTMENTS, eligibility);
  const answered = Object.values(eligibility).some((v) => v !== null && v !== undefined);
  return (
    <div className="space-y-5">
      <SimpleHero result={result} />
      {data.sim.source === "mock" && <MockNote match={data.sim.mock} />}
      <ChartPanel result={result} base={null} input={input} adjustments={NO_ADJUSTMENTS} storyEnabled />
      <CautionStrip result={result} />
      {answered && <p className="text-sm text-ink-soft">이 예시는 혜택 질문 답(따로 삶 · 중소기업 · 보증금 · 교통비)도 넣어 두었어요.</p>}
      <BenefitsSection result={benefits.result?.data ?? null} loading={benefits.loading} error={benefits.error} answers={null} />
      <MoreNumbers data={data} input={input} example />
    </div>
  );
}

/** 숫자 더 보기 (접힘): 원래 결과 화면의 자세한 블록. 지금 계획 기준 */
function MoreNumbers({ data, input, example }: { data: ResultData; input: SimulationInputDraft; example: boolean }) {
  const result = data.sim.data;
  const tax = example ? null : taxView(result, input);
  return (
    <details className="rounded-xl border border-line bg-surface p-5 open:pb-6">
      <summary className="cursor-pointer text-base font-bold">
        숫자 더 보기 <span className="text-sm font-normal text-ink-soft">(표 · 위험 · 세금 · 근거, 리포트에도 있어요)</span>
      </summary>
      <div className="mt-5 space-y-6">
        {!example && <RobustSection input={input as SimulationInput} currentProbability={result.goal.probability} />}
        <YearlyTable result={result} />
        <CheckpointTable result={result} />
        <RiskGrid cards={riskCards(result, data.policyReason)} />
        {tax && <TaxSection view={tax} />}
        <CauseBars result={result} />
        <Levers data={data} />
        <Assumptions result={result} input={input} />
      </div>
    </details>
  );
}
