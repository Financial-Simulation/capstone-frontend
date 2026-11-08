/**
 * 브라우저 저장소 (보고서 4.3: 입력은 서버가 아니라 브라우저에만 저장).
 *
 *  - simInput.v1   : SimulationInput 그대로 (입력 중이면 빈 칸이 있는 Draft)
 *  - simPlans.v1   : 04-2에서 저장한 비교 계획, 최대 3개
 *  - simProgress.v1: 화면에서만 쓰는 진행 상태 (거쳐 간 단계). 서버로 보내지 않는다
 *
 * localStorage는 사생활 보호 모드·저장 공간 초과 등에서 예외를 던질 수 있어 모두 try/catch로 감싼다.
 * 스키마가 바뀌면 키를 v2로 올리고 v1 값을 옮기거나 버린다.
 */
import type { Adjustments, SimulationInputDraft } from "./types";
import { currentYearMonth, isYearMonth } from "./year-month";

export const INPUT_KEY = "simInput.v1";
export const PLANS_KEY = "simPlans.v1";
export const PROGRESS_KEY = "simProgress.v1";
export const MAX_SAVED_PLANS = 3;

/** 테스트에서 가짜 저장소를 넣을 수 있게 Storage의 필요한 부분만 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRaw(key: string, storage: StorageLike | null = browserStorage()): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function parseJson(raw: string | null): unknown {
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown, storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string, storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // 지우지 못해도 다음 저장 때 덮어쓴다
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ===== simInput.v1 =====

export function parseInput(value: unknown): SimulationInputDraft | null {
  return isPlainObject(value) ? (value as SimulationInputDraft) : null;
}

export function loadInput(storage: StorageLike | null = browserStorage()): SimulationInputDraft | null {
  return parseInput(parseJson(readRaw(INPUT_KEY, storage)));
}

/** startMonth 말고 값이 하나라도 들어 있는지 */
export function hasAnyValue(value: unknown, isRoot = true): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some((item) => hasAnyValue(item, false));
  if (isPlainObject(value)) {
    return Object.entries(value).some(([key, v]) => !(isRoot && key === "startMonth") && hasAnyValue(v, false));
  }
  return true;
}

/** 처음 값을 넣을 때 기준 연월(startMonth)을 이번 달로 정한다. 이미 있으면 그대로 */
export function withStartMonth(draft: SimulationInputDraft, now: Date = new Date()): SimulationInputDraft {
  if (isYearMonth(draft.startMonth) || !hasAnyValue(draft)) return draft;
  return { ...draft, startMonth: currentYearMonth(now) };
}

/** 저장하고, 실제로 저장한 값(startMonth가 채워졌을 수 있음)을 돌려준다. 저장에 실패해도 값은 돌려준다 */
export function saveInput(
  draft: SimulationInputDraft,
  storage: StorageLike | null = browserStorage(),
  now: Date = new Date(),
): { saved: boolean; input: SimulationInputDraft } {
  const input = withStartMonth(draft, now);
  return { saved: writeJson(INPUT_KEY, input, storage), input };
}

/** '새로 시작': 입력·비교 계획·진행 상태를 모두 지운다 */
export function clearAll(storage: StorageLike | null = browserStorage()): void {
  remove(INPUT_KEY, storage);
  remove(PLANS_KEY, storage);
  remove(PROGRESS_KEY, storage);
}

/** 저장된 기준 연월이 이번 달보다 이전인지 ('기준 달을 이번 달로 바꿀까요?') */
export function isStartMonthPast(draft: SimulationInputDraft | null, now: Date = new Date()): boolean {
  const start = draft?.startMonth;
  return isYearMonth(start) && start < currentYearMonth(now);
}

// ===== simPlans.v1 =====

export interface SavedPlan {
  id: string;
  /** 20자 이내 */
  name: string;
  adjustments: Adjustments;
  /** ISO 시각 */
  savedAt: string;
}

export function parsePlans(value: unknown): SavedPlan[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is SavedPlan =>
        isPlainObject(p) && typeof p.id === "string" && typeof p.name === "string" && isPlainObject(p.adjustments),
    )
    .slice(0, MAX_SAVED_PLANS);
}

export function loadPlans(storage: StorageLike | null = browserStorage()): SavedPlan[] {
  return parsePlans(parseJson(readRaw(PLANS_KEY, storage)));
}

/** 3개를 넘으면 앞의 3개만 저장한다 */
export function savePlans(plans: SavedPlan[], storage: StorageLike | null = browserStorage()): boolean {
  return writeJson(PLANS_KEY, plans.slice(0, MAX_SAVED_PLANS), storage);
}

// ===== simProgress.v1 =====

export interface Progress {
  /** 한 번이라도 들어가 본 입력 단계 */
  visited: string[];
}

export function parseProgress(value: unknown): Progress {
  if (isPlainObject(value) && Array.isArray(value.visited)) {
    return { visited: value.visited.filter((v): v is string => typeof v === "string") };
  }
  return { visited: [] };
}

export function loadProgress(storage: StorageLike | null = browserStorage()): Progress {
  return parseProgress(parseJson(readRaw(PROGRESS_KEY, storage)));
}

export function saveProgress(progress: Progress, storage: StorageLike | null = browserStorage()): boolean {
  return writeJson(PROGRESS_KEY, progress, storage);
}
