/**
 * 데모 '미래 다시 보기'(/story)에 보여 줄 값 (순수 함수). 숫자는 모두 서버(/simulate/story) 값이고,
 * 여기서는 사건 이름 · 설명 문장 · 변수 줄을 고르기만 한다 (새로 계산하지 않음).
 */
import { formatManwon, formatWon } from "@/lib/format";
import type { SimulationInputDraft, StoryEvent, StoryKind, StoryMonth } from "@/lib/types";
import { isYearMonth } from "@/lib/year-month";

export const KIND_LABELS: Record<StoryKind, { title: string; sub: string }> = {
  BEST: { title: "최상", sub: "상위 5%" },
  MIDDLE: { title: "중간", sub: "가운데" },
  WORST: { title: "최악", sub: "하위 5%" },
};

export type EventTone = "good" | "bad" | "info";

export interface StoryEventView {
  key: string;
  afterMonths: number;
  month: string;
  tone: EventTone;
  title: string;
  detail: string;
  /** 재생 중 잠깐 멈추고 크게 보여 줄 사건 */
  major: boolean;
}

const BREAK_NAMES: Partial<Record<StoryEvent, string>> = {
  BREAK_GENERAL: "일반 적금",
  BREAK_HOUSING: "주택청약",
  BREAK_POLICY: "청년미래적금",
  BREAK_POLICY_SPECIAL: "청년미래적금(특별해지)",
  BREAK_PENSION: "연금저축",
};

/** 입력의 예정된 일: 일어나는 달 → 이름 */
export function plannedNames(input: SimulationInputDraft | null | undefined): Map<string, string> {
  const names = new Map<string, string>();
  for (const event of input?.events ?? []) {
    if (!isYearMonth(event?.occurDate)) continue;
    const name = event.name || "예정된 일";
    const before = names.get(event.occurDate);
    names.set(event.occurDate, before ? `${before} · ${name}` : name);
  }
  return names;
}

/** 한 달에 일어난 일을 화면 사건으로. 같은 달에 여러 적금을 깼으면 한 줄로 묶는다 */
export function eventViews(m: StoryMonth, goal: number, planned: Map<string, string>): StoryEventView[] {
  const views: StoryEventView[] = [];
  const add = (key: string, tone: EventTone, title: string, detail: string, major: boolean) =>
    views.push({ key: `${m.afterMonths}-${key}`, afterMonths: m.afterMonths, month: m.month, tone, title, detail, major });
  const has = (e: StoryEvent) => m.events.includes(e);

  if (has("JOB_LOSS")) {
    add(
      "job-loss",
      "bad",
      "실직",
      m.unemploymentBenefit
        ? `일을 잃었어요. 실업급여로 이번 달 ${formatManwon(m.income)}이 들어와요.`
        : "일을 잃었어요. 실업급여를 받지 못해 들어오는 돈이 없어요.",
      true,
    );
  }
  if (has("REHIRE")) add("rehire", "good", "다시 취업", `다시 일을 시작했어요. 월급 ${formatManwon(m.salary)}을 받아요.`, true);
  if (has("SHOCK")) add("shock", "bad", "급한 지출", `갑자기 ${formatManwon(m.shock)}이 나갔어요.`, true);
  if (has("PLANNED")) {
    add("planned", "info", "예정된 일", `${planned.get(m.month) ?? "예정된 일"}에 ${formatManwon(m.planned)}을 썼어요.`, true);
  }
  if (has("OVERDRAFT")) {
    add("overdraft", "bad", "빌리기 시작", `현금이 모자라 마이너스 통장에서 ${formatManwon(m.balances.overdraft)}을 빌렸어요.`, true);
  }
  const broken = m.events.filter((e) => BREAK_NAMES[e]).map((e) => BREAK_NAMES[e]!);
  if (broken.length > 0) {
    const tax = m.taxPaid > 0 ? ` 해지하면서 세금 ${formatWon(m.taxPaid)}을 냈어요.` : "";
    const special = has("BREAK_POLICY_SPECIAL") ? " 실직 같은 사유가 있어 정부 지원금까지 받았어요." : "";
    add(
      "break",
      "bad",
      `${broken.join(" · ")} 해지`,
      `모자란 돈을 메우려고 깼어요. 받은 돈 ${formatManwon(m.received)}.${special}${tax}`,
      true,
    );
  }
  if (has("MATURE_POLICY")) {
    add("mature", "good", "청년미래적금 만기", `만기까지 버텼어요. 정부 지원금까지 ${formatManwon(m.received)}을 받았어요.`, true);
  }
  if (has("REJOIN_POLICY")) add("rejoin", "info", "청년미래적금 다시 가입", "남은 기간만큼 다시 가입했어요.", false);
  if (has("REFUND")) add("refund", "good", "연말정산 환급", `세금 ${formatManwon(m.refund)}을 돌려받았어요.`, false);
  if (has("DEBT_CLEARED")) add("debt-cleared", "good", "빌린 돈 다 갚음", "마이너스 통장을 다 갚았어요.", true);
  if (has("GOAL_REACHED")) add("goal", "good", "목표 달성", `모은 돈이 목표 ${formatManwon(goal)}을 넘었어요.`, true);
  return views;
}

export interface VariableRow {
  key: string;
  label: string;
  value: string;
  /** 지난달보다 바뀌었으면 강조 */
  changed: boolean;
  tone?: "bad" | "good";
}

/** 오른쪽 '이번 달' 변수 패널 */
export function variableRows(m: StoryMonth, prev: StoryMonth | null): VariableRow[] {
  const saved = m.deposits.policy + m.deposits.housing + m.deposits.pension + m.deposits.general + m.deposits.invest;
  const prevSaved = prev
    ? prev.deposits.policy + prev.deposits.housing + prev.deposits.pension + prev.deposits.general + prev.deposits.invest
    : saved;
  return [
    {
      key: "job",
      label: "일",
      value: m.employed ? "일하는 중" : m.unemploymentBenefit ? "실직 · 실업급여 받는 중" : "실직 · 소득 없음",
      changed: prev !== null && prev.employed !== m.employed,
      tone: m.employed ? undefined : "bad",
    },
    { key: "salary", label: "월급 (일할 때)", value: formatManwon(m.salary), changed: prev !== null && prev.salary !== m.salary },
    { key: "income", label: "이번 달 들어온 돈", value: formatManwon(m.income + m.refund), changed: prev !== null && prev.income + prev.refund !== m.income + m.refund },
    { key: "living", label: "생활비", value: formatManwon(m.living), changed: prev !== null && Math.abs(prev.living - m.living) >= 10_000 },
    { key: "inflation", label: "물가 (올해)", value: `${m.inflation.toFixed(1)}%`, changed: prev !== null && prev.inflation !== m.inflation },
    { key: "loan", label: "대출 상환", value: formatManwon(m.loan), changed: prev !== null && prev.loan !== m.loan },
    { key: "saved", label: "이번 달 저축", value: formatManwon(saved), changed: prev !== null && prevSaved !== saved, tone: saved === 0 ? "bad" : undefined },
  ];
}

export interface AccountRow {
  key: string;
  label: string;
  value: number;
}

/** 계좌별 잔액 (0원인 상품은 뺀다. 빌린 돈은 음수로) */
export function accountRows(m: StoryMonth): AccountRow[] {
  const b = m.balances;
  const rows: AccountRow[] = [
    { key: "cash", label: "현금", value: b.cash },
    { key: "general", label: "일반 적금", value: b.general },
    { key: "policy", label: "청년미래적금", value: b.policy },
    { key: "housing", label: "주택청약", value: b.housing },
    { key: "pension", label: "연금저축", value: b.pension },
    { key: "invest", label: "투자", value: b.invest },
    { key: "deposit", label: "보증금", value: b.deposit },
    { key: "overdraft", label: "빌린 돈", value: -b.overdraft },
  ];
  return rows.filter((r) => r.key === "cash" || r.value !== 0);
}
