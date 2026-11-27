import { describe, expect, it } from "vitest";
import metaData from "@/mocks/data/meta.json";
import type { MetaResult } from "@/lib/types";
import { BUILT_IN_RATES, PENDING_RATES, createRateDefaultsStore, generalSavingBasis, rateDefaultsFrom } from "./rate-defaults";

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

describe("기본 금리 받기 (화면들이 나눠 쓰는 저장소)", () => {
  /** 부를 때마다 응답을 시험에서 직접 정하는 가짜 /meta */
  function fakeMeta() {
    const calls: { resolve: (meta: MetaResult) => void; reject: (error: unknown) => void }[] = [];
    const fetchMeta = () => new Promise<MetaResult>((resolve, reject) => calls.push({ resolve, reject }));
    return { calls, fetchMeta };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("받는 중에는 코드 기본값 · ready false, 받으면 구독 중인 화면에 서버 값 (한 번만 부른다)", async () => {
    const { calls, fetchMeta } = fakeMeta();
    const store = createRateDefaultsStore(fetchMeta);
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.snapshot("real").rates.loanRates.JEONSE));
    store.load("real");
    store.load("real");
    expect(calls).toHaveLength(1);
    expect(store.snapshot("real")).toMatchObject({ ready: false, rates: BUILT_IN_RATES });
    calls[0].resolve(live);
    await settle();
    expect(store.snapshot("real").ready).toBe(true);
    expect(seen.at(-1)).toBe(4.63);
    store.load("real");
    expect(calls).toHaveLength(1);
  });

  it("못 받으면 코드 기본값으로 ready, 다음 load에서 다시 받고 받으면 이미 열린 화면도 바뀐다", async () => {
    const { calls, fetchMeta } = fakeMeta();
    const store = createRateDefaultsStore(fetchMeta);
    let latest = store.snapshot("real");
    store.subscribe(() => {
      latest = store.snapshot("real");
    });
    store.load("real");
    calls[0].reject(new Error("서버 꺼짐"));
    await settle();
    expect(latest).toMatchObject({ ready: true, rates: BUILT_IN_RATES });
    store.load("real");
    expect(calls).toHaveLength(2);
    calls[1].resolve(live);
    await settle();
    expect(latest.rates.loanRates.JEONSE).toBe(4.63);
  });

  it("API 모드마다 따로 받는다 (목업에서 받은 값을 실제 모드에 쓰지 않음)", async () => {
    const { calls, fetchMeta } = fakeMeta();
    const store = createRateDefaultsStore(fetchMeta);
    store.load("mock");
    calls[0].resolve(meta);
    await settle();
    expect(store.snapshot("mock").ready).toBe(true);
    expect(store.snapshot("real")).toBe(PENDING_RATES);
    store.load("real");
    expect(calls).toHaveLength(2);
    calls[1].resolve(live);
    await settle();
    expect(store.snapshot("real").rates.loanRates.JEONSE).toBe(4.63);
    expect(store.snapshot("mock").rates.loanRates.JEONSE).toBe(4.3);
  });
});
