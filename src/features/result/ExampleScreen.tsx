"use client";

/**
 * 04-E 예시 결과. GET /examples의 S1~S3 중 하나로 /simulate를 부른다.
 * 내 입력(simInput.v1)은 바꾸지 않는다: 예시 값은 내 입력으로 옮기지 않고, '내 정보로 시작하기'는
 * 00 '시뮬레이션 시작하기'와 같은 흐름(저장값이 있으면 '이어서 할까요?')으로 01-1에 간다.
 * 위쪽에 '예시 데이터로 계산한 결과예요' 배너가 항상 있다.
 * 백엔드가 꺼져 있으면 /examples 대신 프론트에 들어 있는 같은 예시 입력을 쓴다 (데모가 멈추지 않게).
 */
import { useEffect, useState } from "react";
import { ResultView } from "./ResultView";
import { Computing, Failed } from "./StateViews";
import { useResult } from "./use-result";
import { useStartFlow } from "@/features/input/start-flow";
import { Button } from "@/components/ui";
import { api, isAbortError } from "@/lib/api";
import { formatManwon, formatWon } from "@/lib/format";
import type { ExampleInput, ExamplesResult } from "@/lib/types";
import { formatDuration, monthsBetween } from "@/lib/year-month";
import examplesData from "@/mocks/data/examples.json";

const BUNDLED = (examplesData as unknown as ExamplesResult).examples;

type ListState = { examples: ExampleInput[]; fallback: boolean } | null;

function useExamples(): ListState {
  const [state, setState] = useState<ListState>(null);
  useEffect(() => {
    const abort = new AbortController();
    api.examples({ signal: abort.signal }).then(
      ({ data }) => setState({ examples: data.examples, fallback: false }),
      (error: unknown) => {
        if (!isAbortError(error)) setState({ examples: BUNDLED, fallback: true });
      },
    );
    return () => abort.abort();
  }, []);
  return state;
}

function describe(example: ExampleInput): string {
  const { person, income, goal, startMonth, events } = example.input;
  const months = monthsBetween(startMonth, goal.targetDate);
  const names = (events ?? []).map((e) => e.name).filter((name): name is string => Boolean(name));
  return [
    `${person.age}세 · ${person.employmentType === "CONTRACT" ? "계약직" : "정규직"}`,
    `월 실수령액 ${formatWon(income.monthlyNetIncome)}`,
    `${formatDuration(months)} 뒤 ${formatManwon(goal.targetAmount)} 목표`,
    ...(names.length > 0 ? [`예정된 일: ${names.join(", ")}`] : []),
  ].join(" · ");
}

export function ExampleScreen() {
  const list = useExamples();
  const [selected, setSelected] = useState("S1");
  const example = list?.examples.find((e) => e.key === selected) ?? list?.examples[0] ?? null;
  const result = useResult(example?.input ?? null);
  const { start, dialogs } = useStartFlow();

  return (
    <div className="space-y-6">
      <div role="note" className="rounded-lg bg-mock-soft px-4 py-3 text-sm font-semibold text-mock">
        예시 데이터로 계산한 결과예요. 내가 입력한 값은 바뀌지 않아요.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">04-E</p>
          <p className="text-2xl font-bold tracking-tight">예시 결과</p>
        </div>
        <Button onClick={start}>내 정보로 시작하기</Button>
      </div>

      {list && (
        <div>
          <div role="group" aria-label="예시 사용자" className="flex flex-wrap gap-2">
            {list.examples.map((e) => (
              <button
                key={e.key}
                type="button"
                aria-pressed={e.key === example?.key}
                onClick={() => setSelected(e.key)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold",
                  e.key === example?.key
                    ? "border-primary bg-primary text-white"
                    : "border-line-strong bg-surface text-ink-soft hover:border-primary",
                ].join(" ")}
              >
                {e.label}
              </button>
            ))}
          </div>
          {example && <p className="mt-2 text-sm text-ink-soft">{describe(example)}</p>}
          {list.fallback && (
            <p className="mt-1 text-xs text-muted">백엔드에 연결하지 못해 프론트에 들어 있는 예시 입력(백엔드와 같은 값)을 썼어요.</p>
          )}
        </div>
      )}

      {!list || result.status === "computing" || result.status === "idle" ? (
        <Computing />
      ) : result.status === "failed" || !result.data ? (
        <Failed error={result.error} onRetry={result.retry} canFixInput={false} />
      ) : (
        <>
          <ResultView data={result.data} input={example?.input ?? {}} example />
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <Button variant="secondary" onClick={start}>
              내 정보로 시작하기
            </Button>
            <p className="text-sm text-muted">예시 값은 내 입력으로 옮겨지지 않아요.</p>
          </div>
        </>
      )}
      {dialogs}
    </div>
  );
}
