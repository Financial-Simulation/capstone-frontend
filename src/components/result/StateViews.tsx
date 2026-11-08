"use client";

/** 계산 중 · 계산 실패 · 입력이 덜 끝남 (와이어플로 '계산 중' 상태 · 오류 화면) */
import type { ReactNode } from "react";
import { formErrorMessage, isApiError, toFieldErrors } from "@/lib/api";
import { stepOfPath } from "@/lib/form";
import { STEPS, stepByKey } from "@/lib/steps";
import { Button, LinkButton } from "../ui";

function Panel({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <section
      className={`mx-auto max-w-xl rounded-xl border px-6 py-10 text-center ${tone === "danger" ? "border-danger-line bg-surface" : "border-line bg-surface"}`}
    >
      {children}
    </section>
  );
}

export function Computing({ onCancel, cancelLabel = "취소" }: { onCancel?: () => void; cancelLabel?: string }) {
  return (
    <Panel>
      <div role="status" aria-live="polite">
        <span
          aria-hidden
          className="mx-auto block size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary"
        />
        <h1 className="mt-5 text-xl font-bold">계산하고 있어요</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          실직·급한 지출·물가·연봉이 서로 다르게 펼쳐지는 미래 2,000개를 계산해요 (몬테카를로 시뮬레이션).
        </p>
        <p className="mt-1 text-sm text-muted">보통 1초 안에 끝나요. 같은 입력이면 같은 결과가 나오도록 난수 시드를 기록해요.</p>
      </div>
      {onCancel && (
        <Button variant="secondary" className="mt-6" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
    </Panel>
  );
}

/** 계산 실패: 칸 오류면 그 화면으로, 아니면 다시 계산 */
export function Failed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const fields = toFieldErrors(error);
  const firstField = Object.keys(fields)[0];
  const step = firstField ? stepOfPath(firstField) : undefined;
  const fixHref = step ? stepByKey(step).href : STEPS[0].href;
  const detail = firstField ? fields[firstField] : formErrorMessage(error);
  return (
    <Panel tone="danger">
      <div role="alert">
        <h1 className="text-xl font-bold">계산하지 못했어요</h1>
        <p className="mt-2 text-[15px] text-ink-soft">잠시 후 다시 시도해 주세요.</p>
        {detail && (
          <p className="mt-3 rounded-lg bg-danger-soft px-4 py-2 text-sm text-danger">
            {detail}
            {isApiError(error) && <span className="ml-1 text-xs text-ink-soft">({error.code})</span>}
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry}>다시 계산</Button>
        <LinkButton href={fixHref} variant="secondary">
          입력 확인하기
        </LinkButton>
      </div>
    </Panel>
  );
}

export function NotReady({ step, message }: { step: (typeof STEPS)[number]["key"]; message: string }) {
  const def = stepByKey(step);
  return (
    <Panel>
      <h1 className="text-xl font-bold">입력이 아직 끝나지 않았어요</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        {def.mark} {def.label} 화면의 칸을 채우면 결과를 보여 드려요.
      </p>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <LinkButton href={def.href} className="mt-6">
        {def.mark} {def.label}로 가기
      </LinkButton>
    </Panel>
  );
}

export function Empty() {
  return (
    <Panel>
      <h1 className="text-xl font-bold">아직 입력한 값이 없어요</h1>
      <p className="mt-2 text-[15px] text-ink-soft">내 정보를 넣거나, 예시 사용자로 결과를 먼저 볼 수 있어요.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <LinkButton href={STEPS[0].href}>시뮬레이션 시작하기</LinkButton>
        <LinkButton href="/example" variant="secondary">
          예시 결과 보기
        </LinkButton>
      </div>
    </Panel>
  );
}
