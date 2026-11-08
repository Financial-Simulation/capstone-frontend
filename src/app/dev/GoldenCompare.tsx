"use client";

/**
 * 개발 점검 화면의 '정답 파일 대조'. 11개 입력 × 5개 API를 차례로 보내고 응답이 정답 파일과 같은지 표로 보여 준다.
 * 정답 파일(약 200KB)은 '전부 대조'를 누를 때만 내려받는다. 화면을 떠나면 진행 중인 요청을 멈춘다.
 */
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { isAbortError } from "@/lib/api";
import { compareWithGolden, GOLDEN_TARGETS, shortValue, type CellResult, type GoldenTarget } from "./golden-compare";

type Cell = CellResult | { status: "running" };
type Row = { key: string; note: string; cells: Partial<Record<GoldenTarget, Cell>> };

const CELL_VIEW: Record<Cell["status"], { text: string; className: string }> = {
  same: { text: "✓ 같음", className: "text-good" },
  different: { text: "✗ 다름", className: "font-semibold text-danger" },
  error: { text: "✗ 오류", className: "font-semibold text-danger" },
  mock: { text: "목업", className: "text-muted" },
  running: { text: "보내는 중…", className: "text-muted" },
};

export function GoldenCompare() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setCell = (caseKey: string, target: GoldenTarget, cell: Cell) =>
    setRows((prev) => prev.map((row) => (row.key === caseKey ? { ...row, cells: { ...row.cells, [target]: cell } } : row)));

  const runAll = async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true);
    try {
      const { GOLDEN } = await import("@/mocks/golden");
      setRows(GOLDEN.cases.map((c) => ({ key: c.key, note: c.note, cells: {} })));
      for (const golden of GOLDEN.cases) {
        for (const { key } of GOLDEN_TARGETS) {
          setCell(golden.key, key, { status: "running" });
          setCell(golden.key, key, await compareWithGolden(golden, key, abort.signal));
        }
      }
    } catch (error) {
      if (!isAbortError(error)) throw error;
    } finally {
      if (abortRef.current === abort) setRunning(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const done = rows.flatMap((row) => Object.values(row.cells)).filter((cell) => cell && cell.status !== "running");
  const same = done.filter((cell) => cell?.status === "same").length;
  const problems = rows.flatMap((row) =>
    GOLDEN_TARGETS.flatMap(({ key, label }) => {
      const cell = row.cells[key];
      return cell && (cell.status === "different" || cell.status === "error") ? [{ row, label, cell }] : [];
    }),
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">정답 파일 대조 (v1.7, 11개 입력)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            정답 파일의 입력(S1~S3 예시 · E1~E5 경계 · T1~T3 세금)을 그대로 보내고, 응답 숫자가 정답과 똑같은지 봐요. 같은
            seed라 한 자리도 달라지면 안 돼요. 목업으로 정해진 API는 대조하지 않아요(회색). 가능성 범위는 오래 걸려서 위 API
            점검의 S1만 봐요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {done.length > 0 && (
            <span className="text-sm font-semibold" aria-live="polite">
              같음 {same} / {rows.length * GOLDEN_TARGETS.length}
            </span>
          )}
          {running ? (
            <Button variant="secondary" onClick={stop}>
              멈추기
            </Button>
          ) : (
            <Button onClick={() => void runAll()}>전부 대조</Button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-semibold">입력</th>
                {GOLDEN_TARGETS.map(({ key, label }) => (
                  <th key={key} className="py-2 pr-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    <Badge>{row.key}</Badge>
                    <span className="ml-2 text-xs text-muted">{row.note}</span>
                  </td>
                  {GOLDEN_TARGETS.map(({ key }) => {
                    const cell = row.cells[key];
                    const view = cell ? CELL_VIEW[cell.status] : null;
                    return (
                      <td key={key} className={`whitespace-nowrap py-2 pr-3 ${view?.className ?? ""}`}>
                        {view?.text ?? ""}
                        {cell && "ms" in cell && <span className="ml-1 text-xs text-muted">{cell.ms}ms</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {problems.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {problems.map(({ row, label, cell }) => (
            <li key={`${row.key}-${label}`} className="rounded-md bg-danger-soft px-3 py-2 text-danger">
              <span className="font-semibold">
                {row.key} · {label}
              </span>{" "}
              {cell.status === "different"
                ? `${cell.difference.path}: 정답 ${shortValue(cell.difference.expected)} · 응답 ${shortValue(cell.difference.actual)}`
                : cell.status === "error"
                  ? cell.message
                  : ""}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
