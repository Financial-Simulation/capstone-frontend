"use client";

/**
 * 결과 본문 (04 결과 · 04-E 예시 결과가 같이 쓴다). 서버 응답을 그대로 보여 주기만 하고, 블록 순서만 여기서 정한다.
 *
 * 첫 화면은 사회초년생이 바로 읽을 수 있는 다섯 블록만 (멘토 피드백 11/10: 결과 화면이 너무 어렵다):
 *  결론(SimpleHero) · 그래프 하나(ChartCard) · 조심할 점과 받는 혜택(SimpleNotes) · 이렇게 하면 좋아져요(SimpleActions)
 * 그 아래 버튼으로 펼치는 것: 상품별로 나눠 보기(features/tax) · 계획 바꿔 보기(features/plan). 버튼은 ResultScreen에 있다.
 * 자세한 숫자는 맨 아래 '숫자 더 보기'(접힘)와 리포트(/report, PDF)에:
 *  가능성 범위(RobustSection) · 1·3·5·10년 표 · 위험 카드 · 세금 카드 · 적금을 처음 깬 이유 · 바꿔 본 것 전체와 70% 역산 · 입력값과 가정
 * v1.7 블록(가능성 범위 · 세금 · 상품별로 나눠 보기 · 계획 바꿔 보기)은 내 계획에만 붙인다. 04-E 예시는 example로 부르고 붙이지 않는다 (명세서 v1.7 9.1).
 */
import { PlanSection } from "@/features/plan/PlanSection";
import { AllocationSection } from "@/features/tax/AllocationSection";
import { TaxSection } from "@/features/tax/TaxSection";
import type { MonthlyAllocation } from "@/features/tax/allocation";
import { taxView } from "@/features/tax/tax";
import type { SimulationInput, SimulationInputDraft } from "@/lib/types";
import { Assumptions } from "./Assumptions";
import { MockNote } from "./Hero";
import { Levers } from "./Levers";
import { CauseBars, RiskGrid } from "./RiskSections";
import { RobustSection } from "./RobustSection";
import { ChartCard, CheckpointTable } from "./SavingsSections";
import { SimpleActions, SimpleHero, SimpleNotes } from "./SimpleSections";
import { riskCards } from "./result";
import type { ResultData } from "./use-result";

export const ALLOCATION_SECTION_ID = "allocation-section";

export function ResultView({
  data,
  input,
  example = false,
  onApplyAllocation,
  allocationOpen = false,
  planOpen = false,
  onPlanClose,
}: {
  data: ResultData;
  input: SimulationInputDraft;
  /** 04-E 예시 결과: v1.7 블록(세금 등)을 붙이지 않는다 */
  example?: boolean;
  /** '상품별로 나눠 보기'의 '이 배분으로' (04 결과에서만: 내 입력의 배분을 바꾼다) */
  onApplyAllocation?: (allocation: MonthlyAllocation) => void;
  /** '상품별로 나눠 보기'를 펼쳤는지. 버튼은 ResultScreen에 있다 */
  allocationOpen?: boolean;
  /** '계획 바꿔 보기'(04-2)를 펼쳤는지. 버튼은 ResultScreen에 있다 */
  planOpen?: boolean;
  onPlanClose?: () => void;
}) {
  const result = data.sim.data;
  const tax = example ? null : taxView(result, input);
  return (
    <div className="space-y-6">
      <SimpleHero result={result} />
      {data.sim.source === "mock" && <MockNote match={data.sim.mock} />}
      <ChartCard result={result} input={input} />
      <SimpleNotes result={result} />
      <SimpleActions data={data} />

      {tax && allocationOpen && onApplyAllocation && (
        <div id={ALLOCATION_SECTION_ID} className="scroll-mt-4">
          <AllocationSection
            result={result}
            input={input as SimulationInput}
            policyReason={data.policyReason}
            onApply={onApplyAllocation}
          />
        </div>
      )}
      {!example && planOpen && onPlanClose && <PlanSection input={input as SimulationInput} onClose={onPlanClose} />}

      <details className="group rounded-xl border border-line bg-surface p-5 open:pb-6">
        <summary className="cursor-pointer text-base font-bold">
          숫자 더 보기 <span className="text-sm font-normal text-ink-soft">(표 · 위험 · 세금 · 근거, 리포트에도 있어요)</span>
        </summary>
        <div className="mt-5 space-y-6">
          {!example && <RobustSection input={input as SimulationInput} currentProbability={result.goal.probability} />}
          <CheckpointTable result={result} />
          <RiskGrid cards={riskCards(result, data.policyReason)} />
          {tax && <TaxSection view={tax} />}
          <CauseBars result={result} />
          <Levers data={data} />
          <Assumptions result={result} input={input} />
        </div>
      </details>
    </div>
  );
}
