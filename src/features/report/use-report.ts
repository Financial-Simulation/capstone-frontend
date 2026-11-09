"use client";

/**
 * 리포트 데이터: POST /reports 한 번 (내 입력 + 담은 계획). 숫자는 결과 화면과 같다 (같은 입력 · 같은 seed).
 * 근거 등급 설명은 GET /meta의 gradeLegend를 따로 부르고, 못 받아도 리포트는 보여 준다.
 */
import { useCallback, useEffect, useState } from "react";
import { api, isAbortError, type ApiResult } from "@/lib/api";
import type { PlanRequest, ReportResult, SimulationInput } from "@/lib/types";

export type ReportStatus = "idle" | "loading" | "done" | "failed";

export function useReport(input: SimulationInput | null, plans: PlanRequest[]) {
  const body = input ? JSON.stringify({ input, plans }) : null;
  const [attempt, setAttempt] = useState(0);
  const key = body === null ? null : `${attempt}:${body}`;

  const [report, setReport] = useState<{ key: string; result?: ApiResult<ReportResult>; error?: unknown } | null>(null);
  const [gradeLegend, setGradeLegend] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (key === null || body === null) return;
    const abort = new AbortController();
    const request = JSON.parse(body) as { input: SimulationInput; plans: PlanRequest[] };
    api.report({ ...request, seed: null }, { signal: abort.signal }).then(
      (result) => setReport({ key, result }),
      (error: unknown) => {
        if (!isAbortError(error)) setReport({ key, error });
      },
    );
    return () => abort.abort();
  }, [key, body]);

  useEffect(() => {
    const abort = new AbortController();
    api.meta({ signal: abort.signal }).then(
      ({ data }) => setGradeLegend(data.gradeLegend ?? null),
      () => {},
    );
    return () => abort.abort();
  }, []);

  const status: ReportStatus = key === null ? "idle" : report?.key === key ? (report.result ? "done" : "failed") : "loading";

  /** 실패 → '다시 계산' */
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    status,
    result: status === "done" ? (report?.result ?? null) : null,
    error: status === "failed" ? report?.error : null,
    gradeLegend,
    retry,
  };
}
