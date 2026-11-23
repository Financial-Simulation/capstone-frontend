"use client";

/**
 * 결과 화면 '상품별로 나눠 보기' (조민석 배치안 11/18: 원그래프 3개 · 멘토 피드백 11/16: 입력칸 없이, 글은 접기).
 * /allocations/recommend 결과(ResultView가 한 번 부른다)를 원그래프 3개로: 지금 배분 · 가능성이 가장 높은 배분 · 세금·지원금이 가장 큰 배분.
 * 원 = 월 저축액을 상품별로 나눈 비율. '이 배분으로 보기'를 누르면 그 배분으로 결론 · 그래프가 바로 다시 계산된다.
 * 고르는 규칙 설명은 접어 둔다. 보여 줄 값은 allocation.ts(recommendCards · recommendNote)가 서버 값에서 고른다.
 */
import { Button } from "@/components/ui";
import { goalWhen } from "@/features/result/result";
import { formatManwon } from "@/lib/format";
import type { Allocation, RecommendResult, SimulateResult } from "@/lib/types";
import { recommendCards, recommendNote, sameAllocation, toMonthly, type MonthlyAllocation } from "./allocation";

const SEGMENTS = [
  { key: "policyMonthly", label: "청년미래적금", fill: "fill-primary", dot: "bg-primary" },
  { key: "housingMonthly", label: "주택청약", fill: "fill-good", dot: "bg-good" },
  { key: "pensionMonthly", label: "연금저축", fill: "fill-warn", dot: "bg-warn" },
  { key: "generalMonthly", label: "일반 적금", fill: "fill-line-strong", dot: "bg-line-strong" },
] as const;

export function AllocationSection({
  result,
  recommend,
  error,
  allocation,
  onPick,
}: {
  result: SimulateResult;
  recommend: RecommendResult | null;
  error: string | null;
  /** 지금 보고 있는 배분 (같은 원에 표시) */
  allocation: MonthlyAllocation;
  onPick: (allocation: MonthlyAllocation) => void;
}) {
  return (
    <section aria-labelledby="alloc-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="alloc-title" tabIndex={-1} className="text-base font-bold outline-none">
        상품별로 나눠 보기
      </h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block size-2.5 rounded-sm ${s.dot}`} />
            {s.label}
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          배분을 찾지 못했어요: {error}
        </p>
      ) : !recommend ? (
        <p className="mt-3 text-sm text-muted">가장 좋은 배분을 찾는 중… (몇 초 걸려요)</p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {recommendCards(recommend).map((card) => {
              const option = recommend[card.key];
              const monthly = toMonthly(option.allocation);
              const active = sameAllocation(allocation, monthly);
              return (
                <li key={card.key} className={`flex items-center gap-4 rounded-lg border p-3 ${active ? "border-primary" : "border-line"}`}>
                  <Pie allocation={option.allocation} label={card.allocation} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-semibold">{card.title}</p>
                    <p className="text-sm">
                      가능성 <span className="font-bold tabular-nums">{card.probability}</span>
                    </p>
                    <p className="text-sm text-ink-soft">
                      혜택 <span className="font-semibold text-good tabular-nums">{formatManwon(option.totalBenefit)}</span>
                    </p>
                    <Button size="sm" variant={active ? "secondary" : "primary"} className="mt-2" disabled={active} onClick={() => onPick(monthly)}>
                      {active ? "지금 보는 배분" : "이 배분으로 보기"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink-soft">어떻게 골랐나요?</summary>
            <p className="mt-2 text-sm text-ink-soft">{recommendNote(recommend, result.paths, goalWhen(result))}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
              {recommendCards(recommend).map((card) => (
                <li key={card.key}>
                  {card.title}: {card.allocation}. {card.benefit}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

const R = 44;
const C = 50;

/** 원그래프: 월 저축액을 상품별로 (조각 안에 비율이 12% 이상이면 금액) */
function Pie({ allocation, label }: { allocation: Allocation; label: string }) {
  const slices = slicesOf(allocation);
  const total = SEGMENTS.reduce((sum, s) => sum + allocation[s.key], 0);
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className="size-28 shrink-0">
      {total <= 0 && <circle cx={C} cy={C} r={R} className="fill-line" />}
      {slices.map((s) =>
        s.share >= 0.999 ? (
          <circle key={s.key} cx={C} cy={C} r={R} className={s.fill} />
        ) : (
          <path key={s.key} d={arc(s.start, s.end)} className={`${s.fill} stroke-surface`} strokeWidth={1} />
        ),
      )}
      {slices
        .filter((s) => s.share >= 0.12)
        .map((s) => {
          const mid = (s.start + s.end) / 2;
          const r = s.share >= 0.999 ? 0 : R * 0.6;
          return (
            <text
              key={`t-${s.key}`}
              x={C + Math.cos(mid) * r}
              y={C + Math.sin(mid) * r}
              textAnchor="middle"
              dominantBaseline="central"
              className={`text-[9px] font-semibold ${s.key === "generalMonthly" ? "fill-ink" : "fill-white"}`}
            >
              {formatManwon(s.value)}
            </text>
          );
        })}
    </svg>
  );
}

/** 12시 방향부터 시계 방향으로 조각 (0원인 상품은 뺀다) */
function slicesOf(allocation: Allocation) {
  const total = SEGMENTS.reduce((sum, s) => sum + allocation[s.key], 0);
  const out = [];
  let angle = -Math.PI / 2;
  for (const s of SEGMENTS) {
    const value = allocation[s.key];
    if (value <= 0) continue;
    const share = total > 0 ? value / total : 0;
    const start = angle;
    angle += share * 2 * Math.PI;
    out.push({ ...s, share, start, end: angle, value });
  }
  return out;
}

function arc(start: number, end: number): string {
  const x1 = C + R * Math.cos(start);
  const y1 = C + R * Math.sin(start);
  const x2 = C + R * Math.cos(end);
  const y2 = C + R * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}
