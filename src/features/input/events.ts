/**
 * 03 시나리오: 예정된 일 프리셋(/events/presets) ↔ 입력의 events[].
 * 프리셋 하나가 일 여러 개를 만들 수 있다 (자동차 = 차 값 한 번 + 매달 유지비). 같은 프리셋의 일은 시점을 함께 쓴다.
 */
import { formatRange, formatSigned, formatSignedRange } from "@/lib/format";
import { LIMITS } from "@/lib/rules";
import type { EventPreset, EventTemplate, EventType, PlannedEvent, PresetKey, SimulationInputDraft, Draft, YearMonth } from "@/lib/types";

export type EventAmountKey = "amount" | "monthlyChange" | "incomeChangeRate" | "gapMonths" | "deposit";

export interface EventFieldDef {
  key: EventAmountKey;
  label: string;
  kind: "money" | "percent" | "months";
  allowNegative?: boolean;
  hint?: string;
}

/** 종류마다 쓰는 칸 (SimulationInput.Event 주석과 같은 순서) */
const FIELDS: Record<EventType, EventFieldDef[]> = {
  ONE_TIME: [{ key: "amount", label: "한 번에 드는 돈", kind: "money" }],
  SPEND_CHANGE: [
    { key: "monthlyChange", label: "매달 지출 변화", kind: "money", allowNegative: true, hint: "늘면 그대로, 줄면 앞에 − (예: −300,000)" },
  ],
  JOB_CHANGE: [
    { key: "incomeChangeRate", label: "연봉 변화율", kind: "percent", allowNegative: true },
    { key: "gapMonths", label: "쉬는 기간", kind: "months" },
  ],
  MOVE: [
    { key: "deposit", label: "보증금 (내 돈)", kind: "money" },
    { key: "monthlyChange", label: "주거비 변화 (매달)", kind: "money", allowNegative: true, hint: "늘면 그대로, 줄면 앞에 −" },
    { key: "amount", label: "이사 비용", kind: "money" },
  ],
};

/** 프리셋에 맞게 고친 칸 이름 */
const LABEL_OVERRIDES: Partial<Record<PresetKey, Partial<Record<EventType, Partial<Record<EventAmountKey, string>>>>>> = {
  WEDDING: { ONE_TIME: { amount: "결혼 비용" } },
  CAR: { ONE_TIME: { amount: "차 값" }, SPEND_CHANGE: { monthlyChange: "매달 유지비 (보험·기름값 등)" } },
  INDEPENDENCE: { MOVE: { monthlyChange: "늘어나는 주거비 (매달)" } },
};

/** 범위가 정해진 칸 (이직, EVENT4004). 범위는 lib/rules.ts의 LIMITS */
const RANGES: Partial<Record<EventAmountKey, string>> = {
  incomeChangeRate: formatSignedRange(LIMITS.jobChangeRate, "%"),
  gapMonths: formatRange(LIMITS.jobChangeGapMonths, "개월"),
};

/** 범위가 정해진 칸의 안내: "−90~+200%, 기본 +10%" (기본값은 프리셋, 서버 /events/presets) */
function rangeHint(field: EventFieldDef, template?: EventTemplate): string | undefined {
  const range = RANGES[field.key];
  if (!range) return field.hint;
  const base = template?.[field.key];
  if (base == null) return range;
  return `${range}, 기본 ${field.kind === "percent" ? `${formatSigned(base)}%` : `${base}개월`}`;
}

/** 그 일의 칸들. template(그 프리셋의 기본값)을 넘기면 범위 칸 안내에 기본값을 붙인다 */
export function eventFields(
  presetKey: PresetKey | null | undefined,
  eventType: EventType | null | undefined,
  template?: EventTemplate,
): EventFieldDef[] {
  if (!eventType) return [];
  const overrides = presetKey ? LABEL_OVERRIDES[presetKey]?.[eventType] : undefined;
  return FIELDS[eventType].map((field) => ({ ...field, label: overrides?.[field.key] ?? field.label, hint: rangeHint(field, template) }));
}

/** 프리셋을 켰을 때 넣을 일 (기본 금액 채움, 시점은 사용자가 고름) */
const AMOUNT_KEYS: readonly EventAmountKey[] = ["amount", "monthlyChange", "incomeChangeRate", "gapMonths", "deposit"];

export function eventsFromPreset(preset: EventPreset, occurDate: YearMonth | null = null): Draft<PlannedEvent>[] {
  return preset.events.map((template) => {
    const event: Draft<PlannedEvent> = {
      presetKey: preset.presetKey,
      name: preset.name.slice(0, 20),
      eventType: template.eventType,
      occurDate,
    };
    for (const key of AMOUNT_KEYS) {
      if (template[key] !== undefined) event[key] = template[key];
    }
    return event;
  });
}

/** 그 프리셋의 일이 입력의 몇 번째에 있는지 */
export function presetEventIndexes(input: SimulationInputDraft, presetKey: PresetKey): number[] {
  return (input.events ?? []).flatMap((event, i) => (event?.presetKey === presetKey ? [i] : []));
}

/** 켜기: 끝에 붙인다 / 끄기: 그 프리셋의 일을 모두 뺀다 */
export function togglePreset(input: SimulationInputDraft, preset: EventPreset, on: boolean): SimulationInputDraft {
  const others = (input.events ?? []).filter((event) => event?.presetKey !== preset.presetKey);
  return { ...input, events: on ? [...others, ...eventsFromPreset(preset)] : others };
}

/** 같은 프리셋의 일은 시점을 함께 바꾼다 */
export function setPresetDate(input: SimulationInputDraft, presetKey: PresetKey, occurDate: YearMonth | null): SimulationInputDraft {
  return {
    ...input,
    events: (input.events ?? []).map((event) => (event?.presetKey === presetKey ? { ...event, occurDate } : event)),
  };
}

export function setEventAmount(
  input: SimulationInputDraft,
  index: number,
  key: EventAmountKey,
  value: number | null,
): SimulationInputDraft {
  return {
    ...input,
    events: (input.events ?? []).map((event, i) => (i === index ? { ...event, [key]: value } : event)),
  };
}
