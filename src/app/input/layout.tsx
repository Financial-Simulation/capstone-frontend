import type { ReactNode } from "react";
import { InputFlowProvider } from "@/components/input-flow";
import { StepIndicator } from "@/components/StepIndicator";

/** 입력 4단계 공통: 단계 표시 + 화면 */
export default function InputLayout({ children }: { children: ReactNode }) {
  return (
    <InputFlowProvider>
      <div className="mx-auto max-w-2xl">
        <StepIndicator />
        <div className="mt-8">{children}</div>
      </div>
    </InputFlowProvider>
  );
}
