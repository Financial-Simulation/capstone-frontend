/**
 * 인생 장면 배경 (LifeScene). 캐릭터 · 코스 배경과 같은 말랑한 그림체 (ArtKit: 먼 풍경은 테두리 없는 파스텔, 길가는 갈색 테두리).
 * 배경 세 겹은 CourseArt와 같은 칸 크기(먼 풍경 400 × 100 · 길가 240 × 40 · 길 200 × 34)라 같은 줄(Strip)에 이어 붙여 걷는 빠르기로 흘린다.
 * 칸 안에서만 그려 이어 붙여도 끊기지 않는다.
 *  - 예식장(hall): 하트 스테인드글라스 아치 창 · 꽃 리스 · 샹들리에 · 꽃 덩굴 / 의자에 앉아 손뼉 치는 꼬마 하객 · 꽃 스탠드 / 흰 버진로드와 꽃잎
 *  - 동네(town): 파스텔 빌라 · 지붕 집 · 나무 / 울타리 · 우체통 · 가로등 · 화단 / 보도블록
 *  - 도심(city): 파스텔 유리 빌딩 / 은행나무 · 버스 정류장 · 가로등 / 보도블록
 *  - 강변 도로(drive): 가드레일 · 아스팔트 · 차선 (먼 풍경 · 길가는 한강 코스 그림)
 * 장면마다 한 번 그리는 소품(꽃 아치 · 부모님 집 · 이삿짐 트럭 · 새 회사 · 오픈카)은 LifeProps. 그림은 꾸밈이라 aria-hidden.
 */
import type { ReactNode } from "react";
import { farBlock, farGround, farTree, heart, miniHead, nBush, nFlowers, nLamp, nRail, nTree, rad } from "./ArtKit";
import { NW, OUT, SKIN } from "./palette";

export type LifeBackdrop = "hall" | "town" | "city";

/** 배경 하늘 (예식장은 벽 색) */
export const BACKDROP_SKY: Record<LifeBackdrop, [string, string]> = {
  hall: ["#fff6f1", "#ffeef2"],
  town: ["#e2f0ff", "#cfe5fb"],
  city: ["#e7f0fd", "#d3e3f7"],
};

export function LifeFar({ kind, className = "h-full w-auto" }: { kind: LifeBackdrop; className?: string }) {
  return (
    <svg viewBox="0 0 400 100" aria-hidden overflow="visible" className={`shrink-0 ${className}`} preserveAspectRatio="xMidYMax meet">
      {FAR[kind]}
    </svg>
  );
}

export function LifeNear({ kind, className = "h-full w-auto" }: { kind: LifeBackdrop; className?: string }) {
  return (
    <svg viewBox="0 0 240 40" aria-hidden overflow="visible" className={`shrink-0 ${className}`} preserveAspectRatio="xMidYMax meet">
      {NEAR[kind]}
    </svg>
  );
}

export function LifeRoad({ kind, className = "h-full w-auto" }: { kind: LifeBackdrop | "drive"; className?: string }) {
  return (
    <svg viewBox="0 0 200 34" aria-hidden overflow="visible" className={`shrink-0 ${className}`} preserveAspectRatio="xMidYMax meet">
      {ROAD[kind]}
    </svg>
  );
}

// ===== 작은 부품 =====

/** 다섯 잎 꽃 (테두리 없음, 먼 풍경용) */
const bloom = (x: number, y: number, r: number, color: string, center = "#fff3c4") => (
  <g key={`bloom${x}-${y}`}>
    {[0, 72, 144, 216, 288].map((deg) => (
      <circle key={deg} cx={x + r * 0.6 * Math.cos(rad(deg - 90))} cy={y + r * 0.6 * Math.sin(rad(deg - 90))} r={r * 0.5} fill={color} />
    ))}
    <circle cx={x} cy={y} r={r * 0.34} fill={center} />
  </g>
);

// ===== 먼 풍경 부품 =====

/** 꽃 리스: 하트를 품은 둥근 잎 고리와 리본 */
const wreath = (cx: number, cy: number) => (
  <g key={`wreath${cx}`}>
    <circle cx={cx} cy={cy} r="15" fill="none" stroke="#b5dd9f" strokeWidth="6" />
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * 360;
      const x = cx + 15 * Math.cos(rad(a));
      const y = cy + 15 * Math.sin(rad(a));
      return <ellipse key={i} cx={x} cy={y} rx="4.2" ry="2" fill="#93cf7e" transform={`rotate(${a + 90 + (i % 2 ? 24 : -24)} ${x} ${y})`} />;
    })}
    {[200, 250, 300, 340, 20].map((a, i) => bloom(cx + 15 * Math.cos(rad(a)), cy + 15 * Math.sin(rad(a)), i % 2 ? 5 : 6, i % 2 ? "#ffffff" : "#ffb3c6"))}
    {heart(cx, cy + 1, 1.25, "#ffa3b9")}
    <path d={`M${cx} ${cy + 15} c-3 -5 -10 -4 -8 1 c1 3 5 2 8 -1 z M${cx} ${cy + 15} c3 -5 10 -4 8 1 c-1 3 -5 2 -8 -1 z`} fill="#ff9fb6" />
    <path d={`M${cx - 1} ${cy + 16} l-4 8 M${cx + 1} ${cy + 16} l4 8`} stroke="#ff9fb6" strokeWidth="2" strokeLinecap="round" />
  </g>
);

/** 샹들리에: 금빛 고리 · 초 세 자루 · 동그란 크리스털 */
const chandelier = (x: number) => (
  <g key={`chand${x}`}>
    <path d={`M${x} -14 V7`} stroke="#e4bd62" strokeWidth="1.2" />
    <path d={`M${x - 15} 10 q15 10 30 0`} stroke="#e4bd62" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d={`M${x - 10} 7.4 h20`} stroke="#e4bd62" strokeWidth="1.8" strokeLinecap="round" />
    {[-10, 0, 10].map((dx) => (
      <g key={dx}>
        <rect x={x + dx - 1.3} y="1.4" width="2.6" height="6" rx="1" fill="#ffffff" />
        <ellipse cx={x + dx} cy="-0.6" rx="1.4" ry="2.2" fill="#ffc55c" />
      </g>
    ))}
    {[-15, -7.5, 0, 7.5, 15].map((dx, i) => (
      <g key={`c${dx}`}>
        <path d={`M${x + dx} ${i === 2 ? 15 : 12} v3`} stroke="#eadff2" strokeWidth="1" />
        <circle cx={x + dx} cy={i === 2 ? 20 : 17} r="2" fill="#ffffff" />
        <circle cx={x + dx - 0.6} cy={i === 2 ? 19.4 : 16.4} r="0.7" fill="#dcd3f2" />
      </g>
    ))}
  </g>
);

/** 빌라: 왼쪽 x, 폭 w, 높이 h (바닥 y 100), 벽 · 지붕 테 색, 옥상 물탱크 */
const villa = (x: number, w: number, h: number, wall: string, trim: string, tank = "#ff9f8f") => (
  <g key={`villa${x}`}>
    <rect x={x + w * 0.62} y={100 - h - 10} width="10" height="8.6" rx="3" fill={tank} />
    {farBlock(x, w, h, wall, { roof: trim, win: "#86bde8", rows: Math.max(1, Math.floor((h - 18) / 10)), cols: 2 })}
    <rect x={x + w * 0.4} y="89" width={w * 0.2} height="11" rx="2" fill="#c99d78" />
  </g>
);

// ===== 먼 풍경 (400 × 100) =====

const FAR: Record<LifeBackdrop, ReactNode> = {
  // 예식장 벽: 꽃 덩굴 · 아치 창(하트 스테인드글라스) · 꽃 리스 · 샹들리에 · 아래 벽 판과 창으로 들어온 빛
  hall: (
    <>
      <rect x="-1" y="-40" width="402" height="140" fill="#fff5f0" />
      {[96, 296].map((cx) => (
        <g key={cx}>
          <path d={`M${cx - 29} 74 V36 a29 29 0 0 1 58 0 V74 Z`} fill="#f9e3d9" />
          <path d={`M${cx - 23} 74 V37 a23 23 0 0 1 46 0 V74 Z`} fill="#e2f1ff" />
          <path d={`M${cx - 23} 55 H${cx + 23} M${cx} 14 V74`} stroke="#ffffff" strokeWidth="2.6" />
          <path d={`M${cx - 15} 47 l8 -7 M${cx + 7} 67 l7 -6`} stroke="#ffffff" strokeWidth="3" opacity="0.85" strokeLinecap="round" />
          {heart(cx, 30.6, 1.2, "#ffc4d2")}
          <rect x={cx - 32} y="71.4" width="64" height="5" rx="2.5" fill="#f3d5c9" />
        </g>
      ))}
      {wreath(196, 40)}
      {chandelier(46)}
      {chandelier(246)}
      {/* 꽃 덩굴: 칸 끝(0 · 400)에서 이어진다 */}
      <path d="M0 3 Q50 19 100 3 Q150 19 200 3 Q250 19 300 3 Q350 19 400 3" stroke="#a3d18e" strokeWidth="2.6" fill="none" />
      {[12, 38, 62, 88].flatMap((dx) =>
        [0, 100, 200, 300].map((x0) => {
          const x = x0 + dx;
          const t = dx / 100;
          const y = 3 + 32 * t * (1 - t);
          return <ellipse key={`lf${x}`} cx={x} cy={y + 2.4} rx="3.2" ry="1.6" fill="#93cf7e" transform={`rotate(${dx < 50 ? 30 : -30} ${x} ${y + 2.4})`} />;
        }),
      )}
      {[25, 50, 75, 125, 150, 175, 225, 250, 275, 325, 350, 375].map((x, i) => bloom(x, 3 + 32 * ((x % 100) / 100) * (1 - (x % 100) / 100), i % 3 === 1 ? 6.4 : 5, i % 2 ? "#ffffff" : "#ffb8c9"))}
      {[0, 100, 200, 300, 400].map((x) => bloom(x, 3, 9, "#ffc9d6", "#ffffff"))}
      {/* 아래 벽 판 */}
      <rect x="-1" y="74" width="402" height="26" fill="#f9e2d9" />
      <rect x="-1" y="72.4" width="402" height="3.6" rx="1.8" fill="#f1cfc2" />
      {[12, 62, 112, 162, 212, 262, 312, 362].map((x) => (
        <rect key={x} x={x} y="80" width="40" height="14" rx="3" fill="#fcebe4" />
      ))}
      {[96, 296].map((cx) => (
        <path key={`sun${cx}`} d={`M${cx - 23} 76 H${cx + 23} L${cx + 54} 100 H${cx + 6} Z`} fill="#ffffff" opacity="0.4" />
      ))}
    </>
  ),
  // 동네: 먼 아파트 · 파스텔 빌라 · 둥근 지붕 집 · 나무
  town: (
    <>
      {farBlock(14, 46, 80, "#d6e2f3", { rows: 7, cols: 3 })}
      {farBlock(300, 42, 70, "#dbe3f4", { rows: 6, cols: 3 })}
      {farTree(52, 0.9, "#9ad884")}
      {villa(66, 52, 52, "#fcefdc", "#f29d7e")}
      {villa(126, 40, 42, "#f8cfb0", "#d18d70", "#7cc4ff")}
      {farTree(178, 1.3, "#8fd07e")}
      {villa(196, 56, 60, "#fffaf2", "#93bde9")}
      <g>
        <rect x="262" y="70" width="36" height="32" rx="3" fill="#fff0db" />
        <path d="M255.6 73 C255.6 71.2 256.4 70.2 258 69.2 L277.6 56 C279.1 55 280.9 55 282.4 56 L302 69.2 C303.6 70.2 304.4 71.2 304.4 73 Z" fill="#ff917a" />
        <path d="M266 64.6 L280 55.6" stroke="#ffffff" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
        <rect x="268" y="78" width="9" height="8" rx="2" fill="#a6d3f5" />
        <rect x="283" y="84" width="8" height="16" rx="2" fill="#c99d78" />
      </g>
      {villa(346, 46, 46, "#f4e5c9", "#d6a27a")}
      {farTree(334, 1, "#86cb73")}
      {farGround("#a8d99a")}
    </>
  ),
  // 도심: 파스텔 유리 빌딩 · 둥근 지붕 건물 · 나무
  city: (
    <>
      {farBlock(6, 40, 72, "#bcd4f0", { rows: 6, cols: 3 })}
      {farBlock(50, 32, 52, "#dad4f3", { rows: 4, cols: 2 })}
      <path d="M110 26 V12" stroke="#a9bddb" strokeWidth="2" strokeLinecap="round" />
      <circle cx="110" cy="11" r="2.2" fill="#ff8f8f" />
      {farBlock(86, 48, 74, "#aac7ec", { rows: 6, cols: 4 })}
      {farBlock(138, 36, 58, "#cde6ea", { rows: 4, cols: 3 })}
      <g>
        <path d="M180 100 V44 C180 30 232 30 232 44 V100 Z" fill="#c9d6ee" />
        {[50, 60, 70, 80].map((y) => (
          <rect key={y} x="186" y={y} width="40" height="4.6" rx="2.3" fill="#ffffff" opacity="0.5" />
        ))}
        <path d="M187 39 C191 34.6 198 32.6 206 32.6" stroke="#ffffff" strokeWidth="2.4" opacity="0.5" fill="none" strokeLinecap="round" />
      </g>
      {farBlock(240, 34, 66, "#b4cdee", { rows: 5, cols: 3 })}
      <path d="M305 18 V6" stroke="#a9bddb" strokeWidth="2" strokeLinecap="round" />
      {farBlock(282, 46, 82, "#c0d3f0", { rows: 7, cols: 4 })}
      {farBlock(332, 58, 56, "#f4ddd0", { rows: 4, cols: 5 })}
      {farTree(170, 0.9, "#9ad884")}
      {farTree(236, 0.85, "#8fd07e")}
      {farTree(394, 1, "#9ad884")}
      {farGround("#c6d9b8")}
    </>
  ),
};

// ===== 길가 부품 (240 × 40, 바닥 y 40) =====

/** 하객 의자 (흰 덮개 · 분홍 리본) */
const chair = (x: number) => (
  <g key={`chair${x}`}>
    <path d={`M${x + 1.4} 31 V39.2 M${x + 13} 31 V39.2`} stroke={OUT} strokeWidth="1.6" strokeLinecap="round" />
    <rect x={x - 1.8} y="10.6" width="5.2" height="20.4" rx="2.4" fill="#ffffff" stroke={OUT} strokeWidth="1.1" />
    <rect x={x - 1.2} y="27.4" width="16" height="3.8" rx="1.9" fill="#ffffff" stroke={OUT} strokeWidth="1.1" />
    <path d={`M${x + 0.8} 17.4 l-1.8 6.4`} stroke="#ff9fb6" strokeWidth="1.4" strokeLinecap="round" />
    <path d={`M${x + 0.8} 17.4 l-4.6 -3 v6 z`} fill="#ff9fb6" stroke={OUT} strokeWidth="0.8" strokeLinejoin="round" />
  </g>
);

/** 의자에 앉아 손뼉 치는 꼬마 하객 (신랑 신부가 걸어가는 오른쪽을 본다). 팔(rn-clap)이 손뼉을 친다 */
const guest = (x: number, shirt: string, hair: string, long = false, delay = 0) => (
  <g key={`guest${x}`}>
    {chair(x)}
    <path d={`M${x + 8} 28.6 H${x + 14.4} V36.8`} stroke={OUT} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x={x + 2.6} y="17.4" width="10.4" height="12" rx="4" fill={shirt} stroke={OUT} strokeWidth="1.2" />
    {miniHead(x + 7.8, 11.2, 6.6, hair, { right: true, long })}
    <g className="rn-clap" style={{ animationDelay: `${-delay}s` }}>
      <path d={`M${x + 9} 21.4 L${x + 14.8} 18.4`} stroke={OUT} strokeWidth="3.6" strokeLinecap="round" />
      <path d={`M${x + 9} 21.4 L${x + 14.8} 18.4`} stroke={SKIN} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  </g>
);

/** 꽃 스탠드: 금빛 기둥 위 꽃 뭉치 */
const flowerStand = (x: number) => (
  <g key={`stand${x}`}>
    <path d={`M${x - 9} 12.6 q-3.6 6 -1.2 12.4 M${x + 9} 12.6 q3.6 6 1.2 12.4`} stroke={OUT} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <path d={`M${x - 9} 12.6 q-3.6 6 -1.2 12.4 M${x + 9} 12.6 q3.6 6 1.2 12.4`} stroke="#8fd07e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d={`M${x - 6} 39 h12`} stroke={OUT} strokeWidth="3.6" strokeLinecap="round" />
    <path d={`M${x - 6} 39 h12`} stroke="#f2c661" strokeWidth="1.8" strokeLinecap="round" />
    <rect x={x - 1.4} y="17" width="2.8" height="22" rx="1.2" fill="#f2c661" stroke={OUT} strokeWidth="1" />
    <path d={`M${x - 7.4} 16 h14.8 l-2.6 4 h-9.6 z`} fill="#f2c661" stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
    {(
      [
        [-5.4, 11, "#ffffff"],
        [5.4, 11, "#ffffff"],
        [0, 6.6, "#ffc2d1"],
        [-2.6, 13.6, "#ff9fb6"],
        [3, 14, "#fff1c1"],
      ] as const
    ).map(([dx, y, color]) => (
      <g key={`${dx}-${y}`}>
        <circle cx={x + dx} cy={y} r="4.4" fill={color} stroke={OUT} strokeWidth="0.9" />
        <circle cx={x + dx - 0.4} cy={y - 0.2} r="1.3" fill="#ffffff" opacity="0.7" />
      </g>
    ))}
  </g>
);

// ===== 길가 (240 × 40) =====

const NEAR: Record<LifeBackdrop, ReactNode> = {
  // 하객석과 꽃 스탠드
  hall: (
    <>
      {guest(12, "#8cc1ff", "#5c3b2f", false, 0)}
      {guest(38, "#ffb36b", "#4a2c23", true, 0.2)}
      {flowerStand(78)}
      {guest(100, "#b9a3ff", "#2b2230", false, 0.12)}
      {chair(128)}
      {guest(152, "#7fd6b0", "#5c3b2f", true, 0.3)}
      {flowerStand(196)}
      {guest(216, "#ff9fb6", "#3b2a24", false, 0.06)}
    </>
  ),
  // 울타리 · 덤불 · 가로수 · 가로등 · 우체통 · 화단
  town: (
    <>
      {nRail(-2, 242, 24, "#fbf3e4", 20)}
      {nBush(18, "#7cc46a", 0.95)}
      {nTree(64, 1.25, "#8fd07e")}
      {nLamp(112)}
      <g>
        <rect x="140.4" y="26" width="3.2" height="14" rx="1.2" fill="#8a8f9a" stroke={OUT} strokeWidth="1.1" />
        <path d="M133 27.4 V19.4 a9 9 0 0 1 18 0 V27.4 Z" fill="#ff6f61" stroke={OUT} strokeWidth={NW} strokeLinejoin="round" />
        <rect x="137" y="20.6" width="10" height="2.2" rx="1.1" fill="#8f2f28" />
        <path d="M135.8 18 q0.6 -3.2 3.2 -4.6" stroke="#ffffff" strokeWidth="1.3" fill="none" opacity="0.6" strokeLinecap="round" />
      </g>
      {nBush(184, "#6fb85e", 0.85)}
      {nFlowers(218, ["#ff8fab", "#ffd166", "#b69cff"], 31)}
      <rect x="204" y="30" width="28" height="10" rx="2.4" fill="#d6a47a" stroke={OUT} strokeWidth={NW} />
      <path d="M207 33.6 h22" stroke="#e9bd95" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // 은행나무 · 버스 정류장 · 가로등
  city: (
    <>
      {nTree(22, 1.3, "#d6e26e")}
      <g>
        <rect x="104" y="14" width="40" height="26" rx="2" fill="#e8f3ff" fillOpacity="0.85" stroke={OUT} strokeWidth="1.2" />
        <path d="M124 15 V39" stroke={OUT} strokeWidth="1" opacity="0.4" />
        <rect x="100" y="10.6" width="48" height="4.4" rx="2.2" fill="#8193b5" stroke={OUT} strokeWidth="1.2" />
        <rect x="110" y="30" width="28" height="3.2" rx="1.6" fill="#d6a47a" stroke={OUT} strokeWidth="1" />
        <path d="M107 18 l5 -3" stroke="#ffffff" strokeWidth="1.6" opacity="0.8" strokeLinecap="round" />
        <rect x="90.8" y="12" width="2.4" height="28" rx="1.2" fill="#8a8f9a" stroke={OUT} strokeWidth="1" />
        <circle cx="92" cy="9.6" r="6" fill="#5aa6ff" stroke={OUT} strokeWidth="1.2" />
        <rect x="88.6" y="6.8" width="6.8" height="4.8" rx="1.4" fill="#ffffff" />
        <path d="M89.8 12.2 h1.4 M92.8 12.2 h1.4" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {nLamp(172)}
      {nTree(212, 1.2, "#cadc62")}
    </>
  ),
};

// ===== 길 (200 × 34) =====

/** 보도: 풀 · 둥근 연석 · 동글동글한 보도블록 (칸 폭 200이 블록 폭 40의 배수라 끊기지 않는다) */
const paving = (grass: string, grout: string, a: string, b: string) => (
  <>
    <rect x="-1" width="202" height="34" fill={grout} />
    <rect x="-1" width="202" height="3.6" fill={grass} />
    <rect x="-1" y="3.6" width="202" height="5" fill="#f2f4f7" />
    <path d="M-1 3.6h202M-1 8.6h202" stroke={OUT} strokeWidth="1.1" opacity="0.45" />
    {[0, 1, 2].map((row) =>
      Array.from({ length: 6 }, (_, k) => (
        <rect key={`${row}-${k}`} x={(row % 2 ? -20 : 0) + k * 40 + 1} y={9.8 + row * 8} width="38" height="7" rx="2.6" fill={(row + k) % 2 ? b : a} />
      )),
    )}
    <path d="M14 12.4h6M76 20.4h8M138 28.4h6" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
  </>
);

const ROAD: Record<LifeBackdrop | "drive", ReactNode> = {
  // 흰 버진로드 (금빛 테 · 꽃잎)
  hall: (
    <>
      <rect x="-1" width="202" height="34" fill="#f6e3d7" />
      <path d="M-1 2.6h202" stroke="#ecd3c4" strokeWidth="1" />
      <rect x="-1" y="5.6" width="202" height="24" fill="#fffdfa" />
      <path d="M-1 5.6h202M-1 29.6h202" stroke={OUT} strokeWidth="1" opacity="0.3" />
      <path d="M-1 8h202M-1 27.2h202" stroke="#ecc96b" strokeWidth="1.4" />
      {(
        [
          [18, 14, 20, "#ffb3c6"],
          [56, 22, -30, "#ffd3de"],
          [94, 12, 50, "#ffb3c6"],
          [128, 20, 10, "#ffc6d3"],
          [166, 15, -40, "#ffb3c6"],
          [188, 23, 70, "#ffd3de"],
        ] as const
      ).map(([x, y, r, color]) => (
        <ellipse key={x} cx={x} cy={y} rx="2.8" ry="1.6" fill={color} transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </>
  ),
  town: paving("#a8d99a", "#dccfbd", "#f1e7d8", "#eadcc9"),
  city: paving("#b7d9a2", "#ced3db", "#e9ecf1", "#e0e4eb"),
  // 강변 도로: 둥근 가드레일 · 아스팔트 · 노란 중앙선 · 흰 차선
  drive: (
    <>
      <rect x="-1" width="202" height="34" fill="#9fd3aa" />
      <rect x="-1" y="2.4" width="202" height="3" rx="1.5" fill="#ffffff" stroke={OUT} strokeWidth="1" />
      {[10, 60, 110, 160].map((x) => (
        <rect key={x} x={x} y="1" width="3.4" height="7.6" rx="1.4" fill="#e3e7ee" stroke={OUT} strokeWidth="1" />
      ))}
      <rect x="-1" y="8.6" width="202" height="25.4" fill="#9aa4b8" />
      <path d="M-1 8.6h202" stroke={OUT} strokeWidth="1.1" opacity="0.45" />
      <path d="M-1 11.6h202" stroke="#ffd166" strokeWidth="1.8" />
      {[8, 58, 108, 158].map((x) => (
        <rect key={x} x={x} y="19.6" width="30" height="2.8" rx="1.4" fill="#ffffff" />
      ))}
      <path d="M-1 31.2h202" stroke="#ffffff" strokeWidth="1.4" opacity="0.9" />
    </>
  ),
};
