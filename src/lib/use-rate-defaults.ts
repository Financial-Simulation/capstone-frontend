"use client";

/**
 * 비운 금리 칸 기본값(서버 GET /meta의 defaultRates)을 여러 화면이 나눠 쓴다. 탭을 새로 열면 다시 받는다.
 *  - 받기 전 · 못 받으면 코드 기본값(BUILT_IN_RATES). ready는 받았거나 못 받아서 더 기다리지 않을 때 true
 *  - 받는 대로 이 훅을 쓰는 화면이 모두 함께 바뀐다. 못 받았으면 다음에 이 훅을 쓰는 화면이 열릴 때 다시 받는다
 *  - API 모드(목업 스위치)마다 따로 받는다 (lib/rate-defaults.ts createRateDefaultsStore)
 */
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { useApiModes } from "@/lib/hooks";
import { PENDING_RATES, createRateDefaultsStore, type RateDefaultsState } from "@/lib/rate-defaults";

const store = createRateDefaultsStore(async () => (await api.meta()).data);

export function useRateDefaults(): RateDefaultsState {
  const mode = useApiModes().modes.meta;
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.snapshot(mode),
    () => PENDING_RATES,
  );
  useEffect(() => {
    store.load(mode);
  }, [mode]);
  return state;
}
