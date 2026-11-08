"use client";

/**
 * 결과 화면 '이 숫자는 얼마나 믿을 수 있나요?' (첫 결과 카드 아래, 명세서 v1.7 9.2).
 * 버튼을 누르면 서버에 가능성 범위 작업을 맡기고 1.5초마다 진행률을 보여 준 뒤, 범위를 띠로 그린다.
 * 화면을 떠나거나 결과를 다시 계산하면 묻기를 멈춘다. 04 결과에만 붙인다. 보여 줄 값은 robust.ts에서 고른다.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { ROBUST_TRIALS, SIMULATION_PATHS } from "@/config/policy";
import { formErrorMessage } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import type { RobustJobResult, SimulationInput } from "@/lib/types";
import { RobustFailed, robustView, runRobust, type RobustView } from "./robust";

type RobustState =
  | { kind: "idle" }
  | { kind: "running"; progress: number }
  | { kind: "done"; job: RobustJobResult }
  | { kind: "failed"; message: string };

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function RobustSection({ input, currentProbability }: { input: SimulationInput; currentProbability: number }) {
  const [state, setState] = useState<RobustState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setState({ kind: "running", progress: 0 });
    try {
      const job = await runRobust(input, {
        signal: abort.signal,
        onProgress: (progress) => setState({ kind: "running", progress }),
      });
      setState({ kind: "done", job });
    } catch (error) {
      if (isAbort(error)) return;
      const detail = error instanceof RobustFailed ? error.message : (formErrorMessage(error) ?? "잠시 후 다시 시도해 주세요.");
      setState({ kind: "failed", message: `계산하지 못했어요: ${detail}` });
    }
  };

  const view = state.kind === "done" ? robustView(state.job, currentProbability) : null;

  return (
    <section aria-labelledby="robust-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="robust-title" className="text-base font-bold">
        이 숫자는 얼마나 믿을 수 있나요?
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        물가·연봉·실직·급한 지출처럼 근거가 B~D 등급인 가정값을 {ROBUST_TRIALS}가지로 바꿔, 매번 미래{" "}
        {SIMULATION_PATHS.toLocaleString("ko-KR")}개를 다시 계산해요. 시간이 조금 걸려서 진행률을 보여 드려요.
      </p>

      {(state.kind === "idle" || state.kind === "failed") && (
        <Button className="mt-4" onClick={() => void start()}>
          {state.kind === "failed" ? "다시 계산" : "가능성 범위 계산"}
        </Button>
      )}

      {state.kind === "running" && (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label="가능성 범위 계산 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.progress}
            className="h-2 overflow-hidden rounded-full bg-canvas"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${state.progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted" aria-live="polite">
            계산 중… {state.progress}%
          </p>
        </div>
      )}

      {view && (
        <div className="mt-5" aria-live="polite">
          <RangeBar view={view} />
          <p className="mt-3 font-semibold">{view.message}</p>
          <p className="mt-1 text-sm text-muted">{view.detail}</p>
        </div>
      )}

      {state.kind === "failed" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      )}
    </section>
  );
}

const MARKER_ALIGN: Record<RobustView["markerAlign"], string> = {
  start: "translate-x-0",
  center: "-translate-x-1/2",
  end: "-translate-x-full",
};

/** 0~100% 막대 위에 가능성 범위(띠)와 지금 결과(세로 선) */
function RangeBar({ view }: { view: RobustView }) {
  return (
    <figure role="img" aria-label={view.label}>
      <div className="relative h-12">
        <div className="absolute inset-x-0 bottom-1 h-3 rounded-full border border-line bg-canvas">
          <div
            className="absolute inset-y-0 rounded-full bg-primary/35 ring-1 ring-primary/60"
            style={{ left: `${view.low}%`, width: `${Math.max(view.high - view.low, 0.5)}%` }}
          />
        </div>
        <div className="absolute inset-y-0" style={{ left: `${view.current}%` }}>
          <span className={`absolute left-0 top-0 whitespace-nowrap text-xs font-semibold text-ink ${MARKER_ALIGN[view.markerAlign]}`}>
            지금 {formatPercent(view.current)}
          </span>
          <span className="absolute bottom-0 left-0 h-6 w-0.5 -translate-x-1/2 rounded bg-ink" />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </figure>
  );
}
