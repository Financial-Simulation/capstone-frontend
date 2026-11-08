"use client";

/**
 * 여러 화면이 같이 쓰는 React 훅.
 *
 * 저장소(simInput.v1 · simPlans.v1 · 거쳐 간 단계 · 목업 스위치)는 useSyncExternalStore로 읽어서
 *  - 서버 렌더링·첫 화면(hydration)에서는 '아직 모름'(null/빈 값)으로 그리고, 바로 다음에 저장값으로 다시 그린다
 *  - 같은 탭의 다른 컴포넌트, 다른 탭(storage 이벤트)의 변경도 따라온다
 * 버튼으로 부르는 API 작업(결과 화면의 비교 · 추천 · 미리보기 · 가능성 범위)은 맨 아래 useApiTask.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SimulationInputDraft, YearMonth } from "./types";
import { currentYearMonth } from "./year-month";
import {
  INPUT_KEY,
  PLANS_KEY,
  PROGRESS_KEY,
  browserStorage,
  clearAll,
  parseInput,
  parseJson,
  parsePlans,
  parseProgress,
  readRaw,
  saveInput,
  savePlans,
  saveProgress,
  type Progress,
  type SavedPlan,
} from "./storage";
import type { StepKey } from "./steps";
import { MODE_OVERRIDE_KEY, currentModes, parseModeSpec, writeModeOverride, type ModeMap } from "./api/mode";
import { isAbortError } from "./api/client";
import { errorMessage } from "./api/errors";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    const watched = [INPUT_KEY, PLANS_KEY, PROGRESS_KEY, MODE_OVERRIDE_KEY];
    if (event.key === null || watched.includes(event.key)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** 같은 글자면 같은 객체를 돌려줘야 useSyncExternalStore가 무한히 다시 그리지 않는다 */
function cachedReader<T>(getRaw: () => string | null, parse: (value: unknown) => T) {
  let cache: { raw: string | null; value: T } | null = null;
  return (): T => {
    const raw = getRaw();
    if (cache && cache.raw === raw) return cache.value;
    cache = { raw, value: parse(parseJson(raw)) };
    return cache.value;
  };
}

/**
 * 저장에 실패했을 때(사생활 보호 모드 · 저장 공간 초과) 이번 탭에서만 들고 있는 입력.
 * 그래도 화면은 계속 쓸 수 있고, 새로고침하면 사라진다.
 */
let unsavedInputRaw: string | null = null;

const readInput = cachedReader(() => unsavedInputRaw ?? readRaw(INPUT_KEY), parseInput);
const readPlans = cachedReader(() => readRaw(PLANS_KEY), parsePlans);
const readProgress = cachedReader(() => readRaw(PROGRESS_KEY), parseProgress);

const EMPTY_PLANS: SavedPlan[] = [];
const EMPTY_PROGRESS: Progress = { visited: [] };

export type InputUpdater = SimulationInputDraft | ((prev: SimulationInputDraft) => SimulationInputDraft);

/**
 * 내 입력 (simInput.v1).
 * update는 저장까지 한다. 처음 값을 넣는 순간 startMonth가 이번 달로 정해진다.
 */
export function useSimInput() {
  const input = useSyncExternalStore(subscribe, readInput, () => null);

  const update = useCallback((updater: InputUpdater) => {
    const prev = readInput() ?? {};
    const next = typeof updater === "function" ? updater(prev) : updater;
    const result = saveInput(next);
    unsavedInputRaw = result.saved ? null : JSON.stringify(result.input);
    notify();
    return result;
  }, []);

  const clear = useCallback(() => {
    clearAll();
    unsavedInputRaw = null;
    notify();
  }, []);

  return { input, update, clear };
}

/** 04-2에서 저장한 비교 계획 (최대 3개) */
export function useSavedPlans() {
  const plans = useSyncExternalStore(subscribe, readPlans, () => EMPTY_PLANS);
  const setPlans = useCallback((next: SavedPlan[]) => {
    const saved = savePlans(next);
    notify();
    return saved;
  }, []);
  return { plans, setPlans };
}

/** 거쳐 간 입력 단계 */
export function useProgress() {
  const progress = useSyncExternalStore(subscribe, readProgress, () => EMPTY_PROGRESS);
  const markVisited = useCallback((step: StepKey) => {
    const current = readProgress();
    if (current.visited.includes(step)) return;
    saveProgress({ visited: [...current.visited, step] });
    notify();
  }, []);
  return { visited: progress.visited, markVisited };
}

// apiMode.dev는 JSON이 아니라 "simulate=real,preview=mock" 글자라서 따로 읽는다
let modeCache: { raw: string | null; value: ModeMap } | null = null;
function readModeOverrideSnapshot(): ModeMap {
  const raw = readRaw(MODE_OVERRIDE_KEY);
  if (modeCache && modeCache.raw === raw) return modeCache.value;
  modeCache = { raw, value: parseModeSpec(raw) };
  return modeCache.value;
}

const EMPTY_MODES: ModeMap = {};

/** 목업 스위치 (개발 점검 화면). 바꾸면 바로 모든 API 호출에 적용된다 */
export function useApiModes() {
  const override = useSyncExternalStore(subscribe, readModeOverrideSnapshot, () => EMPTY_MODES);
  const setOverride = useCallback((next: ModeMap | null) => {
    writeModeOverride(next);
    notify();
  }, []);
  return { override, modes: currentModes(override), setOverride };
}

const noopSubscribe = () => () => {};

/** 브라우저에서 그리는 중인지 (서버 렌더링·hydration 중이면 false) */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** 이 기기의 이번 달 "YYYY-MM". 서버 렌더링·hydration 중에는 null (미리 그릴 때 시각을 읽지 않게) */
export function useCurrentMonth(): YearMonth | null {
  return useSyncExternalStore(noopSubscribe, readCurrentMonth, () => null);
}

const readCurrentMonth = () => currentYearMonth();

let storageProbe: boolean | null = null;

function probeStorage(): boolean {
  if (storageProbe !== null) return storageProbe;
  const storage = browserStorage();
  try {
    storage?.setItem("__sim_probe__", "1");
    storage?.removeItem("__sim_probe__");
    storageProbe = storage !== null;
  } catch {
    storageProbe = false;
  }
  return storageProbe;
}

/** 저장소를 쓸 수 있는 브라우저인지 (사생활 보호 모드 등에서 false). 처음 한 번만 확인한다 */
export function useStorageAvailable(): boolean {
  return useSyncExternalStore(noopSubscribe, probeStorage, () => true);
}

/**
 * 버튼으로 부르는 API 작업 (결과 화면의 비교 · 추천 · 미리보기 · 가능성 범위).
 *  - 한 번에 하나: 새로 부르면 앞의 요청을 멈추고, 화면을 떠나도 멈춘다 (멈춘 요청은 오류로 보지 않는다)
 *  - busy: 돌고 있는 작업 이름 (버튼 글자 · 다른 버튼 막기), error: 실패하면 "{failText}: {오류 한 문장}"
 *
 *   const { busy, error, run } = useApiTask<"compare" | "recommend">();
 *   run("compare", "비교하지 못했어요", async (signal) => setCompare((await api.compare(body, { signal })).data));
 */
export function useApiTask<K extends string>() {
  const [busy, setBusy] = useState<K | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (kind: K, failText: string, task: (signal: AbortSignal) => Promise<void>) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setError(null);
    setBusy(kind);
    try {
      await task(abort.signal);
    } catch (caught) {
      if (!isAbortError(caught)) setError(`${failText}: ${errorMessage(caught)}`);
    } finally {
      if (abortRef.current === abort) setBusy(null);
    }
  }, []);

  return { busy, error, run };
}
