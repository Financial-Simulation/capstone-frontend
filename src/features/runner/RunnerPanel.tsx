"use client";

/**
 * 입력 단계 옆 '레이스 준비' 캐릭터 ('인생은 마라톤').
 *  - 넓은 화면(xl): 입력 칸 오른쪽 여백에 붙어 따라 내려오는 큰 장면 (RunnerPanel). 위에 붙는 머리글(h-14) 아래에 멈춘다
 *  - 좁은 화면: 단계 표시 아래 낮은 장면 (RunnerCard)
 * 코인 숫자나 장비 목록은 보여 주지 않고 캐릭터를 크게 보여 준다. 장비는 입력(실수령 · 지출 · 저축)으로 정한 코인 안에서 저절로 입고,
 * 바뀌면 그 칸 자리에서 반짝(좋아짐) · 연기(내려감)가 터지고 말풍선으로 알려 준다.
 * 배경은 레이스 거리로 정해지는 코스(course.ts routeFor)의 출발 구간. 캐릭터 모습은 입력한 나이 · 고른 성별대로 (use-runner look).
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { stepByPath, type StepKey } from "@/lib/steps";
import { bibOf, formatKm, raceText, startScene, type RaceView } from "./course";
import { GEAR, gearChange, isEmptySlot, type GearChange, type GearSet, type GearSlot } from "./gear";
import type { Pose } from "./race";
import { HudChip } from "./Hud";
import { RaceScene } from "./RaceScene";
import { useRunner, type RunnerState } from "./use-runner";

/** 단계마다 자세: 값을 넣는 동안은 출발선에서 몸을 풀고, 목표 · 시나리오에서는 달려 본다 */
const STEP_POSE: Record<StepKey, Pose> = { BASIC: "ready", ASSETS: "ready", GOAL: "jog", EVENTS: "jog" };

function useStepPose(): Pose {
  return STEP_POSE[stepByPath(usePathname())?.key ?? "BASIC"];
}

/** 입력이 멈추고 이만큼 지나야 장비가 바뀐 것으로 본다 (금액을 한 자씩 치는 동안 말풍선이 깜빡이지 않게) */
const SETTLE_MS = 700;
const NEWS_MS = 2600;

interface GearNews {
  text: string;
  tone: "good" | "bad";
  slot: GearSlot;
  kind: "up" | "down";
  id: number;
}

/**
 * 코인이 바뀌어 장비가 바뀌면 2.6초 동안 보여 줄 한마디와 효과.
 * 장비 그림은 칠 때마다 바로 바뀌지만, 알림은 입력이 멈춘 뒤 '멈춘 장비 ↔ 앞서 멈춘 장비'를 견준다
 * (600,000 → 1,000,000처럼 치는 중에만 잠깐 내려갔다 돌아오면 알리지 않음).
 * 처음 그릴 때와 코인을 아직 모르다가 알게 될 때(저장값을 막 읽은 때 포함)도 알리지 않는다.
 */
function useGearNews({ worn, coins, input }: Pick<RunnerState, "worn" | "coins" | "input">): GearNews | null {
  const [news, setNews] = useState<GearNews | null>(null);
  const settled = useRef<{ worn: GearSet; known: boolean } | null>(null);
  const known = coins !== null;

  // input은 칸을 고칠 때마다 바뀌므로, 치는 동안은 기다리는 시간이 계속 처음부터 다시 시작된다
  useEffect(() => {
    if (settled.current === null) {
      settled.current = { worn, known };
      return;
    }
    const timer = window.setTimeout(() => {
      const prev = settled.current ?? { worn, known };
      settled.current = { worn, known };
      const change = prev.known && known ? gearChange(prev.worn, worn) : null;
      if (change) {
        setNews((old) => ({
          text: newsText(change),
          tone: change.kind === "up" ? "good" : "bad",
          slot: change.slot,
          kind: change.kind,
          id: (old?.id ?? 0) + 1,
        }));
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [worn, known, input]);

  useEffect(() => {
    if (!news) return;
    const timer = window.setTimeout(() => setNews(null), NEWS_MS);
    return () => window.clearTimeout(timer);
  }, [news]);

  return news;
}

/** "러닝 양말 장착!" · "코인 부족 · 스마트워치 해제" · "코인 부족 · 런닝화 한 단계 낮춤" */
function newsText(change: GearChange): string {
  if (change.kind === "up") return `${change.item.name} 장착!`;
  const label = GEAR[change.slot].label;
  return isEmptySlot(change.slot, change.tier) ? `코인 부족 · ${label} 해제` : `코인 부족 · ${label} 한 단계 낮춤`;
}

/** 거리 칩: "풀코스 42.195km" · 맞춤 거리는 짧게 "약 3.3km" */
function raceChip(race: RaceView): string {
  return race.race ? raceText(race) : `약 ${formatKm(race.km)}`;
}

/** 입력 옆 장면에 같이 넘기는 값: 출발 구간 풍경 · 단계마다 자세 · 장비가 바뀌면 말풍선과 그 칸의 효과 */
function useReadyScene() {
  const runner = useRunner();
  const pose = useStepPose();
  const news = useGearNews(runner);
  const scene = startScene(runner.route);
  const sceneProps = {
    scene,
    gear: runner.worn,
    look: runner.look,
    pose,
    startLine: pose === "ready",
    bib: bibOf(runner.race),
    say: news?.text,
    tone: news?.tone,
    flash: news ? { slot: news.slot, kind: news.kind, id: news.id } : null,
  };
  return { runner, scene, news, sceneProps };
}

/** xl 화면의 오른쪽 여백: 캐릭터를 크게 */
export function RunnerPanel({ className = "" }: { className?: string }) {
  const { runner, scene, news, sceneProps } = useReadyScene();
  return (
    <aside aria-label="레이스 준비 캐릭터" className={className}>
      <div className="sticky top-20">
        <RaceScene
          size="stage"
          {...sceneProps}
          className={`shadow-[0_18px_40px_-22px_rgba(15,50,110,0.55)] ${news?.kind === "up" ? "rn-glowup" : ""}`}
          hud={
            <>
              <HudChip icon="pin">{scene.name}</HudChip>
              {runner.race && <HudChip dark>{raceChip(runner.race)}</HudChip>}
            </>
          }
        />
      </div>
    </aside>
  );
}

/** 좁은 화면: 단계 표시 아래 낮은 장면 */
export function RunnerCard({ className = "" }: { className?: string }) {
  const { scene, news, sceneProps } = useReadyScene();
  return (
    <section aria-label="레이스 준비 캐릭터" className={className}>
      <RaceScene
        size="card"
        {...sceneProps}
        className={news?.kind === "up" ? "rn-glowup" : ""}
        hud={
          <HudChip icon="pin" className="ml-auto inline-flex">
            {scene.name}
          </HudChip>
        }
      />
    </section>
  );
}
