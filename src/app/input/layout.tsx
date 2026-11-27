import type { ReactNode } from "react";
import { InputFlowProvider } from "@/features/input/input-flow";
import { StepIndicator } from "@/features/input/StepIndicator";
import { RunnerCard, RunnerPanel } from "@/features/runner/RunnerPanel";

/** 입력 4단계 공통: 단계 표시 + 화면. 옆 여백에는 '레이스 준비' 캐릭터 (넓은 화면은 오른쪽에 크게, 좁은 화면은 단계 아래 낮은 장면) */
export default function InputLayout({ children }: { children: ReactNode }) {
  return (
    <InputFlowProvider>
      <div className="relative mx-auto max-w-2xl">
        <StepIndicator />
        <RunnerCard className="mt-4 xl:hidden" />
        <div className="mt-8">{children}</div>
        <RunnerPanel className="absolute left-full top-0 ml-8 hidden h-full w-64 min-[1400px]:w-80 xl:block" />
      </div>
    </InputFlowProvider>
  );
}
