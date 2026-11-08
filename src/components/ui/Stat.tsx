/**
 * 결과 화면의 숫자 카드와 비교 표의 차이 글자 (위험 · 세금 · 가장 좋은 배분 · 계획 미리보기가 같이 쓴다).
 * 값은 서버 숫자를 format.ts로 바꾼 글자를 그대로 받는다.
 */
import type { ReactNode } from "react";

/** 카드 테두리 · 바탕: 지금 계획(system) · 좋아짐(good) · 현금 부족(warn) · 나빠짐(danger) */
export type StatBox = "default" | "system" | "good" | "warn" | "danger";
/** 큰 숫자 색 */
export type StatTone = "default" | "good" | "warn" | "danger" | "muted";

const BOXES: Record<StatBox, string> = {
  default: "border-line bg-surface",
  system: "border-line bg-system-soft",
  good: "border-good-line bg-good-soft/50",
  warn: "border-warn-line bg-warn-soft/60",
  danger: "border-danger-line bg-danger-soft/60",
};

const TONES: Record<StatTone, string> = {
  default: "text-ink",
  good: "text-good",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-muted",
};

/** 숫자 카드 (제목 · 큰 숫자 · 설명 + 그 아래 children). 목록(ul) 안에 넣는다 */
export function StatCard({
  title,
  value,
  tone = "default",
  box = "default",
  detail,
  children,
}: {
  title: string;
  value: ReactNode;
  tone?: StatTone;
  box?: StatBox;
  detail?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className={`rounded-xl border p-4 ${BOXES[box]}`}>
      <p className="text-sm font-semibold text-ink-soft">{title}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${TONES[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-sm text-ink-soft">{detail}</p>}
      {children}
    </li>
  );
}

/** 비교 표에서 '지금 계획과의 차이': 올라감(up) 초록 · 내려감(down) 빨강 · 거의 차이 없음(flat) 회색 */
export type DiffTone = "up" | "down" | "flat";

const DIFF_TONES: Record<DiffTone, string> = {
  up: "text-good",
  down: "text-danger",
  flat: "text-muted",
};

/** 표 칸의 숫자 아래 작은 글자. 지금 계획 줄(null)은 그리지 않는다 */
export function DiffText({ diff }: { diff: { text: string; tone: DiffTone } | null }) {
  if (!diff) return null;
  return <span className={`block text-xs ${DIFF_TONES[diff.tone]}`}>{diff.text}</span>;
}
