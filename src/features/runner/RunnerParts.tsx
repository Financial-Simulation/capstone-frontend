/**
 * 러너 몸 부품 (Runner가 조립한다): 관절 자리 · 옷 색표 · 다리(허벅지 · 정강이 · 양말 · 신발) · 팔(소매 · 손 · 시계) · 몸통(옷 · 번호표 · 넥타이).
 * 팔다리는 끝이 둥근 굵은 선(관절이 보이지 않는 말랑한 관)으로, '윤곽 한 번 + 색 한 번' 두 겹으로 그려 한 덩어리 스티커처럼 보이게 한다.
 * 좌표는 viewBox(200 × 250) 그대로. 관절: 어깨 가까운 쪽 (82, 146) · 먼 쪽 (127, 143) (몸 양옆), 엉덩이 (93, 199) · (115, 199),
 * 무릎은 엉덩이 + 15, 목 (104, 128). 관절 중심은 runner.css의 transform-origin과 같아야 한다.
 */
import type { GearSet, GearTier } from "./gear";
import { LW, OL, SKIN, SKIN_LINE, SKIN_SHADE } from "./palette";
import { Briefcase } from "./RunnerItems";

// ===== 관절 · 크기 =====
type Pt = readonly [number, number];
export const SH_NEAR: Pt = [82, 146];
export const SH_FAR: Pt = [127, 143];
export const HIP_NEAR: Pt = [93, 199];
export const HIP_FAR: Pt = [115, 199];
const THIGH = 15;
const SHIN = 17;
const ARM = 24;
const HAND_R = 9;
const LEG_W = 17;
const ARM_W = 13;

/** 몸통: 아래가 동그란 달걀 모양 (위는 머리 밑에 숨는다) */
export const TORSO = "M85 124 C75 136 70 158 71 180 C72 200 87 211 104 211 C121 211 136 200 137 180 C138 158 133 136 123 124 Z";

/** SVG 안 id (그림마다 달라야 한다): 선글라스 렌즈 · 미러 고글 · 결승 빛 · 몸통 자르기 · 러너스 하이 불꽃 머리 색 */
export interface RunnerIds {
  lens: string;
  mirror: string;
  glow: string;
  torsoClip: string;
  fire: string;
}

// ===== 달리기 옷: 단계마다 =====
interface TopStyle {
  base: string;
  shade: string;
  trim: string;
  /** 소매: 면 티 · 기능성 티 (싱글렛은 없음) */
  sleeve: "tee" | "fitted" | null;
}
const TOPS: Record<GearTier, TopStyle> = {
  0: { base: "#dce1e8", shade: "#b9c1cd", trim: "#a9b2bf", sleeve: "tee" }, // 면 티셔츠
  1: { base: "#55a0ff", shade: "#2f7be6", trim: "#ffffff", sleeve: "fitted" }, // 기능성 티셔츠
  2: { base: "#ff7a59", shade: "#e8583a", trim: "#d6ff4a", sleeve: null }, // 레이싱 싱글렛
};

interface BottomStyle {
  base: string;
  shade: string;
  trim: string;
  /** 다리를 덮는 길이: 긴바지 · 쇼츠(허벅지 위로 몇만큼) */
  long: boolean;
  short: number;
}
const BOTTOMS: Record<GearTier, BottomStyle> = {
  0: { base: "#8f99ab", shade: "#727d90", trim: "#f2f4f7", long: true, short: 0 }, // 트레이닝 바지
  1: { base: "#34426d", shade: "#232d50", trim: "#86a2e6", long: false, short: 11 }, // 러닝 쇼츠
  2: { base: "#272b34", shade: "#14171d", trim: "#d6ff4a", long: false, short: 6.5 }, // 스플릿 쇼츠
};

interface SockStyle {
  base: string;
  /** 위쪽 띠 */
  band?: string;
  /** 발목 위로 올라오는 길이 */
  len: number;
  /** 아래쪽에도 띠 한 줄 (압박 양말) */
  stripe?: boolean;
}
const SOCKS: Record<GearTier, SockStyle> = {
  0: { base: "#f6f7f9", len: 4 }, // 발목 양말
  1: { base: "#ffffff", band: "#55a0ff", len: 9 }, // 크루 양말
  2: { base: "#2cc4b0", band: "#138f80", len: 15, stripe: true }, // 압박 양말
};

/** 신발 종류: 달리기 장비 단계 · 구두 · 웨딩 구두 */
export type ShoeKind = GearTier | "dress" | "pump";
interface ShoeStyle {
  upper: string;
  shade: string;
  sole: string;
  accent: string;
  /** 밑창 두께 (카본화가 두툼하다) */
  soleH: number;
  /** 신발 끈 (구두는 없음) */
  lace?: string;
}
const SHOES: Record<ShoeKind, ShoeStyle> = {
  0: { upper: "#f4f5f7", shade: "#d3d8df", sole: "#9aa3af", accent: "#c4cad3", soleH: 3.6, lace: "#aab2bd" }, // 캔버스 운동화
  1: { upper: "#55a0ff", shade: "#2f7be6", sole: "#ffffff", accent: "#ffffff", soleH: 4.4, lace: "#ffffff" }, // 쿠션 러닝화
  2: { upper: "#d6ff3a", shade: "#a8d10f", sole: "#ff7a1a", accent: "#272b34", soleH: 5.6, lace: "#272b34" }, // 카본 레이싱화
  dress: { upper: "#2b2b33", shade: "#17171c", sole: "#111114", accent: "#4b4b56", soleH: 3 }, // 구두
  pump: { upper: "#ffffff", shade: "#efe6ea", sole: "#e8dde2", accent: "#f4b6c6", soleH: 3 }, // 웨딩 구두
};

// ===== 인생 장면용 옷 (턱시도 · 정장) =====
export interface FormalStyle {
  jacket: string;
  shade: string;
  lapel: string;
  pants: string;
  shirt: string;
  /** 넥타이 · 나비넥타이 · 블라우스 리본 */
  neck: "bow" | "tie" | "ribbon";
  accent: string;
}
export const FORMAL: Record<"groom" | "suitM" | "suitF", FormalStyle> = {
  groom: { jacket: "#2e3149", shade: "#1d1f31", lapel: "#45496b", pants: "#2e3149", shirt: "#ffffff", neck: "bow", accent: "#1c1c22" },
  suitM: { jacket: "#35497d", shade: "#25355d", lapel: "#4d63a0", pants: "#3b4458", shirt: "#ffffff", neck: "tie", accent: "#e8564e" },
  suitF: { jacket: "#35497d", shade: "#25355d", lapel: "#4d63a0", pants: "#35497d", shirt: "#ffffff", neck: "ribbon", accent: "#e8564e" },
};

/** 굵은 선 한 겹 (끝이 둥근 관) */
function Tube({ x, y1, y2, width, color }: { x: number; y1: number; y2: number; width: number; color: string }) {
  return <path d={`M${x} ${y1} V${y2}`} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />;
}

export function Leg({
  hip,
  gear,
  shin,
  style,
  shoe,
  bare = false,
}: {
  hip: Pt;
  gear: GearSet;
  /** 정강이 그룹 클래스 (무릎에서 접힌다) */
  shin: string;
  style: FormalStyle | null;
  shoe: ShoeKind;
  /** 신부: 치마 아래 맨다리 */
  bare?: boolean;
}) {
  const [x, y] = hip;
  const knee = y + THIGH;
  const ankle = knee + SHIN;
  const bottom = BOTTOMS[gear.bottoms];
  const sock = SOCKS[gear.socks];
  // 긴바지(트레이닝 바지 · 정장 바지)면 다리 전체가 바지 색
  const pants = bare ? null : style ? style.pants : bottom.long ? bottom.base : null;
  const trainingPants = !bare && !style && bottom.long;
  const leg = pants ?? SKIN;
  const runShoe = typeof shoe === "number";
  return (
    <>
      {/* 윤곽 */}
      <Tube x={x} y1={y} y2={knee} width={LEG_W + LW * 2} color={OL} />
      <g className={shin}>
        <Tube x={x} y1={knee} y2={ankle} width={LEG_W - 1 + LW * 2} color={OL} />
      </g>
      {/* 허벅지 */}
      <Tube x={x} y1={y} y2={knee} width={LEG_W} color={leg} />
      {!pants && <path d={`M${x - 4.6} ${y + 2} V${knee}`} stroke={SKIN_SHADE} strokeWidth="4" strokeLinecap="round" opacity="0.8" />}
      {/* 쇼츠 다리통 (허벅지와 함께 움직인다) */}
      {!pants && !bare && bottom.short > 0 && (
        <>
          <Tube x={x} y1={y - 2} y2={y + bottom.short} width={LEG_W + 4 + LW * 2} color={OL} />
          <Tube x={x} y1={y - 2} y2={y + bottom.short} width={LEG_W + 4} color={bottom.base} />
          <path d={`M${x - (LEG_W + 4) / 2 + 1.4} ${y + bottom.short + 0.6} H${x + (LEG_W + 4) / 2 - 1.4}`} stroke={bottom.trim} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {/* 정강이 · 양말 · 신발 */}
      <g className={shin}>
        <Tube x={x} y1={knee} y2={ankle} width={LEG_W - 1} color={leg} />
        {trainingPants && (
          // 트레이닝 바지: 옆줄 · 발목 고무단
          <>
            <path d={`M${x + 4.6} ${y + 4} V${ankle - 4}`} stroke={bottom.trim} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <Tube x={x} y1={ankle - 3.4} y2={ankle - 1} width={LEG_W + 0.6} color={bottom.shade} />
          </>
        )}
        {!pants && runShoe && (
          <>
            <Tube x={x} y1={ankle - sock.len} y2={ankle} width={LEG_W - 1} color={sock.base} />
            {sock.band && <path d={`M${x - 6.4} ${ankle - sock.len + 1.2} H${x + 6.4}`} stroke={sock.band} strokeWidth="2.6" strokeLinecap="round" />}
            {sock.stripe && <path d={`M${x - 6.4} ${ankle - 4} H${x + 6.4}`} stroke={sock.band} strokeWidth="2" strokeLinecap="round" />}
          </>
        )}
        <Shoe x={x} y={ankle} kind={shoe} />
      </g>
    </>
  );
}

/** 신발: 발목(x, y) 아래, 앞(오른쪽)으로 둥글게 */
function Shoe({ x, y, kind }: { x: number; y: number; kind: ShoeKind }) {
  const s = SHOES[kind];
  const top = y - 3.4;
  const bottom = y + 13.4;
  const base = bottom - s.soleH;
  const upper = `M${x - 10.6} ${base} C${x - 11} ${top + 4.4} ${x - 6} ${top} ${x + 1} ${top} C${x + 9} ${top} ${x + 18.6} ${top + 5} ${x + 18.8} ${base - 0.6} L${x + 18.8} ${base} Z`;
  const sole = `M${x - 11.6} ${base - 0.6} H${x + 19.8} C${x + 21.6} ${base - 0.6} ${x + 21.6} ${bottom} ${x + 19.8} ${bottom} H${x - 11.6} C${x - 13.4} ${bottom} ${x - 13.4} ${base - 0.6} ${x - 11.6} ${base - 0.6} Z`;
  const formal = kind === "dress" || kind === "pump";
  return (
    <g strokeLinejoin="round">
      <path d={sole} fill={s.sole} stroke={OL} strokeWidth="2.6" />
      {kind === 2 && <path d={`M${x - 8} ${base + 2.4} H${x + 16}`} stroke={s.accent} strokeWidth="1.4" strokeDasharray="3 2.4" />}
      <path d={upper} fill={s.upper} stroke={OL} strokeWidth="2.6" />
      {!formal && <path d={`M${x - 7.6} ${base - 1.6} C${x - 7.6} ${top + 5} ${x - 4} ${top + 2} ${x - 1} ${top + 1.6}`} stroke={s.shade} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {kind === 0 && <path d={`M${x + 9} ${top + 3} C${x + 14} ${top + 4.4} ${x + 16.4} ${base - 3} ${x + 16.6} ${base - 0.8}`} stroke={s.accent} strokeWidth="3.2" fill="none" strokeLinecap="round" />}
      {kind === 1 && <path d={`M${x - 3} ${base - 2.6} C${x + 2} ${top + 4.6} ${x + 9} ${top + 5} ${x + 13.4} ${base - 3}`} stroke={s.accent} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {kind === 2 && <path d={`M${x - 2} ${base - 2} L${x + 4} ${top + 3.6} L${x + 9.4} ${base - 2}`} stroke={s.accent} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === "pump" && <path d={`M${x - 3} ${top + 2.4} C${x + 1} ${top - 0.6} ${x + 5} ${top - 0.6} ${x + 8} ${top + 2.2}`} stroke={s.accent} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {kind === "dress" && <path d={`M${x + 6} ${top + 3} C${x + 10} ${top + 3.6} ${x + 13.4} ${top + 5.4} ${x + 14.6} ${base - 3}`} stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.35" />}
      {s.lace && <path d={`M${x + 1} ${top + 1.6} l2 2.6 M${x + 4.6} ${top + 2} l2 2.6`} stroke={s.lace} strokeWidth="1.6" strokeLinecap="round" />}
    </g>
  );
}

export function Arm({
  sh,
  near = false,
  gear,
  style,
  bride,
  briefcase = false,
}: {
  sh: Pt;
  near?: boolean;
  gear: GearSet;
  style: FormalStyle | null;
  bride: boolean;
  /** 손에 서류 가방을 든다 (팔과 함께 흔들린다) */
  briefcase?: boolean;
}) {
  const [x, y] = sh;
  const wrist = y + ARM;
  const hand = wrist + 4;
  const top = TOPS[gear.top];
  const watch = near ? gear.watch : 0;
  const color = style ? style.jacket : SKIN;
  const sleeve = !style && !bride ? top.sleeve : null;
  return (
    <>
      <g fill={OL}>
        <Tube x={x} y1={y} y2={wrist} width={ARM_W + LW * 2} color={OL} />
        <circle cx={x} cy={hand} r={HAND_R + LW} />
      </g>
      <Tube x={x} y1={y} y2={wrist} width={ARM_W} color={color} />
      {!style && <path d={`M${x - 3.6} ${y + 4} V${wrist - 2}`} stroke={SKIN_SHADE} strokeWidth="3.4" strokeLinecap="round" opacity="0.8" />}
      {/* 반소매 (면 티 · 기능성 티) */}
      {sleeve && (
        <>
          <Tube x={x} y1={y - 1} y2={y + (sleeve === "tee" ? 11 : 8)} width={ARM_W + 5 + 2.6 * 2} color={OL} />
          <Tube x={x} y1={y - 1} y2={y + (sleeve === "tee" ? 11 : 8)} width={ARM_W + 5} color={top.base} />
          <path d={`M${x - 7.6} ${y + (sleeve === "tee" ? 12.4 : 9.4)} H${x + 7.6}`} stroke={sleeve === "tee" ? top.shade : top.trim} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {/* 긴소매 소맷부리 (정장) */}
      {style && <path d={`M${x - 6} ${wrist - 0.6} H${x + 6}`} stroke={style.shirt} strokeWidth="4" strokeLinecap="round" />}
      <circle cx={x} cy={hand} r={HAND_R} fill={SKIN} />
      <path d={`M${x + 4} ${hand - 3.4} C${x + 6} ${hand - 1} ${x + 6} ${hand + 2} ${x + 4} ${hand + 4.4}`} stroke={SKIN_LINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {watch === 1 && (
        <>
          <Tube x={x} y1={wrist - 4.6} y2={wrist - 1} width={ARM_W + 2} color="#2a303c" />
          <rect x={x - 3.6} y={wrist - 7.2} width="7.2" height="8.4" rx="2.4" fill="#111827" stroke={OL} strokeWidth="1.2" />
          <path d={`M${x - 1.8} ${wrist - 3} H${x + 1.8}`} stroke="#3ee08f" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {watch === 2 && (
        <>
          <Tube x={x} y1={wrist - 5.4} y2={wrist - 0.6} width={ARM_W + 2} color="#1a1d24" />
          <circle cx={x} cy={wrist - 3} r="5.6" fill="#0b1220" stroke="#d6ff4a" strokeWidth="1.8" />
          <circle cx={x} cy={wrist - 3} r="3.6" fill="#0e7c94" className="rn-glow" />
          <path d={`M${x - 2.6} ${wrist - 2.6} H${x - 1.2} L${x - 0.4} ${wrist - 4.6} L${x + 0.8} ${wrist - 1.2} L${x + 1.6} ${wrist - 3} H${x + 2.8}`} stroke="#ecfeff" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {briefcase && <Briefcase x={x} y={hand} />}
    </>
  );
}

export function Torso({
  gear,
  ids,
  bib,
  run,
  style,
  bride,
}: {
  gear: GearSet;
  ids: RunnerIds;
  bib?: string;
  /** 달리기 옷 (아니면 인생 장면 옷) */
  run: boolean;
  style: FormalStyle | null;
  bride: boolean;
}) {
  const top = TOPS[gear.top];
  const bottom = BOTTOMS[gear.bottoms];
  const fill = bride ? "#fffafc" : style ? style.jacket : top.base;
  const shade = bride ? "#f1e6ec" : style ? style.shade : top.shade;
  const waist = bride ? null : style ? style.pants : bottom.base;
  return (
    <>
      <path d={TORSO} fill={OL} stroke={OL} strokeWidth={LW * 2} strokeLinejoin="round" />
      <path d={TORSO} fill={fill} />
      <g clipPath={`url(#${ids.torsoClip})`}>
        {/* 등 쪽 그늘 · 배 빛 */}
        <path d="M64 116 C80 140 82 176 78 218 H56 V116 Z" fill={shade} />
        <ellipse cx="122" cy="162" rx="6" ry="16" fill="#ffffff" opacity="0.2" />
        {run && gear.top === 0 && (
          <>
            <path d="M93 129 Q104 138 115 129" stroke={top.trim} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M96 174 q9 3 18 0.6" stroke={top.shade} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8" />
          </>
        )}
        {run && gear.top === 1 && (
          <>
            <path d="M74 164 L136 140" stroke={top.trim} strokeWidth="4" strokeLinecap="round" />
            <path d="M93 129 Q104 137 115 129" stroke={top.shade} strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <circle cx="120" cy="168" r="2.8" fill={top.trim} />
          </>
        )}
        {run && gear.top === 2 && (
          <>
            <path d="M68 126 C80 132 84 152 82 216 H64 V126 Z" fill="#ffffff" opacity="0.9" />
            <path d="M93 128 Q104 136 115 128" stroke={top.trim} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
        {style && (
          <>
            <path d="M93 126 L106 162 L119 126 Z" fill={style.shirt} />
            <path d="M93 126 L105.4 158 L100 130 Z M119 126 L106.6 158 L112 130 Z" fill={style.lapel} stroke={OL} strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="107" cy="173" r="1.9" fill={style.shade} />
            <circle cx="107" cy="185" r="1.9" fill={style.shade} />
          </>
        )}
        {bride && (
          <>
            {(
              [
                [98, 142],
                [112, 148],
                [90, 154],
                [120, 138],
                [104, 156],
              ] as const
            ).map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="none" stroke="#ecdce3" strokeWidth="1.2" />
            ))}
            <rect x="66" y="162" width="76" height="8" fill="#f7b6c8" />
          </>
        )}
        {/* 허리 아래: 하의 */}
        {waist && (
          <>
            <rect x="60" y="188" width="84" height="30" fill={waist} />
            <path d="M66 188.6 H142" stroke={OL} strokeWidth="1.6" opacity="0.5" />
            {run && gear.bottoms === 0 && <path d="M106 190 v6 M110 190 v6" stroke={bottom.trim} strokeWidth="1.6" strokeLinecap="round" />}
            {run && gear.bottoms > 0 && <path d="M66 191 H142" stroke={bottom.trim} strokeWidth="2" opacity="0.9" />}
          </>
        )}
      </g>
      {/* 번호표 · 넥타이 · 꽃 */}
      {run && gear.top === 2 && (
        <g>
          <rect x="97" y="146" width="25" height="20" rx="3.6" fill="#ffffff" stroke={OL} strokeWidth="1.8" />
          <rect x="97" y="146" width="25" height="4.8" rx="2" fill="#26324f" />
          <text x="109.5" y="162" textAnchor="middle" fontSize="10" fontWeight="900" fill="#26324f" fontFamily="system-ui, sans-serif">
            {bib ?? "42"}
          </text>
        </g>
      )}
      {style?.neck === "tie" && <path d="M104 129 L108 129 L109.6 134 L108 157 L106 160 L104 157 L102.4 134 Z" fill={style.accent} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />}
      {style?.neck === "bow" && (
        <>
          <path d="M99 127 L106 131 L99 135 Z M113 127 L106 131 L113 135 Z" fill={style.accent} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="106" cy="131" r="2" fill={style.accent} />
          <circle cx="121" cy="144" r="4.2" fill="#ffffff" stroke="#d8dbe2" strokeWidth="1" />
          <circle cx="121" cy="144" r="1.7" fill="#f2c14e" />
        </>
      )}
      {style?.neck === "ribbon" && (
        <>
          <path d="M100 128 C97 132 98 136 103 134 L106 131 L109 134 C114 136 115 132 112 128 L106 131 Z" fill={style.accent} stroke={OL} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M104.6 132 l-3 7 M107.4 132 l3 7" stroke={style.accent} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </>
  );
}
