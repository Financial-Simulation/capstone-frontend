"use client";

/**
 * 04 범위 그래프: 지금부터 10년(0~120개월) 동안 모은 돈의 분포.
 *  - 범위(아래 10%~위 10%)는 옅은 면, 중간값은 선, 최악의 경우(하위 5%)는 주황 선
 *  - 목표 금액(가로 점선)과 목표 시점(세로 점선), 계산기 결과는 두 점(목표 시점 · 10년 뒤)
 *  - 예정된 일은 입력의 occurDate로 아래쪽에 ◆
 *  - 마우스 · 손가락 · 화살표 키로 달을 옮기면 그달의 값을 보여 준다 (표로 보기에도 같은 값)
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { formatAxisWon, monthTicks, niceTicks, pickLabels, textBox, textWidth, type Anchor, type Box, type Obstacle } from "@/lib/chart";
import { formatManwon } from "@/lib/format";
import { afterLabel, type EventMark } from "@/lib/result";
import type { SimulateResult } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";

const MARGIN = { top: 30, right: 18, bottom: 34, left: 58 };

/** 그래프 위 글자: 바탕색 테두리를 먼저 칠해서 선·점선이 글자를 가로지르지 않게 */
const HALO = { strokeWidth: 4, strokeLinejoin: "round", paintOrder: "stroke" } as const;
/** 툴팁 폭(px): 가장 긴 줄 '−3억 2,388만 원 최악의 경우'가 한 줄에 들어가는 폭 */
const TOOLTIP_W = 224;
/** 굵은 글자는 조금 더 넓다 */
const BOLD = 1.06;

function useElementWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function BandChart({ result, events = [] }: { result: SimulateResult; events?: EventMark[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const [active, setActive] = useState<number | null>(null);

  const narrow = width !== null && width < 560;
  const height = narrow ? 270 : 330;
  const bands = result.bands;
  const last = bands.length - 1;
  const gm = Math.min(result.goal.goalMonths, last);
  const target = result.goal.targetAmount;
  const det = result.deterministic;

  const values = [...bands.flatMap((b) => [b.p5, b.p90]), target, det.atGoal, det.at120, 0];
  const scale = niceTicks(Math.min(...values), Math.max(...values), narrow ? 4 : 5);
  const plotW = Math.max(10, (width ?? 0) - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const x = (m: number) => MARGIN.left + (m / last) * plotW;
  const y = (v: number) => MARGIN.top + (1 - (v - scale.min) / (scale.max - scale.min)) * plotH;

  const line = (pick: (b: (typeof bands)[number]) => number) =>
    bands.map((b, m) => `${m === 0 ? "M" : "L"}${x(m).toFixed(1)},${y(pick(b)).toFixed(1)}`).join("");
  const area =
    bands.map((b, m) => `${m === 0 ? "M" : "L"}${x(m).toFixed(1)},${y(b.p90).toFixed(1)}`).join("") +
    bands
      .map((b, m) => ({ b, m }))
      .reverse()
      .map(({ b, m }) => `L${x(m).toFixed(1)},${y(b.p10).toFixed(1)}`)
      .join("") +
    "Z";

  const goalBand = bands[gm];
  const activeBand = active === null ? null : bands[active];

  // ----- 라벨 자리: 데이터 선 · 점 · 다른 라벨과 겹치지 않는 후보를 고른다 (lib/chart.ts pickLabels) -----
  const plotRight = MARGIN.left + plotW;
  const edgeAnchor = (px: number): Anchor => (px > plotRight - 60 ? "end" : px < MARGIN.left + 60 ? "start" : "middle");
  const place = (px: number, baseline: number, anchor: Anchor, w: number): Label => ({ x: px, y: baseline, anchor, box: textBox(px, baseline, w, anchor) });
  const bounds: Box = { x0: MARGIN.left + 2, y0: 0, x1: width ?? 0, y1: MARGIN.top + plotH };
  const dataLines: Obstacle[] = [
    { kind: "line", points: bands.map((b, m) => [x(m), y(b.p50)] as const) },
    { kind: "line", points: bands.map((b, m) => [x(m), y(b.p5)] as const) },
  ];
  const goalX = x(gm);
  const goalText = `목표 시점 ${goalBand ? formatYearMonth(goalBand.month) : ""}`;
  const goalLabel = place(goalX, MARGIN.top - 12, edgeAnchor(goalX), textWidth(goalText) * BOLD);
  const calcY = y(det.atGoal);
  const targetY = y(target);
  const marks: Obstacle[] = [
    { kind: "box", box: goalLabel.box },
    ...(gm !== last ? [{ kind: "box", box: { x0: x(last) - 7, x1: x(last) + 7, y0: y(det.at120) - 7, y1: y(det.at120) + 7 } } as const] : []),
    ...events.map((e) => ({ kind: "box", box: { x0: x(e.months) - 8, x1: x(e.months) + 8, y0: MARGIN.top + plotH - 8, y1: MARGIN.top + plotH + 8 } }) as const),
  ];

  // 계산기 라벨: 점의 오른쪽 위 · 왼쪽 위(중간값 선이 점 아래일 때) → 아래 → 옆. 깨끗한 자리가 없으면 안 그린다(범례 · 툴팁에 있다)
  const calcText = `계산기 ${formatManwon(det.atGoal)}`;
  const calcW = textWidth(calcText);
  const up = [place(goalX + 7, calcY - 9, "start", calcW), place(goalX - 7, calcY - 9, "end", calcW)];
  const down = [place(goalX + 7, calcY + 18, "start", calcW), place(goalX - 7, calcY + 18, "end", calcW)];
  const side = [place(goalX + 11, calcY + 4, "start", calcW), place(goalX - 11, calcY + 4, "end", calcW)];
  // 목표 금액 라벨: 점선의 왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래
  const targetText = `목표 ${formatManwon(target)}`;
  const targetW = textWidth(targetText) * BOLD;
  const [calcLabel, targetLabel] = pickLabels(
    {
      candidates: [...(goalBand && goalBand.p50 > det.atGoal ? [...down, ...up] : [...up, ...down]), ...side],
      hard: [...dataLines, ...marks],
      soft: [
        { kind: "hline", y: targetY },
        { kind: "vline", x: goalX },
      ],
    },
    {
      candidates: [
        place(MARGIN.left + 6, targetY - 6, "start", targetW),
        place(plotRight - 6, targetY - 6, "end", targetW),
        place(MARGIN.left + 6, targetY + 15, "start", targetW),
        place(plotRight - 6, targetY + 15, "end", targetW),
      ],
      hard: [...dataLines, ...marks, { kind: "box", box: { x0: goalX - 7, x1: goalX + 7, y0: calcY - 7, y1: calcY + 7 } }],
      soft: [{ kind: "vline", x: goalX }],
    },
    bounds,
  );
  const activeEvent = active === null ? undefined : events.find((e) => e.months === active);

  const monthAt = (clientX: number, rect: DOMRect) =>
    Math.max(0, Math.min(last, Math.round(((clientX - rect.left - MARGIN.left) / plotW) * last)));

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    setActive(monthAt(event.clientX, event.currentTarget.getBoundingClientRect()));
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 12 : 1;
    const current = active ?? gm;
    const next =
      event.key === "ArrowRight" ? current + step : event.key === "ArrowLeft" ? current - step : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(last, next)));
  };

  const summary = goalBand
    ? `모은 돈 범위 그래프. 목표 시점(${formatYearMonth(goalBand.month)})의 중간값 ${formatManwon(goalBand.p50)}, 아래 10% ${formatManwon(goalBand.p10)}, 위 10% ${formatManwon(goalBand.p90)}, 최악의 경우 ${formatManwon(goalBand.p5)}. 화살표 키로 달을 옮겨 볼 수 있어요.`
    : "모은 돈 범위 그래프";

  // 툴팁: 가리킨 달의 오른쪽(자리가 없으면 왼쪽)에, 그래프 밖으로 나가지 않게
  const tooltipLeft = (() => {
    if (active === null || width === null) return 0;
    const right = x(active) + 14;
    const preferred = right + TOOLTIP_W <= width - 2 ? right : x(active) - 14 - TOOLTIP_W;
    return Math.max(2, Math.min(width - TOOLTIP_W - 2, preferred));
  })();

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="group"
      aria-label={summary}
      onKeyDown={onKey}
      onFocus={() => setActive((m) => m ?? gm)}
      onBlur={() => setActive(null)}
      className="relative w-full rounded-lg outline-offset-4"
      style={{ height }}
    >
      {width !== null && (
        <svg
          width={width}
          height={height}
          role="presentation"
          className="touch-pan-y select-none"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
        >
          {/* 가로 눈금 (실선 hairline) */}
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotW}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? "stroke-line-strong" : "stroke-line"}
                strokeWidth={1}
              />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {formatAxisWon(tick)}
              </text>
            </g>
          ))}
          {/* 세로축 눈금: 해마다 */}
          {monthTicks(last, narrow).map((m) => (
            <text key={m} x={x(m)} y={height - MARGIN.bottom + 18} textAnchor="middle" className="fill-muted text-[11px]">
              {m === 0 ? "지금" : `${m / 12}년`}
            </text>
          ))}

          {/* 범위 (아래 10%~위 10%) */}
          <path d={area} className="fill-primary/12" />
          {/* 최악의 경우 (하위 5%) */}
          <path d={line((b) => b.p5)} fill="none" className="stroke-series-2" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* 중간값 */}
          <path d={line((b) => b.p50)} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* 목표 금액 (기준선이라 점선) */}
          <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(target)} y2={y(target)} className="stroke-ink-soft" strokeWidth={1.5} strokeDasharray="5 4" />
          {/* 목표 시점 */}
          <line x1={x(gm)} x2={x(gm)} y1={MARGIN.top - 6} y2={MARGIN.top + plotH} className="stroke-ink-soft" strokeWidth={1.5} strokeDasharray="5 4" />

          {/* 예정된 일 (입력의 occurDate) */}
          {events.map((event) => (
            <g key={event.months} transform={`translate(${x(event.months)},${MARGIN.top + plotH})`}>
              <title>{`${afterLabel(event.months)} · ${event.label}`}</title>
              <rect x={-5} y={-5} width={10} height={10} transform="rotate(45)" className="fill-warn stroke-surface" strokeWidth={2} />
            </g>
          ))}

          {/* 계산기 결과: 목표 시점 · 10년 뒤 두 점 */}
          {[
            { m: gm, v: det.atGoal },
            ...(gm !== last ? [{ m: last, v: det.at120 }] : []),
          ].map(({ m, v }) => (
            <circle key={m} cx={x(m)} cy={y(v)} r={5} className="fill-surface stroke-ink" strokeWidth={2} />
          ))}

          {/* 라벨: 선 위에 바탕을 깔고 쓴다 (자리는 위에서 골랐다) */}
          <ChartLabel label={goalLabel} text={goalText} bold chip={false} />
          <ChartLabel label={targetLabel} text={targetText} bold />
          {calcLabel && <ChartLabel label={calcLabel} text={calcText} />}

          {/* 가리킨 달 */}
          {activeBand && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + plotH} className="stroke-ink-soft" strokeWidth={1} />
              {[
                { v: activeBand.p90, cls: "fill-primary" },
                { v: activeBand.p10, cls: "fill-primary" },
                { v: activeBand.p5, cls: "fill-series-2" },
                { v: activeBand.p50, cls: "fill-primary" },
              ].map(({ v, cls }, i) => (
                <circle key={i} cx={x(active)} cy={y(v)} r={4} className={`${cls} stroke-surface`} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}

      {activeBand && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ top: MARGIN.top, left: tooltipLeft, width: TOOLTIP_W }}
        >
          <p className="font-semibold text-ink">
            {formatYearMonth(activeBand.month)} · {afterLabel(active)}
          </p>
          <div className="mt-1.5 grid grid-cols-[0.75rem_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 whitespace-nowrap">
            {/* 그래프에서 보이는 위아래 순서 그대로 (1·3·5·10년 표와 같은 이름) */}
            <TooltipRow mark={<span className="block h-2.5 w-3 rounded-sm bg-primary/20" />} value={formatManwon(activeBand.p90)} label="위 10%" />
            <TooltipRow mark={<span className="block h-0.5 w-3 rounded-full bg-primary" />} value={formatManwon(activeBand.p50)} label="중간값" />
            <TooltipRow mark={<span className="block h-2.5 w-3 rounded-sm bg-primary/20" />} value={formatManwon(activeBand.p10)} label="아래 10%" />
            <TooltipRow mark={<span className="block h-0.5 w-3 rounded-full bg-series-2" />} value={formatManwon(activeBand.p5)} label="최악의 경우" />
            {(active === gm || active === last) && (
              <TooltipRow
                mark={<span className="block size-2.5 rounded-full border-2 border-ink" />}
                value={formatManwon(active === gm ? det.atGoal : det.at120)}
                label="계산기 결과"
              />
            )}
          </div>
          {activeEvent && (
            <p className="mt-1.5 font-semibold text-ink">
              <span aria-hidden className="text-warn">
                ◆
              </span>{" "}
              {activeEvent.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface Label {
  x: number;
  y: number;
  anchor: Anchor;
  box: Box;
}

/** 그래프 위 라벨. chip이면 글자 뒤에 바탕색 상자를 깔아서 지나가는 점선을 가린다 */
function ChartLabel({ label, text, bold = false, chip = true }: { label: Label; text: string; bold?: boolean; chip?: boolean }) {
  const { box } = label;
  return (
    <g pointerEvents="none">
      {chip && (
        <rect
          x={box.x0 - 3}
          y={box.y0 - 2}
          width={box.x1 - box.x0 + 6}
          height={box.y1 - box.y0 + 4}
          rx={3}
          className="fill-surface"
          opacity={0.92}
        />
      )}
      <text x={label.x} y={label.y} textAnchor={label.anchor} {...HALO} className={`fill-ink stroke-surface text-[12px] ${bold ? "font-semibold" : ""}`}>
        {text}
      </text>
    </g>
  );
}

/** 툴팁 한 줄: 값이 앞, 이름은 뒤 (값을 찾으러 온 사람에게). 부모가 3칸 grid */
function TooltipRow({ mark, value, label }: { mark: ReactNode; value: string; label: string }) {
  return (
    <>
      <span aria-hidden className="flex items-center">
        {mark}
      </span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
      <span className="truncate text-muted">{label}</span>
    </>
  );
}

/** 그래프 위 범례 (2개 이상이라 항상 보여 준다) */
export function BandLegend({ hasEvents }: { hasEvents: boolean }) {
  const item = (key: ReactNode, label: string) => (
    <li className="flex items-center gap-1.5">
      {key}
      <span>{label}</span>
    </li>
  );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
      {item(<span aria-hidden className="inline-block h-0.5 w-4 bg-primary" />, "중간값 (미래의 절반)")}
      {item(<span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-primary/15" />, "범위 (아래 10%~위 10%)")}
      {item(<span aria-hidden className="inline-block h-0.5 w-4 bg-series-2" />, "최악의 경우 (하위 5%)")}
      {item(<span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-ink-soft" />, "목표 금액 · 목표 시점")}
      {item(<span aria-hidden className="inline-block size-2.5 rounded-full border-2 border-ink" />, "계산기 결과 (실직·급한 지출이 없을 때)")}
      {hasEvents && item(<span aria-hidden className="inline-block size-2 rotate-45 bg-warn" />, "예정된 일")}
    </ul>
  );
}
