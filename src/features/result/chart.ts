/**
 * 그래프 눈금 · 축 글자 (순수 함수). 그리는 건 같은 폴더의 BandChart.tsx.
 */
import { MINUS, groupDigits } from "@/lib/format";

/** 1 · 2 · 5 × 10^k 중에서 target개쯤 나오는 간격 */
export function niceStep(span: number, target = 5): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const raw = span / Math.max(1, target);
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return nice * power;
}

/** min~max를 덮는 깔끔한 눈금. 0은 항상 눈금에 들어간다 (min ≤ 0 ≤ max일 때) */
export function niceTicks(min: number, max: number, target = 5): { ticks: number[]; min: number; max: number } {
  if (min === max) {
    const pad = Math.abs(min) || 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, target);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { ticks, min: lo, max: hi };
}

/** 축 글자: 0 · 5,000만 · 1억 · 1.5억 · −1,000만 */
export function formatAxisWon(value: number): string {
  if (value === 0) return "0";
  const sign = value < 0 ? MINUS : "";
  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    const eok = abs / 100_000_000;
    return `${sign}${Number.isInteger(eok) ? eok : eok.toFixed(1).replace(/\.0$/, "")}억`;
  }
  if (abs >= 10_000) return `${sign}${groupDigits(Math.round(abs / 10_000))}만`;
  return `${sign}${groupDigits(abs)}`;
}

/** 가로축(개월) 눈금: 1년마다, 좁으면 2년마다 */
export function monthTicks(maxMonths: number, narrow: boolean): number[] {
  const step = narrow ? 24 : 12;
  const ticks: number[] = [];
  for (let m = 0; m <= maxMonths; m += step) ticks.push(m);
  if (ticks[ticks.length - 1] !== maxMonths && maxMonths % 12 === 0) ticks.push(maxMonths);
  return ticks;
}

// ===== 그래프 위 라벨 자리 고르기 (선 · 다른 라벨과 겹치지 않게) =====

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type Anchor = "start" | "middle" | "end";

/** 글자 폭 어림(px): 한글 1em, 숫자·기호 0.6em, 공백·쉼표 0.3em */
export function textWidth(text: string, fontSize = 12): number {
  let em = 0;
  for (const ch of text) {
    if (/[ᄀ-ᇿ㄰-㆏가-힣]/.test(ch)) em += 1;
    else if (/[ ,.·]/.test(ch)) em += 0.3;
    else em += 0.6;
  }
  return em * fontSize;
}

/** SVG <text>(x, 기준선 y, text-anchor)가 차지하는 상자 */
export function textBox(x: number, baseline: number, width: number, anchor: Anchor, fontSize = 12): Box {
  const x0 = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return { x0, x1: x0 + width, y0: baseline - fontSize * 0.86, y1: baseline + fontSize * 0.24 };
}

export type Obstacle =
  | { kind: "hline"; y: number }
  | { kind: "vline"; x: number }
  | { kind: "box"; box: Box }
  /** 꺾은선 (x가 커지는 순서의 점들) */
  | { kind: "line"; points: readonly (readonly [number, number])[] };

/** 두 구간 [a0, a1] · [b0, b1] 사이 거리 (겹치면 0) */
function gap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.max(a0, b0) - Math.min(a1, b1));
}

/** 상자와 장애물 사이의 가장 가까운 거리(px). 겹치거나 가로지르면 0 */
export function clearance(box: Box, obstacle: Obstacle): number {
  switch (obstacle.kind) {
    case "hline":
      return gap(box.y0, box.y1, obstacle.y, obstacle.y);
    case "vline":
      return gap(box.x0, box.x1, obstacle.x, obstacle.x);
    case "box":
      return Math.hypot(gap(box.x0, box.x1, obstacle.box.x0, obstacle.box.x1), gap(box.y0, box.y1, obstacle.box.y0, obstacle.box.y1));
    case "line": {
      let best = Infinity;
      const points = obstacle.points;
      for (let i = 1; i < points.length; i += 1) {
        const [ax, ay] = points[i - 1];
        const [bx, by] = points[i];
        if (bx < box.x0 || ax > box.x1) {
          // 상자 옆을 지나는 선분: 가까운 끝점까지의 거리
          const [ex, ey] = bx < box.x0 ? [bx, by] : [ax, ay];
          best = Math.min(best, Math.hypot(gap(ex, ex, box.x0, box.x1), gap(ey, ey, box.y0, box.y1)));
          continue;
        }
        // 상자 폭 안으로 자른 선분의 세로 범위와 상자의 세로 거리
        const t0 = bx === ax ? 0 : Math.max(0, (box.x0 - ax) / (bx - ax));
        const t1 = bx === ax ? 1 : Math.min(1, (box.x1 - ax) / (bx - ax));
        const y0 = ay + (by - ay) * t0;
        const y1 = ay + (by - ay) * t1;
        best = Math.min(best, gap(Math.min(y0, y1), Math.max(y0, y1), box.y0, box.y1));
      }
      return best;
    }
  }
}

function minClearance(box: Box, obstacles: readonly Obstacle[]): number {
  return obstacles.reduce((min, obstacle) => Math.min(min, clearance(box, obstacle)), Infinity);
}

export interface LabelGroup<T extends { box: Box }> {
  /** 좋아하는 순서대로 */
  candidates: readonly T[];
  /** 꼭 피할 것: 데이터 선 · 점 · 다른 라벨 */
  hard: readonly Obstacle[];
  /** 될 수 있으면 피할 것: 기준 점선 (라벨 바탕이 가려 준다) */
  soft: readonly Obstacle[];
}

/** 후보 하나만 고를 때: comfortable + soft → comfortable → 가장 멀리 */
function pickOne<T extends { box: Box }>(candidates: readonly T[], group: LabelGroup<T>, comfortable: number): T {
  const scored = candidates.map((candidate) => ({
    candidate,
    hard: minClearance(candidate.box, group.hard),
    soft: minClearance(candidate.box, group.soft),
  }));
  const pick =
    scored.find((s) => s.hard >= comfortable && s.soft >= 2) ??
    scored.find((s) => s.hard >= comfortable) ??
    scored.reduce((best, s) => (s.hard > best.hard ? s : best));
  return pick.candidate;
}

/**
 * 라벨 두 개의 자리를 함께 고른다 (서로도 피한다). 첫 번째 라벨의 순서를 먼저 따른다.
 *  1. 그리는 영역(bounds) 밖으로 나가는 후보는 뺀다
 *  2. 둘 다 hard와 comfortable px 넘게, soft와도 떨어진 첫 조합
 *  3. 없으면 둘 다 hard와만 떨어진 첫 조합
 *  4. 그래도 없으면 첫 번째 라벨은 그리지 않고(null) 두 번째 라벨만 혼자 고른다
 *     (좁은 화면에서 선을 가리느니 빼는 게 낫다. 범례 · 툴팁에 같은 값이 있다)
 */
export function pickLabels<A extends { box: Box }, B extends { box: Box }>(
  first: LabelGroup<A>,
  second: LabelGroup<B>,
  bounds: Box,
  comfortable = 6,
): [A | null, B] {
  const inBounds = <T extends { box: Box }>(list: readonly T[]) => {
    const inside = list.filter(({ box }) => box.x0 >= bounds.x0 && box.x1 <= bounds.x1 && box.y0 >= bounds.y0 && box.y1 <= bounds.y1);
    return inside.length > 0 ? inside : list;
  };
  const firsts = inBounds(first.candidates);
  const seconds = inBounds(second.candidates);
  let hardOnly: [A, B] | null = null;
  for (const a of firsts) {
    for (const b of seconds) {
      const between = clearance(a.box, { kind: "box", box: b.box });
      const hard = Math.min(minClearance(a.box, first.hard), minClearance(b.box, second.hard), between);
      if (hard < comfortable) continue;
      const soft = Math.min(minClearance(a.box, first.soft), minClearance(b.box, second.soft));
      if (soft >= 2) return [a, b];
      hardOnly ??= [a, b];
    }
  }
  return hardOnly ?? [null, pickOne(seconds, second, comfortable)];
}
