"use client";

/**
 * 입력 화면의 '다음' 흐름 (와이어플로 D1 · D2 · D3 · D4).
 *
 *   1. 필수 칸 · 칸별 규칙을 프론트가 먼저 확인 → 빈 칸·잘못된 칸에 빨간 테두리, 첫 오류 칸으로 이동
 *   2. 서버 입력 검사 POST /inputs/validate (그 화면까지의 입력) → 오류는 그 칸·카드에
 *   3. 그 화면의 경고(지출 > 소득 · 매달 모자람 · 이미 목표 달성)는 모달로 묻는다 → 수정하기 / 그대로 진행
 *
 * 칸 오류는 칸을 떠난 뒤(blur) 또는 '다음'을 누른 뒤에 보여 준다 (치는 도중에 깜빡이지 않게).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, fieldError, formErrorMessage, isApiError, toFieldErrors, type ApiResult, type ApiSource } from "@/lib/api";
import {
  STEP_WARNINGS,
  errorTargets,
  errorsForStep,
  getAtPath,
  hasErrors,
  normalizeErrors,
  scopeInput,
  stepOfPath,
  unchangedErrors,
} from "@/lib/form";
import { useHydrated, useSimInput, type InputUpdater } from "@/lib/hooks";
import { checkFields, checkRequired } from "@/lib/rules";
import { nextHref, stepByKey, type StepKey } from "@/lib/steps";
import type { FieldErrorMap, SimulationInputDraft, ValidateResult } from "@/lib/types";
import { describeWarning, type WarningView } from "./warnings";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";

export interface FormNotice {
  message: string;
  /** 서버에 닿지 못했을 때만: 프론트 검사는 통과했으니 넘어갈 수 있다 */
  canSkip: boolean;
  /** 앞 화면 칸의 오류면 그 화면으로 */
  link?: { href: string; label: string };
}

const EMPTY: SimulationInputDraft = {};

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** data-field가 붙은 칸 중 keys가 가리키는 첫 칸으로 화면을 옮기고 포커스. 못 찾으면 false */
export function focusFirstField(keys: string[]): boolean {
  if (typeof document === "undefined" || keys.length === 0) return false;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-field]"));
  const exact = nodes.find((node) => {
    const path = node.dataset.field ?? "";
    return keys.some((key) => key === path || errorTargets(path, key));
  });
  const near = exact ?? nodes.find((node) => keys.some((key) => errorTargets(key, node.dataset.field ?? "")));
  if (!near) return false;
  near.scrollIntoView({ block: "center", behavior: "smooth" });
  near.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button")?.focus({ preventScroll: true });
  return true;
}

export interface StepFormOptions {
  /** '다음'을 누를 때 먼저 입력을 다듬는다 (예: 비워 둔 지출 항목 → 0원). 바뀌면 저장한다 */
  prepare?: (input: SimulationInputDraft) => SimulationInputDraft;
}

export function useStepForm(step: StepKey, options: StepFormOptions = {}) {
  const { prepare } = options;
  const router = useRouter();
  const hydrated = useHydrated();
  const { input, update } = useSimInput();
  const draft = input ?? EMPTY;

  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<readonly string[]>([]);
  const [server, setServer] = useState<{ errors: FieldErrorMap; sent: SimulationInputDraft } | null>(null);
  const [highlight, setHighlight] = useState<{ fields: string[]; sent: SimulationInputDraft } | null>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<WarningView | null>(null);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const live = hydrated ? normalizeErrors(checkFields(draft)) : {};
  const required = attempted ? checkRequired(step, draft) : {};
  const serverErrors = server ? unchangedErrors(server.errors, server.sent, draft) : {};

  const isTouched = (path: string) => touched.some((t) => t === path || errorTargets(t, path));

  /** 그 칸에 보여 줄 오류 문장. prefix면 그 아래 칸의 오류까지 (카드 테두리용) */
  const error = (path: string, options: { prefix?: boolean } = {}): string | undefined =>
    (attempted || isTouched(path) ? fieldError(live, path, options) : undefined) ??
    fieldError(serverErrors, path, options) ??
    fieldError(required, path, options);

  /** 칸을 떠날 때 (그때부터 칸별 규칙 오류를 보여 준다) */
  const touch = (path: string) => () => {
    setTouched((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  /** 경고 모달의 '수정하기'로 강조한 칸. 그중 하나라도 고치면 모두 풀린다 */
  const highlightActive =
    highlight !== null &&
    highlight.fields.every(
      (field) => JSON.stringify(getAtPath(highlight.sent, field)) === JSON.stringify(getAtPath(draft, field)),
    );
  const highlighted = (path: string): boolean =>
    highlightActive && highlight.fields.some((field) => path === field || errorTargets(path, field));

  const proceed = useCallback(() => {
    setWarning(null);
    router.push(nextHref(step));
  }, [router, step]);

  /** 칸에 붙일 오류를 보여 주고 첫 칸으로. 이 화면에 그 칸이 없으면 위쪽 안내로 */
  const showFieldErrors = useCallback(
    (fields: FieldErrorMap) => {
      const keys = Object.keys(fields);
      requestAnimationFrame(() => {
        if (focusFirstField(keys)) return;
        const other = stepOfPath(keys[0]);
        const def = other ? stepByKey(other) : undefined;
        setNotice({
          message: fields[keys[0]],
          canSkip: false,
          link: def && other !== step ? { href: def.href, label: `${def.mark} ${def.label}에서 고치기` } : undefined,
        });
      });
    },
    [step],
  );

  const submit = useCallback(async () => {
    if (busy) return;
    setAttempted(true);
    setNotice(null);
    setHighlight(null);

    const ready = prepare ? prepare(draft) : draft;
    if (ready !== draft) update(ready);

    // 1. 프론트 검사 (이 화면의 필수 칸 + 칸별 규칙)
    const local = { ...errorsForStep(normalizeErrors(checkFields(ready)), step), ...checkRequired(step, ready) };
    if (hasErrors(local)) {
      showFieldErrors(local);
      return;
    }

    // 2. 서버 입력 검사
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const sent = scopeInput(ready, step);
    setBusy(true);
    try {
      const { data } = await api.validate({ step, input: sent }, { signal: abort.signal });
      setServer(null);
      setResult(data);
      // 3. 이 화면의 경고는 모달로
      const stepWarning = data.warnings.find((w) => (STEP_WARNINGS[step] as readonly string[]).includes(w.code));
      if (stepWarning) setWarning(describeWarning(stepWarning, data.summary));
      else proceed();
    } catch (caught) {
      if (isAbort(caught)) return;
      const fields = toFieldErrors(caught, sent);
      if (hasErrors(fields)) {
        setServer({ errors: fields, sent });
        showFieldErrors(fields);
      } else {
        setNotice({
          message: formErrorMessage(caught, sent) ?? "입력을 확인하지 못했어요.",
          // 서버에 닿지 못한 경우만 건너뛸 수 있다 (프론트 검사는 통과)
          canSkip: isApiError(caught) && ["NETWORK", "BACKEND_UNAVAILABLE", "BAD_RESPONSE", "COMMON500"].includes(caught.code),
        });
      }
    } finally {
      if (controller.current === abort) controller.current = null;
      setBusy(false);
    }
  }, [busy, draft, prepare, update, step, proceed, showFieldErrors]);

  const resolveWarning = useCallback(
    (choice: "edit" | "proceed" | "close") => {
      if (choice === "proceed") return proceed();
      const view = warning;
      setWarning(null);
      if (choice === "edit" && view) {
        setHighlight({ fields: view.fields, sent: draft });
        requestAnimationFrame(() => focusFirstField(view.fields));
      }
    },
    [draft, proceed, warning],
  );

  return {
    hydrated,
    input: draft,
    update: update as (updater: InputUpdater) => unknown,
    error,
    touch,
    highlighted,
    submit,
    busy,
    notice,
    skipCheck: proceed,
    warning,
    resolveWarning,
    result,
  };
}

export type StepForm = ReturnType<typeof useStepForm>;

/**
 * 화면 위쪽 안내 (서버에 닿지 못함 · 앞 화면 칸의 오류).
 * 화면 아래 '다음'을 눌렀을 때도 보이게, 안내가 뜨면 그 자리로 화면을 옮기고 포커스를 준다.
 */
export function FormNoticeBox({ form }: { form: StepForm }) {
  const notice = form.notice;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notice || !ref.current) return;
    ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
    ref.current.focus({ preventScroll: true });
  }, [notice]);
  if (!notice) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-sm outline-none">
      <p className="font-semibold text-danger">{notice.message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {notice.canSkip && (
          <>
            <Button size="sm" variant="secondary" onClick={() => void form.submit()}>
              다시 시도
            </Button>
            <Button size="sm" variant="ghost" onClick={form.skipCheck}>
              검사 없이 다음으로
            </Button>
          </>
        )}
        {notice.link && (
          <Link href={notice.link.href} className="font-semibold text-primary underline-offset-2 hover:underline">
            {notice.link.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/** 서버 경고 → 와이어플로 경고 모달 (수정하기 / 그대로 진행) */
export function StepWarningModal({ form }: { form: StepForm }) {
  const view = form.warning;
  return (
    <Modal
      open={view !== null}
      tone="warn"
      title={view?.title ?? ""}
      onClose={() => form.resolveWarning("close")}
      actions={
        <>
          <Button variant="secondary" onClick={() => form.resolveWarning("edit")}>
            {view?.editLabel ?? "수정하기"}
          </Button>
          <Button onClick={() => form.resolveWarning("proceed")}>{view?.proceedLabel ?? "그대로 진행"}</Button>
        </>
      }
    >
      <p>{view?.body}</p>
    </Modal>
  );
}

// ===== 입력하는 동안 부르는 API (0.3초 뒤, 앞의 요청은 취소) =====

export interface DebouncedState<R> {
  /** 지금 입력에 대한 응답을 기다리는 중 */
  pending: boolean;
  data: R | null;
  source: ApiSource | null;
  error: unknown;
}

/**
 * body가 바뀌고 delay 동안 그대로면 fetcher를 부른다. body가 null이면 부르지 않는다.
 * fetcher는 바뀌지 않는 함수(모듈의 함수)를 넘긴다.
 */
export function useDebouncedApi<B, R>(
  body: B | null,
  fetcher: (body: B, signal: AbortSignal) => Promise<ApiResult<R>>,
  delay = 300,
): DebouncedState<R> {
  const key = body === null ? null : JSON.stringify(body);
  const [state, setState] = useState<{ key: string; data: R | null; source: ApiSource | null; error: unknown } | null>(
    null,
  );

  useEffect(() => {
    if (key === null) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      fetcher(JSON.parse(key) as B, abort.signal).then(
        (result) => setState({ key, data: result.data, source: result.source, error: null }),
        (error: unknown) => {
          if (!isAbort(error)) setState({ key, data: null, source: null, error });
        },
      );
    }, delay);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [key, fetcher, delay]);

  const current = state !== null && state.key === key;
  return {
    pending: key !== null && !current,
    data: current ? state.data : null,
    source: current ? state.source : null,
    error: current ? state.error : null,
  };
}
