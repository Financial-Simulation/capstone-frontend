/**
 * 비운 금리 칸 기본값 (연 %): 일반 적금, 대출 종류별.
 * 서버가 기준이다 (GET /meta의 defaultRates). 백엔드에 ECOS 키가 있으면 한국은행 최신 금리라 달마다 바뀐다.
 * /meta를 받기 전이나 못 받았을 때(예전 백엔드 · 오류)는 config/policy.ts의 코드 기본값을 쓴다.
 * 화면에서는 useRateDefaults()(lib/use-rate-defaults.ts)로 읽는다. 받는 일은 아래 createRateDefaultsStore가 맡는다.
 */
import { GENERAL_SAVING_RATE_BASIS, INPUT_DEFAULTS, LOAN_DEFAULTS } from "@/config/policy";
import type { DefaultRates, LoanType, MetaResult } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";

export type RateDefaults = Pick<DefaultRates, "generalSavingRate" | "loanRates" | "asOf">;

/** 코드 기본값. 백엔드가 ECOS 키 없이 쓰는 값과 같다 (policy.test.ts가 /meta 사본과 대조) */
export const BUILT_IN_RATES: RateDefaults = {
  generalSavingRate: INPUT_DEFAULTS.generalSavingRate,
  loanRates: Object.fromEntries(
    (Object.keys(LOAN_DEFAULTS) as LoanType[]).map((type) => [type, LOAN_DEFAULTS[type].annualRate]),
  ) as Record<LoanType, number>,
  asOf: null,
};

/** /meta 응답 → 기본 금리. defaultRates가 없으면(예전 백엔드) 코드 기본값, 빠진 대출 종류도 코드 기본값 */
export function rateDefaultsFrom(meta: MetaResult | null | undefined): RateDefaults {
  const server = meta?.defaultRates;
  if (!server) return BUILT_IN_RATES;
  return {
    generalSavingRate: server.generalSavingRate,
    loanRates: { ...BUILT_IN_RATES.loanRates, ...server.loanRates },
    asOf: server.asOf ?? null,
  };
}

/** 일반 적금 기본 금리의 근거: '한국은행 2026년 10월 정기적금 평균' 또는 '2025년 은행 정기적금 평균' */
export function generalSavingBasis(rates: RateDefaults): string {
  return rates.asOf ? `한국은행 ${formatYearMonth(rates.asOf)} 정기적금 평균` : GENERAL_SAVING_RATE_BASIS;
}

export interface RateDefaultsState {
  rates: RateDefaults;
  /** 서버 값을 받았거나 못 받아서(코드 기본값) 더 기다리지 않으면 true. 받는 중이면 false */
  ready: boolean;
}

/** 받는 중 (서버 렌더링 · 첫 화면도 이 값) */
export const PENDING_RATES: RateDefaultsState = { rates: BUILT_IN_RATES, ready: false };

/**
 * /meta의 기본 금리를 API 모드(mock · real)마다 한 번 받아 두고, 받을 때마다 구독자(화면)에게 알린다.
 *  - 다른 모드에서 받은 값은 쓰지 않는다 (개발 점검 화면에서 목업 스위치를 바꾼 경우)
 *  - 받는 중이면 다시 부르지 않는다. 못 받았으면 다음 load에서 다시 받고, 받으면 이미 열린 화면도 같이 바뀐다
 * 화면에서는 useRateDefaults()(lib/use-rate-defaults.ts)로 쓴다.
 */
export function createRateDefaultsStore(fetchMeta: () => Promise<MetaResult | null | undefined>) {
  const states = new Map<string, RateDefaultsState & { failed: boolean }>();
  const listeners = new Set<() => void>();
  const set = (mode: string, state: RateDefaultsState & { failed: boolean }) => {
    states.set(mode, state);
    for (const listener of listeners) listener();
  };
  return {
    snapshot(mode: string): RateDefaultsState {
      return states.get(mode) ?? PENDING_RATES;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load(mode: string): void {
      const state = states.get(mode);
      if (state && !state.failed) return;
      set(mode, { ...PENDING_RATES, failed: false });
      fetchMeta().then(
        (meta) => set(mode, { rates: rateDefaultsFrom(meta), ready: true, failed: false }),
        () => set(mode, { rates: BUILT_IN_RATES, ready: true, failed: true }),
      );
    },
  };
}
