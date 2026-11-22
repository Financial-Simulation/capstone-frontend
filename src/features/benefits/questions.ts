/**
 * 결과 화면 '혜택을 받을 수 있을지 더 정확히 알고 싶다면' 질문 (모두 선택, 답하지 않으면 서버가 '확인해 보세요'로 둔다).
 * 질문 이름은 서버 Eligibility · 응답 ask와 같다. 판정은 서버(/benefits)가 한다.
 */
import type { BenefitCategory, BenefitStatus, Eligibility, EligibilityKey } from "@/lib/types";

export type QuestionKind = "yesno" | "month" | "money" | "months";

export interface Question {
  key: EligibilityKey;
  label: string;
  /** 혜택 카드의 '알려 주면 정확해져요'에 쓰는 짧은 이름 */
  short: string;
  kind: QuestionKind;
  hint?: string;
  /** 금액 칸 상한 (서버 Eligibility 검사와 같다) */
  max?: number;
}

export const QUESTIONS: readonly Question[] = [
  { key: "livingApart", label: "부모님과 따로 사나요?", short: "따로 사는지", kind: "yesno", hint: "청년월세 지원 · 청년내일저축계좌" },
  { key: "sme", label: "지금 회사가 중소기업인가요?", short: "중소기업인지", kind: "yesno", hint: "소득세 감면 · 청년미래적금 우대형" },
  { key: "hireMonth", label: "지금 회사에 들어간 달", short: "입사한 달", kind: "month", hint: "소득세 감면은 입사일부터 5년" },
  { key: "taxReliefNow", label: "이미 중소기업 소득세 감면을 받고 있나요?", short: "감면 받는 중인지", kind: "yesno", hint: "월급 명세서의 소득세가 거의 없으면 받고 있는 거예요" },
  { key: "militaryMonths", label: "군 복무 기간", short: "군 복무 기간", kind: "months", hint: "나이 기준에서 최대 6년까지 빼 줘요" },
  {
    key: "parentsIncomeLow",
    label: "부모님 가구 소득이 중간(중위 100%) 이하이고 재산이 4억 7천만 원 이하인가요?",
    short: "부모님 소득",
    kind: "yesno",
    hint: "만 30세 미만이고 본인 소득이 낮을 때 청년월세 지원에서 봐요",
  },
  { key: "rentDeposit", label: "지금 집 보증금", short: "보증금", kind: "money", hint: "청년월세 지원 재산 기준(1억 2,200만 원)에 들어가요", max: 1_000_000_000 },
  { key: "monthlyTransit", label: "한 달 대중교통비", short: "교통비", kind: "money", hint: "K-패스로 돌려받는 돈을 계산해요 (한 달 15번 이상 탈 때)", max: 1_000_000 },
];

export const QUESTION_BY_KEY = Object.fromEntries(QUESTIONS.map((q) => [q.key, q])) as Record<EligibilityKey, Question>;

/** 답한 질문 수 */
export function answeredCount(e: Eligibility): number {
  return QUESTIONS.filter((q) => e[q.key] !== null && e[q.key] !== undefined).length;
}

/** 한 칸만 바꾼다. null이면 그 칸을 지운다 (모름) */
export function withAnswer(e: Eligibility, key: EligibilityKey, value: Eligibility[EligibilityKey]): Eligibility {
  const next: Record<string, unknown> = { ...e };
  if (value === null || value === undefined) delete next[key];
  else next[key] = value;
  return next as Eligibility;
}

export const STATUS_LABELS: Record<BenefitStatus, string> = {
  YES: "받을 수 있어요",
  CHECK: "확인해 보세요",
  LATER: "일을 그만두면",
  NO: "못 받아요",
};

export const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  CASH: "돈 받기",
  TAX: "세금 줄이기",
  SAVING: "적금 지원",
  LOAN: "싸게 빌리기",
  SAFETY: "실직 대비",
};
