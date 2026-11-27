"use client";

/**
 * 02 목표 설정의 '레이스 거리' 카드.
 *  - 카드(10km · 하프 · 풀코스)를 누르면 목표 시점을 기준 달 + 3 · 5 · 10년으로 정한다 (onPick). 계산에 들어가는 값은 목표 시점뿐이다.
 *  - 코스(배경)는 고르지 않고 거리로 정해진다 (course.ts ROUTES). 카드마다 그 코스의 결승 구간 그림과 본뜬 대회 · 경로를 보여 준다.
 *  - 아래 한 줄로 규칙을 알려 준다: 결승선은 목표 시점, 그 전에 목표 금액을 모으면 러너스 하이로 달리다 결승선에서 금메달 (결과 화면 레이스, race.ts).
 */
import type { YearMonth } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { RACES, ROUTES, finishScene, formatKm, raceOfGoal, routeFor, targetDateFor, type SceneDef } from "./course";
import { FarTile, RoadTile } from "./CourseArt";
import { MEDAL_RIBBON, MEDAL_STAR } from "./Hud";

/** 거리 막대의 기준: 풀코스 */
const FULL_KM = RACES[RACES.length - 1].km;

export function RaceCards({
  start,
  target,
  onPick,
  describedBy,
}: {
  start: YearMonth;
  target: YearMonth | null | undefined;
  onPick: (date: YearMonth) => void;
  describedBy?: string;
}) {
  const current = raceOfGoal(start, target);
  return (
    <div>
      <div role="radiogroup" aria-label="레이스 거리" aria-describedby={describedBy} className="grid grid-cols-3 gap-2">
        {RACES.map((race) => {
          const date = targetDateFor(start, race);
          const route = ROUTES[race.key];
          const on = current?.race?.key === race.key;
          return (
            <button
              key={race.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${race.label} ${formatKm(race.km)}, ${race.months / 12}년 (${formatYearMonth(date)}까지), ${route.event} 코스 ${route.title}`}
              onClick={() => onPick(date)}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition ${
                on
                  ? "border-primary bg-primary-soft shadow-[0_0_0_3px_rgba(21,89,184,0.14)]"
                  : "border-line-strong bg-surface hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              }`}
            >
              <ScenePreview scene={finishScene(route)} />
              {on && <CheckBadge className="absolute right-2 top-2" />}
              <span className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:px-3">
                <span className="text-[11px] font-bold tracking-wide text-muted">{race.months / 12}년</span>
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className={`text-lg font-extrabold leading-tight ${on ? "text-primary" : "text-ink"}`}>{race.label}</span>
                  {race.key !== "10K" && <span className="text-[11px] font-semibold tabular-nums text-ink-soft">{formatKm(race.km)}</span>}
                </span>
                {/* 거리 막대: 풀코스 대비 길이 */}
                <span aria-hidden className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <span
                    className={`block h-full rounded-full transition-colors ${on ? "bg-primary" : "bg-line-strong group-hover:bg-primary/60"}`}
                    style={{ width: `${(race.km / FULL_KM) * 100}%` }}
                  />
                </span>
                <span className="mt-2 break-keep text-xs font-bold leading-snug text-ink">{route.event}</span>
                <span className="break-keep text-xs leading-snug text-ink-soft">{route.title}</span>
                <span className="mt-1 text-xs text-muted">{formatYearMonth(date)}까지</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-ink-soft">
        <svg viewBox="0 0 24 24" aria-hidden className="mt-px size-4 shrink-0">
          <path d={MEDAL_RIBBON} fill="#2f80ed" />
          <circle cx="12" cy="15.5" r="6.5" fill="#ffc531" stroke="#b57900" strokeWidth="1.2" />
          <path d={MEDAL_STAR} fill="#fff8d6" />
        </svg>
        <span className="break-keep">
          결승선은 <span className="font-semibold text-ink">목표 시점</span>이에요. 그 전에 <span className="font-semibold text-ink">목표 금액</span>을 모으면 결과 화면
          레이스에서 러너스 하이로 달리고, 결승선에서 금메달을 받아요.
        </span>
      </p>
      {current && !current.race && (
        <p className="mt-2 text-sm text-ink-soft">
          직접 고른 기간이라 <span className="font-semibold text-ink">맞춤 코스 약 {formatKm(current.km)}</span>로 달려요. 배경은{" "}
          {routeFor(current).event} 코스예요.
        </p>
      )}
    </div>
  );
}

/** 카드 위 멈춘 그림: 그 코스의 결승 구간 풍경과 길 */
function ScenePreview({ scene }: { scene: SceneDef }) {
  return (
    <span aria-hidden className="relative block h-16 overflow-hidden" style={{ background: `linear-gradient(${scene.sky[0]}, ${scene.sky[1]})` }}>
      <span className="absolute inset-x-0 bottom-3 top-1 flex justify-center">
        {[0, 1, 2].map((i) => (
          <FarTile key={i} scene={scene} />
        ))}
      </span>
      <span className="absolute inset-x-0 bottom-0 flex h-3.5 justify-center">
        {[0, 1, 2, 3].map((i) => (
          <RoadTile key={i} scene={scene} />
        ))}
      </span>
    </span>
  );
}

function CheckBadge({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`grid size-5 place-items-center rounded-full bg-primary text-white shadow ${className}`}>
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
