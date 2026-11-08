import { describe, expect, it } from "vitest";
import metaData from "@/mocks/data/meta.json";
import { formatKoreanWon } from "@/lib/format";
import { HOUSING_SUBSCRIPTION, INPUT_DEFAULTS, PENSION_SAVING, SIMULATION_PATHS, YOUTH_FUTURE_SAVING } from "./policy";

/** 서버 /meta(params.json)의 근거 문장. 백엔드 숫자가 바뀌면 이 시험이 먼저 깨져서 config를 같이 고치게 한다 */
const evidence = (key: string) => metaData.parameters.find((p) => p.key === key)!.value;

describe("config/policy.ts가 서버 근거(/meta)와 같은지", () => {
  it("경로 수", () => {
    expect(SIMULATION_PATHS).toBe(metaData.paths);
  });

  it("청년미래적금 월 한도 · 정부 지원금 소득 기준 · 가입 소득 기준", () => {
    expect(evidence("youthFutureSaving")).toContain(`월 ${formatKoreanWon(YOUTH_FUTURE_SAVING.monthlyLimit)} 한도`);
    expect(evidence("youthFutureMatchIncome")).toContain(`총급여 ${formatKoreanWon(YOUTH_FUTURE_SAVING.matchMaxGrossSalary)} 이하`);
    expect(evidence("youthFutureMatchIncome")).toContain(`가입은 ${formatKoreanWon(YOUTH_FUTURE_SAVING.maxGrossSalary)} 이하`);
  });

  it("일반 적금 금리 기본값", () => {
    expect(evidence("rates")).toContain(`${INPUT_DEFAULTS.generalSavingRate}%`);
  });

  it("청약 추징 기간 · 연금저축 세액공제 한도 · 중도 인출 (세금 · 배분 안내 문장)", () => {
    expect(evidence("housingSubscription")).toContain(`${HOUSING_SUBSCRIPTION.clawbackYears}년 안 해지 추징`);
    expect(evidence("pensionSaving")).toContain(`세액공제 연 ${formatKoreanWon(PENSION_SAVING.creditAnnualCap)} 한도`);
    expect(evidence("pensionSaving")).toContain(`${PENSION_SAVING.withdrawalAge}세 전 인출 ${PENSION_SAVING.earlyWithdrawalTaxRate}%`);
  });

  it("청년미래적금 정부 지원금 비율", () => {
    expect(evidence("youthFutureSaving")).toContain(`지원금 ${YOUTH_FUTURE_SAVING.matchRate}%`);
  });
});
