"use client";

/**
 * '계획 바꿔 보기' 막대를 움직이면 바꾼 계획으로 결과 전체를 다시 계산한다: POST /simulate(+adjustments).
 * 막대를 끄는 동안 요청이 쏟아지지 않게 마지막으로 움직이고 DELAY_MS 뒤에 한 번 부르고, 앞 요청은 멈춘다.
 * 새 결과가 올 때까지는 앞 결과를 그대로 보여 준다 (그래프가 깜빡이지 않게). 바꾼 값이 없으면 null.
 */
import { useEffect, useState } from "react";
import { api, errorMessage, isAbortError } from "@/lib/api";
import type { Adjustments, SimulateResult, SimulationInput } from "@/lib/types";

export const DELAY_MS = 300;

export function useAdjustedResult(input: SimulationInput, adjustments: Adjustments) {
  const changed = Object.keys(adjustments).length > 0;
  const key = changed ? JSON.stringify({ input, adjustments }) : null;
  const [state, setState] = useState<{ key: string; result: SimulateResult | null; error: string | null } | null>(null);

  useEffect(() => {
    if (key === null) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const body = JSON.parse(key) as { input: SimulationInput; adjustments: Adjustments };
      api.simulate(body, { signal: abort.signal }).then(
        ({ data }) => setState({ key, result: data, error: null }),
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

  if (key === null) return { result: null, loading: false, error: null };
  return { result: state?.result ?? null, loading: state?.key !== key, error: state?.key === key ? state.error : null };
}
