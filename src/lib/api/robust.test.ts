import { afterEach, describe, expect, it, vi } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { RobustJobResult, SimulationInput } from "@/lib/types";
import { errorMessage } from "./errors";
import { ROBUST_POLL_MS, runRobust, sleep } from "./robust";

const golden = (key: string) => goldenCaseByKey(key)!;
const input = golden("S1").input as SimulationInput;
const done = (key: string): RobustJobResult => ({ jobId: "job-1", status: "DONE", progress: 100, ...golden(key).robust });

/** 백엔드 자리에 가짜 응답: POST /robust → 작업 번호, GET /robust/{id} → 차례로 */
function stubBackend(jobs: Partial<RobustJobResult>[]) {
  const queue = [...jobs];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const result =
      init?.method === "POST" ? { jobId: "job-1", status: "RUNNING", trials: 60 } : { jobId: "job-1", trials: 60, ...queue.shift() };
    return new Response(JSON.stringify({ isSuccess: true, code: "COMMON200", message: "", result }), {
      status: url.endsWith("/robust") ? 202 : 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("가능성 범위 작업 (맡기고 1.5초마다 묻기)", () => {
  it("진행률을 알리다가 끝나면 결과", async () => {
    const fetchMock = stubBackend([
      { status: "RUNNING", progress: 40, probability: null, plans: null, message: null },
      { status: "RUNNING", progress: 80, probability: null, plans: null, message: null },
      done("S1"),
    ]);
    const progress: number[] = [];
    const waits: number[] = [];
    const job = await runRobust(input, {
      onProgress: (p) => progress.push(p),
      wait: async (ms) => {
        waits.push(ms);
      },
    });
    expect(progress).toEqual([0, 40, 80, 100]);
    expect(waits).toEqual([ROBUST_POLL_MS, ROBUST_POLL_MS, ROBUST_POLL_MS]);
    expect(job.probability).toEqual({ median: 66.4, low: 51.4, high: 83.4 });
    expect(fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`)).toEqual([
      "POST /api/robust",
      "GET /api/robust/job-1",
      "GET /api/robust/job-1",
      "GET /api/robust/job-1",
    ]);
  });

  it("서버가 실패하면 · 너무 오래 걸리면 멈춘다 (화면에는 그 문장)", async () => {
    stubBackend([{ status: "FAILED", progress: 30 }]);
    const failed = await runRobust(input, { onProgress: () => {}, wait: async () => {} }).catch((error: unknown) => error);
    expect(failed).toMatchObject({ code: "ROBUST_FAILED" });
    expect(errorMessage(failed)).toBe("계산 중 오류가 났어요.");

    stubBackend(Array.from({ length: 5 }, () => ({ status: "RUNNING" as const, progress: 10 })));
    let clock = 0;
    const late = await runRobust(input, {
      onProgress: () => {},
      wait: async () => {},
      now: () => (clock += 60_000),
    }).catch((error: unknown) => error);
    expect(late).toMatchObject({ code: "ROBUST_TIMEOUT" });
    expect(errorMessage(late)).toBe("2분이 지나도 끝나지 않았어요. 잠시 후 다시 시도해 주세요.");
  });

  it("화면을 떠나면(abort) 기다리던 중에도 바로 멈춘다", async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const waiting = sleep(ROBUST_POLL_MS, abort.signal);
    abort.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    await expect(sleep(10, abort.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
