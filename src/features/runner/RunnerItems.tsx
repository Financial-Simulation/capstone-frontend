/**
 * 러너가 걸치거나 드는 것과 효과 (Runner가 몸 부품 사이사이에 끼워 그린다). 좌표는 Runner와 같은 viewBox(200 × 250).
 *  - 메달(결승선에서 금 · 은): 목에서 툭 튀어나와 걸리고 달리면 흔들린다
 *  - 러너스 하이 기운(HighAura): 결승 전에 목표 금액을 모은 뒤 몸 뒤에서 금빛 기운이 크게 퍼진다 (불꽃 머리는 RunnerFire)
 *  - 신부: 웨딩드레스 치마 · 면사포 · 부케
 *  - 소품: 배낭(등) · 끌고 가는 여행 가방(땅) · 이삿짐 상자(두 팔 사이) · 서류 가방(가까운 손)
 *  - 장비가 바뀐 칸의 효과(Burst): 좋아짐은 금빛 반짝이, 내려감은 회색 연기
 * 움직임은 runner.css · scene.css, 러너스 하이 기운은 high.css (rn- 클래스).
 */
import type { CSSProperties } from "react";
import type { GearSlot } from "./gear";
import { LW, OL } from "./palette";
import type { Medal } from "./race";

export interface GearFlash {
  slot: GearSlot;
  kind: "up" | "down";
  /** 같은 칸이 다시 바뀌어도 다시 터지게 바꾸는 값 */
  id: number;
}

/** 장비가 바뀐 칸에서 효과가 터지는 자리 */
const FLASH_AT: Record<GearSlot, [number, number]> = {
  headband: [112, 42],
  sunglasses: [130, 16],
  watch: [82, 168],
  top: [110, 160],
  bottoms: [104, 200],
  socks: [94, 224],
  shoes: [100, 240],
};

/** 목에 건 메달: 결승선에서 금(목표 금액을 모음) · 은(완주). 팔에 가리지 않게 맨 앞에 건다 */
export function NeckMedal({ kind }: { kind: Medal }) {
  const face = kind === "gold" ? { base: "#ffc531", inner: "#ffdc6b", mark: "#d48700" } : { base: "#cfd6df", inner: "#f1f4f8", mark: "#8793a4" };
  return (
    <g className="rn-medal-on">
      <g className="rn-medal-swing">
        <path d="M94 128 L104 155 L115 128" stroke="#2f72d8" strokeWidth="5.4" fill="none" strokeLinejoin="round" />
        <path d="M94 128 L104 155 L115 128" stroke="#ef4c4c" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        <circle cx="104" cy="164" r="11.4" fill={face.base} stroke={OL} strokeWidth="2.2" />
        <circle cx="104" cy="164" r="7.6" fill={face.inner} />
        <path d="M104 158.2 L105.4 162 L109.5 162.2 L106.3 164.8 L107.3 168.7 L104 166.4 L100.7 168.7 L101.7 164.8 L98.5 162.2 L102.6 162 Z" fill={face.mark} />
        <path d="M96.8 160 a8.4 8.4 0 0 1 5.2 -3.8" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.85" />
      </g>
    </g>
  );
}

/** 신부 웨딩드레스 치마: 허리에서 땅까지 퍼진다 (걸으면 살랑) */
export function Skirt() {
  return (
    <g className="rn-skirt">
      <path d="M78 166 C69 192 59 220 52 242 C80 250.4 128 250.4 156 242 C149 220 139 192 130 166 Z" fill="#fffafc" stroke={OL} strokeWidth={LW} strokeLinejoin="round" />
      <path d="M90 174 C86 198 80 222 76 246 M104 174 C104 200 104 224 104 248 M118 174 C122 198 128 222 132 246" stroke="#eee2e8" strokeWidth="2" fill="none" />
      <path d="M56 234 C86 240 122 240 152 234" stroke="#f7b6c8" strokeWidth="2.4" fill="none" opacity="0.85" />
      <path d="M78 166 C94 172 114 172 130 166" stroke="#f7b6c8" strokeWidth="4" fill="none" />
    </g>
  );
}

/** 신부 면사포: 머리 뒤에서 등까지 (몸보다 뒤) */
export function Veil() {
  return <path d="M72 26 C40 46 26 120 34 202 L66 204 C58 152 60 98 84 50 Z" fill="#ffffff" opacity="0.8" stroke="#ebe4ea" strokeWidth="1.4" />;
}

/** 신부 부케: 앞으로 모은 두 손(.rn-bride 팔: 가까운 손 ≈ (99, 168) · 먼 손 ≈ (141, 167)) 사이, 꽃은 위 · 줄기는 아래로 */
export function Bouquet() {
  const flowers: [number, number, string][] = [
    [104, 150, "#ffffff"],
    [114, 143.6, "#ffd1dc"],
    [124, 150, "#ffffff"],
    [109, 156.4, "#ffb3c6"],
    [119, 156.4, "#fff1c1"],
    [114, 150.4, "#ffffff"],
  ];
  return (
    <g>
      <path d="M108 160 L113.6 182 L119.4 160" stroke="#6e9f5d" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M97 150 C91 141 95 134 101 136 M131 150 C137 141 133 134 127 136" stroke="#7cb26a" strokeWidth="3.6" fill="none" strokeLinecap="round" />
      {flowers.map(([x, y, color]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6.4" fill={color} stroke="#e7a2b4" strokeWidth="1.2" />
      ))}
      <circle cx="114" cy="143.6" r="1.9" fill="#f2c14e" />
      <circle cx="114" cy="150.4" r="1.7" fill="#f2c14e" />
      <path d="M108 168 L113.6 172 L119.2 168 L118.4 175 L113.6 172 L108.8 175 Z" fill="#f7b6c8" stroke="#e48aa3" strokeWidth="1" strokeLinejoin="round" />
    </g>
  );
}

/** 등에 멘 배낭 (몸 뒤) */
export function Backpack() {
  return (
    <g>
      <path d="M54 142 C54 132 60 128 68 128 H86 L88 196 H66 C59 196 54 191 54 184 Z" fill="#ffb547" stroke={OL} strokeWidth={LW} strokeLinejoin="round" />
      <path d="M57 164 H80 V182 C80 185 78 187 75 187 H62 C59 187 57 185 57 182 Z" fill="#ffc96b" stroke={OL} strokeWidth="1.6" />
      <path d="M62 172 H75" stroke="#c27a12" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

/** 배낭 어깨끈 (몸 앞, 머리보다 뒤) */
export function BackpackStrap() {
  return <path d="M92 130 C90 150 92 170 96 190" stroke="#c27a12" strokeWidth="4.6" fill="none" strokeLinecap="round" />;
}

/**
 * 끌고 가는 여행 가방. 가방 끌기(pull) 자세에서 뒤로 뻗은 가까운 손(어깨 (82, 146)에서 58°: 손 ≈ (58.3, 160.8))에 손잡이 끝이 오도록,
 * 오른쪽 아래 바퀴를 땅에 대고 16° 기울여 세운다 (cos 16° = 0.9613, sin 16° = 0.2756)
 */
export function Suitcase() {
  return (
    <g transform="translate(51.2 240) rotate(16)">
      <rect x="-16.6" y="-78" width="3.2" height="42" rx="1.4" fill="#a3acb8" stroke={OL} strokeWidth="1.2" />
      <rect x="-21" y="-80.6" width="12" height="5.2" rx="2.4" fill="#4b5563" stroke={OL} strokeWidth="1.4" />
      <rect x="-32" y="-40" width="34" height="40" rx="7" fill="#5aa7ff" stroke={OL} strokeWidth={LW} />
      <path d="M-24 -34 V-6 M-15 -34 V-6 M-6 -34 V-6" stroke="#2f7be6" strokeWidth="2" strokeLinecap="round" />
      <rect x="-28.6" y="-25" width="11" height="8" rx="2" fill="#ffe08a" stroke={OL} strokeWidth="1.2" />
      <circle cx="-25" cy="2.6" r="3.4" fill="#374151" stroke={OL} strokeWidth="1.2" />
      <circle cx="-5" cy="2.6" r="3.4" fill="#374151" stroke={OL} strokeWidth="1.2" />
    </g>
  );
}

/** 두 팔로 받쳐 든 이삿짐 상자 (몸 앞, 상자 들기 자세의 두 팔이 옆을 받친다) */
export function Box() {
  return (
    <g>
      <rect x="98" y="138" width="60" height="46" rx="4" fill="#e0a86e" stroke={OL} strokeWidth={LW} />
      <path d="M98 148 H158" stroke="#c08446" strokeWidth="2" />
      <rect x="124" y="138" width="9" height="46" fill="#cf9354" opacity="0.9" />
      <rect x="138" y="164" width="15" height="11" rx="2" fill="#fff7e6" stroke="#c08446" strokeWidth="1.2" />
      <path d="M140.6 167.6 h9.6 M140.6 171 h6.4" stroke="#c08446" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M104 160 l3.2 -3.2 3.2 3.2 M107.2 156.8 v7 M111.6 160 l3.2 -3.2 3.2 3.2 M114.8 156.8 v7" stroke="#8a5a2b" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** 서류 가방: 가까운 손(x, y)에 매달려 팔과 함께 흔들린다 */
export function Briefcase({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 5} ${y + 5} V${y + 1.6} H${x + 5} V${y + 5}`} stroke={OL} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <rect x={x - 15} y={y + 5} width="30" height="21" rx="3.4" fill="#8a5a36" stroke={OL} strokeWidth={LW} />
      <path d={`M${x - 15} ${y + 12} H${x + 15}`} stroke="#6b4226" strokeWidth="1.6" />
      <rect x={x - 2.4} y={y + 10} width="4.8" height="4.6" rx="1" fill="#f2c14e" stroke={OL} strokeWidth="1" />
    </g>
  );
}

/** 러너스 하이 기운의 가운데 (몸 가운데, 머리와 배 사이) */
const AURA_X = 104;
const AURA_Y = 140;
/** 뒤에서 퍼지는 햇살 16줄: 긴 줄 · 짧은 줄을 번갈아, 가운데에서 바깥으로 넓어진다 */
const AURA_RAYS = Array.from({ length: 16 }, (_, i) => {
  const long = i % 2 === 0;
  const reach = long ? 200 : 150;
  const half = ((long ? 5 : 3.8) * Math.PI) / 180;
  const angle = (i * 22.5 * Math.PI) / 180;
  const at = (a: number) => `${(AURA_X + reach * Math.sin(a)).toFixed(1)} ${(AURA_Y - reach * Math.cos(a)).toFixed(1)}`;
  return `M${AURA_X} ${AURA_Y} L${at(angle - half)} L${at(angle + half)} Z`;
});
/** 몸 둘레에서 피어오르는 빛 알갱이: 자리 · 크기 · 한 번 오르는 시간(초) · 시작 늦춤(초) · 옆으로 흐름(px). 얼굴은 비켜 간다 */
const AURA_DOTS = [
  { x: 44, y: 226, r: 5.2, t: 1.7, d: 0, dx: -6 },
  { x: 60, y: 200, r: 4.0, t: 1.4, d: -0.5, dx: -4 },
  { x: 34, y: 176, r: 4.6, t: 1.9, d: -1.1, dx: -8 },
  { x: 70, y: 238, r: 3.6, t: 1.3, d: -0.8, dx: 2 },
  { x: 50, y: 150, r: 3.8, t: 1.6, d: -1.4, dx: -5 },
  { x: 164, y: 228, r: 5.0, t: 1.8, d: -0.3, dx: 6 },
  { x: 152, y: 204, r: 4.0, t: 1.5, d: -1, dx: 4 },
  { x: 178, y: 182, r: 4.4, t: 2, d: -1.6, dx: 8 },
  { x: 140, y: 240, r: 3.6, t: 1.35, d: -0.6, dx: -2 },
  { x: 166, y: 152, r: 3.8, t: 1.7, d: -1.25, dx: 5 },
  { x: 104, y: 246, r: 4.2, t: 1.5, d: -0.2, dx: 0 },
  { x: 122, y: 242, r: 3.4, t: 1.25, d: -0.95, dx: 3 },
];

/**
 * 러너스 하이 기운 (몸 뒤): 숨 쉬듯 커졌다 작아지는 금빛 빛 · 천천히 도는 햇살 · 퍼져 나가는 고리 · 피어오르는 빛 알갱이.
 * 나타날 때(변신하는 순간) 흰 빛이 한 번 크게 터지고, 기운이 작게 모였다가 확 퍼진다.
 * id는 그라디언트 이름 (한 화면에 캐릭터가 여럿이어도 겹치지 않게)
 */
export function HighAura({ id }: { id: string }) {
  return (
    <g className="rn-aura" aria-hidden>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#fffbe0" stopOpacity="1" />
          <stop offset="0.25" stopColor="#ffe55c" stopOpacity="0.92" />
          <stop offset="0.55" stopColor="#ffc61f" stopOpacity="0.6" />
          <stop offset="0.8" stopColor="#ffad00" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff9d00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-ray`} gradientUnits="userSpaceOnUse" cx={AURA_X} cy={AURA_Y} r="200">
          <stop offset="0" stopColor="#fff6c0" stopOpacity="1" />
          <stop offset="0.45" stopColor="#ffd535" stopOpacity="0.85" />
          <stop offset="0.8" stopColor="#ffb000" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffa000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="rn-aura-body">
        <g className="rn-aura-rays" fill={`url(#${id}-ray)`}>
          {AURA_RAYS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <ellipse className="rn-aura-glow" cx={AURA_X} cy={AURA_Y} rx="140" ry="150" fill={`url(#${id}-glow)`} />
        <g fill="none" stroke="#ffbf1a" strokeWidth="6">
          {[0, 1, 2].map((i) => (
            <ellipse key={i} className="rn-aura-ring" cx={AURA_X} cy={AURA_Y} rx="60" ry="70" />
          ))}
        </g>
        <g fill="#fff6b8" stroke="#ffb800" strokeWidth="1.2">
          {AURA_DOTS.map((dot) => (
            <circle
              key={`${dot.x}-${dot.y}`}
              className="rn-aura-dot"
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              style={{ "--t": `${dot.t}s`, "--d": `${dot.d}s`, "--dx": `${dot.dx}px` } as CSSProperties}
            />
          ))}
        </g>
      </g>
      {/* 변신하는 순간 한 번 크게 터지는 빛 (기운 위, 몸 뒤) */}
      <circle className="rn-aura-flash" cx={AURA_X} cy={AURA_Y - 20} r="90" fill="#fffbe6" />
    </g>
  );
}

/** 장비가 바뀐 칸에서 한 번 터지는 효과: 좋아짐은 금빛 반짝이 · 고리, 내려감은 회색 연기 */
export function Burst({ flash }: { flash: GearFlash }) {
  const [x, y] = FLASH_AT[flash.slot];
  const up = flash.kind === "up";
  return (
    <g transform={`translate(${x} ${y})`} className={`rn-burst ${up ? "rn-burst-up" : "rn-burst-down"}`} aria-hidden>
      <circle className="rn-burst-ring" r="13" fill="none" stroke={up ? "#ffcf3a" : "#9aa3af"} strokeWidth="3.4" />
      {up
        ? Array.from({ length: 8 }, (_, i) => (
            <g key={i} className="rn-burst-ray" style={{ "--a": `${i * 45 + 22}deg` } as CSSProperties}>
              <path d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z" fill={i % 2 ? "#ffffff" : "#ffd84a"} stroke="#e0a800" strokeWidth="0.7" />
            </g>
          ))
        : Array.from({ length: 4 }, (_, i) => (
            <g key={i} className="rn-burst-ray" style={{ "--a": `${i * 90 + 45}deg` } as CSSProperties}>
              <circle r="4.8" fill="#cbd2db" opacity="0.9" />
            </g>
          ))}
    </g>
  );
}
