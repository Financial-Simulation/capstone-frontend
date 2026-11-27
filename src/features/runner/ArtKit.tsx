/**
 * 배경 그림 부품 (CourseArt · LifeArt · LifeProps가 같이 쓴다). 캐릭터와 같은 '말랑한' 그림체:
 *  - 먼 풍경(400 × 100 칸): 테두리 없이 파스텔 실루엣 + 위쪽 밝은 띠, 모서리는 둥글게
 *  - 길가(240 × 40 칸): 따뜻한 갈색 테두리(OUT)를 두른 동글동글한 나무 · 덤불 · 가로등과 응원하는 꼬마 관중(작은 2등신)
 *  - 작은 부품: 하트 · 꼬마 마스코트 얼굴 (하객 · 가족 · 운전사)
 * 함수는 칸 배열 안에서 바로 쓰도록 key를 단 요소를 돌려준다. 그림은 꾸밈이라 aria-hidden(칸을 그리는 svg가 단다).
 */
import { BLUSH, INK, MOUTH_LINE, NW, OUT, SKIN } from "./palette";

/** 도 → 라디안 */
export const rad = (deg: number) => (deg * Math.PI) / 180;

// ===== 먼 풍경 (테두리 없음) =====

/** 둥근 언덕: 가운데 cx, 폭 w, 높이 h (바닥 y 100) */
export const farHill = (cx: number, w: number, h: number, color: string, hi?: string) => (
  <g key={`hill${cx}-${w}`}>
    <path d={`M${cx - w / 2} 100 C${cx - w * 0.36} ${100 - h * 1.25} ${cx + w * 0.36} ${100 - h * 1.25} ${cx + w / 2} 100 Z`} fill={color} />
    {hi && <path d={`M${cx - w * 0.3} ${100 - h * 0.72} C${cx - w * 0.16} ${100 - h * 0.95} ${cx} ${100 - h * 0.98} ${cx + w * 0.1} ${100 - h * 0.96}`} stroke={hi} strokeWidth="3" fill="none" strokeLinecap="round" />}
  </g>
);

/** 먼 나무: 동그란 머리 + 짧은 줄기 (바닥 y base) */
export const farTree = (x: number, s: number, color: string, base = 96) => (
  <g key={`ftree${x}-${base}`} transform={`translate(${x} ${base}) scale(${s})`}>
    <rect x="-1.6" y="-9" width="3.2" height="9" rx="1.4" fill="#a67c5b" />
    <circle cx="0" cy="-15" r="9.6" fill={color} />
    <circle cx="-6" cy="-10" r="6" fill={color} />
    <circle cx="6" cy="-10.6" r="6.4" fill={color} />
    <circle cx="-3" cy="-19" r="3.4" fill="#ffffff" opacity="0.22" />
  </g>
);

/**
 * 먼 건물: 왼쪽 x, 폭 w, 높이 h (바닥 y 100), 모서리 둥근 상자 + 둥근 창 + 위쪽 밝은 띠.
 * rows/cols를 0으로 주면 창이 없다
 */
export const farBlock = (x: number, w: number, h: number, color: string, opts: { win?: string; hi?: string; rows?: number; cols?: number; roof?: string } = {}) => {
  const win = opts.win ?? "#ffffff";
  const rows = opts.rows ?? Math.max(1, Math.floor((h - 10) / 10));
  const cols = opts.cols ?? Math.max(1, Math.floor((w - 6) / 9));
  const gx = (w - 6) / cols;
  return (
    <g key={`blk${x}-${w}-${h}`}>
      <rect x={x} y={100 - h} width={w} height={h + 4} rx="4" fill={color} />
      {opts.roof && <rect x={x - 1} y={100 - h - 2} width={w + 2} height="4.4" rx="2.2" fill={opts.roof} />}
      <rect x={x + 2} y={100 - h + 2} width={Math.max(w * 0.22, 3)} height={h - 4} rx="2" fill={opts.hi ?? "#ffffff"} opacity="0.18" />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect key={`${r}-${c}`} x={x + 3 + c * gx + gx * 0.22} y={100 - h + 6 + r * 10} width={gx * 0.56} height="5" rx="1.6" fill={win} opacity="0.55" />
        )),
      )}
    </g>
  );
};

/** 땅 띠 (먼 풍경 칸 맨 아래) */
export const farGround = (color: string) => (
  <g key="ground">
    <rect x="-1" y="94" width="402" height="7" fill={color} />
    <path d="M-1 94.6h402" stroke="#ffffff" strokeWidth="1.4" opacity="0.35" />
  </g>
);

// ===== 길가 (테두리 있음, 바닥 y 40) =====

/** 동그란 나무 (막대 사탕 모양): 가운데 x, 크기 s, 잎 색 */
export const nTree = (x: number, s = 1, color = "#7cc46a", base = 40) => (
  <g key={`ntree${x}-${base}`} transform={`translate(${x} ${base}) scale(${s})`}>
    <rect x="-2.4" y="-14" width="4.8" height="14" rx="2" fill="#b0845f" stroke={OUT} strokeWidth={NW} />
    <path d="M-12 -17 C-16 -27 -8 -35 0 -34 C8 -35 16 -27 12 -17 C10 -11 -10 -11 -12 -17 Z" fill={color} stroke={OUT} strokeWidth={NW} strokeLinejoin="round" />
    <path d="M-6 -27 C-4 -30 0 -31 3 -30" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" />
  </g>
);

/** 덤불: 가운데 x */
export const nBush = (x: number, color = "#6fb85e", s = 1, base = 40) => (
  <g key={`nbush${x}-${base}`} transform={`translate(${x} ${base}) scale(${s})`}>
    <path d="M-14 0 C-17 -6 -12 -11 -7 -9 C-6 -15 3 -16 5 -10 C10 -13 16 -8 14 0 Z" fill={color} stroke={OUT} strokeWidth={NW} strokeLinejoin="round" />
    <circle cx="-4" cy="-8" r="1.6" fill="#ffffff" opacity="0.4" />
  </g>
);

/** 가로등 */
export const nLamp = (x: number, base = 40) => (
  <g key={`nlamp${x}-${base}`}>
    <rect x={x - 1.4} y={base - 32} width="2.8" height="32" rx="1.2" fill="#6b7383" stroke={OUT} strokeWidth="1.1" />
    <path d={`M${x - 6} ${base - 31} H${x + 6} L${x + 4} ${base - 36} H${x - 4} Z`} fill="#4f5666" stroke={OUT} strokeWidth="1.1" strokeLinejoin="round" />
    <circle cx={x} cy={base - 29.4} r="2.4" fill="#ffe58a" />
  </g>
);

/** 작은 꽃밭 */
export const nFlowers = (x: number, colors: string[] = ["#ff8fab", "#ffd166", "#b69cff"], base = 40) => (
  <g key={`nflw${x}-${base}`}>
    <path d={`M${x - 8} ${base} q2 -5 4 -6 M${x} ${base} q0 -6 1 -8 M${x + 7} ${base} q-1 -5 -3 -6`} stroke="#6aa35b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    {colors.map((c, i) => (
      <circle key={c + i} cx={x - 5 + i * 6} cy={base - 7 - (i % 2) * 2} r="2.6" fill={c} stroke={OUT} strokeWidth="0.9" />
    ))}
  </g>
);

export type FanPose = "up" | "flag" | "balloon" | "clap";

/**
 * 응원하는 꼬마 관중 (작은 2등신 마스코트, 발이 y base): 큰 머리 · 점 눈 · 볼터치.
 * up 두 팔 번쩍 · flag 깃발 흔들기 · balloon 풍선 · clap 손뼉
 */
export const nFan = (x: number, shirt: string, hair: string, pose: FanPose = "up", prop = "#ff6b6b", base = 40) => {
  const y = base;
  const armUp = pose === "up" || pose === "flag" || pose === "balloon";
  const arms = armUp
    ? `M${x - 4} ${y - 12} L${x - 8} ${y - 19.6} M${x + 4} ${y - 12} L${x + 8.2} ${y - 19.6}`
    : `M${x - 4} ${y - 12} L${x - 1} ${y - 16} M${x + 4} ${y - 12} L${x + 1.4} ${y - 16}`;
  return (
    <g key={`nfan${x}-${base}`}>
      {pose === "balloon" && (
        <>
          <path d={`M${x + 7.6} ${y - 21} C${x + 9} ${y - 26} ${x + 7} ${y - 29} ${x + 9} ${y - 33}`} stroke="#8a8f9a" strokeWidth="0.8" fill="none" />
          <ellipse cx={x + 9.6} cy={y - 37.6} rx="4.6" ry="5.4" fill={prop} stroke={OUT} strokeWidth="1.1" />
          <path d={`M${x + 8} ${y - 39.6} q1.4 -1.6 3 -1`} stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.8" />
        </>
      )}
      {pose === "flag" && (
        <>
          <path d={`M${x + 8.4} ${y - 21} V${y - 33}`} stroke="#8a8f9a" strokeWidth="1" />
          <path d={`M${x + 8.4} ${y - 33} h8 l-2.2 2.8 2.2 2.8 h-8 z`} fill={prop} stroke={OUT} strokeWidth="0.9" strokeLinejoin="round" />
        </>
      )}
      {/* 다리 · 몸 */}
      <path d={`M${x - 2} ${y - 5} V${y - 0.8} M${x + 2.2} ${y - 5} V${y - 0.8}`} stroke={OUT} strokeWidth="2.6" strokeLinecap="round" />
      <rect x={x - 5} y={y - 15} width="10" height="11" rx="4" fill={shirt} stroke={OUT} strokeWidth="1.2" />
      {/* 팔 */}
      <g strokeLinecap="round">
        <path d={arms} stroke={OUT} strokeWidth="3.6" />
        <path d={arms} stroke={SKIN} strokeWidth="1.8" />
      </g>
      {/* 머리 */}
      <circle cx={x} cy={y - 21.6} r="7" fill={SKIN} stroke={OUT} strokeWidth="1.2" />
      <path d={`M${x - 7} ${y - 22} C${x - 7.4} ${y - 30} ${x + 6} ${y - 31.6} ${x + 7} ${y - 23.4} C${x + 4} ${y - 26.4} ${x - 2} ${y - 26.6} ${x - 7} ${y - 22} Z`} fill={hair} stroke={OUT} strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx={x - 0.6} cy={y - 20.6} r="0.95" fill={INK} />
      <circle cx={x + 3.4} cy={y - 20.8} r="0.95" fill={INK} />
      <ellipse cx={x - 2.6} cy={y - 18.2} rx="1.5" ry="0.9" fill={BLUSH} opacity="0.7" />
      <path d={`M${x + 0.6} ${y - 18} q1 0.9 2 0`} stroke={MOUTH_LINE} strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
};

/** 둥근 기둥 울타리: x부터 x2까지, 위 난간 높이 top (바닥 y 40) */
export const nRail = (x: number, x2: number, top: number, color = "#ffffff", step = 20, base = 40) => (
  <g key={`nrail${x}-${top}`}>
    <rect x={x} y={top} width={x2 - x} height="3" rx="1.5" fill={color} stroke={OUT} strokeWidth="1.1" />
    <rect x={x} y={top + 8} width={x2 - x} height="2.6" rx="1.3" fill={color} stroke={OUT} strokeWidth="1" />
    {Array.from({ length: Math.floor((x2 - x) / step) + 1 }, (_, i) => (
      <rect key={i} x={x + i * step - 1.8} y={top - 2} width="3.6" height={base - top + 2} rx="1.6" fill={color} stroke={OUT} strokeWidth="1.1" />
    ))}
  </g>
);

// ===== 작은 부품 =====

/** 하트 (가운데 x y, 크기 s). stroke면 갈색 테두리 */
export const heart = (x: number, y: number, s: number, color: string, opts: { stroke?: boolean; className?: string } = {}) => (
  <path
    key={`heart${x}-${y}`}
    className={opts.className}
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 6 C-6 1.6 -8 -2.6 -5.2 -5 C-3 -6.8 -0.8 -5.6 0 -3.6 C0.8 -5.6 3 -6.8 5.2 -5 C8 -2.6 6 1.6 0 6 Z"
    fill={color}
    stroke={opts.stroke ? OUT : undefined}
    strokeWidth={opts.stroke ? 1.3 / s : undefined}
    strokeLinejoin="round"
  />
);

/**
 * 꼬마 얼굴 (작은 2등신 마스코트의 머리, 가운데 x y · 반지름 r): 점 눈 · 볼터치 · 작은 입.
 * right면 오른쪽을 본다 (눈이 오른쪽으로). long은 긴 머리, cap은 모자 색 (챙이 오른쪽)
 */
export const miniHead = (x: number, y: number, r: number, hair: string, opts: { right?: boolean; long?: boolean; cap?: string } = {}) => {
  const k = opts.right ? r * 0.3 : 0;
  const sw = Math.max(1, r * 0.17);
  return (
    <g key={`mh${x}-${y}`}>
      {opts.long && (
        <path
          d={`M${x - r * 1.02} ${y - r * 0.2} C${x - r * 1.2} ${y + r * 0.9} ${x - r * 0.9} ${y + r * 1.5} ${x - r * 0.3} ${y + r * 1.4} L${x + r * 0.4} ${y + r * 1.4} C${x + r} ${y + r * 1.5} ${x + r * 1.2} ${y + r * 0.9} ${x + r * 1.02} ${y - r * 0.2} Z`}
          fill={hair}
          stroke={OUT}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      )}
      <circle cx={x} cy={y} r={r} fill={SKIN} stroke={OUT} strokeWidth={sw} />
      <path
        d={`M${x - r} ${y - r * 0.08} C${x - r * 1.04} ${y - r * 1.24} ${x + r * 0.96} ${y - r * 1.36} ${x + r} ${y - r * 0.22} C${x + r * 0.5} ${y - r * 0.62} ${x - r * 0.28} ${y - r * 0.66} ${x - r} ${y - r * 0.08} Z`}
        fill={hair}
        stroke={OUT}
        strokeWidth={sw * 0.9}
        strokeLinejoin="round"
      />
      {opts.cap && (
        <>
          <path d={`M${x - r * 0.98} ${y - r * 0.3} C${x - r * 0.92} ${y - r * 1.34} ${x + r * 0.92} ${y - r * 1.34} ${x + r * 0.98} ${y - r * 0.3} Z`} fill={opts.cap} stroke={OUT} strokeWidth={sw * 0.9} strokeLinejoin="round" />
          <path d={`M${x + r * 0.2} ${y - r * 0.32} H${x + r * 1.5}`} stroke={OUT} strokeWidth={sw * 2.4} strokeLinecap="round" />
          <path d={`M${x + r * 0.2} ${y - r * 0.32} H${x + r * 1.5}`} stroke={opts.cap} strokeWidth={sw * 1.1} strokeLinecap="round" />
        </>
      )}
      <circle cx={x - r * 0.34 + k} cy={y + r * 0.14} r={r * 0.14} fill={INK} />
      <circle cx={x + r * 0.34 + k} cy={y + r * 0.12} r={r * 0.14} fill={INK} />
      <ellipse cx={x - r * 0.56 + k} cy={y + r * 0.5} rx={r * 0.2} ry={r * 0.12} fill={BLUSH} opacity="0.75" />
      <ellipse cx={x + r * 0.62 + k} cy={y + r * 0.46} rx={r * 0.18} ry={r * 0.11} fill={BLUSH} opacity="0.75" />
      <path d={`M${x - r * 0.12 + k} ${y + r * 0.42} q${r * 0.14} ${r * 0.16} ${r * 0.28} 0`} stroke={MOUTH_LINE} strokeWidth={sw * 0.7} fill="none" strokeLinecap="round" />
    </g>
  );
};
