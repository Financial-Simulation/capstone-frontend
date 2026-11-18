"use client";

/**
 * 받을 수 있는 혜택 (POST /benefits). 바꾼 계획(막대) · 질문 답이 바뀌면 DELAY_MS 뒤에 한 번 다시 부르고, 앞 요청은 멈춘다.
 * 새 결과가 올 때까지 앞 결과를 그대로 보여 준다.
 */
import { useEffect, useState } from "react";
import { DELAY_MS } from "@/features/result/use-adjusted";
import { api, errorMessage, isAbortError, type ApiResult } from "@/lib/api";
import type { Adjustments, BenefitsResult, Eligibility, SimulationInput } from "@/lib/types";

export function useBenefits(input: SimulationInput, adjustments: Adjustments, eligibility: Eligibility) {
  const key = JSON.stringify({ input, adjustments, eligibility });
  const [state, setState] = useState<{ key: string; result: ApiResult<BenefitsResult> | null; error: string | null } | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const body = JSON.parse(key) as { input: SimulationInput; adjustments: Adjustments; eligibility: Eligibility };
      const changed = Object.keys(body.adjustments).length > 0;
      api.benefits({ input: body.input, adjustments: changed ? body.adjustments : undefined, eligibility: body.eligibility }, { signal: abort.signal }).then(
        (result) => setState({ key, result, error: null }),
        (error: unknown) => {
          if (!isAbortError(error)) setState((prev) => ({ key, result: prev?.result ?? null, error: errorMessage(error) }));
        },
      );
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [key]);

  return { result: state?.result ?? null, loading: state?.key !== key, error: state?.key === key ? state.error : null };
}
