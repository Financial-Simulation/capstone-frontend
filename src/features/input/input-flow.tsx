"use client";

/**
 * 입력 단계 화면 공통: 화면이 '다음' 동작(검사 → 이동)을 등록하면
 * 단계 표시에서 바로 다음 단계를 눌렀을 때도 같은 동작을 한다 (와이어플로 01-1: "단계 표시의 '②'를 눌러도 같아요").
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type NextHandler = () => void | Promise<void>;

interface InputFlowValue {
  register: (handler: NextHandler | null) => void;
  requestNext: () => void;
}

const InputFlowContext = createContext<InputFlowValue | null>(null);

export function InputFlowProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<NextHandler | null>(null);
  const value = useMemo<InputFlowValue>(
    () => ({
      register: (handler) => {
        handlerRef.current = handler;
      },
      requestNext: () => {
        void handlerRef.current?.();
      },
    }),
    [],
  );
  return <InputFlowContext.Provider value={value}>{children}</InputFlowContext.Provider>;
}

export function useInputFlow(): InputFlowValue | null {
  return useContext(InputFlowContext);
}

/** 화면의 '다음' 동작을 등록한다. 늘 마지막으로 그린 handler가 불린다 */
export function useRegisterNext(handler: NextHandler) {
  const flow = useContext(InputFlowContext);
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!flow) return;
    flow.register(() => latest.current());
    return () => flow.register(null);
  }, [flow]);
}
