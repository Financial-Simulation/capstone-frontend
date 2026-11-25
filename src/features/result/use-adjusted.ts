"use client";

/**
 * '계획 바꿔 보기' 막대를 움직이면 바꾼 계획으로 결과 전체를 다시 계산한다: POST /simulate(+adjustments).
 * 막대를 끄는 동안 요청이 쏟아지지 않게 마지막으로 움직이고 DELAY_MS 뒤에 한 번 부르고, 앞 요청은 멈춘다.
 * 새 결과가 올 때까지는 앞 결과를 그대로 보여 준다 (그래프가 깜빡이지 않게). 바꾼 값이 없으면 null.
 */
import { useEffect, useState } from "react";
import { simulateScenario } from "@/features/plan/action-comparison";
import { api, errorMessage, isAbortError } from "@/lib/api";
import type { Adjustments, SimulateRequest, SimulationInput, YearMonth } from "@/lib/types";

export const DELAY_MS = 300;

type Calculation = Awaited<ReturnType<typeof simulateScenario>>;

export function useAdjustedResult(input: SimulationInput, adjustments: Adjustments, seed: number, scenario?: { moveMonth?: YearMonth }) {
  const changed = Object.keys(adjustments).length > 0;
  const scope = JSON.stringify({ input, seed, scenario });
  const key = changed ? JSON.stringify({ input, adjustments, seed }) : null;
  const isScenario = scenario !== undefined;
  const moveMonth = scenario?.moveMonth;
  const [state, setState] = useState<{ key: string; scope: string; calculation: Calculation | null; error: string | null } | null>(null);

  useEffect(() => {
    if (key === null) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const body = JSON.parse(key) as SimulateRequest;
      const request = isScenario
        ? simulateScenario(body, moveMonth, abort.signal)
        : api.simulate(body, { signal: abort.signal }).then(({ data }) => ({ result: data, move: null }));
      request.then(
        (calculation) => {
          if (!abort.signal.aborted) setState({ key, scope, calculation, error: null });
        },
        (error: unknown) => {
          if (!abort.signal.aborted && !isAbortError(error)) {
            setState((prev) => ({ key, scope, calculation: prev?.scope === scope ? prev.calculation : null, error: errorMessage(error) }));
          }
        },
      );
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [key, scope, isScenario, moveMonth]);

  const current = state?.scope === scope ? state : null;
  if (key === null) return { result: null, move: null, loading: false, error: null };
  return {
    result: current?.calculation?.result ?? null,
    move: current?.calculation?.move ?? null,
    loading: current?.key !== key,
    error: current?.key === key ? current.error : null,
  };
}
