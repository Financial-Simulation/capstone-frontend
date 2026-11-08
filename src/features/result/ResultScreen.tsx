"use client";

/**
 * 04 결과 확인. 이 브라우저에 저장된 입력(simInput.v1)으로 계산한다.
 * 입력이 덜 끝났으면 그 화면으로 안내하고, 계산 중에는 '계산 중'(5초가 넘으면 오래 걸린다는 안내),
 * 실패하면 입력 칸 문제는 '입력 확인하기', 백엔드 꺼짐 · 서버 오류는 '다시 계산'.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ResultView } from "./ResultView";
import { Computing, Empty, Failed, NotReady } from "./StateViews";
import { useResult } from "./use-result";
import { Button, LinkButton } from "@/components/ui";
import { setAllocation } from "@/features/input/draft";
import { useHydrated, useSimInput } from "@/lib/hooks";
import { readiness } from "./result";
import { STEPS, stepByKey } from "@/lib/steps";
import type { SimulationInput } from "@/lib/types";

export function ResultScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { input, update, clear } = useSimInput();
  const [confirmReset, setConfirmReset] = useState(false);

  const ready = hydrated ? readiness(input) : null;
  const result = useResult(ready?.ok && input ? (input as SimulationInput) : null);

  if (!ready) return <Computing />;
  if (!ready.ok) return ready.reason === "empty" ? <Empty /> : <NotReady step={ready.step} message={ready.message} />;
  if (result.status === "computing" || result.status === "idle" || result.status === "cancelled") {
    return (
      <Computing
        onCancel={() => {
          result.cancel();
          router.push(stepByKey("EVENTS").href);
        }}
      />
    );
  }
  if (result.status === "failed" || !result.data) return <Failed error={result.error} onRetry={result.retry} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">04</p>
          <p className="text-2xl font-bold tracking-tight">결과 확인</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={STEPS[0].href} variant="secondary" size="sm">
            입력 수정
          </LinkButton>
          <LinkButton href={stepByKey("EVENTS").href} variant="secondary" size="sm">
            시나리오 바꾸기
          </LinkButton>
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            새로 시작
          </Button>
        </div>
      </div>

      <ResultView
        data={result.data}
        input={input ?? {}}
        onApplyAllocation={(allocation) => {
          // 내 입력의 배분을 바꾸면 결과 전체를 다시 계산한다 (계산 중 화면 → 새 결과, 위에서부터 보이게)
          update((prev) => setAllocation(prev, allocation));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button disabled title="11/6에 만들어요">
          계획 바꿔 보기 (11/6)
        </Button>
        <LinkButton href={STEPS[0].href} variant="secondary">
          입력 수정
        </LinkButton>
        <p className="text-sm text-muted">입력은 이 브라우저에만 저장돼요. 다시 들어와도 같은 결과가 나와요.</p>
      </div>

      <Modal
        open={confirmReset}
        title="새로 시작할까요?"
        onClose={() => setConfirmReset(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clear();
                setConfirmReset(false);
                router.push(STEPS[0].href);
              }}
            >
              새로 시작
            </Button>
          </>
        }
      >
        <p>지금 결과가 사라져요. &lsquo;새로 시작&rsquo;을 누르면 저장값을 지우고 빈 칸으로 시작해요.</p>
      </Modal>
    </div>
  );
}
