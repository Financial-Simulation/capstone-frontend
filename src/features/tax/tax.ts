/**
 * 결과 화면 '세금' 블록(명세서 v1.7 9.2, tax-addon.js의 taxSection)에 보여 줄 값 (순수 함수).
 * 숫자는 모두 서버(/simulate의 tax) 값이고, 여기서는 카드 5개와 안내 문장을 고르기만 한다.
 */
import {
  HOUSING_SUBSCRIPTION,
  INTEREST_INCOME_TAX_RATE,
  PENSION_SAVING,
  RENT_TAX_CREDIT,
  YOUTH_FUTURE_SAVING,
} from "@/config/policy";
import { goalWhen } from "@/features/result/result";
import { MINUS, formatKoreanWon, formatManwon, formatPercent } from "@/lib/format";
import { fieldId } from "@/lib/form";
import { stepByKey } from "@/lib/steps";
import type { SimulateResult, SimulationInputDraft } from "@/lib/types";

/** 청약 · 연금저축을 깰 확률이 이 값(%) 이상일 때만 안내 문장을 붙인다 (tax-addon.js와 같게) */
export const BREAK_NOTE_MIN_PROBABILITY = 5;

export interface TaxCard {
  key: "refundPerYear" | "refundTotal" | "interestTax" | "breakTax" | "netBenefit";
  title: string;
  value: string;
  detail?: string;
  tone: "default" | "good" | "danger";
}

export interface TaxNote {
  key: "pensionLimit" | "pensionBreak" | "housingBreak" | "preferential" | "rent" | "noProducts";
  text: string;
  /** 입력 화면의 그 칸으로 */
  link?: { href: string; label: string };
}

export interface TaxView {
  intro: string;
  cards: TaxCard[];
  notes: TaxNote[];
}

/** 1만 원 이상은 '57만 원', 그보다 작으면 '3,000원' (어림 금액 안내용) */
function roughWon(value: number): string {
  return Math.abs(value) >= 10_000 ? formatManwon(value) : formatKoreanWon(value);
}

/**
 * 세금 블록 (명세서 v1.7 9.2 '세금', tax-addon.js의 taxSection). 숫자는 모두 서버(/simulate의 tax) 값이다.
 * tax-addon.js가 화면에서 세율표로 계산하던 '내는 세금 연 약 n만 원' · 연금저축 세액공제 어림은 넣지 않고,
 * 금액 없는 안내로 바꿨다 (계산은 서버에서만. 서버가 값을 주면 다시 넣는다: docs/refactor-plan.md '팀과 정할 것' 3번).
 * v1.6 백엔드라 tax가 없으면 null.
 */
export function taxView(result: SimulateResult, input: SimulationInputDraft): TaxView | null {
  const tax = result.tax;
  if (!tax) return null;
  const { allocation } = tax;

  const cards: TaxCard[] = [
    {
      key: "refundPerYear",
      title: "매년 돌려받는 세금",
      value: formatKoreanWon(tax.refundPerYear),
      detail: "매년 2월 연말정산, 상품·월세가 없을 때와의 차이",
      tone: "default",
    },
    { key: "refundTotal", title: "목표 시점까지 돌려받는 세금", value: formatKoreanWon(tax.refundTotal), tone: "default" },
    {
      key: "interestTax",
      title: "낸 이자소득세",
      value: formatKoreanWon(tax.interestTax),
      detail: `적금·청약 이자의 ${INTEREST_INCOME_TAX_RATE}%`,
      tone: "default",
    },
    {
      key: "breakTax",
      title: "해지로 다시 낸 세금",
      value: formatKoreanWon(tax.clawback + tax.pensionTax),
      detail: `청약 추징 ${formatKoreanWon(tax.clawback)} · 연금 ${formatKoreanWon(tax.pensionTax)}`,
      tone: "default",
    },
    {
      key: "netBenefit",
      title: "세금으로 본 순이득",
      value: formatKoreanWon(tax.netBenefit),
      detail: `돌려받은 세금 ${MINUS} 낸 세금`,
      tone: tax.netBenefit > 0 ? "good" : tax.netBenefit < 0 ? "danger" : "default",
    },
  ];

  const notes: TaxNote[] = [];
  if (allocation.pensionMonthly > 0) {
    notes.push({
      key: "pensionLimit",
      text: "연금저축 세액공제는 그해 낸 세금까지만 돌려받아요. 소득이 낮으면 넣은 만큼 다 돌려받지 못할 수 있어요.",
    });
    if ((tax.pensionBreakProbability ?? 0) >= BREAK_NOTE_MIN_PROBABILITY) {
      notes.push({
        key: "pensionBreak",
        text: `목표 시점까지 연금저축을 중간에 꺼낼 확률이 ${formatPercent(tax.pensionBreakProbability)}예요. 꺼내면 공제받은 돈과 수익의 ${PENSION_SAVING.earlyWithdrawalTaxRate}%를 다시 내요.`,
      });
    }
  }
  if (allocation.housingMonthly > 0 && (tax.housingBreakProbability ?? 0) >= BREAK_NOTE_MIN_PROBABILITY) {
    notes.push({
      key: "housingBreak",
      text: `목표 시점까지 청약을 깰 확률이 ${formatPercent(tax.housingBreakProbability)}예요. 가입 ${HOUSING_SUBSCRIPTION.clawbackYears}년 안에 깨면 그동안 청약으로 줄어든 세금을 다시 내요.`,
    });
  }
  // 지원금이 있으면(v1.7: 총급여 기준 이하) 우대형 안내. 중소기업 여부를 묻지 않아서 계산하지 않고 안내만 (명세서 12.1)
  const { eligible, expectedSubsidy } = result.risks.policySaving;
  if (eligible && expectedSubsidy != null && expectedSubsidy > 0) {
    notes.push({
      key: "preferential",
      text:
        `중소기업에 다니면(총급여 ${formatManwon(YOUTH_FUTURE_SAVING.preferentialIncumbentMaxGrossSalary)} 이하 재직자, ` +
        `또는 ${formatManwon(YOUTH_FUTURE_SAVING.preferentialNewHireMaxGrossSalary)} 이하 신규 취업자) 청년미래적금 우대형으로 ` +
        `정부 지원금이 두 배가 돼요. 지금 계획 기준으로 약 ${roughWon(expectedSubsidy)}을 더 받아요.`,
    });
  }
  // 월세 세액공제를 받을 수 있는데(무주택 세대주, 넣은 세전 연봉이 기준 이하) 월세를 비워 두었으면
  const gross = input.income?.annualGrossSalary;
  const rentCreditPossible =
    input.person?.homelessHouseholder !== false && (gross == null || gross <= RENT_TAX_CREDIT.maxGrossSalary);
  if (!input.expenses?.monthlyRent && rentCreditPossible) {
    notes.push({
      key: "rent",
      text: `월세를 내고 있다면 입력 화면의 '그중 월세'에 넣어 보세요. 낸 월세의 ${RENT_TAX_CREDIT.lowRate}~${RENT_TAX_CREDIT.highRate}%를 돌려받을 수 있어요.`,
      link: { href: `${stepByKey("BASIC").href}#${fieldId("expenses.monthlyRent")}`, label: "그중 월세 넣기" },
    });
  }
  if (allocation.housingMonthly === 0 && allocation.pensionMonthly === 0 && tax.refundTotal === 0) {
    notes.push({
      key: "noProducts",
      text: "지금 계획에는 세금을 돌려받는 상품이 없어요. 아래 '어디에 얼마나'에서 청약·연금저축을 넣어 비교해 보세요.",
    });
  }

  return {
    intro: `연말정산으로 돌려받는 세금과 해지할 때 내는 세금이에요. 목표 시점(${goalWhen(result)})까지, 미래 ${result.paths.toLocaleString("ko-KR")}개의 평균이에요.`,
    cards,
    notes,
  };
}
