/**
 * 코스 위 장애물 · 아이템 그림 (40 × 40). 캐릭터와 같은 말랑한 그림체: 따뜻한 갈색 테두리 · 둥근 모양 · 밝은 하이라이트,
 * 몇몇은 작은 얼굴(심술 난 돌부리 · 웃는 하트 · 시무룩한 비구름)이 있다.
 * 이름과 좋고 나쁨은 race.ts의 SPRITES. 그림은 꾸밈이라 aria-hidden, 뜻은 옆 글자로 전한다.
 */
import { useId, type ReactNode } from "react";
import { INK, OUT } from "./palette";
import type { SpriteKind } from "./race";

/** 테두리 (40 칸 기준 1.5) */
const LINE = { stroke: OUT, strokeWidth: 1.5, strokeLinejoin: "round" as const };
const THIN = { stroke: OUT, strokeWidth: 1, strokeLinejoin: "round" as const };

export function Sprite({ kind, className = "size-10" }: { kind: SpriteKind; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 40 40" aria-hidden overflow="visible" className={className}>
      {kind === "tape" ? <Flag clip={`rnflag${uid}`} /> : SHAPES[kind]}
    </svg>
  );
}

/** 반짝이 별 (가운데 x y, 크기 r) */
const twinkle = (x: number, y: number, r: number, fill = "#ffd84d") => (
  <path
    d={`M${x} ${y - r} L${x + r * 0.32} ${y - r * 0.32} L${x + r} ${y} L${x + r * 0.32} ${y + r * 0.32} L${x} ${y + r} L${x - r * 0.32} ${y + r * 0.32} L${x - r} ${y} L${x - r * 0.32} ${y - r * 0.32} Z`}
    fill={fill}
    {...THIN}
    strokeWidth="0.8"
  />
);

/** 빗방울 · 물방울 (아래 둥근 끝 가운데 x, 꼭지 y, 크기 s) */
const drop = (x: number, y: number, s: number, fill = "#7cc8ff") => (
  <path d={`M${x} ${y} C${x - s * 0.5} ${y + s * 0.9} ${x - s} ${y + s * 1.3} ${x - s} ${y + s * 1.8} A${s} ${s} 0 0 0 ${x + s} ${y + s * 1.8} C${x + s} ${y + s * 1.3} ${x + s * 0.5} ${y + s * 0.9} ${x} ${y} Z`} fill={fill} {...THIN} />
);

/** 결승 깃발: 물결치는 체크무늬 (체크는 깃발 모양으로 잘라 낸다) */
function Flag({ clip }: { clip: string }) {
  const cloth = "M10.4 6.4 C15 3.4 19.4 8.6 24 6.4 C28 4.4 31.4 4.8 34.4 6.6 V22.4 C31.4 20.6 28 20.2 24 22.2 C19.4 24.4 15 19.2 10.4 22.2 Z";
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={cloth} />
        </clipPath>
      </defs>
      <rect x="6.8" y="5" width="3.4" height="33" rx="1.7" fill="#d4dae3" {...LINE} />
      <path d={cloth} fill="#ffffff" />
      <g clipPath={`url(#${clip})`} fill="#3d3a48">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={10.4 + (i % 4) * 6} y={2 + Math.floor(i / 4) * 8 + ((i % 4) % 2) * 4} width="6" height="4" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`b${i}`} x={10.4 + i * 6} y={18 + (i % 2) * 4} width="6" height="4" />
        ))}
      </g>
      <path d={cloth} fill="none" {...LINE} />
      <circle cx="8.5" cy="4.4" r="2.6" fill="#ffd84d" {...LINE} />
      {twinkle(35.6, 29, 2.6)}
    </>
  );
}

const SHAPES: Record<Exclude<SpriteKind, "tape">, ReactNode> = {
  // 허들: 한 번에 드는 큰돈
  hurdle: (
    <>
      <rect x="8.6" y="17" width="3.6" height="18" rx="1.8" fill="#e2e7ee" {...LINE} />
      <rect x="27.8" y="17" width="3.6" height="18" rx="1.8" fill="#e2e7ee" {...LINE} />
      <rect x="4.6" y="33.8" width="11.6" height="4" rx="2" fill="#a7b0be" {...LINE} />
      <rect x="23.8" y="33.8" width="11.6" height="4" rx="2" fill="#a7b0be" {...LINE} />
      <rect x="3.4" y="9.6" width="33.2" height="9.6" rx="4.8" fill="#ff6f6f" {...LINE} />
      <path d="M11 10.4h4.6l-3.4 8h-4.6zM20.6 10.4h4.6l-3.4 8h-4.6zM30.2 10.4h3.8l-3.4 8h-4.2z" fill="#ffffff" />
      <path d="M6.4 12.8 q0.6 -1.2 2 -1.6" stroke="#ffffff" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  // 오르막: 매달 지출이 늘어남
  hill: (
    <>
      <path d="M2.4 37.6 C10 37 14.6 25 21.6 16.6 C25.6 11.8 30 9.4 33.8 9.4 C36.4 9.4 37.6 11 37.6 13.4 V37.6 Z" fill="#a8dc90" {...LINE} />
      <path d="M8 34.2 C12.6 31 16.4 24 21.2 18.6" stroke="#d6f1c6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M19.4 32.4 L29 22.8 M29 22.8 H23.2 M29 22.8 V28.6" stroke={OUT} strokeWidth="5.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 32.4 L29 22.8 M29 22.8 H23.2 M29 22.8 V28.6" stroke="#ffffff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33.4" cy="33.6" r="1.5" fill="#ff8fab" {...THIN} strokeWidth="0.8" />
      <circle cx="12.4" cy="35.2" r="1.2" fill="#ffd166" {...THIN} strokeWidth="0.8" />
    </>
  ),
  // 물웅덩이: 쉬어 가는 기간 · 실직 (시무룩한 비구름)
  puddle: (
    <>
      <path
        d="M9.4 16 H26.4 C29.4 16 31 13.6 30.2 11.2 C29.4 9 27 8.4 25.4 9 C24.6 5.8 21.4 4.2 18.4 5 C16 5.6 14.6 7.6 14.4 9.4 C12 8.6 9 9.8 8.4 12.2 C7.8 14.2 8.4 16 9.4 16 Z"
        fill="#e3e9f2"
        {...LINE}
      />
      <circle cx="17" cy="11.6" r="0.9" fill={INK} />
      <circle cx="22.6" cy="11.6" r="0.9" fill={INK} />
      <path d="M18.6 14 q1.2 -1 2.4 0" stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {drop(13.6, 18.6, 1.5)}
      {drop(24.4, 19.6, 1.3)}
      <ellipse cx="20" cy="32.4" rx="17" ry="5.6" fill="#8fd3ff" {...LINE} />
      <ellipse cx="14" cy="31.2" rx="5.4" ry="1.5" fill="#e6f6ff" />
      <path d="M23.4 33.6 q3.2 1.6 6.6 0" stroke="#5db4ec" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  ),
  // 돌부리: 급한 지출 (심술 난 돌)
  rock: (
    <>
      <path d="M4.6 37.6 C3.4 31 6.6 23.6 12.6 20.4 C15.4 14.8 23.6 13.2 28.4 17.4 C34.4 19.4 37.6 27.6 35.6 37.6 Z" fill="#bcc2cc" {...LINE} />
      <path d="M12 23.8 C14.4 19.2 19 17.2 23.4 18" stroke="#e3e7ed" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M30.4 21.6 l-2 3.2 2.2 2" stroke={OUT} strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.4 27 l3.2 1.4 M25.6 27 l-3.2 1.4" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16.8" cy="30.6" r="1.15" fill={INK} />
      <circle cx="23.2" cy="30.6" r="1.15" fill={INK} />
      <path d="M18.4 34.4 q1.6 -1.3 3.2 0" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </>
  ),
  // 진흙탕: 빌리기 시작 (납작한 진흙 웅덩이에서 거품이 보글보글, 진흙이 튄다)
  mud: (
    <>
      <circle cx="8.4" cy="24" r="1.7" fill="#a8744d" {...THIN} />
      <circle cx="32.6" cy="22.4" r="1.4" fill="#a8744d" {...THIN} strokeWidth="0.9" />
      <circle cx="20.4" cy="19.6" r="1.1" fill="#a8744d" {...THIN} strokeWidth="0.9" />
      <path d="M3 33.6 C3 29.6 8.4 28 13 28.6 C16 26.6 23 26.2 27 28 C32.6 27.6 37.4 29.6 37 33.4 C36.6 36.8 30 37.8 20 37.8 C9.6 37.8 3 37 3 33.6 Z" fill="#a8744d" {...LINE} />
      <path d="M8.4 31.4 C11 29.8 14.6 29.4 17.4 30" stroke="#c99a70" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M13.6 34.2 a2.6 2.6 0 0 1 5.2 0 Z" fill="#c08a5e" {...THIN} />
      <path d="M24.2 33 a1.9 1.9 0 0 1 3.8 0 Z" fill="#c08a5e" {...THIN} strokeWidth="0.9" />
      <ellipse cx="30.8" cy="34.4" rx="2" ry="0.9" fill="none" stroke={OUT} strokeWidth="0.9" />
      <circle cx="15.4" cy="32.6" r="0.55" fill="#ffffff" opacity="0.75" />
    </>
  ),
  // 비상 식량: 적금 해지
  pack: (
    <>
      <path d="M14.6 12 C14.6 5.6 25.4 5.6 25.4 12" stroke={OUT} strokeWidth="4.6" fill="none" strokeLinecap="round" />
      <path d="M14.6 12 C14.6 5.6 25.4 5.6 25.4 12" stroke="#ffb878" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="7.2" y="10.4" width="25.6" height="27" rx="7.4" fill="#ff9d57" {...LINE} />
      <rect x="11.4" y="25.2" width="17.2" height="9.2" rx="3.8" fill="#ffc48e" {...THIN} strokeWidth="1.1" />
      <path d="M20 14.4 v7.4 M16.3 18.1 h7.4" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M10.6 15 v6.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  // 에너지 젤: 연봉이 오름 · 다시 취업
  gel: (
    <>
      <path d="M11.4 9.4 H28.6 L26.4 14 V31.6 A5 5 0 0 1 21.4 36.6 H18.6 A5 5 0 0 1 13.6 31.6 V14 Z" fill="#ffb347" {...LINE} />
      <rect x="15" y="4.2" width="10" height="5.6" rx="2" fill="#ff8a3d" {...LINE} />
      <path d="M21.8 15.6 L16.8 24.4 H20.6 L18.6 31.2 L24.6 21.8 H20.8 L22.8 15.6 Z" fill="#ffffff" {...THIN} />
      <path d="M15.8 15.4 v13.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      {twinkle(33.4, 12.4, 3)}
      {twinkle(6.6, 22, 2)}
    </>
  ),
  // 급수대: 만기 · 매달 지출이 줄어듦 (빨대 꽂은 물컵)
  water: (
    <>
      <path d="M23.4 12.6 L26.6 3.4 H31" stroke={OUT} strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.4 12.6 L26.6 3.4 H31" stroke="#ff8fab" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.8 12.6 H30.2 L27.4 35.8 A2 2 0 0 1 25.4 37.6 H14.6 A2 2 0 0 1 12.6 35.8 Z" fill="#f4fbff" />
      <path d="M10.7 20.2 H29.3 L27.4 35.8 A2 2 0 0 1 25.4 37.6 H14.6 A2 2 0 0 1 12.6 35.8 Z" fill="#7cc8ff" />
      <path d="M11.4 20.2 H28.6" stroke="#bfe5ff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.8 12.6 H30.2 L27.4 35.8 A2 2 0 0 1 25.4 37.6 H14.6 A2 2 0 0 1 12.6 35.8 Z" fill="none" {...LINE} />
      <rect x="8.4" y="10.4" width="23.2" height="3.8" rx="1.9" fill="#e4f3ff" {...LINE} />
      <path d="M14 17 l1.6 16" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
      {drop(5.6, 4.6, 1.6)}
    </>
  ),
  // 응원: 환급 · 빚 다 갚음 (웃는 하트)
  cheer: (
    <>
      <path d="M20 35.4 C20 35.4 5.4 26.6 5.4 16.6 A7.4 7.4 0 0 1 20 13.2 A7.4 7.4 0 0 1 34.6 16.6 C34.6 26.6 20 35.4 20 35.4 Z" fill="#ff7d96" {...LINE} />
      <path d="M9.4 16 C9.8 13 12.4 11.4 14.8 12" stroke="#ffc6d2" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M14.2 21.8 q1.7 -2.1 3.4 0 M22.4 21.8 q1.7 -2.1 3.4 0" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M18 24.4 q2 2.6 4 0 z" fill="#c8344f" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx="12.6" cy="25" rx="1.9" ry="1.1" fill="#ff4f73" opacity="0.45" />
      <ellipse cx="27.4" cy="25" rx="1.9" ry="1.1" fill="#ff4f73" opacity="0.45" />
      {twinkle(34, 5.6, 3)}
      {twinkle(6, 6.4, 2.2)}
    </>
  ),
};
