/**
 * 정답 파일 대조: 정답 파일(v1.7, 11개 입력)의 입력을 그대로 API에 보내고 응답이 정답과 똑같은지 본다.
 * 같은 seed라서 숫자가 한 자리도 달라지면 안 된다. 응답에만 있는 칸(warnings 등)과 정답 파일에만 있는 칸(보낸 조정값 adjustments)은 보지 않는다.
 * 가능성 범위(robust)는 입력마다 몇 초씩 걸려서 여기서는 빼고, 위 API 점검에서 S1만 본다.
 */
import { api, isAbortError, isApiError, type ApiResult, type Endpoint } from "@/lib/api";
import type { GoldenCase } from "@/mocks/golden";

export interface Difference {
  /** 처음 다른 곳. 예) "plans[1].probability" */
  path: string;
  expected: unknown;
  actual: unknown;
}

/**
 * expected에 있는 값이 actual에 모두 같게 들어 있는지 보고, 처음 다른 곳 하나를 돌려준다 (같으면 null).
 * actual에만 있는 칸은 무시한다. 숫자는 정확히 같아야 한다.
 */
export function firstDifference(expected: unknown, actual: unknown, path = ""): Difference | null {
  if (expected === null || typeof expected !== "object") {
    return expected === actual ? null : { path: path || "(전체)", expected, actual };
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return { path: path || "(전체)", expected: "배열", actual };
    if (actual.length !== expected.length) {
      return { path: `${path}.length`, expected: expected.length, actual: actual.length };
    }
    for (let i = 0; i < expected.length; i += 1) {
      const difference = firstDifference(expected[i], actual[i], `${path}[${i}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
    return { path: path || "(전체)", expected: "객체", actual };
  }
  for (const [key, value] of Object.entries(expected)) {
    const difference = firstDifference(value, (actual as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
    if (difference) return difference;
  }
  return null;
}

export type GoldenTarget = "simulate" | "preview" | "compare" | "reverse" | "recommend";

export const GOLDEN_TARGETS: readonly { key: GoldenTarget; label: string; endpoint: Endpoint }[] = [
  { key: "simulate", label: "기본 결과", endpoint: "simulate" },
  { key: "preview", label: "미리보기", endpoint: "preview" },
  { key: "compare", label: "계획 비교", endpoint: "compare" },
  { key: "reverse", label: "역산", endpoint: "reverse" },
  { key: "recommend", label: "배분 추천", endpoint: "recommend" },
];

export type CellResult =
  | { status: "same"; ms: number }
  | { status: "different"; ms: number; difference: Difference }
  /** 목업으로 정해진 API라 대조하지 않음 */
  | { status: "mock"; ms: number }
  | { status: "error"; ms: number; message: string };

function withoutAdjustments<T extends { adjustments?: unknown }>(row: T): Omit<T, "adjustments"> {
  const copy = { ...row };
  delete copy.adjustments;
  return copy;
}

/** 정답 파일에 있는 요청 그대로 API를 부르고, 비교할 정답을 같이 돌려준다 */
async function callGolden(golden: GoldenCase, target: GoldenTarget, signal: AbortSignal) {
  const { input } = golden;
  switch (target) {
    case "simulate":
      return { result: await api.simulate({ input }, { signal }), expected: golden.simulate as unknown };
    case "preview": {
      // 정답 파일의 preview에는 보낸 조정값(adjustments)이 같이 들어 있다
      const { adjustments, ...expected } = golden.preview;
      return { result: await api.preview({ input, adjustments }, { signal }), expected };
    }
    case "compare": {
      const plans = golden.compare.plans
        .filter((plan) => !plan.isBase)
        .map((plan) => ({ name: plan.name, adjustments: plan.adjustments ?? {} }));
      // 정답 파일의 비교 줄에도 보낸 조정값이 같이 들어 있다. 응답에는 없는 칸이라 빼고 본다 (백엔드 AnalysisGoldenTest와 같게)
      const expected = { ...golden.compare, plans: golden.compare.plans.map(withoutAdjustments) };
      return { result: await api.compare({ input, plans }, { signal }), expected };
    }
    case "reverse":
      return { result: await api.reverse({ input, targetProbability: 70 }, { signal }), expected: golden.reverse };
    case "recommend":
      return { result: await api.recommendAllocation({ input }, { signal }), expected: golden.recommend };
  }
}

export async function compareWithGolden(golden: GoldenCase, target: GoldenTarget, signal: AbortSignal): Promise<CellResult> {
  const start = performance.now();
  const ms = () => Math.round(performance.now() - start);
  try {
    const { result, expected } = (await callGolden(golden, target, signal)) as { result: ApiResult<unknown>; expected: unknown };
    if (result.source === "mock") return { status: "mock", ms: ms() };
    const difference = firstDifference(expected, result.data);
    return difference ? { status: "different", ms: ms(), difference } : { status: "same", ms: ms() };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const message = isApiError(error) ? `${error.code} · ${error.message}` : String(error);
    return { status: "error", ms: ms(), message };
  }
}

/** 화면에 보여 줄 짧은 값 (긴 배열 · 객체는 줄인다) */
export function shortValue(value: unknown): string {
  if (value === undefined) return "없음";
  const text = JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}
