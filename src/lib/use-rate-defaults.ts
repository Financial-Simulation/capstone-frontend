"use client";

/**
 * 비운 금리 칸 기본값을 서버(GET /meta)에서 한 번 받아 여러 화면이 나눠 쓴다. 탭을 새로 열면 다시 받는다.
 * 받기 전에는 코드 기본값으로 그리고, 받으면 서버 값으로 다시 그린다. 못 받으면 코드 기본값 그대로 (lib/rate-defaults.ts).
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BUILT_IN_RATES, rateDefaultsFrom, type RateDefaults } from "@/lib/rate-defaults";

let loading: Promise<RateDefaults> | null = null;

function loadRateDefaults(): Promise<RateDefaults> {
  loading ??= api.meta().then(
    ({ data }) => rateDefaultsFrom(data),
    () => {
      loading = null; // 다음 화면에서 다시 받아 본다
      return BUILT_IN_RATES;
    },
  );
  return loading;
}

export function useRateDefaults(): RateDefaults {
  const [rates, setRates] = useState<RateDefaults>(BUILT_IN_RATES);
  useEffect(() => {
    let alive = true;
    loadRateDefaults().then((loaded) => {
      if (alive) setRates(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);
  return rates;
}
