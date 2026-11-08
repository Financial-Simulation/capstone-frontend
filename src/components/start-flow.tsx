"use client";

/**
 * 정보 입력을 시작하는 버튼의 공통 흐름 (00 '시뮬레이션 시작하기' · 04-E '내 정보로 시작하기').
 *  - 저장된 입력이 없으면 바로 01-1 (빈 칸)
 *  - 있으면 '이어서 할까요?' (이어서 하기 / 새로 시작 / 닫기). 새로 시작을 고를 때만 저장값을 지운다
 *  - 이어서 하는데 기준 달이 이번 달보다 이전이면 '기준 달을 이번 달로 바꿀까요?'
 *    (같은 입력이면 다음 달에 열어도 같은 결과가 나오도록 기준 달을 저장해 둔다)
 *
 *   const { start, dialogs } = useStartFlow();
 *   <Button onClick={start}>시뮬레이션 시작하기</Button>{dialogs}
 */
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { formatWon } from "@/lib/format";
import { useCurrentMonth, useHydrated, useSimInput } from "@/lib/hooks";
import { hasAnyValue } from "@/lib/storage";
import { STEPS } from "@/lib/steps";
import { formatYearMonth, isYearMonth } from "@/lib/year-month";
import { Modal } from "./Modal";
import { Button } from "./ui";

type Dialog = "resume" | "rebase" | null;

export function useStartFlow(): { start: () => void; dialogs: ReactNode } {
  const router = useRouter();
  const hydrated = useHydrated();
  const currentMonth = useCurrentMonth();
  const { input, update, clear } = useSimInput();
  const [dialog, setDialog] = useState<Dialog>(null);

  const saved = hydrated && input !== null && hasAnyValue(input);
  const savedStart = isYearMonth(input?.startMonth) ? input.startMonth : null;
  const stale = savedStart !== null && currentMonth !== null && savedStart < currentMonth;
  const firstStep = STEPS[0].href;

  const go = (href: string) => {
    setDialog(null);
    router.push(href);
  };

  const dialogs = (
    <>
      <Modal
        open={dialog === "resume"}
        title="이어서 할까요?"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                clear();
                go(firstStep);
              }}
            >
              새로 시작
            </Button>
            <Button onClick={() => (stale ? setDialog("rebase") : go(firstStep))}>이어서 하기</Button>
          </>
        }
      >
        <p>지난번에 입력하던 내용이 남아 있어요.</p>
        {input && (
          <p className="mt-2 text-sm text-muted">
            {[
              savedStart && `기준 연월 ${formatYearMonth(savedStart)}`,
              input.income?.monthlyNetIncome != null && `월 실수령액 ${formatWon(input.income.monthlyNetIncome)}`,
              input.goal?.targetAmount != null && `목표 ${formatWon(input.goal.targetAmount)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <p className="mt-2 text-sm text-muted">&lsquo;새로 시작&rsquo;을 누르면 저장한 입력을 지우고 빈 칸으로 시작해요.</p>
      </Modal>

      <Modal
        open={dialog === "rebase"}
        title="기준 달을 이번 달로 바꿀까요?"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => go(firstStep)}>
              그대로 두기
            </Button>
            <Button
              onClick={() => {
                if (currentMonth) update((prev) => ({ ...prev, startMonth: currentMonth }));
                go(firstStep);
              }}
            >
              이번 달로 바꾸기
            </Button>
          </>
        }
      >
        <p>
          저장된 입력은 {savedStart ? formatYearMonth(savedStart) : ""} 기준이에요. 이번 달(
          {currentMonth ? formatYearMonth(currentMonth) : ""})로 바꾸면 지난 달은 빼고 이번 달부터 계산해요.
        </p>
        <p className="mt-2 text-sm text-muted">목표와 예정된 일의 연월은 그대로예요. 그대로 두면 지난번과 같은 결과가 나와요.</p>
      </Modal>
    </>
  );

  return { start: () => (saved ? setDialog("resume") : go(firstStep)), dialogs };
}
