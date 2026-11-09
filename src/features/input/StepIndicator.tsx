"use client";

/**
 * 단계 표시 ①②③④.
 *  - 끝낸 단계: 누르면 그 화면으로 이동 (값 유지)
 *  - 바로 다음 단계: 화면의 '다음' 버튼과 같다 (검사 후 이동)
 *  - 아직 안 한 단계: 누를 수 없다
 */
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { useHydrated, useProgress, useSimInput } from "@/lib/hooks";
import { STEPS, finishedSteps, stepByPath, stepIndex, type StepDef, type StepKey } from "@/lib/steps";
import { useInputFlow } from "./input-flow";

type State = "current" | "done" | "next" | "todo";

/** 휴대폰 폭에서는 '자산·대출·저축'이 '·' 뒤에서만 줄을 바꾸게 */
function breakAtDots(label: string) {
  const parts = label.split("·");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <>
          ·<wbr />
        </>
      )}
    </Fragment>
  ));
}

function StepContent({ step, state }: { step: StepDef; state: State }) {
  const circle: Record<State, string> = {
    current: "bg-primary text-white",
    done: "bg-primary-soft text-primary",
    next: "bg-canvas text-ink-soft",
    todo: "bg-canvas text-muted",
  };
  return (
    <>
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:size-7 sm:text-sm ${circle[state]}`}
      >
        {state === "done" ? "✓" : stepIndex(step.key) + 1}
      </span>
      <span className="min-w-0 text-center sm:text-left">
        <span className="hidden text-[11px] font-medium text-muted sm:block">{step.screen}</span>
        <span
          className={`block text-xs leading-snug sm:truncate sm:text-sm ${state === "current" ? "font-bold text-ink" : "font-medium"}`}
        >
          {breakAtDots(step.label)}
        </span>
      </span>
    </>
  );
}

export function StepIndicator() {
  const pathname = usePathname();
  const current = stepByPath(pathname);
  const { input } = useSimInput();
  const { visited } = useProgress();
  const hydrated = useHydrated();
  const flow = useInputFlow();

  const done: Set<StepKey> = hydrated ? finishedSteps(input, visited) : new Set();
  const currentIndex = current ? stepIndex(current.key) : -1;

  return (
    <nav aria-label="입력 단계">
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {STEPS.map((step, index) => {
          const state: State =
            step.key === current?.key
              ? "current"
              : done.has(step.key)
                ? "done"
                : index === currentIndex + 1
                  ? "next"
                  : "todo";
          const base =
            "flex h-full w-full flex-col items-center gap-1 rounded-lg border px-1 py-2 sm:flex-row sm:gap-2 sm:px-2.5";
          const label = `${step.mark} ${step.label}`;

          return (
            <li key={step.key}>
              {state === "current" ? (
                <span aria-current="step" className={`${base} border-primary bg-surface`}>
                  <StepContent step={step} state={state} />
                </span>
              ) : state === "done" ? (
                <Link
                  href={step.href}
                  aria-label={`${label} (끝낸 단계, 누르면 이동)`}
                  className={`${base} border-line bg-surface hover:border-primary`}
                >
                  <StepContent step={step} state={state} />
                </Link>
              ) : state === "next" && flow ? (
                <button
                  type="button"
                  onClick={flow.requestNext}
                  aria-label={`${label} (다음 단계, 이 화면을 확인한 뒤 이동)`}
                  className={`${base} border-line bg-surface hover:border-primary`}
                >
                  <StepContent step={step} state={state} />
                </button>
              ) : (
                <span aria-disabled="true" className={`${base} cursor-not-allowed border-line bg-canvas`}>
                  <StepContent step={step} state="todo" />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
