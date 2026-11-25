"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { PresetCard, usePresets } from "@/features/input/scenario/ScenarioStep";
import { useApiTask } from "@/lib/hooks";
import { checkCrossRules, checkFields, checkRequired } from "@/lib/rules";
import type { SimulationInput, SimulationInputDraft } from "@/lib/types";
import { changedMoveMonth, comparisonEvents, simulateScenario } from "./action-comparison";

export type ActionComparisonResult = Awaited<ReturnType<typeof simulateScenario>> & {
  input: SimulationInput;
};

export function ActionComparison({ input, seed, active, onResult }: {
  input: SimulationInput;
  seed: number;
  active: boolean;
  onResult: (result: ActionComparisonResult | null) => void;
}) {
  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState<SimulationInputDraft>(input);
  const [attempted, setAttempted] = useState(false);
  const { state, retry } = usePresets(started);
  const { busy, error, run, clearError } = useApiTask<"actions">();
  const errors = attempted ? { ...checkRequired("EVENTS", draft), ...checkFields(draft) } : {};
  const cross = attempted ? checkCrossRules(draft) : null;
  const changed = JSON.stringify(draft.events ?? []) !== JSON.stringify(input.events ?? []);

  function update(patch: (prev: SimulationInputDraft) => SimulationInputDraft) {
    onResult(null);
    setDraft(patch);
  }

  function reset() {
    setDraft(input);
    setAttempted(false);
    clearError();
    onResult(null);
  }

  return (
    <details className="mt-4 rounded-lg border border-line bg-canvas" onToggle={(event) => {
      if (event.currentTarget.open) setStarted(true);
    }}>
      <summary className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-bold">시나리오 바꿔 보기</summary>
      <div className="space-y-3 px-3 pb-3">
        <p className="text-sm text-ink-soft">새 일을 추가하거나 시점과 금액을 바꿔 비교해 보세요. 저장한 계획은 그대로예요.</p>
        {state.status === "loading" && <p role="status" className="text-sm text-muted">목록을 불러오는 중…</p>}
        {state.status === "error" && (
          <div role="alert" className="space-y-2 text-sm text-danger">
            <p>{state.message}</p>
            <Button size="sm" variant="secondary" onClick={retry}>다시 불러오기</Button>
          </div>
        )}
        {state.status === "ok" && (
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!changed || busy) return;
            setAttempted(true);
            const events = comparisonEvents(draft.events ?? []);
            if (!events || Object.keys(checkFields(draft)).length || Object.keys(checkRequired("EVENTS", draft)).length || checkCrossRules(draft)) return;
            onResult(null);
            void run("actions", "바꾼 계획을 비교하지 못했어요", async (signal) => {
              const next = { ...input, events };
              const request = { input: next, seed };
              const month = changedMoveMonth(input.events ?? [], events);
              const comparison = await simulateScenario(request, month, signal);
              if (!signal.aborted) {
                onResult({ input: next, ...comparison });
              }
            });
          }}>
            <fieldset disabled={busy !== null} className="space-y-3">
              <ul className="space-y-2">
                {state.presets.map((preset) => (
                  <li key={preset.presetKey}>
                    <PresetCard
                      preset={preset}
                      start={input.startMonth}
                      idPrefix="action-"
                      stackFields
                      form={{
                        input: draft, update,
                        error: (path, options) => errors[path] ?? (options?.prefix ? Object.entries(errors).find(([key]) => key.startsWith(`${path}.`))?.[1] : undefined),
                      }}
                    />
                  </li>
                ))}
              </ul>
              {state.source === "mock" && <p className="text-xs text-mock">목업 목록이에요. 비교하려면 실제 계산 서버에 연결해야 해요.</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!changed || busy !== null}>{busy ? "계산 중…" : "그래프에 추가하기"}</Button>
                <Button type="button" variant="secondary" disabled={!changed && !active} onClick={reset}>시나리오 초기화</Button>
              </div>
            </fieldset>
            {(cross || error) && <p role="alert" className="mt-2 text-sm text-danger">{cross?.message ?? error}</p>}
          </form>
        )}
      </div>
    </details>
  );
}
