/**
 * 결과 화면 '이 숫자는 얼마나 믿을 수 있나요?' (가능성 범위, 명세서 v1.7 9.2 · tax-addon.js의 robustSection).
 * 서버에 작업을 맡기고(POST /robust) 1.5초마다 진행률을 묻는다(GET /robust/{jobId}). 계산은 서버가 한다.
 */
import { api } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import type { RobustJobResult, SimulationInput } from "@/lib/types";

/** 진행률을 묻는 간격 (명세서 v1.7 9.2) */
export const ROBUST_POLL_MS = 1_500;
/** 이만큼 지나도 끝나지 않으면 멈춘다 (서버는 작업을 10분 보관) */
export const ROBUST_TIMEOUT_MS = 120_000;

export class RobustFailed extends Error {}

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
 * wait · now는 시험에서 바꿔 끼운다.
 */
export async function runRobust(
  input: SimulationInput,
  options: {
    signal?: AbortSignal;
    onProgress: (progress: number) => void;
    wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
    now?: () => number;
  },
): Promise<RobustJobResult> {
  const { signal, onProgress, wait = sleep, now = () => Date.now() } = options;
  const start = await api.startRobust({ input, plans: [] }, { signal });
  onProgress(0);
  const deadline = now() + ROBUST_TIMEOUT_MS;
  for (;;) {
    await wait(ROBUST_POLL_MS, signal);
    const { data } = await api.robustJob(start.data.jobId, { signal });
    onProgress(data.progress);
    if (data.status === "DONE") return data;
    if (data.status === "FAILED") throw new RobustFailed("계산 중 오류가 났어요.");
    if (now() > deadline) {
      throw new RobustFailed(`${ROBUST_TIMEOUT_MS / 60_000}분이 지나도 끝나지 않았어요. 잠시 후 다시 시도해 주세요.`);
    }
  }
}

export interface RobustView {
  /** 띠와 표시 위치 (0~100 %) */
  low: number;
  high: number;
  current: number;
  /** 서버 문장 그대로 */
  message: string;
  detail: string;
  /** 화면 읽기 프로그램용 설명 (띠 그림 대신) */
  label: string;
  /** '지금 n%' 글자가 막대 끝에서 잘리지 않게 */
  markerAlign: "start" | "center" | "end";
}

/** 끝난 작업 → 띠 그림과 문장. 결과가 없으면 null */
export function robustView(job: RobustJobResult, currentProbability: number): RobustView | null {
  const range = job.probability;
  if (job.status !== "DONE" || !range) return null;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  return {
    low: clamp(range.low),
    high: clamp(range.high),
    current: clamp(currentProbability),
    message: job.message ?? "",
    detail: `${job.trials}번의 가운데 값 ${formatPercent(range.median)}, 95% 범위 ${formatPercent(range.low)}~${formatPercent(range.high)}. 파란 띠가 이 범위예요.`,
    label: `가능성 범위 ${formatPercent(range.low)}~${formatPercent(range.high)}, 지금 결과 ${formatPercent(currentProbability)}`,
    markerAlign: currentProbability < 12 ? "start" : currentProbability > 88 ? "end" : "center",
  };
}
