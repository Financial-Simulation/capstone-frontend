"use client";

/**
 * 결과 화면 '앞으로 모을 돈' 그래프 옆 레이스 ('인생은 마라톤').
 *  - RaceStart: [전체 범위]일 때 출발선에서 몸을 푸는 캐릭터와 '레이스 시작' (중간 미래를 재생)
 *  - RaceLive: 미래 다시 보기와 같은 달을 따라 달린다. 자세 · 장애물 · 말풍선 · 메달은 race.ts의 paceOf
 *    (실직 · 급한 지출 · 빌리기 · 적금 해지면 무릎 짚고 쉬기, 목표 페이스보다 앞서면 빠르게)
 * 결승선 = 목표 시점: 레이스는 시간으로 달려(raceClock) 목표 시점에 완주한다. 목표 금액은 결승선과 따로 '금메달'이라,
 * 결승 전에 모으면 그달 금빛 '목표 달성' 문을 지나며 꽃가루 속에 금메달을 걸고, 그 뒤로는 메달을 건 채 빛나며 결승선까지 달린다.
 * 못 모은 채 결승선에 닿으면 완주 메달(은), 결승 뒤에라도 모으면 금메달로 바꿔 단다.
 * 결혼 · 독립 · 전세 이사 · 이직 · 자동차가 있는 달은 레이스 대신 그 일의 장면(LifeScene)을 보여 준다.
 * 코스는 레이스 거리로 정해지고(course.ts routeFor), 지난 시간만큼 달린 자리의 구간 풍경을 보여 준다 (광화문 → 청계천 → … → 잠실).
 * 위쪽 칩: 구간 · 거리, 메달, '몇 km 지점 · 결승까지 몇 개월'. 아래는 구간 이름이 붙은 출발 → 결승 막대 (목표 달성 자리에 금별).
 */
import { useMemo } from "react";
import { Button } from "@/components/ui";
import { SIMULATION_PATHS } from "@/config/policy";
import type { SimulationInputDraft, StoryMonth } from "@/lib/types";
import { SCENES, bibOf, formatKm, raceForMonths, raceText, routeFor, sceneAt, startScene, type RouteDef } from "./course";
import { lifeMoments } from "./life";
import { LifeScene } from "./LifeScene";
import { goalIndexOf, paceOf, plannedMarkers, raceClock } from "./race";
import { HudChip } from "./Hud";
import { RaceScene } from "./RaceScene";
import { useRunner } from "./use-runner";

export function RaceStart({ goalMonths, onStart }: { goalMonths: number; onStart: () => void }) {
  const runner = useRunner();
  const race = raceForMonths(goalMonths);
  const route = routeFor(race);
  const scene = startScene(route);
  return (
    <div className="mt-4">
      <RaceScene
        scene={scene}
        gear={runner.worn}
        look={runner.look}
        pose="ready"
        startLine
        bib={bibOf(race)}
        say={`${route.event} 코스 출발선! 결승선 전에 목표 금액을 모으면 금메달이에요`}
        hud={
          <>
            <HudChip icon="pin">
              {scene.name}
              <span className="hidden sm:inline"> · {raceText(race)}</span>
            </HudChip>
            <span className="ml-auto inline-flex flex-wrap justify-end gap-1.5">
              <HudChip dark icon="flag">
                결승선 = 목표 시점
              </HudChip>
              <HudChip gold icon="medal" className="hidden sm:inline-flex">
                금메달 = 목표 금액
              </HudChip>
            </span>
          </>
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button size="sm" onClick={onStart} className="gap-1.5 shadow-sm">
          <svg viewBox="0 0 24 24" aria-hidden className="size-4">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" fill="currentColor" />
          </svg>
          레이스 시작 (중간 미래)
        </Button>
        <p className="text-xs text-ink-soft">
          {SIMULATION_PATHS.toLocaleString("ko-KR")}가지 미래의 가운데를 한 달씩 달려요. 최상 · 최악은 위 버튼으로.
        </p>
      </div>
    </div>
  );
}

export function RaceLive({
  months,
  index,
  startTotal,
  targetAmount,
  goalMonths,
  input,
  running,
}: {
  months: readonly StoryMonth[];
  index: number;
  /** 그래프 0개월 값 (미래 다시 보기 선의 출발점) */
  startTotal: number;
  targetAmount: number;
  goalMonths: number;
  input: SimulationInputDraft;
  running: boolean;
}) {
  const runner = useRunner();
  const race = raceForMonths(goalMonths);
  const route = routeFor(race);
  const planned = useMemo(() => plannedMarkers(input, input.startMonth ?? null), [input]);
  const life = useMemo(() => lifeMoments(input, input.startMonth ?? null), [input]);
  const goalIndex = useMemo(() => goalIndexOf(months), [months]);
  const m = months[index];
  const pace = paceOf(months, index, { startTotal, targetAmount, goalMonths, planned });
  const clock = raceClock(m.afterMonths, goalMonths, race.km);
  const scene = sceneAt(route, clock.ratio);
  const moment = life.get(m.month) ?? null;
  // 목표 금액을 모은 자리 (막대 위 금별): 결승 뒤에 모았으면 결승 자리
  const goalAt = goalIndex !== null && index >= goalIndex ? Math.min(months[goalIndex].afterMonths / goalMonths, 1) : null;
  const track = <ProgressTrack ratio={clock.ratio} goal={goalAt} totalKm={race.km} route={route} />;

  if (moment) {
    return (
      <div className="mt-3">
        <LifeScene key={`${moment.kind}-${moment.month}`} moment={moment} look={runner.look} gear={runner.worn} frozen={!running} goal={index === goalIndex} />
        {track}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <RaceScene
        scene={scene}
        gear={runner.worn}
        look={runner.look}
        pose={pace.pose}
        sprite={pace.sprite}
        spriteKey={m.afterMonths}
        say={pace.say}
        tone={pace.tone}
        bib={bibOf(race)}
        frozen={!running}
        medal={pace.medal}
        shine={pace.medal === "gold"}
        confetti={pace.confetti ? m.afterMonths : null}
        gate={pace.gate}
        hud={
          <>
            {/* 좁은 화면은 한 줄에 맞게 메달 · 진행 칩만 (구간 이름은 아래 막대에도 있다) */}
            <HudChip icon="pin" className="hidden sm:inline-flex">
              {scene.name} · {raceText(race)}
            </HudChip>
            <span className="ml-auto inline-flex flex-wrap justify-end gap-1.5">
              {pace.medal === "gold" && (
                <HudChip gold icon="medal">
                  금메달
                </HudChip>
              )}
              {pace.medal === "silver" && <HudChip icon="medal">완주 메달</HudChip>}
              <HudChip dark icon={pace.pose === "sprint" ? "bolt" : "flag"}>
                {clock.toFinish > 0 ? `${formatKm(clock.km)} · 결승까지 ${clock.toFinish}개월` : `완주 ${formatKm(race.km)}`}
              </HudChip>
            </span>
          </>
        }
      />
      {track}
    </div>
  );
}

/**
 * 출발 → 결승(목표 시점) 진행 막대: 캐릭터 자리 점, 구간이 시작하는 자리 눈금과 이름, 목표 금액을 모은 자리의 금별
 * (꾸밈, 숫자는 위 칩이 전한다)
 */
function ProgressTrack({ ratio, goal, totalKm, route }: { ratio: number; goal: number | null; totalKm: number; route: RouteDef }) {
  const at = Math.min(Math.max(ratio, 0), 1);
  const pct = `${at * 100}%`;
  const done = ratio >= 1;
  const current = sceneAt(route, at).key;
  return (
    <div aria-hidden className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 text-[11px] font-semibold tabular-nums text-ink-soft">
      <span>출발</span>
      <div className="relative h-2.5 rounded-full bg-canvas ring-1 ring-inset ring-line">
        {route.sections.slice(1).map((section) => (
          <span key={section.scene} className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-line-strong" style={{ left: `${section.from * 100}%` }} />
        ))}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
          style={{ width: pct, background: done ? "var(--color-good)" : "linear-gradient(90deg, #7fb0ee, var(--color-primary))" }}
        />
        {goal !== null && (
          <svg viewBox="0 0 24 24" className="rn-pop absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 drop-shadow" style={{ left: `${goal * 100}%` }}>
            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="#ffc531" stroke="#b57900" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        )}
        <span
          className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md transition-[left] duration-300 ${done ? "bg-good" : "bg-primary"}`}
          style={{ left: pct }}
        />
      </div>
      <span className="inline-flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 21V4 M6 4h11l-2 4 2 4H6" />
        </svg>
        {formatKm(totalKm)}
      </span>
      {/* 구간 이름 (넓은 화면만, 막대와 같은 칸): 지금 달리는 구간은 진하게 */}
      <span />
      <div className="relative mt-1 hidden h-4 sm:block">
        {route.sections.map((section) => (
          <span
            key={section.scene}
            className={`absolute whitespace-nowrap text-[10.5px] ${section.scene === current ? "font-bold text-primary" : "font-medium text-muted"}`}
            style={{ left: `${section.from * 100}%` }}
          >
            {SCENES[section.scene].name.replace("종합운동장", "")}
          </span>
        ))}
      </div>
      <span />
    </div>
  );
}
