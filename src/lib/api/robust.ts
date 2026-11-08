/**
 * 가능성 범위 작업 (명세서 v1.7 9.2): 서버에 맡기고(POST /robust) 1.5초마다 진행률을 묻는다(GET /robust/{jobId}).
 * 결과 화면 '이 숫자는 얼마나 믿을 수 있나요?'와 '계획 바꿔 보기'의 '결론이 같은지'가 같이 쓴다. 계산은 서버가 한다.
 */
import type { PlanRequest, RobustJobResult, SimulationInput } from "@/lib/types";
import { api } from "./endpoints";
import { ApiError } from "./errors";

/** 진행률을 묻는 간격 (명세서 v1.7 9.2) */
export const ROBUST_POLL_MS = 1_500;
/** 이만큼 지나도 끝나지 않으면 멈춘다 (서버는 작업을 10분 보관) */
export const ROBUST_TIMEOUT_MS = 120_000;

const ROBUST_MESSAGES = {
  /** 서버가 작업을 FAILED로 끝냈을 때 (ROBUST_FAILED) */
  failed: "계산 중 오류가 났어요.",
  /** ROBUST_TIMEOUT_MS가 지났을 때 (ROBUST_TIMEOUT) */
  timeout: `${ROBUST_TIMEOUT_MS / 60_000}분이 지나도 끝나지 않았어요. 잠시 후 다시 시도해 주세요.`,
} as const;

function abortError(): DOMException {
  return new DOMException("aborted", "AbortError");
}

/** ms 기다리기. signal이 멈추면 바로 AbortError */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * 작업을 맡기고 끝날 때까지 진행률을 묻는다. 화면을 떠나면(signal) 바로 멈춘다.
 * plans를 보내면 계획마다 결론이 몇 번 유지되는지도 계산한다 ('계획 바꿔 보기').
 * 서버가 실패하거나 너무 오래 걸리면 ApiError(ROBUST_FAILED · ROBUST_TIMEOUT). wait · now는 시험에서 바꿔 끼운다.
 */
export async function runRobust(
  input: SimulationInput,
  options: {
    signal?: AbortSignal;
    /** 0~3개 */
    plans?: PlanRequest[];
    onProgress: (progress: number) => void;
    wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
    now?: () => number;
  },
): Promise<RobustJobResult> {
  const { signal, plans = [], onProgress, wait = sleep, now = () => Date.now() } = options;
  const start = await api.startRobust({ input, plans }, { signal });
  onProgress(0);
  const deadline = now() + ROBUST_TIMEOUT_MS;
  for (;;) {
    await wait(ROBUST_POLL_MS, signal);
    const { data } = await api.robustJob(start.data.jobId, { signal });
    onProgress(data.progress);
    if (data.status === "DONE") return data;
    if (data.status === "FAILED") throw new ApiError("ROBUST_FAILED", ROBUST_MESSAGES.failed, null);
    if (now() > deadline) throw new ApiError("ROBUST_TIMEOUT", ROBUST_MESSAGES.timeout, null);
  }
}
