"use client";

/**
 * 데모 '미래 다시 보기' (/story). 결과 화면과 같은 입력 · 같은 미래 2,000개 중
 * 최상(상위 5%) · 중간 · 최악(하위 5%) 미래 하나를 골라 한 달씩 재생한다.
 *  - 위: 모은 돈 숫자와 그래프가 달마다 그려진다 (목표선 · 목표 시점 · 사건 점)
 *  - 오른쪽: 이번 달 변수(일 · 월급 · 들어온 돈 · 생활비 · 물가 · 대출 · 저축)와 계좌별 잔액
 *  - 아래: 일어난 일 목록. 큰 사건(실직 · 급한 지출 · 적금 해지 · 빌리기 · 목표 달성)은 크게 보여 주고 재생을 잠깐 멈춘다
 * 숫자는 모두 서버(/simulate/story) 값이다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui";
import { MockNote } from "@/features/result/Hero";
import { Computing, Empty, Failed, NotReady } from "@/features/result/StateViews";
import { readiness } from "@/features/result/result";
import { api, isAbortError, type ApiResult } from "@/lib/api";
import { formatManwon } from "@/lib/format";
import { useHydrated, useSimInput } from "@/lib/hooks";
import { ROUTES } from "@/lib/steps";
import type { SimulationInput, Story, StoryKind, StoryResult } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { formatAxisWon, niceTicks } from "@/features/result/chart";
import { KIND_LABELS, accountRows, eventViews, plannedNames, variableRows, type StoryEventView } from "./story";

/** 1초에 몇 달 */
const SPEEDS = [2, 4, 8, 16] as const;
/** 큰 사건에서 멈추는 시간 (ms) */
const HOLD_MS = 1400;

function useStory(input: SimulationInput | null) {
  const body = input ? JSON.stringify(input) : null;
  const [attempt, setAttempt] = useState(0);
  const key = body === null ? null : `${attempt}:${body}`;
  const [state, setState] = useState<{ key: string; result?: ApiResult<StoryResult>; error?: unknown } | null>(null);
  useEffect(() => {
    if (key === null || body === null) return;
    const abort = new AbortController();
    api.story({ input: JSON.parse(body) as SimulationInput }, { signal: abort.signal }).then(
      (result) => setState({ key, result }),
      (error: unknown) => {
        if (!isAbortError(error)) setState({ key, error });
      },
    );
    return () => abort.abort();
  }, [key, body]);
  const done = state?.key === key;
  return { result: done ? (state?.result ?? null) : null, error: done ? state?.error : null, retry: () => setAttempt((n) => n + 1) };
}

export function StoryScreen() {
  const hydrated = useHydrated();
  const { input } = useSimInput();
  const ready = hydrated ? readiness(input) : null;
  const story = useStory(ready?.ok && input ? (input as SimulationInput) : null);

  if (!ready) return <Computing />;
  if (!ready.ok) return ready.reason === "empty" ? <Empty /> : <NotReady step={ready.step} message={ready.message} />;
  if (story.error) return <Failed error={story.error} onRetry={story.retry} />;
  if (!story.result) return <Computing />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">04 · 데모</p>
          <p className="text-2xl font-bold tracking-tight">미래 다시 보기</p>
          <p className="mt-1 text-sm text-ink-soft">
            결과 화면의 숫자는 미래 {story.result.data.paths.toLocaleString("ko-KR")}가지를 계산한 거예요. 그중 세 가지를 골라 한 달씩
            어떻게 흘러가는지 보여 드려요.
          </p>
        </div>
        <LinkButton href={ROUTES.result} variant="secondary">
          결과로 돌아가기
        </LinkButton>
      </div>
      {story.result.source === "mock" && <MockNote match={story.result.mock} />}
      <Player data={story.result.data} input={input as SimulationInput} />
    </div>
  );
}

function Player({ data, input }: { data: StoryResult; input: SimulationInput }) {
  const [kind, setKind] = useState<StoryKind>("MIDDLE");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const [hold, setHold] = useState(true);

  const current = data.stories.find((s) => s.kind === kind) ?? data.stories[0];
  const months = current.months;
  const last = months.length - 1;
  const planned = useMemo(() => plannedNames(input), [input]);
  const allEvents = useMemo(() => months.flatMap((m) => eventViews(m, data.targetAmount, planned)), [months, data.targetAmount, planned]);

  // 재생: 한 달씩. 큰 사건이 있는 달에 들어서면 잠깐 더 멈춘다
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 끝 달에 닿으면 멈춘 것으로 본다 (playing은 그대로 두고 running으로 가른다)
  const running = playing && index < last;
  useEffect(() => {
    if (!running) return;
    const major = hold && allEvents.some((e) => e.afterMonths === months[index].afterMonths && e.major);
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 1000 / speed + (major ? HOLD_MS : 0));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [running, index, last, speed, hold, allEvents, months]);

  const choose = (k: StoryKind) => {
    setKind(k);
    setIndex(0);
    setPlaying(true);
  };

  const m = months[index];
  const prev = index > 0 ? months[index - 1] : null;
  const now = allEvents.filter((e) => e.afterMonths === m.afterMonths);
  const past = allEvents.filter((e) => e.afterMonths <= m.afterMonths).reverse();
  const goalMonth = data.goalMonths;
  const reached = m.total >= data.targetAmount;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="미래 고르기">
        {data.stories.map((s) => (
          <KindButton key={s.kind} story={s} active={s.kind === kind} onClick={() => choose(s.kind)} />
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">
              {formatYearMonth(m.month)} · {m.afterMonths}개월째
              {m.afterMonths === goalMonth && <span className="ml-2 font-semibold text-primary">목표 시점</span>}
            </p>
            <p className={`mt-1 text-4xl font-bold tabular-nums tracking-tight ${m.total < 0 ? "text-danger" : "text-ink"}`}>
              {formatManwon(m.total)}
            </p>
            <p className="text-sm text-ink-soft">
              모은 돈
              {prev && <Delta value={m.total - prev.total} />} · 목표 {formatManwon(data.targetAmount)}
              {reached ? <span className="font-semibold text-good">넘었어요</span> : <span>까지 {formatManwon(data.targetAmount - m.total)} 남았어요</span>}
            </p>
          </div>
          <Controls
            playing={running}
            atEnd={index >= last}
            onPlay={() => {
              if (index >= last) {
                setIndex(0);
                setPlaying(true);
              } else {
                setPlaying(!running);
              }
            }}
            onRestart={() => {
              setIndex(0);
              setPlaying(true);
            }}
            speed={speed}
            onSpeed={setSpeed}
            hold={hold}
            onHold={setHold}
          />
        </div>

        <div className="mt-3 min-h-[3.25rem]" aria-live="polite">
          {now.filter((e) => e.major).map((e) => (
            <Banner key={e.key} event={e} />
          ))}
        </div>

        <StoryChart data={data} story={current} index={index} events={allEvents} />

        <input
          type="range"
          min={0}
          max={last}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
          aria-label="달 옮기기"
          className="mt-2 w-full accent-[var(--color-primary)]"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-base font-bold">이번 달</h2>
          <dl className="mt-3 divide-y divide-line">
            {variableRows(m, prev).map((row) => (
              <div key={row.key} className={`flex items-center justify-between gap-3 py-2 transition-colors ${row.changed ? "bg-warn-soft/60" : ""}`}>
                <dt className="text-sm text-ink-soft">{row.label}</dt>
                <dd className={`font-semibold tabular-nums ${row.tone === "bad" ? "text-danger" : ""}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-5 text-sm font-bold">계좌별 잔액</h3>
          <Accounts story={current} index={index} />
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-base font-bold">지금까지 일어난 일</h2>
          {past.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">아직 특별한 일이 없어요. 월급을 받고 계획대로 저축하는 중이에요.</p>
          ) : (
            <ol className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {past.map((e) => (
                <li key={e.key} className={`rounded-lg border px-3 py-2 text-sm ${TONE_BOX[e.tone]} ${e.afterMonths === m.afterMonths ? "ring-2 ring-primary/40" : ""}`}>
                  <p className="font-semibold">
                    <span className="mr-2 font-normal text-ink-soft">{formatYearMonth(e.month)}</span>
                    {e.title}
                  </p>
                  <p className="mt-0.5 text-ink-soft">{e.detail}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

const TONE_BOX = {
  good: "border-good-line bg-good-soft/50",
  bad: "border-danger-line bg-danger-soft/50",
  info: "border-line bg-system-soft",
} as const;

const TONE_DOT = { good: "fill-good", bad: "fill-danger", info: "fill-info-line" } as const;

function KindButton({ story, active, onClick }: { story: Story; active: boolean; onClick: () => void }) {
  const label = KIND_LABELS[story.kind];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-colors sm:px-4 ${
        active ? "border-primary bg-primary-soft" : "border-line bg-surface hover:bg-canvas"
      }`}
    >
      <p className="text-base font-bold">
        {label.title} <span className="text-xs font-normal text-ink-soft">{label.sub}</span>
      </p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${story.atGoal < 0 ? "text-danger" : ""}`}>목표 시점 {formatManwon(story.atGoal)}</p>
      <p className={`text-xs ${story.reached ? "text-good" : "text-danger"}`}>{story.reached ? "목표 달성" : "목표 못 미침"}</p>
    </button>
  );
}

function Delta({ value }: { value: number }) {
  if (Math.abs(value) < 5_000) return null;
  return (
    <span className={`ml-1.5 font-semibold ${value > 0 ? "text-good" : "text-danger"}`}>
      ({value > 0 ? "+" : ""}
      {formatManwon(value)})
    </span>
  );
}

function Banner({ event }: { event: StoryEventView }) {
  return (
    <div className={`mb-2 rounded-lg border-2 px-4 py-2.5 shadow-sm ${TONE_BOX[event.tone]}`}>
      <p className="font-bold">{event.title}</p>
      <p className="text-sm text-ink-soft">{event.detail}</p>
    </div>
  );
}

function Controls({
  playing,
  atEnd,
  onPlay,
  onRestart,
  speed,
  onSpeed,
  hold,
  onHold,
}: {
  playing: boolean;
  atEnd: boolean;
  onPlay: () => void;
  onRestart: () => void;
  speed: number;
  onSpeed: (s: (typeof SPEEDS)[number]) => void;
  hold: boolean;
  onHold: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onPlay}>
        {playing ? "일시정지" : atEnd ? "처음부터 재생" : "재생"}
      </Button>
      <Button size="sm" variant="secondary" onClick={onRestart}>
        처음부터
      </Button>
      <div className="flex overflow-hidden rounded-lg border border-line-strong text-sm" role="group" aria-label="빠르기">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === speed}
            onClick={() => onSpeed(s)}
            className={`h-9 px-2.5 ${s === speed ? "bg-ink text-white" : "bg-surface text-ink-soft hover:bg-canvas"}`}
          >
            {s}개월/초
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-sm text-ink-soft">
        <input type="checkbox" checked={hold} onChange={(e) => onHold(e.target.checked)} />큰 일에서 잠깐 멈춤
      </label>
    </div>
  );
}

/** 계좌별 잔액 막대 (그달 가장 큰 값 기준) */
function Accounts({ story, index }: { story: Story; index: number }) {
  const rows = accountRows(story.months[index]);
  const max = Math.max(1, ...story.months.flatMap((m) => accountRows(m).map((r) => Math.abs(r.value))));
  return (
    <ul className="mt-2 space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-sm">
          <span className="text-ink-soft">{r.label}</span>
          <span className="h-2.5 rounded-full bg-canvas" aria-hidden>
            <span
              className={`block h-2.5 rounded-full transition-[width] duration-300 ${r.value < 0 ? "bg-danger" : "bg-primary"}`}
              style={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
            />
          </span>
          <span className={`text-right font-semibold tabular-nums ${r.value < 0 ? "text-danger" : ""}`}>{formatManwon(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 26, left: 56 };

/** 모은 돈 선이 지금 달까지 그려진다. 눈금은 고른 미래 전체(10년)와 0 · 목표 금액이 다 들어가게 미리 정한다 (재생 중에 눈금이 움직이지 않게) */
function StoryChart({ data, story, index, events }: { data: StoryResult; story: Story; index: number; events: StoryEventView[] }) {
  const all = story.months.map((m) => m.total);
  const scale = niceTicks(Math.min(0, ...all), Math.max(data.targetAmount, ...all), 4);
  const lo = scale.min;
  const hi = scale.max;
  const n = story.months.length;
  const x = (afterMonths: number) => PAD.left + (afterMonths / n) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  const shown = story.months.slice(0, index + 1);
  const path = shown.map((m, i) => `${i === 0 ? "M" : "L"}${x(m.afterMonths).toFixed(1)},${y(m.total).toFixed(1)}`).join("");
  const cur = story.months[index];
  const ticks = scale.ticks;
  const marks = events.filter((e) => e.major && e.afterMonths <= cur.afterMonths);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`모은 돈 그래프, ${formatYearMonth(cur.month)}까지`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-line-strong" : "stroke-line"} />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="fill-muted text-[11px]">
            {formatAxisWon(v)}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(data.targetAmount)} y2={y(data.targetAmount)} className="stroke-ink-soft" strokeDasharray="4 4" />
      <text x={PAD.left + 4} y={y(data.targetAmount) - 5} className="fill-ink-soft text-[11px] font-semibold">
        목표 {formatManwon(data.targetAmount)}
      </text>
      <line x1={x(data.goalMonths)} x2={x(data.goalMonths)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-ink-soft" strokeDasharray="3 4" />
      <text x={x(data.goalMonths)} y={H - 8} textAnchor="middle" className="fill-ink-soft text-[11px]">
        목표 시점
      </text>
      {[0, 24, 48, 72, 96, 120].map((mm) => (
        <text key={mm} x={x(mm)} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]" display={Math.abs(mm - data.goalMonths) < 8 ? "none" : undefined}>
          {mm === 0 ? "지금" : `${mm / 12}년`}
        </text>
      ))}
      <path d={path} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
      {marks.map((e) => {
        const m = story.months.find((mm) => mm.afterMonths === e.afterMonths)!;
        return <circle key={e.key} cx={x(m.afterMonths)} cy={y(m.total)} r={4.5} className={`${TONE_DOT[e.tone]} stroke-surface`} strokeWidth={1.5} />;
      })}
      <circle cx={x(cur.afterMonths)} cy={y(cur.total)} r={6} className="fill-primary stroke-surface" strokeWidth={2} />
    </svg>
  );
}
