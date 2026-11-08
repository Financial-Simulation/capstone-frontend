/**
 * 입력 화면 공통 규칙 (순수 함수). 화면 쪽은 components/step-form.tsx.
 *
 *  - 칸 키는 입력 경로: "person.age", "loans.items[0].principal", 카드 전체는 "events[1]"
 *  - '다음'은 그 화면까지의 입력만 보낸다 (뒤 화면에 남은 값 때문에 앞 화면이 막히지 않게)
 *  - 서버 오류는 그 칸(또는 카드·묶음)의 값이 바뀌면 지운다
 */
import type { FieldErrorMap, SimulationInputDraft, WarningCode } from "./types";
import { normalizeFieldPath } from "./api/errors";
import type { StepKey } from "./steps";

/** 화면마다 다루는 입력 묶음 */
export const STEP_SECTIONS: Record<StepKey, readonly (keyof SimulationInputDraft)[]> = {
  BASIC: ["startMonth", "person", "income", "expenses"],
  ASSETS: ["assets", "savingPlan", "emergency", "loans"],
  GOAL: ["goal"],
  EVENTS: ["events"],
};

const ORDER: StepKey[] = ["BASIC", "ASSETS", "GOAL", "EVENTS"];

/** 이 화면에서 '다음'을 눌렀을 때 모달로 묻는 경고 (와이어플로 01-1 · 01-2 · 02) */
export const STEP_WARNINGS: Record<StepKey, readonly WarningCode[]> = {
  BASIC: ["WARN_EXPENSE_OVER_INCOME"],
  ASSETS: ["WARN_MONTHLY_SHORTFALL"],
  GOAL: ["WARN_GOAL_ALREADY_MET"],
  EVENTS: [],
};

/** 처음 화면부터 이 화면까지의 입력만 (서버 입력 검사에 보낼 본문) */
export function scopeInput(input: SimulationInputDraft, step: StepKey): SimulationInputDraft {
  const sections = ORDER.slice(0, ORDER.indexOf(step) + 1).flatMap((s) => STEP_SECTIONS[s]);
  const scoped: Record<string, unknown> = {};
  for (const key of sections) {
    if (input[key] !== undefined) scoped[key] = input[key];
  }
  return scoped as SimulationInputDraft;
}

/** 경로의 첫 묶음 이름: "loans.items[0].principal" → "loans", "events[1]" → "events" */
function sectionOf(path: string): string {
  return path.split(/[.[]/, 1)[0];
}

/** 이 화면 칸의 오류만 */
export function errorsForStep(errors: FieldErrorMap, step: StepKey): FieldErrorMap {
  const sections = STEP_SECTIONS[step] as readonly string[];
  return Object.fromEntries(Object.entries(errors).filter(([path]) => sections.includes(sectionOf(path))));
}

/** 서버 경로(@AssertTrue 이름 등)를 화면 칸 키로. 같은 칸이면 앞의 문장 */
export function normalizeErrors(errors: FieldErrorMap): FieldErrorMap {
  const result: FieldErrorMap = {};
  for (const [path, message] of Object.entries(errors)) {
    const key = normalizeFieldPath(path);
    if (!(key in result)) result[key] = message;
  }
  return result;
}

export function hasErrors(errors: FieldErrorMap): boolean {
  return Object.keys(errors).length > 0;
}

/** "loans.items[0].principal" → ["loans", "items", 0, "principal"] */
function parsePath(path: string): (string | number)[] {
  const parts: (string | number)[] = [];
  for (const piece of path.split(".")) {
    const match = /^([^[\]]*)((?:\[\d+\])*)$/.exec(piece);
    if (!match) return [piece];
    if (match[1]) parts.push(match[1]);
    for (const index of match[2].matchAll(/\[(\d+)\]/g)) parts.push(Number(index[1]));
  }
  return parts;
}

export function getAtPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const part of parsePath(path)) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[part];
  }
  return current;
}

/**
 * 서버 오류가 가리키는 값의 범위. 이 범위의 값이 바뀌면 오류를 지운다.
 * 카드(예정된 일 · 대출)와 지출 묶음은 통째로, 나머지는 첫 묶음(person 등)으로 본다
 * (경력 오류 INPUT4001은 나이를 고쳐도 풀리니까).
 */
export function errorScope(path: string): string {
  const card = /^(events\[\d+\]|loans\.items\[\d+\]|expenses\.(?:fixed|variable))/.exec(path);
  return card ? card[1] : sectionOf(path);
}

/** 보냈을 때와 지금 값이 같은 칸의 오류만 남긴다 */
export function unchangedErrors(
  errors: FieldErrorMap,
  sent: SimulationInputDraft,
  current: SimulationInputDraft,
): FieldErrorMap {
  return Object.fromEntries(
    Object.entries(errors).filter(([path]) => {
      const scope = errorScope(path);
      return JSON.stringify(getAtPath(sent, scope)) === JSON.stringify(getAtPath(current, scope));
    }),
  );
}

/** 그 칸이 있는 화면: "loans.items[0].principal" → ASSETS */
export function stepOfPath(path: string): StepKey | undefined {
  const section = sectionOf(path);
  return (Object.keys(STEP_SECTIONS) as StepKey[]).find((step) => (STEP_SECTIONS[step] as readonly string[]).includes(section));
}

/** 칸 키 → input의 id ("loans.items[0].principal" → "f-loans-items-0-principal") */
export function fieldId(path: string): string {
  return `f-${path.replace(/[^A-Za-z0-9]+/g, "-").replace(/-+$/, "")}`;
}

/** 오류 키가 이 칸(또는 그 아래 칸)을 가리키는지 */
export function errorTargets(errorPath: string, fieldPath: string): boolean {
  return errorPath === fieldPath || errorPath.startsWith(`${fieldPath}.`) || errorPath.startsWith(`${fieldPath}[`);
}
