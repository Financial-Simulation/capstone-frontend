/**
 * '인생은 마라톤' 러너 캐릭터 (직접 그린 SVG): 큰 동그란 머리 · 말랑한 몸통 · 짧고 통통한 팔다리의 2등신 마스코트. 오른쪽을 보고 달린다.
 *  - 모습(look): 성별 · 나이대마다 머리 모양 · 눈 크기가 다르다 (RunnerHead · look.ts).
 *  - 장비 7칸(헤어밴드 · 선글라스 · 스마트워치 · 상의 · 하의 · 양말 · 런닝화)이 단계마다 다르게 그려진다:
 *    기본(면 티 · 트레이닝 바지 · 캔버스 운동화) → 러너(기능성 티 · 러닝 쇼츠 · 쿠션화 · 스포츠 선글라스 · 스마트밴드)
 *    → 프로(레이싱 싱글렛과 번호표 · 스플릿 쇼츠 · 압박 양말 · 카본 레이싱화 · 미러 고글 · GPS 워치 · 꼬리 달린 헤어밴드)
 *  - 옷(outfit): 달리기(run) 말고도 인생 장면용 결혼(턱시도 · 웨딩드레스와 면사포 · 부케) · 출근(정장)이 있다.
 *  - 소품(items): 배낭 · 여행 가방(독립) · 이삿짐 상자(이사) · 서류 가방(이직).
 *  - 자세: 몸 풀기(ready) · 달리기(jog) · 빠르게(sprint) · 숨 고르기(rest) · 기뻐하기(celebrate)
 *    · 걷기(walk) · 상자 들고 걷기(carry) · 가방 끌기(pull) · 서 있기(stand) · 운전(drive).
 *  - medal: 목표 금액을 모으면 금메달, 못 모은 채 목표 시점(결승)에 닿으면 완주 메달(은). shine이면 금빛으로 빛난다.
 *  - flash: 장비가 바뀐 칸 자리에서 반짝(좋아짐) · 연기(내려감)가 한 번 터진다. 일곱 칸이 모두 프로면 둘레가 늘 반짝인다.
 * 여기서는 부품을 겹쳐 조립한다: 몸 부품은 RunnerParts, 머리는 RunnerHead, 걸치거나 드는 것과 효과는 RunnerItems.
 * 움직임은 runner.css (rn- 클래스: 통통 튀는 몸 · 찌그러졌다 늘어나기 · 늦게 따라오는 머리 · 깜빡임).
 */
import { useId } from "react";
import "./runner.css";
import { gearSummary, type GearSet } from "./gear";
import { DEFAULT_LOOK, type Look } from "./look";
import { POSE_LABELS, type Medal, type Pose } from "./race";
import { Head } from "./RunnerHead";
import { Backpack, BackpackStrap, Bouquet, Box, Burst, NeckMedal, Skirt, Suitcase, Veil, type GearFlash } from "./RunnerItems";
import { Arm, FORMAL, HIP_FAR, HIP_NEAR, Leg, SH_FAR, SH_NEAR, TORSO, Torso, type FormalStyle, type RunnerIds, type ShoeKind } from "./RunnerParts";

export type { GearFlash };

/** 옷: 달리기 · 결혼 · 출근 */
export type Outfit = "run" | "wedding" | "suit";
/** 소품: 배낭 · 여행 가방 · 이삿짐 상자 · 서류 가방 */
export type Item = "backpack" | "suitcase" | "box" | "briefcase";

export function Runner({
  gear,
  pose = "ready",
  className = "",
  label,
  bib,
  flash = null,
  look = DEFAULT_LOOK,
  outfit = "run",
  items = [],
  medal = null,
  shine = false,
  happy = false,
}: {
  gear: GearSet;
  pose?: Pose;
  /** 크기는 className(Tailwind 높이)으로. 기본 h-32 */
  className?: string;
  /** 대체 글. 없으면 장비와 자세로 만든다 */
  label?: string;
  /** 싱글렛 번호 (프로 상의일 때만 보인다) */
  bib?: string;
  flash?: GearFlash | null;
  look?: Look;
  outfit?: Outfit;
  items?: readonly Item[];
  /** 목표 달성(금) · 완주(은) 메달 */
  medal?: Medal | null;
  /** 목표를 이룬 뒤 금빛으로 빛난다 */
  shine?: boolean;
  /** 자세와 상관없이 웃는 얼굴 (결혼 등) */
  happy?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids: RunnerIds = { lens: `lens-${uid}`, mirror: `mirror-${uid}`, glow: `glow-${uid}`, torsoClip: `torso-${uid}` };
  const formal = outfit !== "run";
  const bride = outfit === "wedding" && look.gender === "F";
  const style: FormalStyle | null = outfit === "wedding" ? (bride ? null : FORMAL.groom) : outfit === "suit" ? FORMAL[look.gender === "M" ? "suitM" : "suitF"] : null;
  // 결혼 · 출근 장면에서는 달리기 장비(헤어밴드 · 선글라스 · 시계)를 벗는다
  const worn: GearSet = formal ? { ...gear, headband: 0, sunglasses: 0, watch: 0 } : gear;
  const shoe: ShoeKind = bride ? "pump" : formal ? "dress" : gear.shoes;
  const alt =
    label ?? `러너 캐릭터: ${formal ? (outfit === "wedding" ? (bride ? "웨딩드레스" : "턱시도") : "정장") : gearSummary(gear)}. ${POSE_LABELS[pose]}`;
  // 일곱 칸을 모두 프로로 갖추면 늘 반짝인다
  const allPro = !formal && Object.values(gear).every((tier) => tier === 2);
  const classes = ["rn-runner", `rn-${pose}`, allPro ? "rn-allpro" : "", shine ? "rn-shine" : "", happy ? "rn-mood-happy" : "", bride ? "rn-bride" : "", className || "h-32"];

  return (
    <svg viewBox="0 0 200 250" role="img" aria-label={alt} className={classes.filter(Boolean).join(" ")}>
      <defs>
        <linearGradient id={ids.lens} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3a4a66" />
          <stop offset="0.55" stopColor="#1c2333" />
          <stop offset="1" stopColor="#4a74b4" />
        </linearGradient>
        <linearGradient id={ids.mirror} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9b6dff" />
          <stop offset="0.45" stopColor="#22c4e0" />
          <stop offset="0.8" stopColor="#b6f04a" />
          <stop offset="1" stopColor="#ffe066" />
        </linearGradient>
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor="#fff0b8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff0b8" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.torsoClip}>
          <path d={TORSO} />
        </clipPath>
      </defs>

      {/* 바닥 그림자 */}
      <ellipse className="rn-shadow" cx="104" cy="245" rx={bride ? 54 : 42} ry="5.4" fill="#2a2030" opacity="0.14" />

      {/* 빨리 달릴 때 바람선 · 달릴 때 발밑 먼지 */}
      <g className="rn-speed" stroke="#b3c8e6" strokeWidth="5" strokeLinecap="round">
        <path d="M22 118h28" />
        <path d="M8 146h34" />
        <path d="M22 174h24" />
      </g>
      <g className="rn-dust" fill="#e3d6bf">
        <circle cx="70" cy="240" r="5.4" />
        <circle cx="58" cy="236" r="4.2" />
        <circle cx="47" cy="241" r="3" />
      </g>

      {/* 결승선 빛 */}
      <circle className="rn-halo" cx="104" cy="112" r="100" fill={`url(#${ids.glow})`} />

      {/* 끌고 가는 여행 가방 (땅 위, 뒤로 뻗은 가까운 손이 손잡이를 잡는다) */}
      {items.includes("suitcase") && <Suitcase />}

      <g className="rn-bob">
        <g className="rn-squash">
          {/* 다리 (몸통이 엉덩이를 덮는다) */}
          <g className="rn-legFar rn-far">
            <Leg hip={HIP_FAR} gear={worn} shin="rn-shinFar" style={style} shoe={shoe} bare={bride} />
          </g>
          <g className="rn-legNear">
            <Leg hip={HIP_NEAR} gear={worn} shin="rn-shinNear" style={style} shoe={shoe} bare={bride} />
          </g>

          <g className="rn-upper">
            {bride && <Veil />}
            {items.includes("backpack") && <Backpack />}
            <g className="rn-armFar rn-far">
              <Arm sh={SH_FAR} gear={worn} style={style} bride={bride} />
            </g>
            <Torso gear={worn} ids={ids} bib={bib} run={!formal} style={style} bride={bride} />
            {bride && <Skirt />}
            {items.includes("backpack") && <BackpackStrap />}
            <g className="rn-head">
              <Head look={look} gear={worn} ids={ids} bride={bride} />
            </g>
            {items.includes("box") && <Box />}
            {bride && <Bouquet />}
            <g className="rn-armNear">
              <Arm sh={SH_NEAR} near gear={worn} style={style} bride={bride} briefcase={items.includes("briefcase")} />
            </g>
            {/* 메달: 목표 달성 금 · 완주 은. 팔에 가리지 않게 맨 앞에 건다 */}
            {medal && <NeckMedal key={medal} kind={medal} />}
          </g>

          {flash && <Burst key={flash.id} flash={flash} />}
        </g>
      </g>

      {/* 결승선 · 목표 달성 반짝이 */}
      <g className="rn-sparkle" fill="#ffcf4a" stroke="#f0a500" strokeWidth="1" strokeLinejoin="round">
        <path d="M34 36l3.4 8.4 8.4 3.4-8.4 3.4-3.4 8.4-3.4-8.4-8.4-3.4 8.4-3.4z" />
        <path d="M172 26l2.8 6.8 6.8 2.8-6.8 2.8-2.8 6.8-2.8-6.8-6.8-2.8 6.8-2.8z" />
        <path d="M180 110l2.2 5.6 5.6 2.2-5.6 2.2-2.2 5.6-2.2-5.6-5.6-2.2 5.6-2.2z" />
      </g>
    </svg>
  );
}
