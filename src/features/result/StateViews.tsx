"use client";

/** 계산 중 · 계산 실패 · 입력이 덜 끝남 (와이어플로 '계산 중' 상태 · 오류 화면) */
import { useEffect, useState, type ReactNode } from "react";
import { isApiError } from "@/lib/api";
import { STEPS, stepByKey } from "@/lib/steps";
import { Button, LinkButton } from "@/components/ui";
import { SIMULATION_PATHS } from "@/config/policy";
import { failure } from "./result";

/** 이만큼 기다려도 답이 없으면 '오래 걸리고 있어요'를 덧붙인다 (화면 대기 시간. 보통은 1초 안에 끝난다) */
export const SLOW_NOTICE_MS = 5_000;

function useWaitedLong(ms: number): boolean {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return waited;
}

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
  const slow = useWaitedLong(SLOW_NOTICE_MS);
  return (
    <Panel>
      <div role="status" aria-live="polite">
        <span
          aria-hidden
          className="mx-auto block size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary"
        />
        <h1 className="mt-5 text-xl font-bold">계산하고 있어요</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          실직·급한 지출·물가·연봉이 서로 다르게 펼쳐지는 미래 {SIMULATION_PATHS.toLocaleString("ko-KR")}개를 계산해요 (몬테카를로 시뮬레이션).
        </p>
        <p className="mt-1 text-sm text-muted">보통 1초 안에 끝나요. 같은 입력이면 같은 결과가 나오도록 난수 시드를 기록해요.</p>
        {slow && (
          <div className="mt-4 rounded-lg border border-warn-line bg-warn-soft px-4 py-2 text-sm text-ink">
            <p className="font-semibold">평소보다 오래 걸리고 있어요.</p>
            <p className="mt-0.5 text-ink-soft">백엔드가 바쁘거나 응답하지 않는 상태일 수 있어요.</p>
          </div>
        )}
      </div>
      {onCancel && (
        <Button variant="secondary" className="mt-6" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
    </Panel>
  );
}

/**
 * 계산 실패: 입력 칸 문제면 그 칸이 있는 화면으로('입력 확인하기'), 아니면(백엔드 꺼짐 · 서버 오류) '다시 계산'.
 * 04-E 예시는 내 입력이 아니라서 canFixInput={false}로 늘 '다시 계산'만.
 */
export function Failed({ error, onRetry, canFixInput = true }: { error: unknown; onRetry: () => void; canFixInput?: boolean }) {
  const info = failure(error);
  const fixHref = canFixInput && info.kind === "input" ? stepByKey(info.step).href : null;
  return (
    <Panel tone="danger">
      <div role="alert">
        <h1 className="text-xl font-bold">계산하지 못했어요</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          {fixHref ? "입력을 고친 뒤 다시 계산해 주세요." : "잠시 후 다시 시도해 주세요."}
        </p>
        {info.message && (
          <p className="mt-3 rounded-lg bg-danger-soft px-4 py-2 text-sm text-danger">
            {info.message}
            {isApiError(error) && <span className="ml-1 text-xs text-ink-soft">({error.code})</span>}
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {fixHref ? <LinkButton href={fixHref}>입력 확인하기</LinkButton> : <Button onClick={onRetry}>다시 계산</Button>}
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
