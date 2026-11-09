"use client";

/**
 * 입력 단계 화면의 틀: 제목 · 내용 · 이전/다음.
 * 들어오면 '거쳐 간 단계'로 기록하고, '다음' 동작을 단계 표시에도 등록한다.
 * onNext를 넘기지 않으면 검사 없이 다음 화면으로 간다.
 */
import { useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useProgress } from "@/lib/hooks";
import { nextHref, type StepKey } from "@/lib/steps";
import { useRegisterNext } from "./input-flow";
import { StepNav, StepTitle } from "./StepNav";

export function StepScreen({
  step,
  description,
  onNext,
  busy = false,
  children,
}: {
  step: StepKey;
  description?: ReactNode;
  /** 검사 후 이동. 없으면 바로 이동 */
  onNext?: () => void | Promise<void>;
  busy?: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const { markVisited } = useProgress();

  useEffect(() => {
    markVisited(step);
  }, [markVisited, step]);

  const goNext = useCallback(() => {
    if (onNext) return onNext();
    router.push(nextHref(step));
  }, [onNext, router, step]);

  useRegisterNext(goNext);

  return (
    <div>
      <StepTitle step={step}>{description}</StepTitle>
      <div className="mt-6 space-y-6">{children}</div>
      <StepNav step={step} onNext={() => void goNext()} busy={busy} />
    </div>
  );
}
