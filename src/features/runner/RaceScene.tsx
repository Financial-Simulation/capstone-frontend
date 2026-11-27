/**
 * 레이스 장면: 코스 구간(scene) 배경 위에서 캐릭터가 달린다.
 *  - 하늘(해 · 구름) / 먼 풍경 / 길가 / 길 네 겹. 달리는 중(jog · sprint)이면 겹마다 다른 빠르기로 왼쪽으로 흐르고(sprint는 더 빠르게),
 *    쉬거나 서 있으면 멈춘다. 구름은 늘 천천히 흐른다. 구간이 바뀌면 새 풍경이 스르르 나타난다.
 *  - 이번 달 장애물 · 아이템(sprite)은 캐릭터 앞에 튀어나오고, 말풍선(say)으로 지금 상황을 알려 준다.
 *  - 결과 화면(md)의 문(gate): 금빛 '목표 달성' 문 · 결승 아치가 오른쪽에서 다가와 캐릭터 자리에서 테이프가 끊어지고 뒤로 멀어진다 (GateArt).
 *    목표 달성 · 금메달 완주 달에는 꽃가루(confetti)가 쏟아진다. 결승 전에 목표 금액을 모으면 러너스 하이(high)로 금빛 기운을 내뿜고,
 *    결승선에서 메달(medal)을 건 뒤로는 금빛으로 은은하게 빛난다(shine).
 *  - 크기: md(결과 화면) · stage(입력 옆 패널, 캐릭터를 크게) · card(좁은 화면 입력 카드)
 */
import type { CSSProperties, ReactNode } from "react";
import type { SceneDef } from "./course";
import { FarTile, NearTile, RoadTile } from "./CourseArt";
import { GateArch, GateTape, StartPost } from "./GateArt";
import type { GearSet } from "./gear";
import { HudRow } from "./Hud";
import { DEFAULT_LOOK, type Look } from "./look";
import { SPRITES, type Medal, type Pose, type RaceGate, type SpriteKind } from "./race";
import { Runner, type GearFlash } from "./Runner";
import { Confetti, SCENE_FRAME, Sky, Strip, type CloudLane } from "./SceneKit";
import { Sprite } from "./Sprites";

const BUBBLE = {
  good: "border-good-line bg-good-soft text-good",
  bad: "border-danger-line bg-danger-soft text-danger",
  info: "border-line-strong bg-white text-ink",
} as const;

const SIZES = {
  md: {
    box: "h-48",
    far: "top-6 bottom-8",
    near: "bottom-7 h-9",
    road: "h-9",
    runner: "h-[8.6rem]",
    /** 캐릭터 왼쪽 끝 --rx (좁은 화면 8%, 넓은 화면 12%). 문 · 인생 장면이 이 자리에 맞춘다 */
    runnerBox: "bottom-1 left-[var(--rx)]",
    sprite: "size-11",
    bubbleBox: "top-11 left-[calc(var(--rx)+5.4rem)] sm:left-[calc(var(--rx)+6.6rem)]",
    bubbleText: "px-3 py-1.5 text-xs font-semibold leading-snug sm:text-sm",
    /** 출발선은 캐릭터 바로 앞 */
    start: "left-[calc(var(--rx)+7.3rem)] h-[40%]",
    /** 먼 풍경을 얼마나 밀어 둘지 (멈춰 있을 때 랜드마크(칸 x 170~290)가 캐릭터 바로 오른쪽에 보이는 자리) */
    phase: 0.11,
  },
  stage: {
    box: "h-[23rem]",
    far: "top-[10.5rem] bottom-[4.4rem]",
    near: "bottom-[3.2rem] h-11",
    road: "h-14",
    runner: "h-[15.5rem]",
    runnerBox: "bottom-1.5 -left-2",
    sprite: "size-12",
    bubbleBox: "top-12 left-3",
    bubbleText: "px-3 py-1.5 text-[13px] font-bold leading-snug",
    start: "left-[11.4rem] h-[42%]",
    phase: 0.085,
  },
  card: {
    box: "h-40",
    far: "top-7 bottom-9",
    near: "bottom-8 h-8",
    road: "h-9",
    runner: "h-[8.8rem]",
    runnerBox: "bottom-0.5 left-1",
    sprite: "size-10",
    bubbleBox: "top-9 left-[6.2rem]",
    bubbleText: "px-2.5 py-1 text-xs font-bold leading-snug",
    start: "left-[7.4rem] h-[46%]",
    phase: 0.12,
  },
} as const;

/** 하늘의 구름 두 줄 */
const CLOUDS: readonly CloudLane[] = [
  { top: "top-3", size: "h-5 opacity-90", duration: 46, delay: -12 },
  { top: "top-9", size: "h-4 opacity-70", duration: 64, delay: -40 },
];

export function RaceScene({
  scene,
  gear,
  pose,
  sprite = null,
  spriteKey,
  say,
  tone = "info",
  hud,
  startLine = false,
  bib,
  size = "md",
  frozen = false,
  flash = null,
  look = DEFAULT_LOOK,
  medal = null,
  shine = false,
  high = false,
  confetti = null,
  gate = null,
  className = "",
}: {
  scene: SceneDef;
  gear: GearSet;
  pose: Pose;
  sprite?: SpriteKind | null;
  /** 같은 그림이 다시 나와도 튀어나오게 바꾸는 값 (그달 번호 등) */
  spriteKey?: string | number;
  say?: string;
  tone?: keyof typeof BUBBLE;
  /** 위쪽 숫자 줄 */
  hud?: ReactNode;
  /** 캐릭터 바로 앞의 출발선 */
  startLine?: boolean;
  bib?: string;
  size?: keyof typeof SIZES;
  /** 재생을 멈췄을 때 장면도 멈춘다 */
  frozen?: boolean;
  /** 장비가 바뀐 칸 효과 (Runner로 넘긴다) */
  flash?: GearFlash | null;
  /** 캐릭터 모습 (성별 · 나이대) */
  look?: Look;
  medal?: Medal | null;
  shine?: boolean;
  /** 러너스 하이 (금빛 기운) */
  high?: boolean;
  /** 꽃가루를 쏟을 달의 열쇠 (바뀌면 다시 쏟는다). null이면 없음 */
  confetti?: string | number | null;
  /** 다가오는 · 지나는 문 (결과 화면 md 크기) */
  gate?: RaceGate | null;
  className?: string;
}) {
  const moving = pose === "jog" || pose === "sprint";
  const z = SIZES[size];
  const phase = { "--phase": z.phase } as CSSProperties;

  return (
    <div
      className={`${SCENE_FRAME} ${z.box} ${moving ? "" : "rn-still"} ${pose === "sprint" ? "rn-fast" : ""} ${frozen ? "rn-frozen" : ""} ${className}`}
      style={{ background: `linear-gradient(${scene.sky[0]}, ${scene.sky[1]})` }}
    >
      <Sky clouds={CLOUDS} />

      {/* 먼 풍경 · 길가 · 길: 칸 수는 넓은 결과 화면(약 1,000px)에서도 한 칸 흐른 뒤까지 빈틈이 없게.
          구간이 바뀌면(key) 새 풍경이 스르르 나타난다 */}
      <div key={`far-${scene.key}`} className={`rn-swap absolute inset-x-0 ${z.far}`} style={phase}>
        <Strip count={4}>{(i) => <FarTile key={i} scene={scene} />}</Strip>
      </div>
      <div key={`near-${scene.key}`} className={`rn-swap absolute inset-x-0 ${z.near}`} style={phase}>
        <Strip count={7} className="rn-near">
          {(i) => <NearTile key={i} scene={scene} />}
        </Strip>
      </div>
      <div className={`absolute inset-x-0 bottom-0 ${z.road}`} style={phase}>
        <Strip count={7} className="rn-road">
          {(i) => <RoadTile key={i} scene={scene} />}
        </Strip>
      </div>

      {startLine && <StartPost className={z.start} />}
      {gate && <GateArch gate={gate} />}

      {/* 캐릭터 앞 장애물 · 아이템 */}
      {sprite && (
        <div key={`${sprite}-${spriteKey ?? ""}`} className="rn-pop absolute bottom-2.5 left-[56%] flex flex-col items-center">
          <Sprite kind={sprite} className={`${z.sprite} drop-shadow-[0_3px_2px_rgba(0,0,0,0.18)]`} />
          <span
            className={`mt-0.5 rounded-full px-1.5 text-[11px] font-bold leading-4 shadow-sm ${SPRITES[sprite].tone === "good" ? "bg-good text-white" : "bg-danger text-white"}`}
          >
            {SPRITES[sprite].name}
          </span>
        </div>
      )}

      {/* 캐릭터 */}
      <div className={`absolute ${z.runnerBox}`}>
        <Runner gear={gear} pose={pose} className={z.runner} bib={bib} flash={flash} look={look} medal={medal} shine={shine} high={high} />
      </div>
      {/* 캐릭터가 지나는 달: 테이프가 캐릭터 앞에서 끊어진다 */}
      {gate?.ahead === 0 && <GateTape key={`${gate.kind}-tape`} gold={gate.kind === "goal" || gate.gold} />}
      {confetti != null && <Confetti key={confetti} />}

      {/* 말풍선 (꼬리가 캐릭터 머리를 가리킨다). 오른쪽 끝을 넘지 않게 right로 막고, 길면 줄을 바꾼다 */}
      {say && (
        <div className={`absolute right-2.5 ${z.bubbleBox}`}>
          <p key={say} className={`rn-say relative inline-block text-balance break-keep rounded-2xl border shadow-md ${z.bubbleText} ${BUBBLE[tone]}`}>
            {say}
            {size === "stage" ? (
              <span aria-hidden className={`absolute -bottom-1.5 left-[4.6rem] size-3 rotate-45 border-b border-r ${BUBBLE[tone]}`} />
            ) : (
              <span aria-hidden className={`absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 border-b border-l ${BUBBLE[tone]}`} />
            )}
          </p>
        </div>
      )}

      {hud && <HudRow>{hud}</HudRow>}
    </div>
  );
}
