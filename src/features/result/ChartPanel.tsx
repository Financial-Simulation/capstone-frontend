"use client";

/**
 * 결과 그래프 + 미래 다시 보기 (멘토 피드백 11/16: 따로 화면을 만들지 말고 그래프 위 버튼으로).
 *  - [전체 범위] 미래 2,000가지의 범위 (지금까지의 그래프)
 *  - [최상 · 중간 · 최악] 그중 상위 5% · 가운데 · 하위 5% 미래 하나를 같은 그래프 위에 한 달씩 그린다 (POST /simulate/story)
 *    큰 일(실직 · 급한 지출 · 적금 해지 · 빌리기 · 목표 달성)은 그래프 위에 크게 띄우고 잠깐 멈춘다.
 *    그래프 아래에 이번 달 변수(일 · 월급 · 들어온 돈 · 생활비 · 물가 · 저축)와 계좌별 잔액, 지금까지 일어난 일.
 * 계획을 바꿨으면(adjustments) 바꾼 계획의 미래를 본다. 숫자는 모두 서버 값이고, 문장은 features/story/story.ts가 고른다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { KIND_LABELS, accountRows, eventViews, plannedNames, variableRows, type StoryEventView } from "@/features/story/story";
import { api, errorMessage, isAbortError } from "@/lib/api";
import { formatManwon } from "@/lib/format";
import type { Adjustments, SimulateResult, SimulationInputDraft, Story, StoryKind, StoryResult } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { BandChart, BandLegend, type StoryOverlay } from "./BandChart";
import { eventMarks } from "./result";

/** 1초에 몇 달 */
const SPEEDS = [4, 8, 16] as const;
/** 큰 일이 있는 달에서 멈추는 시간 (ms) */
const HOLD_MS = 1300;
const KINDS: StoryKind[] = ["BEST", "MIDDLE", "WORST"];
const KIND_TONE: Record<StoryKind, StoryOverlay["tone"]> = { BEST: "good", MIDDLE: "primary", WORST: "danger" };

const TONE_BOX = {
  good: "border-good-line bg-good-soft/60",
  bad: "border-danger-line bg-danger-soft/60",
  info: "border-line bg-system-soft",
} as const;

export function ChartPanel({
  result,
  base,
  input,
  adjustments,
  storyEnabled,
}: {
  /** 보여 줄 결과 (계획을 바꿨으면 바꾼 계획) */
  result: SimulateResult;
  /** 계획을 바꿨을 때 지금 계획 (회색 점선). 안 바꿨으면 null */
  base: SimulateResult | null;
  input: SimulationInputDraft;
  adjustments: Adjustments;
  /** 04-E 예시 결과에는 미래 다시 보기를 붙이지 않는다 */
  storyEnabled: boolean;
}) {
  const events = eventMarks(input);
  const [kind, setKind] = useState<StoryKind | null>(null);
  const story = useStoryData(kind !== null && storyEnabled ? input : null, adjustments);
  const current = story.data?.stories.find((s) => s.kind === kind) ?? null;

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <h2 className="text-base font-bold">앞으로 모을 돈</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {kind === null
              ? `가능한 미래 ${result.paths.toLocaleString("ko-KR")}가지를 계산했어요. 버튼으로 하나씩 볼 수 있어요.`
              : `${result.paths.toLocaleString("ko-KR")}가지 중 '${KIND_LABELS[kind].title}'(${KIND_LABELS[kind].sub}) 미래 하나를 한 달씩 보여 드려요.`}
          </p>
        </div>
        {storyEnabled && (
          <div className="flex overflow-hidden rounded-lg border border-line-strong text-sm" role="group" aria-label="미래 고르기">
            {[null, ...KINDS].map((k) => (
              <button
                key={k ?? "ALL"}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`h-9 px-3 font-semibold ${kind === k ? "bg-ink text-white" : "bg-surface text-ink-soft hover:bg-canvas"}`}
              >
                {k === null ? "전체 범위" : KIND_LABELS[k].title}
              </button>
            ))}
          </div>
        )}
      </div>

      {kind === null || !storyEnabled ? (
        <>
          <div className="mt-4">
            <BandLegend hasEvents={events.length > 0} />
            {base && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-muted" />
                지금 계획의 상위 50% (막대로 바꾸기 전)
              </p>
            )}
          </div>
          <div className="mt-3">
            <BandChart result={result} events={events} ghost={base?.bands} />
          </div>
        </>
      ) : story.error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          미래를 불러오지 못했어요: {story.error}
        </p>
      ) : !current || !story.data ? (
        <p className="mt-4 text-sm text-muted">미래를 불러오는 중…</p>
      ) : (
        <Replay key={`${kind}:${JSON.stringify(adjustments)}`} result={result} data={story.data} story={current} input={input} events={events} />
      )}
    </section>
  );
}

/** 고른 미래 세 개 (버튼을 처음 누를 때 한 번 부르고, 계획이 바뀌면 다시) */
function useStoryData(input: SimulationInputDraft | null, adjustments: Adjustments) {
  const key = input ? JSON.stringify({ input, adjustments }) : null;
  const [state, setState] = useState<{ key: string; data: StoryResult | null; error: string | null } | null>(null);
  useEffect(() => {
    if (key === null) return;
    const abort = new AbortController();
    const body = JSON.parse(key) as { input: never; adjustments: Adjustments };
    const changed = Object.keys(body.adjustments).length > 0;
    api.story({ input: body.input, ...(changed ? { adjustments: body.adjustments } : {}) }, { signal: abort.signal }).then(
      ({ data }) => setState({ key, data, error: null }),
      (error: unknown) => {
        if (!isAbortError(error)) setState({ key, data: null, error: errorMessage(error) });
      },
    );
    return () => abort.abort();
  }, [key]);
  const fresh = state?.key === key;
  return { data: fresh ? state.data : null, error: fresh ? state.error : null };
}

function Replay({
  result,
  data,
  story,
  input,
  events,
}: {
  result: SimulateResult;
  data: StoryResult;
  story: Story;
  input: SimulationInputDraft;
  events: ReturnType<typeof eventMarks>;
}) {
  const months = story.months;
  const last = months.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(8);
  const planned = useMemo(() => plannedNames(input), [input]);
  const all = useMemo(() => months.flatMap((m) => eventViews(m, data.targetAmount, planned)), [months, data.targetAmount, planned]);

  const running = playing && index < last;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!running) return;
    const major = all.some((e) => e.afterMonths === months[index].afterMonths && e.major);
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 1000 / speed + (major ? HOLD_MS : 0));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [running, index, last, speed, all, months]);

  const m = months[index];
  const prev = index > 0 ? months[index - 1] : null;
  const now = all.filter((e) => e.afterMonths === m.afterMonths && e.major);
  const past = all.filter((e) => e.afterMonths <= m.afterMonths).reverse();
  const start = result.bands[0]?.p50 ?? 0;
  const overlay: StoryOverlay = {
    full: [start, ...months.map((mm) => mm.total)],
    shown: [start, ...months.slice(0, index + 1).map((mm) => mm.total)],
    tone: KIND_TONE[story.kind],
    // 같은 달에 같은 색 사건이 둘 이상이면(예: 급한 지출 + 빌리기 시작) 점은 하나만 찍는다
    marks: all
      .filter((e) => e.major && e.afterMonths <= m.afterMonths)
      .filter((e, i, list) => list.findIndex((o) => o.major && o.afterMonths === e.afterMonths && o.tone === e.tone) === i)
      .map((e) => ({ months: e.afterMonths, value: months[e.afterMonths - 1].total, tone: e.tone })),
  };
  const reached = m.total >= data.targetAmount;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            {formatYearMonth(m.month)} · {m.afterMonths}개월째
            {m.afterMonths === data.goalMonths && <span className="ml-2 font-semibold text-primary">목표 시점</span>}
          </p>
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${m.total < 0 ? "text-danger" : "text-ink"}`}>
            {formatManwon(m.total)}
            {prev && Math.abs(m.total - prev.total) >= 5_000 && (
              <span className={`ml-2 text-base font-semibold ${m.total > prev.total ? "text-good" : "text-danger"}`}>
                ({m.total > prev.total ? "+" : ""}
                {formatManwon(m.total - prev.total)})
              </span>
            )}
          </p>
          <p className="text-sm text-ink-soft">
            모은 돈 · 목표 {formatManwon(data.targetAmount)}
            {reached ? <span className="ml-1 font-semibold text-good">넘었어요</span> : <span>까지 {formatManwon(data.targetAmount - m.total)} 남았어요</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (index >= last) {
                setIndex(0);
                setPlaying(true);
              } else setPlaying(!running);
            }}
          >
            {running ? "일시정지" : index >= last ? "처음부터 재생" : "재생"}
          </Button>
          <div className="flex overflow-hidden rounded-lg border border-line-strong text-sm" role="group" aria-label="빠르기">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === speed}
                onClick={() => setSpeed(s)}
                className={`h-9 px-2.5 ${s === speed ? "bg-ink text-white" : "bg-surface text-ink-soft hover:bg-canvas"}`}
              >
                {s}개월/초
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-[3.5rem]" aria-live="polite">
        {now.map((e) => (
          <Banner key={e.key} event={e} />
        ))}
      </div>

      <BandChart result={result} events={events} story={overlay} />
      <input
        type="range"
        min={0}
        max={last}
        value={index}
        onChange={(event) => {
          setPlaying(false);
          setIndex(Number(event.target.value));
        }}
        aria-label="달 옮기기"
        className="mt-1 w-full accent-[var(--color-primary)]"
      />

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {variableRows(m, prev).map((row) => (
          <div key={row.key} className={`rounded-lg px-3 py-2 transition-colors ${row.changed ? "bg-warn-soft" : "bg-canvas"}`}>
            <dt className="text-xs text-ink-soft">{row.label}</dt>
            <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${row.tone === "bad" ? "text-danger" : ""}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-ink-soft">
        <span className="font-semibold text-ink">계좌</span>{" "}
        {accountRows(m)
          .map((r) => `${r.label} ${formatManwon(r.value)}`)
          .join(" · ")}
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-soft">지금까지 일어난 일 ({past.length})</summary>
        <ol className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {past.map((e) => (
            <li key={e.key} className={`rounded-lg border px-3 py-1.5 text-sm ${TONE_BOX[e.tone]}`}>
              <span className="mr-2 text-ink-soft">{formatYearMonth(e.month)}</span>
              <span className="font-semibold">{e.title}</span> <span className="text-ink-soft">{e.detail}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function Banner({ event }: { event: StoryEventView }) {
  return (
    <div className={`mb-2 rounded-lg border-2 px-4 py-2 shadow-sm ${TONE_BOX[event.tone]}`}>
      <p className="font-bold">{event.title}</p>
      <p className="text-sm text-ink-soft">{event.detail}</p>
    </div>
  );
}
