/**
 * 결과 화면 '이 숫자는 얼마나 믿을 수 있나요?' (가능성 범위, 명세서 v1.7 9.2 · tax-addon.js의 robustSection)에 보여 줄 값.
 * 작업을 맡기고 진행률을 묻는 건 lib/api의 runRobust, 여기서는 끝난 작업을 띠 그림과 문장으로 고르기만 한다.
 */
import { formatPercent } from "@/lib/format";
import type { RobustJobResult } from "@/lib/types";

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
