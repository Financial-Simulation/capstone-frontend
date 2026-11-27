/**
 * 장면 위쪽 숫자 줄 (레이스 · 인생 장면 · 입력 옆 캐릭터): 줄(HudRow)과 칩(HudChip). 칩은 반투명 흰 바탕 · 어두운 바탕 · 금메달 바탕이고
 * 앞에 작은 아이콘(위치 핀 · 깃발 · 번개 · 메달 · 하트 · 반짝이)을 단다. 하트 · 메달 모양은 다른 그림(인생 장면 하트 · 거리 카드 안내)도 같이 쓴다.
 */
import type { ReactNode } from "react";

/** 하트 (24 × 24) */
export const HEART_PATH = "M12 21s-7.5-4.6-9.4-9.4C1.2 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.8 3.5 4.4 7.1C19.5 16.4 12 21 12 21z";
/** 메달 (24 × 24): 끈 두 갈래 · 둥근 판(가운데 12, 15.5 · 반지름 6.5) 위의 별 */
export const MEDAL_RIBBON = "M6.5 2h4l2.2 5.2-2.6 2.4zM17.5 2h-4l-1.6 3.8 2.4 3.4z";
export const MEDAL_STAR = "M12 11.6l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z";

/** 위쪽 칩 줄: 장면 위 가장자리에 붙고, 칩이 많으면 줄을 바꾼다 (오른쪽으로 보낼 칩은 ml-auto 묶음으로) */
export function HudRow({
  children,
  hidden = false,
}: {
  children: ReactNode;
  /** 장면 글을 aria-label로 따로 읽히면 칩 줄은 숨긴다 */
  hidden?: boolean;
}) {
  return (
    <div aria-hidden={hidden || undefined} className="absolute inset-x-2.5 top-2.5 flex flex-wrap items-start justify-between gap-1.5">
      {children}
    </div>
  );
}

/** 위쪽 숫자 줄의 칩: 반투명 흰 바탕 · 어두운 바탕 · 금메달 바탕 */
export function HudChip({
  children,
  dark = false,
  gold = false,
  icon,
  className = "inline-flex",
}: {
  children: ReactNode;
  dark?: boolean;
  /** 금메달 칩 (금빛 바탕) */
  gold?: boolean;
  icon?: HudIconKind;
  /** 보이기 (기본 inline-flex, 좁은 화면에서 숨기려면 "hidden sm:inline-flex") */
  className?: string;
}) {
  return (
    <span
      className={`items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ring-1 backdrop-blur sm:text-xs ${
        gold
          ? "bg-[linear-gradient(180deg,#ffe27a,#f5b40a)] text-[#5b3b00] ring-[#d99a00]/40"
          : dark
            ? "bg-ink/80 text-white ring-white/10"
            : "bg-white/85 text-ink ring-black/5"
      } ${className}`}
    >
      {icon && <HudIcon kind={icon} />}
      {children}
    </span>
  );
}

type HudIconKind = "pin" | "flag" | "bolt" | "medal" | "heart" | "spark";

/** 칩 아이콘 (칩 글자색으로 채운다) */
function HudIcon({ kind }: { kind: HudIconKind }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0" fill="currentColor">
      {kind === "medal" && (
        <>
          <path d={MEDAL_RIBBON} opacity="0.75" />
          <circle cx="12" cy="15.5" r="6.5" />
          <path d={MEDAL_STAR} fill="#fff8d6" />
        </>
      )}
      {kind === "heart" && <path d={HEART_PATH} />}
      {kind === "pin" && <path fillRule="evenodd" d="M12 22s-7-6.1-7-11.8a7 7 0 0 1 14 0C19 15.9 12 22 12 22zm0-9.3a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z" />}
      {kind === "flag" && (
        <>
          <rect x="4.6" y="2.5" width="2.4" height="19" rx="1.2" />
          <path d="M7.5 3.5h12l-2.8 4.4 2.8 4.4h-12z" />
        </>
      )}
      {kind === "bolt" && <path d="M13.5 2 4.5 13.6h6.3L9.6 22l9.4-12.1h-6.4z" />}
      {kind === "spark" && (
        <>
          <path d="M10 2.5c.7 4.6 2.4 6.4 7 7.1-4.6.7-6.3 2.5-7 7.1-.7-4.6-2.4-6.4-7-7.1 4.6-.7 6.3-2.5 7-7.1z" />
          <path d="M18.5 13.5c.4 2.4 1.2 3.2 3.5 3.6-2.3.4-3.1 1.2-3.5 3.6-.4-2.4-1.2-3.2-3.5-3.6 2.3-.4 3.1-1.2 3.5-3.6z" />
        </>
      )}
    </svg>
  );
}
