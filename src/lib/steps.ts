/**
 * 입력 4단계와 화면 주소. 화면마다 주소가 있어서 브라우저 뒤로 가기 = 화면의 '이전'이다.
 * '끝낸 단계' = 들어가 본 적이 있고 필수 칸이 다 찼고, 앞 단계도 모두 끝낸 단계. 단계 표시에서는 끝낸 단계만 누를 수 있다.
 */
import type { SimulationInputDraft } from "./types";
import { checkRequired } from "./rules";

export type StepKey = "BASIC" | "ASSETS" | "GOAL" | "EVENTS";

export interface StepDef {
  key: StepKey;
  /** 단계 표시의 번호 ①②③④ */
  mark: string;
  /** 와이어플로 화면 번호 */
  screen: "01-1" | "01-2" | "02" | "03";
  /** 단계 표시에 보이는 짧은 이름 */
  label: string;
  /** 화면 제목 */
  title: string;
  href: string;
}

export const STEPS: readonly StepDef[] = [
  { key: "BASIC", mark: "①", screen: "01-1", label: "소득·지출", title: "정보 입력 · 나와 소득/지출", href: "/input/basic" },
  { key: "ASSETS", mark: "②", screen: "01-2", label: "자산·대출·저축", title: "정보 입력 · 자산/대출/저축", href: "/input/assets" },
  { key: "GOAL", mark: "③", screen: "02", label: "목표", title: "목표 설정", href: "/input/goal" },
  { key: "EVENTS", mark: "④", screen: "03", label: "시나리오", title: "시나리오 선택", href: "/input/scenario" },
];

export const ROUTES = {
  start: "/",
  result: "/result",
  report: "/report",
  story: "/story",
  example: "/example",
  dev: "/dev",
} as const;

export function stepIndex(key: StepKey): number {
  return STEPS.findIndex((s) => s.key === key);
}

export function stepByKey(key: StepKey): StepDef {
  return STEPS[stepIndex(key)];
}

export function stepByPath(pathname: string | null): StepDef | undefined {
  if (!pathname) return undefined;
  return STEPS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
}

/** '이전': 01-1이면 시작 화면 */
export function prevHref(key: StepKey): string {
  const i = stepIndex(key);
  return i <= 0 ? ROUTES.start : STEPS[i - 1].href;
}

/** '다음': 03이면 결과 화면 */
export function nextHref(key: StepKey): string {
  const i = stepIndex(key);
  return i >= STEPS.length - 1 ? ROUTES.result : STEPS[i + 1].href;
}

/** 그 단계의 필수 칸이 다 찼는지 */
export function isStepFilled(key: StepKey, input: SimulationInputDraft | null): boolean {
  return Object.keys(checkRequired(key, input ?? {})).length === 0;
}

/** 끝낸 단계들 (앞에서부터 이어지는 것만) */
export function finishedSteps(input: SimulationInputDraft | null, visited: readonly string[]): Set<StepKey> {
  const done = new Set<StepKey>();
  for (const step of STEPS) {
    if (!visited.includes(step.key) || !isStepFilled(step.key, input)) break;
    done.add(step.key);
  }
  return done;
}
