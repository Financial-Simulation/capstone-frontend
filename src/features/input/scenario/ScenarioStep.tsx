"use client";

/**
 * 03 시나리오 선택. 실직 · 급한 지출 · 물가 · 연봉 변화는 기본 상황에 확률로 들어 있고,
 * 예정된 일(GET /events/presets 5종)은 켜면 '언제(연·월)'와 기본 금액 칸이 열린다.
 * 결과 보기 → 켠 일의 칸 확인 → validate (step=EVENTS) → 04 결과
 */
import { useEffect, useState } from "react";
import { Field, describedBy } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";
import { StepScreen } from "@/features/input/StepScreen";
import { YearMonthPicker } from "@/components/ui/YearMonthPicker";
import { FormNoticeBox, useStepForm, type StepForm } from "@/features/input/step-form";
import { Badge, Button, FormSection } from "@/components/ui";
import { SIMULATION_PATHS } from "@/config/policy";
import { api, formErrorMessage, isAbortError, type ApiSource } from "@/lib/api";
import { eventFields, presetEventIndexes, setEventAmount, setPresetDate, togglePreset } from "@/features/input/events";
import { fieldId } from "@/lib/form";
import { useCurrentMonth } from "@/lib/hooks";
import { LIMITS } from "@/lib/rules";
import type { EventPreset, YearMonth } from "@/lib/types";
import { formatYearMonth, isYearMonth } from "@/lib/year-month";

/** 예정된 일 시점 범위: 기준 달부터 10년(119개월) 안 (lib/rules.ts의 LIMITS) */
const EVENT_WINDOW = `${(LIMITS.eventMonths.max + 1) / 12}년(${LIMITS.eventMonths.max}개월)`;

type PresetState =
  | { status: "loading" }
  | { status: "ok"; presets: EventPreset[]; source: ApiSource }
  | { status: "error"; message: string };

function usePresets() {
  const [state, setState] = useState<PresetState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    api.presets({ signal: abort.signal }).then(
      ({ data, source }) => setState({ status: "ok", presets: data.presets, source }),
      (error: unknown) => {
        if (!isAbortError(error)) {
          setState({ status: "error", message: formErrorMessage(error) ?? "예정된 일 목록을 불러오지 못했어요." });
        }
      },
    );
    return () => abort.abort();
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };
  return { state, retry };
}

export function ScenarioStep() {
  const form = useStepForm("EVENTS");
  const { state, retry } = usePresets();
  const currentMonth = useCurrentMonth();
  const start = isYearMonth(form.input.startMonth) ? form.input.startMonth : currentMonth;

  return (
    <StepScreen
      step="EVENTS"
      description="실직·급한 지출·물가·연봉 변화는 기본 상황에 확률로 들어 있어요. 앞으로 예정된 일이 있으면 켜 주세요."
      onNext={form.submit}
      busy={form.busy}
    >
      <FormNoticeBox form={form} />

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">기본 상황</h2>
          <Badge tone="primary">항상 포함</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          실직, 급한 지출, 물가, 연봉 변화가 서로 다르게 펼쳐지는 미래 {SIMULATION_PATHS.toLocaleString("ko-KR")}개를 계산해요. 끌 수 없어요.
        </p>
      </section>

      <FormSection
        title="예정된 일"
        description={
          start
            ? `켜면 '언제'와 기본 금액 칸이 열려요. 금액은 고칠 수 있고, 시점은 ${formatYearMonth(start)}부터 ${EVENT_WINDOW} 안이에요.`
            : "켜면 '언제'와 기본 금액 칸이 열려요. 금액은 고칠 수 있어요."
        }
      >
        {state.status === "loading" && <p className="text-sm text-muted">목록을 불러오는 중…</p>}
        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-sm">
            <p className="font-semibold text-danger">{state.message}</p>
            <p className="mt-1 text-ink-soft">예정된 일 없이도 결과를 볼 수 있어요.</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={retry}>
              다시 불러오기
            </Button>
          </div>
        )}
        {state.status === "ok" && (
          <ul className="space-y-3">
            {state.presets.map((preset) => (
              <li key={preset.presetKey}>
                <PresetCard form={form} preset={preset} start={start} />
              </li>
            ))}
          </ul>
        )}
        {state.status === "ok" && state.source === "mock" && (
          <p className="text-xs text-mock">목업 목록이에요 (백엔드 /events/presets와 같은 값).</p>
        )}
      </FormSection>
    </StepScreen>
  );
}

function PresetCard({ form, preset, start }: { form: StepForm; preset: EventPreset; start: YearMonth | null }) {
  const indexes = presetEventIndexes(form.input, preset.presetKey);
  const on = indexes.length > 0;
  const events = indexes.map((i) => ({ index: i, event: form.input.events?.[i] }));
  const first = indexes[0];
  const occurDate = on ? events[0].event?.occurDate : null;
  const toggleId = fieldId(`preset.${preset.presetKey}`);
  const datePath = `events[${first}].occurDate`;
  const dateId = fieldId(datePath);

  const dateMissing = indexes.some((i) => form.error(`events[${i}].occurDate`));
  const dateError = dateMissing ? `${preset.name} 시점이 비어 있어요` : undefined;
  const cardErrors = indexes.map((i) => form.error(`events[${i}]`)).filter(Boolean);
  const hasError = Boolean(dateError) || cardErrors.length > 0 || indexes.some((i) => form.error(`events[${i}]`, { prefix: true }));

  return (
    <div
      data-field={on ? `events[${first}]` : undefined}
      className={`rounded-xl border p-4 ${hasError ? "border-danger-line" : on ? "border-primary" : "border-line"}`}
    >
      <label htmlFor={toggleId} className="flex cursor-pointer items-start gap-3">
        <input
          id={toggleId}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-primary"
          checked={on}
          onChange={(event) => form.update((prev) => togglePreset(prev, preset, event.target.checked))}
        />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{preset.name}</span>
          <span className="block text-xs text-muted">기본 금액 · {preset.basis}</span>
        </span>
      </label>

      {on && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <Field id={dateId} path={datePath} label="언제" required group error={dateError}>
            {start ? (
              <YearMonthPicker
                id={dateId}
                value={occurDate}
                start={start}
                minMonths={LIMITS.eventMonths.min}
                maxMonths={LIMITS.eventMonths.max}
                invalid={Boolean(dateError)}
                describedBy={describedBy(dateId, dateError)}
                onBlur={form.touch(datePath)}
                onChange={(date) => form.update((prev) => setPresetDate(prev, preset.presetKey, date))}
              />
            ) : (
              <div className="h-11 w-60 animate-pulse rounded-lg bg-canvas" />
            )}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {events.flatMap(({ index, event }) =>
              eventFields(
                event?.presetKey,
                event?.eventType,
                preset.events.find((template) => template.eventType === event?.eventType),
              ).map((def) => {
                const path = `events[${index}].${def.key}`;
                const id = fieldId(path);
                const error = form.error(path);
                const value = event?.[def.key];
                const common = {
                  id,
                  value,
                  invalid: Boolean(error),
                  "aria-describedby": describedBy(id, error, def.hint),
                  onBlur: form.touch(path),
                  onChange: (next: number | null) => form.update((prev) => setEventAmount(prev, index, def.key, next)),
                };
                return (
                  <Field key={path} id={id} path={path} label={def.label} required hint={def.hint} error={error}>
                    {def.kind === "money" ? (
                      <MoneyInput {...common} allowNegative={def.allowNegative} />
                    ) : (
                      <NumberInput
                        {...common}
                        allowNegative={def.allowNegative}
                        decimals={def.kind === "percent" ? 1 : 0}
                        maxIntegerDigits={3}
                        unit={def.kind === "percent" ? "%" : "개월"}
                      />
                    )}
                  </Field>
                );
              }),
            )}
          </div>
          {cardErrors.length > 0 && <p className="text-sm text-danger">{cardErrors[0]}</p>}
        </div>
      )}
    </div>
  );
}
