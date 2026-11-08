"use client";

/**
 * 00 시작의 버튼. '시뮬레이션 시작하기'의 이어서 하기 · 기준 달 모달은 같은 폴더의 start-flow.tsx
 * (04-E '내 정보로 시작하기'도 같은 흐름을 쓴다)
 */
import { useStartFlow } from "./start-flow";
import { Button, LinkButton } from "@/components/ui";
import { ROUTES } from "@/lib/steps";

export function StartActions() {
  const { start, dialogs } = useStartFlow();
  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={start}>시뮬레이션 시작하기</Button>
        <LinkButton href={ROUTES.example} variant="secondary">
          예시 결과 보기
        </LinkButton>
      </div>
      {dialogs}
    </>
  );
}
