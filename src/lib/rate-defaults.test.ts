import { describe, expect, it } from "vitest";
import metaData from "@/mocks/data/meta.json";
import type { MetaResult } from "@/lib/types";
import { BUILT_IN_RATES, generalSavingBasis, rateDefaultsFrom } from "./rate-defaults";

const meta = metaData as MetaResult;

/** 백엔드에 ECOS 키가 있을 때의 /meta (2026년 10월 한국은행 값) */
const live: MetaResult = {
  ...meta,
  defaultRates: {
    generalSavingRate: 3.08,
    loanRates: { STUDENT: 1.7, JEONSE: 4.63, CREDIT: 6.43, MORTGAGE: 4.98, OTHER: 5.0 },
    asOf: "2026-10",
    source: "한국은행 ECOS 예금은행 가중평균금리 (신규취급액 기준). 학자금·기타 대출은 코드 기본값",
  },
};

describe("비운 금리 칸 기본값", () => {
  it("서버가 한국은행 값을 주면 그 값과 기준 달", () => {
    const rates = rateDefaultsFrom(live);
    expect(rates.generalSavingRate).toBe(3.08);
    expect(rates.loanRates.JEONSE).toBe(4.63);
    expect(rates.asOf).toBe("2026-10");
    expect(generalSavingBasis(rates)).toBe("한국은행 2026년 10월 정기적금 평균");
  });

  it("ECOS 키가 없는 서버 · 못 받음 · 예전 백엔드(칸 없음)는 코드 기본값", () => {
    expect(rateDefaultsFrom(meta)).toEqual(BUILT_IN_RATES);
    expect(rateDefaultsFrom(null)).toBe(BUILT_IN_RATES);
    expect(rateDefaultsFrom({ ...meta, defaultRates: undefined })).toBe(BUILT_IN_RATES);
    expect(generalSavingBasis(BUILT_IN_RATES)).toBe("2025년 은행 정기적금 평균");
  });

  it("서버가 빠뜨린 대출 종류는 코드 기본값으로 채운다", () => {
    const partial = {
      ...meta,
      defaultRates: { ...live.defaultRates!, loanRates: { JEONSE: 4.63 } as Record<string, number> },
    } as MetaResult;
    const rates = rateDefaultsFrom(partial);
    expect(rates.loanRates.JEONSE).toBe(4.63);
    expect(rates.loanRates.MORTGAGE).toBe(BUILT_IN_RATES.loanRates.MORTGAGE);
  });
});
