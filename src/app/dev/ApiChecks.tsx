"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { ENDPOINT_LABELS, isAbortError } from "@/lib/api";
import { useApiModes, useHydrated } from "@/lib/hooks";
import { CHECKS, type Check, type CheckErrorView, type CheckRecord } from "./checks";

type RunState =
  | { status: "running"; progress?: string }
  | { status: "done"; record: CheckRecord }
  | { status: "crashed"; message: string };

/** 점검을 하나씩 또는 전부(차례로) 보내고, 기대와 같은지 보여 준다 */
export function ApiChecks() {
  const { modes } = useApiModes();
  const hydrated = useHydrated();
  const [states, setStates] = useState<Record<string, RunState>>({});
  const [runningAll, setRunningAll] = useState(false);
  const controllers = useRef(new Set<AbortController>());
  const unmounted = useRef(false);

  // 화면을 떠나면 보내던 요청과 1초 간격 확인을 멈춘다
  useEffect(() => {
    const active = controllers.current;
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      for (const controller of active) controller.abort();
    };
  }, []);

  const setState = (id: string, state: RunState) => setStates((prev) => ({ ...prev, [id]: state }));
  const clearState = (id: string) =>
    setStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  async function runOne(check: Check) {
    const controller = new AbortController();
    controllers.current.add(controller);
    setState(check.id, { status: "running" });
    try {
      const record = await check.execute(controller.signal, (progress) => {
        if (!controller.signal.aborted) setState(check.id, { status: "running", progress });
      });
      setState(check.id, { status: "done", record });
    } catch (error) {
      // 화면을 떠나 멈춘 점검은 '보내는 중'으로 남기지 않는다
      if (isAbortError(error)) clearState(check.id);
      else setState(check.id, { status: "crashed", message: String(error) });
    } finally {
      controllers.current.delete(controller);
    }
  }

  async function runAll() {
    setRunningAll(true);
    setStates({});
    try {
      for (const check of CHECKS) {
        if (unmounted.current) break;
        await runOne(check);
      }
    } finally {
      setRunningAll(false);
    }
  }

  const records = Object.values(states).filter((s): s is Extract<RunState, { status: "done" }> => s.status === "done");
  const passed = records.filter((s) => s.record.pass).length;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">API 점검</h2>
          <p className="mt-1 text-sm text-ink-soft">
            요청마다 기대한 응답이 오는지 봐요. 오류 점검은 서버 오류가 화면의 어느 칸·카드에 붙는지(toFieldErrors)까지 보여 줘요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {records.length > 0 && (
            <span className="text-sm font-semibold" aria-live="polite">
              기대대로 {passed} / {records.length}
            </span>
          )}
          <Button onClick={() => void runAll()} disabled={runningAll}>
            {runningAll ? "점검하는 중…" : "전부 실행"}
          </Button>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-line">
        {CHECKS.map((check) => {
          const source = hydrated ? modes[check.endpoint] : null;
          const state = states[check.id];
          const running = state?.status === "running";
          return (
            <li key={check.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{check.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted">{ENDPOINT_LABELS[check.endpoint]}</p>
                  {source && <p className="mt-1 text-sm text-ink-soft">기대: {check.expect(source)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {source && <Badge tone={source === "mock" ? "mock" : "primary"}>{source}</Badge>}
                  <Button size="sm" variant="secondary" onClick={() => void runOne(check)} disabled={running || runningAll}>
                    {running ? "보내는 중…" : "실행"}
                  </Button>
                </div>
              </div>
              {state?.status === "running" && state.progress && (
                <p className="mt-2 text-sm text-muted" aria-live="polite">
                  {state.progress}
                </p>
              )}
              {state?.status === "crashed" && (
                <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">점검 코드 오류: {state.message}</p>
              )}
              {state?.status === "done" && <CheckResult record={state.record} />}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function CheckResult({ record }: { record: CheckRecord }) {
  return (
    <div
      className={`mt-3 rounded-lg border px-3 py-2.5 text-sm ${record.pass ? "border-line bg-canvas" : "border-danger-line bg-danger-soft"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={record.pass ? "primary" : "danger"}>{record.pass ? "기대대로" : "기대와 다름"}</Badge>
        <Badge tone={record.source === "mock" ? "mock" : "neutral"}>
          {record.source === "mock" ? "목업 응답" : "백엔드로 보냄"}
        </Badge>
        {record.mock?.caseKey && (
          <span className="text-xs font-semibold text-mock">
            정답 {record.mock.caseKey} · {record.mock.exact ? "입력 일치" : "근사"}
          </span>
        )}
        <span className="text-xs text-muted">{record.ms.toLocaleString("ko-KR")}ms</span>
      </div>
      <p className="mt-2 break-words">{record.summary}</p>
      {record.mock?.note && <p className="mt-1 text-xs text-muted">{record.mock.note}</p>}
      {record.error && <ErrorPlacement error={record.error} />}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-ink-soft">응답 JSON</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-line bg-surface p-3 text-xs leading-relaxed">
          {JSON.stringify(record.json, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function ErrorPlacement({ error }: { error: CheckErrorView }) {
  const fields = Object.entries(error.fields);
  return (
    <div className="mt-2 rounded-md border border-line bg-surface px-3 py-2">
      <p className="text-xs font-semibold text-ink-soft">
        화면에 보이는 자리 {error.status !== null && <span className="font-normal text-muted">· HTTP {error.status}</span>}
      </p>
      {fields.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {fields.map(([path, message]) => (
            <li key={path}>
              <code className="rounded bg-canvas px-1 text-xs">{path}</code> 칸 아래: {message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">화면 위 안내: {error.formMessage ?? error.message}</p>
      )}
    </div>
  );
}
