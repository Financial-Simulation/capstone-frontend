import { afterEach, describe, expect, it, vi } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { RobustJobResult, SimulationInput } from "@/lib/types";
import { ROBUST_POLL_MS, RobustFailed, robustView, runRobust, sleep } from "./robust";

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

  it("서버가 실패하면 · 너무 오래 걸리면 멈춘다", async () => {
    stubBackend([{ status: "FAILED", progress: 30 }]);
    await expect(runRobust(input, { onProgress: () => {}, wait: async () => {} })).rejects.toEqual(
      new RobustFailed("계산 중 오류가 났어요."),
    );

    stubBackend(Array.from({ length: 5 }, () => ({ status: "RUNNING" as const, progress: 10 })));
    let clock = 0;
    await expect(
      runRobust(input, {
        onProgress: () => {},
        wait: async () => {},
        now: () => (clock += 60_000),
      }),
    ).rejects.toThrow("2분이 지나도 끝나지 않았어요.");
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

describe("띠 그림과 문장 (서버 값 그대로)", () => {
  it("S1: 51.4%~83.4%, 지금 58.0%", () => {
    expect(robustView(done("S1"), 58)).toEqual({
      low: 51.4,
      high: 83.4,
      current: 58,
      message: "가정을 60가지로 바꿔 다시 계산하면 대부분 51%~83% 사이예요. 정확한 한 숫자보다 이 범위를 봐 주세요.",
      detail: "60번의 가운데 값 66.4%, 95% 범위 51.4%~83.4%. 파란 띠가 이 범위예요.",
      label: "가능성 범위 51.4%~83.4%, 지금 결과 58.0%",
      markerAlign: "center",
    });
  });

  it("'지금' 글자가 막대 끝에서 잘리지 않게 (S3 96.6% · E4 1.3%)", () => {
    expect(robustView(done("S3"), 96.6)?.markerAlign).toBe("end");
    expect(robustView(done("E4"), 1.3)?.markerAlign).toBe("start");
  });

  it("아직 끝나지 않았으면 그리지 않는다", () => {
    expect(robustView({ ...done("S1"), status: "RUNNING", probability: null }, 58)).toBeNull();
  });
});
