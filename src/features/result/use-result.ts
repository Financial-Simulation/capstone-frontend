"use client";

/**
 * 결과 계산: 입력이 정해지면 한 번에 부른다.
 *  - POST /simulate (본 결과)
 *  - POST /reverse (이렇게 바꿔 보세요 · 70% 역산)
 *  - POST /inputs/validate (청년미래적금 비대상 이유만 꺼내 쓴다)
 * 같은 입력 · 같은 seed면 같은 결과라서, 화면에 다시 들어오면 다시 불러도 숫자는 같다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, isAbortError, type ApiResult } from "@/lib/api";
import type { ReverseResult, SimulateResult, SimulationInput } from "@/lib/types";

/** 결과 본문(ResultView)에 넘기는 값 */
export interface ResultData {
  sim: ApiResult<SimulateResult>;
  reverse: ApiResult<ReverseResult> | null;
  /** 개선 포인트 계산 중 */
  reversePending: boolean;
  /** 청년미래적금 비대상 이유 (입력 검사의 policySaving.reason) */
  policyReason: string | null;
}

export type ResultStatus = "idle" | "computing" | "done" | "failed" | "cancelled";

export function useResult(input: SimulationInput | null) {
  const inputKey = input ? JSON.stringify(input) : null;
  const [attempt, setAttempt] = useState(0);
  const key = inputKey === null ? null : `${attempt}:${inputKey}`;

  const [sim, setSim] = useState<{ key: string; result?: ApiResult<SimulateResult>; error?: unknown } | null>(null);
  const [rev, setRev] = useState<{ key: string; result: ApiResult<ReverseResult> | null } | null>(null);
  const [policy, setPolicy] = useState<{ key: string; reason: string | null } | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (key === null || inputKey === null) return;
    const abort = new AbortController();
    abortRef.current = abort;
    const body = JSON.parse(inputKey) as SimulationInput;
    const { signal } = abort;

    api.simulate({ input: body }, { signal }).then(
      (result) => setSim({ key, result }),
      (error: unknown) => {
        if (!isAbortError(error)) setSim({ key, error });
      },
    );
    api.reverse({ input: body, targetProbability: 70 }, { signal }).then(
      (result) => setRev({ key, result }),
      (error: unknown) => {
        if (!isAbortError(error)) setRev({ key, result: null });
      },
    );
    api.validate({ step: "ALL", input: body }, { signal }).then(
      ({ data }) => setPolicy({ key, reason: data.policySaving?.reason ?? null }),
      (error: unknown) => {
        if (!isAbortError(error)) setPolicy({ key, reason: null });
      },
    );
    return () => abort.abort();
  }, [key, inputKey]);

  // 결과가 왔으면 '취소'보다 앞선다: 취소하고 나갔다가 다시 들어오면(화면이 살아 있으면 효과가 다시 돈다) 새로 계산한 결과를 보여 준다
  const status: ResultStatus =
    key === null
      ? "idle"
      : sim?.key === key
        ? sim.result
          ? "done"
          : "failed"
        : cancelled === key
          ? "cancelled"
          : "computing";

  const data: ResultData | null =
    status === "done" && sim?.result
      ? {
          sim: sim.result,
          reverse: rev?.key === key ? rev.result : null,
          reversePending: rev?.key !== key,
          policyReason: policy?.key === key ? policy.reason : null,
        }
      : null;

  /** 계산 중 '취소' */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (key) setCancelled(key);
  }, [key]);

  /** 계산 실패 → '다시 계산' */
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, data, error: status === "failed" ? sim?.error : null, cancel, retry };
}
