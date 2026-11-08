"use client";

/**
 * 결과 본문 (04 결과 · 04-E 예시 결과가 같이 쓴다). 서버 응답을 그대로 보여 주기만 하고, 블록 순서만 여기서 정한다.
 *  첫 문장(Hero) · 가능성 범위(RobustSection) · 범위 그래프 · 1·3·5·10년 표(SavingsSections) · 위험(RiskSections) ·
 *  세금 · 어디에 얼마나(features/tax) · 적금을 처음 깬 이유 · 이렇게 바꿔 보세요(Levers) ·
 *  계획 바꿔 보기(features/plan, 펼쳤을 때) · 입력값과 가정(Assumptions)
 * v1.7 블록(가능성 범위 · 세금 · 어디에 얼마나 · 계획 바꿔 보기)은 내 계획에만 붙인다. 04-E 예시는 example로 부르고 붙이지 않는다 (명세서 v1.7 9.1).
 */
import { PlanSection } from "@/features/plan/PlanSection";
import { AllocationSection } from "@/features/tax/AllocationSection";
import { TaxSection } from "@/features/tax/TaxSection";
import type { MonthlyAllocation } from "@/features/tax/allocation";
import { taxView } from "@/features/tax/tax";
import type { SimulationInput, SimulationInputDraft } from "@/lib/types";
import { Assumptions } from "./Assumptions";
import { Hero, MockNote } from "./Hero";
import { Levers } from "./Levers";
import { CauseBars, RiskGrid } from "./RiskSections";
import { RobustSection } from "./RobustSection";
import { ChartCard, CheckpointTable } from "./SavingsSections";
import { riskCards } from "./result";
import type { ResultData } from "./use-result";

export function ResultView({
  data,
  input,
  example = false,
  onApplyAllocation,
  planOpen = false,
  onPlanClose,
}: {
  data: ResultData;
  input: SimulationInputDraft;
  /** 04-E 예시 결과: v1.7 블록(세금 등)을 붙이지 않는다 */
  example?: boolean;
  /** '어디에 얼마나'의 '이 배분으로' (04 결과에서만: 내 입력의 배분을 바꾼다) */
  onApplyAllocation?: (allocation: MonthlyAllocation) => void;
  /** '계획 바꿔 보기'(04-2)를 펼쳤는지. 맨 아래 버튼은 ResultScreen에 있다 */
  planOpen?: boolean;
  onPlanClose?: () => void;
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
      {!example && planOpen && onPlanClose && <PlanSection input={input as SimulationInput} onClose={onPlanClose} />}
      <Assumptions result={result} input={input} />
    </div>
  );
}
