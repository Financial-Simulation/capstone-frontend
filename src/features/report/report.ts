/**
 * 리포트 한 장(FR-11, 명세서 v1.7 9.2 '리포트 저장', tax-addon.js의 showReport)에 보여 줄 값 (순수 함수).
 * 숫자는 모두 서버(POST /reports) 값이다. 결과 화면과 같은 표기 · 같은 기준(70% · 2%p · '거의 차이 없음')으로 고르기만 한다.
 */
import { SIMULATION_PATHS, YOUTH_FUTURE_SAVING } from "@/config/policy";
import { planCompareRows, type PlanCompareRow, type PlanLabel } from "@/features/plan/plan";
import { LEVEL_LABELS, PROBABILITY_GOOD, afterLabel, causeRows, leverRows, probabilityLevel } from "@/features/result/result";
import { allocationLine } from "@/features/tax/allocation";
import { formatKoreanWon, formatManwon, formatPercent } from "@/lib/format";
import type { ReportResult } from "@/lib/types";
import { formatDuration, formatYearMonth } from "@/lib/year-month";

/** 이름 · 값 한 칸 */
export interface ReportCell {
  label: string;
  value: string;
}

/** 금액 한 칸 (음수면 빨간 글자) */
export interface MoneyCell {
  text: string;
  negative: boolean;
}

export interface ReportView {
  title: string;
  /** 만든 시각 · 기준 연월 · 모델 · 미래 n개 · 난수 시드 */
  meta: string;
  /** 서버 첫 문장 그대로 */
  headline: string;
  summary: ReportCell[];
  goal: ReportCell[];
  forecast: { label: string; p5: MoneyCell; p10: MoneyCell; p50: MoneyCell; p90: MoneyCell }[];
  risks: ReportCell[];
  causes: string;
  /** 서버 경고 문장 (지원금 없음 등) */
  notes: string[];
  tax: ReportCell[];
  allocation: string;
  levers: { label: string; probability: string; diff: string }[];
  /** 담은 계획 비교 (계획 바꿔 보기의 비교 표와 같은 줄). 담은 계획이 없으면 빈 목록 */
  comparison: PlanCompareRow[];
  parameters: { key: string; label: string; value: string; grade: string; source: string; asOf: string }[];
  /** 근거 등급 설명 (GET /meta의 gradeLegend). 못 받았으면 null */
  gradeLegend: string | null;
  disclaimer: string;
}

export const REPORT_TITLE = "사회초년생 재무 시뮬레이션 리포트";

/** 리포트 맨 끝 '용어 풀이': 결과 화면은 쉬운 말을 쓰고, 리포트는 정확한 이름을 쓴 뒤 여기서 풀어 준다 */
export const GLOSSARY: readonly { term: string; meaning: string }[] = [
  { term: "미래 2,000개", meaning: "실직 · 급한 지출 · 물가 · 연봉을 매달 무작위로 바꿔 계산한 2,000가지 경우예요. 같은 입력이면 같은 2,000가지를 써서 결과가 매번 같아요." },
  { term: "달성 가능성", meaning: "2,000가지 중 목표 시점에 목표 금액 이상 모은 경우의 비율이에요. 결과 화면의 '10번 중 n번'이 이 값이에요." },
  { term: "오차", meaning: "2,000가지로 센 달성 가능성의 표준오차예요. 경우를 늘려 다시 세면 대략 이 폭 안에서 달라져요." },
  { term: "중간값", meaning: "2,000가지를 모은 돈 순서로 세웠을 때 가운데 값이에요. 결과 화면의 '보통이면'이에요." },
  { term: "아래 10% · 위 10%", meaning: "아래에서 10%째 · 위에서 10%째 값이에요. 10번 중 8번은 이 사이에 있어요 (결과 화면의 '안 풀리면 · 잘 풀리면')." },
  { term: "최악의 경우 (하위 5%)", meaning: "아래에서 5%째 값이에요. 20번 중 1번은 이보다 나빠요 (결과 화면의 '많이 안 풀리면')." },
  { term: "계산기 결과", meaning: "실직 · 급한 지출이 없고 물가 · 연봉이 평균대로 갈 때 모이는 돈이에요 (결과 화면의 '계획대로만 가면')." },
  { term: "빚질 가능성", meaning: "목표 시점까지 모은 돈(현금 + 예 · 적금 + 투자)이 한 번이라도 0원 아래로 내려간 경우의 비율이에요." },
  { term: "중도해지", meaning: "청년미래적금을 만기 전에 깬 경우의 비율이에요." },
  { term: "세금으로 본 순이득", meaning: "돌려받은 세금에서 낸 세금(이자소득세 · 청약 추징 · 연금 기타소득세)을 뺀 값이에요." },
];

/** "2026-11-08T22:50:12" → "2026년 11월 8일 22:50" (모양이 다르면 그대로) */
export function generatedText(at: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(at);
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일 ${m[4]}:${m[5]}` : at;
}

const won = (value: number | null | undefined) => (value == null ? "—" : formatKoreanWon(value));
const money = (value: number): MoneyCell => ({ text: formatManwon(value), negative: value < 0 });

/** labels: 보낸 담은 계획의 이름표 (줄여 보낸 이름 대신 담은 계획 이름, plan.ts의 planLabels) */
export function reportView(
  report: ReportResult,
  gradeLegend?: Record<string, string> | null,
  labels?: readonly PlanLabel[],
): ReportView {
  const { goal, risks, tax } = report;
  const { debt, policySaving } = risks;
  const eligible = policySaving.eligible;
  const s = report.inputSummary;
  const noMatch = report.warnings.some((w) => w.code === "INFO_POLICY_NO_MATCH");

  const causes = causeRows(report.causes);
  const levers = leverRows(report.levers);

  return {
    title: REPORT_TITLE,
    meta: [
      `만든 시각 ${generatedText(report.generatedAt)}`,
      `기준 연월 ${formatYearMonth(report.startMonth)}`,
      `모델 ${report.modelVersion}`,
      `미래 ${SIMULATION_PATHS.toLocaleString("ko-KR")}개 (난수 시드 ${report.seed})`,
    ].join(" · "),
    headline: report.headline,
    summary: [
      { label: "월 실수령액", value: won(s.monthlyNetIncome) },
      { label: "고정지출", value: won(s.fixedTotal) },
      { label: "변동지출", value: won(s.variableTotal) },
      { label: "대출 상환 (첫 달)", value: won(s.monthlyLoanPayment) },
      { label: "매달 남는 돈", value: won(s.monthlySurplus) },
      { label: "월 저축액", value: won(s.monthlySaving) },
    ],
    goal: [
      { label: "목표 금액", value: formatKoreanWon(goal.targetAmount) },
      { label: "달성 가능성", value: `${formatPercent(goal.probability)} (${LEVEL_LABELS[probabilityLevel(goal.probability)]})` },
      { label: "오차", value: `±${goal.probabilityError.toFixed(1)}%p` },
      { label: "미래의 절반이 닿는 때", value: goal.medianReachDate ? formatYearMonth(goal.medianReachDate) : "10년 안에 못 닿아요" },
      {
        label: `가능성 ${PROBABILITY_GOOD}%가 되는 때`,
        value: goal.reach70Date ? formatYearMonth(goal.reach70Date) : `10년 안에 ${PROBABILITY_GOOD}%가 안 돼요`,
      },
      { label: "계산기 결과 (목표 시점)", value: formatManwon(report.forecast.deterministicAtGoal) },
    ],
    forecast: report.forecast.checkpoints.map((c) => ({
      label: afterLabel(c.afterMonths),
      p5: money(c.p5),
      p10: money(c.p10),
      p50: money(c.p50),
      p90: money(c.p90),
    })),
    risks: [
      { label: "빚질 가능성", value: formatPercent(debt.probability) },
      { label: "처음 빚지는 때 (중간값)", value: debt.probability > 0 && debt.medianFirstDate ? formatYearMonth(debt.medianFirstDate) : "없음" },
      { label: "최악의 경우 (하위 5%)", value: formatManwon(debt.worstCaseAtGoal) },
      {
        label: "청년미래적금 중도해지",
        value: !eligible || policySaving.earlyTerminationProbability == null ? "대상 아님" : formatPercent(policySaving.earlyTerminationProbability),
      },
      {
        label: `정부 지원금 (${formatDuration(YOUTH_FUTURE_SAVING.riskSubsidyWindowMonths)} 안)`,
        value: !eligible || policySaving.expectedSubsidy == null ? "대상 아님" : noMatch ? "없음" : formatKoreanWon(policySaving.expectedSubsidy),
      },
    ],
    causes: `적금을 처음 깬 이유: ${
      !eligible
        ? "청년미래적금 대상이 아니라 해당 없음"
        : causes.empty
          ? "적금을 중간에 깬 미래가 없어요"
          : causes.rows.map((row) => `${row.label} ${formatPercent(row.share)}`).join(" · ")
    }`,
    notes: [...new Set(report.warnings.map((w) => w.message))],
    tax: [
      { label: "매년 돌려받는 세금", value: formatKoreanWon(tax.refundPerYear) },
      { label: "돌려받는 세금 합계", value: formatKoreanWon(tax.refundTotal) },
      { label: "낸 이자소득세", value: formatKoreanWon(tax.interestTax) },
      { label: "청약 추징", value: formatKoreanWon(tax.clawback) },
      { label: "연금 기타소득세", value: formatKoreanWon(tax.pensionTax) },
      { label: "세금으로 본 순이득", value: formatKoreanWon(tax.netBenefit) },
    ],
    allocation: `월 배분: ${allocationLine(tax.allocation)}`,
    levers: levers.map((lever) => ({
      label: lever.label,
      probability: lever.probability,
      diff: lever.flat ? "거의 차이 없음" : lever.diff,
    })),
    comparison:
      report.comparison.length > 0 ? planCompareRows({ goalMonths: goal.goalMonths, plans: report.comparison }, labels) : [],
    parameters: report.parameters.map((p) => ({
      key: p.key,
      label: p.label,
      value: p.value,
      grade: p.grade,
      source: p.source,
      asOf: p.asOf ?? "—",
    })),
    gradeLegend: gradeLegend
      ? `근거 등급: ${Object.entries(gradeLegend)
          .map(([grade, text]) => `${grade} ${text}`)
          .join(" · ")}`
      : null,
    disclaimer: report.disclaimer,
  };
}
