/**
 * 장면 공통 부품 (RaceScene · LifeScene): 장면 틀과 캐릭터 자리 변수 · 같은 그림 칸을 이어 붙여 흘리는 줄 · 해와 구름 · 꽃가루.
 * 움직임은 scene.css (rn- 클래스).
 */
import type { CSSProperties, ReactNode } from "react";
import "./scene.css";
import { Cloud } from "./CourseArt";

/** 캐릭터 자리 변수: 왼쪽 끝 --rx (좁은 화면 8%, 넓은 화면 12%). 문 · 말풍선 · 인생 장면 소품이 이 자리에 맞춘다 */
export const RUNNER_X = "[--rx:8%] sm:[--rx:12%]";

/** 장면 틀: 둥근 모서리 · 옅은 테두리 · 캐릭터 자리 변수 (높이와 상태 클래스는 장면이 붙인다) */
export const SCENE_FRAME = `rn-scene relative isolate overflow-hidden rounded-2xl ring-1 ring-black/5 ${RUNNER_X}`;

/** 같은 그림 칸을 이어 붙인 줄. 한 칸만큼(100% ÷ 칸 수) 흐르고 처음으로 돌아가 이음매가 보이지 않는다 */
export function Strip({ count, className = "", children }: { count: number; className?: string; children: (i: number) => ReactNode }) {
  return (
    <div className={`rn-strip ${className}`} style={{ "--n": count } as CSSProperties}>
      {Array.from({ length: count }, (_, i) => children(i))}
    </div>
  );
}

/** 구름 한 줄: 높이(top) · 크기(size) 클래스, 한 번 지나는 시간과 시작 자리(음수 늦춤, 초) */
export interface CloudLane {
  top: string;
  size: string;
  duration: number;
  delay: number;
}

/** 오른쪽 위 해와 천천히 흐르는 구름 */
export function Sky({ clouds }: { clouds: readonly CloudLane[] }) {
  return (
    <>
      <div aria-hidden className="absolute right-[12%] top-3 size-10 rounded-full bg-[radial-gradient(circle,#fff7d6_0%,#ffe9a8_45%,rgba(255,233,168,0)_70%)]" />
      {clouds.map((cloud) => (
        <div
          key={cloud.top}
          aria-hidden
          className={`rn-cloud absolute inset-x-0 ${cloud.top}`}
          style={{ animationDuration: `${cloud.duration}s`, animationDelay: `${cloud.delay}s` }}
        >
          <Cloud className={`${cloud.size} w-auto`} />
        </div>
      ))}
    </>
  );
}

/** 꽃가루 조각: 자리(%) · 늦춤 · 빠르기 · 옆으로 흐름 · 회전 · 색 (그릴 때마다 같은 모양이 되게 미리 정해 둔다) */
const CONFETTI_COLORS = ["#ffcf3a", "#ff6b6b", "#4dabf7", "#51cf66", "#cc5de8", "#ff922b", "#ffffff"];
const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${((i * 53) % 9) * 0.07}s`,
  duration: `${1.5 + ((i * 29) % 7) * 0.12}s`,
  dx: `${((i * 41) % 9) * 6 - 24}px`,
  rotate: `${(i % 2 ? 1 : -1) * (240 + ((i * 67) % 5) * 60)}deg`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

/** 목표 달성 · 금메달 완주 달에 위에서 쏟아지는 꽃가루 */
export function Confetti() {
  return (
    <div aria-hidden className="rn-confetti pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map((piece, i) => (
        <i
          key={i}
          style={
            {
              left: piece.left,
              background: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              "--dx": piece.dx,
              "--r": piece.rotate,
              boxShadow: piece.color === "#ffffff" ? "0 0 0 1px rgba(0,0,0,0.08)" : undefined,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
