"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { prevHref, stepByKey, stepIndex, STEPS, type StepKey } from "@/lib/steps";
import { Button } from "./ui";

/** 와이어플로의 '다음' 버튼 문구 */
export function nextLabel(step: StepKey): string {
  const i = stepIndex(step);
  return i >= STEPS.length - 1 ? "결과 보기" : `다음: ${STEPS[i + 1].label}`;
}

/** 와이어플로의 '이전' 버튼 문구 (01-2: '이전 · ① 소득·지출') */
export function prevLabel(step: StepKey): string {
  const i = stepIndex(step);
  if (i <= 0) return "이전";
  const prev = STEPS[i - 1];
  return `이전 · ${prev.mark} ${prev.label}`;
}

/** 화면 맨 아래 '이전' · '다음'. 이전은 그냥 이동(값 유지), 다음은 화면이 넘겨준 onNext(검사 후 이동) */
export function StepNav({
  step,
  onNext,
  busy = false,
  label,
}: {
  step: StepKey;
  onNext: () => void;
  busy?: boolean;
  label?: string;
}) {
  const router = useRouter();
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
      <Button variant="secondary" onClick={() => router.push(prevHref(step))}>
        {prevLabel(step)}
      </Button>
      <Button onClick={onNext} disabled={busy} aria-busy={busy || undefined}>
        {busy ? "확인하는 중…" : (label ?? nextLabel(step))}
      </Button>
    </div>
  );
}

export function StepTitle({ step, children }: { step: StepKey; children?: ReactNode }) {
  const def = stepByKey(step);
  return (
    <header>
      <p className="text-sm font-semibold text-primary">{def.screen}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{def.title}</h1>
      {children && <div className="mt-2 text-[15px] text-ink-soft">{children}</div>}
    </header>
  );
}
