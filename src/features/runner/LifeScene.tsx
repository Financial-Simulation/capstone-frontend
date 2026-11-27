"use client";

/**
 * 인생 장면 ('인생은 마라톤' 미래 다시 보기에서 결혼 · 독립 · 전세 이사 · 이직 · 자동차가 있는 달). life.ts의 LifeMoment를 그림으로 보여 준다.
 * 레이스 장면(RaceScene md)과 높이 · 캐릭터 자리(--rx)가 같아 달이 바뀌어도 화면이 튀지 않는다.
 *  - 결혼: 내 캐릭터와 짝(성별만 반대, 나이대는 같게)이 웨딩 차림으로 꽃잎 날리는 버진로드를 걷다가, 다가온 꽃 아치 앞에 서면 하트가 피어오른다
 *  - 독립: 배낭을 메고 여행 가방을 끌며 나서면 부모님 집이 뒤로 멀어지고, 2층 창에서 가족이 손을 흔든다
 *  - 전세 이사: 이삿짐 상자를 들고 걷고, 소파 · 상자 · 화분을 실은 트럭이 나란히 간다
 *  - 이직: 정장에 서류 가방을 들고 걷다가 '환영합니다!' 현수막이 걸린 새 회사 앞에 서면 웃는다
 *  - 자동차: 선물 리본을 단 새 오픈카를 몰고 강변을 달린다
 * 꽃 아치 · 새 회사가 다가와 멈추는 움직임이 끝나면(onAnimationEnd) 걷기를 멈추고 서서 웃는다. 재생을 멈추면(frozen) 움직임도 그 자리에 선다.
 * 멈춘 채 이 달로 옮겨 왔거나 움직임을 줄이는 설정이면 처음부터 도착한 모습. 장면 글은 aria-label로도 읽힌다.
 */
import { useState, type AnimationEvent, type ComponentProps, type CSSProperties } from "react";
import { formatYearMonth } from "@/lib/year-month";
// 장면 공통 움직임(scene.css) 다음에 인생 장면 움직임(life.css)을 얹는다
import "./scene.css";
import "./life.css";
import { SCENES } from "./course";
import { FarTile, NearTile } from "./CourseArt";
import { BASIC_SET, type GearSet } from "./gear";
import { HEART_PATH, HudChip, HudRow } from "./Hud";
import { LIFE_LINES, type LifeKind, type LifeMoment } from "./life";
import { BACKDROP_SKY, LifeFar, LifeNear, LifeRoad, type LifeBackdrop } from "./LifeArt";
import { CarBack, CarFront, FamilyHouse, MovingTruck, NewOffice, WeddingArch } from "./LifeProps";
import { partnerOf, type Look } from "./look";
import { OUT } from "./palette";
import { Runner } from "./Runner";
import { Confetti, SCENE_FRAME, Sky, Strip, type CloudLane } from "./SceneKit";

const BACKDROP: Record<LifeKind, LifeBackdrop | "drive"> = {
  WEDDING: "hall",
  INDEPENDENCE: "town",
  JEONSE_MOVE: "town",
  JOB_CHANGE: "city",
  CAR: "drive",
};

/** 캐릭터 크기 (RaceScene md와 같다) */
const RUNNER_H = "h-[8.6rem]";

/** 하늘의 구름 한 줄 (예식장은 실내라 해 · 구름이 없다) */
const CLOUDS: readonly CloudLane[] = [{ top: "top-3", size: "h-5 opacity-90", duration: 46, delay: -20 }];

/** '나' 캐릭터에 장면마다 다르게 넘기는 값 */
type MeProps = Pick<ComponentProps<typeof Runner>, "pose" | "outfit" | "items" | "happy">;

/** 같은 달에 목표 금액도 넘었을 때 칩 · 장면 글: 결승 전이면 러너스 하이, 결승선에서 · 결승 뒤면 금메달 */
const GOAL_REWARD = {
  high: { icon: "spark", text: "러너스 하이" },
  gold: { icon: "medal", text: "금메달" },
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LifeScene({
  moment,
  look,
  gear,
  frozen = false,
  goal = null,
}: {
  moment: LifeMoment;
  look: Look;
  gear: GearSet;
  /** 재생을 멈췄을 때 장면도 멈춘다 */
  frozen?: boolean;
  /** 같은 달에 목표 금액도 넘었으면 꽃가루와 칩 (결승 전 러너스 하이 · 결승 뒤 금메달) */
  goal?: keyof typeof GOAL_REWARD | null;
}) {
  const { kind } = moment;
  // 꽃 아치 · 새 회사가 앞에서 다가와 멈추는 장면 (도착하면 서서 웃는다)
  const arrives = kind === "WEDDING" || kind === "JOB_CHANGE";
  const [arrived, setArrived] = useState(() => !arrives || frozen || prefersReducedMotion());
  const onArrive = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setArrived(true);
  };
  const backdrop = BACKDROP[kind];
  const sky = backdrop === "drive" ? SCENES.hangang.sky : BACKDROP_SKY[backdrop];
  const reward = goal ? GOAL_REWARD[goal] : null;
  const label = `${moment.title} 장면: ${LIFE_LINES[kind]}.${moment.detail ? ` ${moment.detail}.` : ""}${reward ? ` 이달 목표 금액도 달성해 ${reward.text}.` : ""}`;
  // 나: 캐릭터 자리(--rx)에 선다 (자동차는 차 안에 앉아 따로 그린다)
  const me = (props: MeProps) => (
    <div className="absolute bottom-1 left-[var(--rx)]">
      <Runner gear={gear} look={look} className={RUNNER_H} label="나" {...props} />
    </div>
  );

  return (
    <div
      role="img"
      aria-label={label}
      className={`${SCENE_FRAME} rn-life h-48 ${backdrop === "drive" ? "rn-drive-fast" : ""} ${arrives && arrived ? "rn-still" : ""} ${frozen ? "rn-frozen" : ""}`}
      style={{ background: `linear-gradient(${sky[0]}, ${sky[1]})` }}
    >
      {backdrop !== "hall" && <Sky clouds={CLOUDS} />}

      {/* 배경 세 겹: 걷는 빠르기로 흐른다 (자동차는 빠르게) */}
      <div aria-hidden className="absolute inset-x-0 bottom-8 top-6">
        <Strip count={4}>{(i) => (backdrop === "drive" ? <FarTile key={i} scene={SCENES.hangang} /> : <LifeFar key={i} kind={backdrop} />)}</Strip>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-7 h-9">
        <Strip count={7} className="rn-near">
          {(i) => (backdrop === "drive" ? <NearTile key={i} scene={SCENES.hangang} /> : <LifeNear key={i} kind={backdrop} />)}
        </Strip>
      </div>

      {/* 길 뒤쪽 소품 */}
      {kind === "WEDDING" && (
        <div
          aria-hidden
          className={`absolute bottom-6 left-[calc(var(--rx)-1rem)] h-40 ${arrived ? "" : "rn-arrive"}`}
          style={{ "--from": "11rem" } as CSSProperties}
          onAnimationEnd={onArrive}
        >
          <WeddingArch />
        </div>
      )}
      {kind === "INDEPENDENCE" && (
        <div aria-hidden className="rn-leave absolute bottom-[1.9rem] left-[calc(var(--rx)-3.7rem)] h-[8.75rem]">
          <FamilyHouse />
        </div>
      )}
      {kind === "JEONSE_MOVE" && (
        <div aria-hidden className="rn-bounce absolute bottom-[1.9rem] left-[calc(var(--rx)+7.2rem)] h-[5.6rem] sm:h-[6.4rem]">
          <MovingTruck />
        </div>
      )}
      {kind === "JOB_CHANGE" && (
        <div
          aria-hidden
          className={`absolute bottom-[1.9rem] left-[calc(var(--rx)+8.6rem)] h-[10.4rem] ${arrived ? "" : "rn-arrive"}`}
          style={{ "--from": "10rem" } as CSSProperties}
          onAnimationEnd={onArrive}
        >
          <NewOffice />
        </div>
      )}

      <div aria-hidden className="absolute inset-x-0 bottom-0 h-9">
        <Strip count={7} className="rn-road">
          {(i) => <LifeRoad key={i} kind={backdrop} />}
        </Strip>
      </div>

      {/* 캐릭터 */}
      {kind === "WEDDING" && (
        <>
          {/* 짝은 나보다 조금 뒤(오른쪽 위)에 나란히 */}
          <div className="absolute bottom-2 left-[calc(var(--rx)+2.9rem)]">
            <Runner gear={BASIC_SET} look={partnerOf(look)} outfit="wedding" pose={arrived ? "stand" : "walk"} happy className={RUNNER_H} label="짝" />
          </div>
          {me({ outfit: "wedding", pose: arrived ? "stand" : "walk", happy: true })}
          <Petals />
          {arrived && <Hearts />}
        </>
      )}
      {kind === "INDEPENDENCE" && me({ pose: "pull", items: ["backpack", "suitcase"], happy: true })}
      {kind === "JEONSE_MOVE" && me({ pose: "carry", items: ["box"] })}
      {kind === "JOB_CHANGE" && me({ outfit: "suit", pose: arrived ? "stand" : "walk", items: ["briefcase"], happy: arrived })}
      {kind === "CAR" && (
        <div className="rn-car absolute bottom-1 left-[calc(var(--rx)-0.6rem)] h-[6.25rem] w-[14.375rem]">
          <Wind />
          <CarBack className="absolute inset-0 size-full" />
          <div className="absolute -bottom-2 left-[3.56rem]">
            <Runner gear={gear} look={look} pose="drive" happy className={RUNNER_H} label="나" />
          </div>
          <CarFront className="absolute inset-0 size-full" />
        </div>
      )}

      {reward && <Confetti />}

      {/* 장면 설명: 한 줄 + 그 일의 돈 (자동차는 캐릭터가 차 안 오른쪽에 앉아 말풍선을 더 오른쪽에 둔다) */}
      <div aria-hidden className={`absolute right-2.5 top-9 flex justify-end ${kind === "CAR" ? "pl-[calc(var(--rx)+9rem)]" : "pl-[calc(var(--rx)+6rem)]"}`}>
        <p className="rn-say max-w-[11rem] break-keep rounded-2xl border border-line-strong bg-white/95 px-3 py-1.5 text-xs leading-snug shadow-md sm:max-w-[19rem] sm:text-sm">
          <span className="block font-bold text-ink">{LIFE_LINES[kind]}</span>
          {moment.detail && <span className="block text-[11px] font-medium text-ink-soft sm:text-xs">{moment.detail}</span>}
        </p>
      </div>

      <HudRow hidden>
        <HudChip icon={kind === "WEDDING" ? "heart" : "pin"}>
          {moment.title}
          <span className="hidden sm:inline"> · {formatYearMonth(moment.month)}</span>
        </HudChip>
        {reward && (
          <HudChip gold icon={reward.icon} className="ml-auto inline-flex">
            목표 달성! {reward.text}
          </HudChip>
        )}
      </HudRow>
    </div>
  );
}

/** 버진로드 위로 날리는 꽃잎 (늦춤을 음수로 줘 처음부터 공중에 떠 있다) */
const PETALS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 23 + 7) % 100}%`,
  delay: `${-(((i * 37) % 40) / 10)}s`,
  duration: `${3.4 + ((i * 13) % 6) * 0.35}s`,
  size: 6 + ((i * 7) % 4),
  color: ["#ffffff", "#f9b4c6", "#fbd0dc"][i % 3],
}));

function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PETALS.map((petal, i) => (
        <i
          key={i}
          className="rn-petal"
          style={{
            left: petal.left,
            width: petal.size,
            height: petal.size * 0.7,
            background: petal.color,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
        />
      ))}
    </div>
  );
}

/** 꽃 아치 앞에 서면 두 사람 머리 위로 피어오르는 하트 */
function Hearts() {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-[8.4rem] left-[calc(var(--rx)+3.2rem)] h-10 w-20">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="rn-heart absolute" style={{ left: `${i * 19}%`, bottom: `${[0, 34, 10, 42, 18][i]}%`, animationDelay: `${i * 0.26}s` }}>
          <path d={HEART_PATH} fill={i % 2 ? "#ff9fb6" : "#ff6b8a"} stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

/** 새 차 뒤로 흐르는 바람선 */
function Wind() {
  return (
    <div aria-hidden className="rn-wind pointer-events-none absolute -left-10 bottom-6 h-12 w-12">
      <span className="top-1" />
      <span className="top-5" />
      <span className="top-9" />
    </div>
  );
}
