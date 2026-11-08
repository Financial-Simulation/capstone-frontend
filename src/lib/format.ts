/**
 * 금액·확률 표시. 계산은 하지 않고 서버가 준 숫자를 보여 주는 모양만 정한다.
 * 음수 기호는 하이픈이 아니라 U+2212 "−" (구현 명세 7.6).
 */

export const MINUS = "−";

/** 1234567 → "1,234,567" (정수 부분만, 부호 없이) */
export function groupDigits(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** BigDecimal HALF_UP과 같은 반올림 (0.5는 0에서 멀어지는 쪽으로) */
export function roundHalfUp(value: number): number {
  const rounded = Math.floor(Math.abs(value) + 0.5);
  return value < 0 ? -rounded : rounded;
}

function sign(value: number): string {
  return value < 0 ? MINUS : "";
}

/** 134839 → "134,839원", -1234 → "−1,234원" */
export function formatWon(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${sign(value)}${groupDigits(value)}원`;
}

/**
 * 원 단위를 그대로 한국어로 읽기 쉽게 (백엔드 Money.toKorean + 억 단위).
 * 465161 → "46만 5,161원", 500000 → "50만 원", 3000 → "3,000원", 127452602 → "1억 2,745만 2,602원"
 */
export function formatKoreanWon(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const abs = Math.trunc(Math.abs(value));
  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const rest = abs % 10_000;

  const parts: string[] = [];
  if (eok > 0) parts.push(`${groupDigits(eok)}억`);
  if (man > 0) parts.push(`${groupDigits(man)}만`);
  if (rest > 0 || parts.length === 0) parts.push(`${groupDigits(rest)}원`);
  else parts[parts.length - 1] += " 원";
  return sign(value) + parts.join(" ");
}

/**
 * 만 원 단위로 반올림해서 (구현 명세 7.6, 첫 문장과 같은 표기).
 * 44396264 → "4,440만 원", 127452602 → "1억 2,745만 원", 100000000 → "1억 원", -15684865 → "−1,568만 원"
 */
export function formatManwon(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const totalMan = roundHalfUp(value / 10_000);
  if (totalMan === 0) return "0원";
  const abs = Math.abs(totalMan);
  const eok = Math.floor(abs / 10_000);
  const man = abs % 10_000;
  let text: string;
  if (eok === 0) text = `${groupDigits(man)}만 원`;
  else if (man === 0) text = `${groupDigits(eok)}억 원`;
  else text = `${groupDigits(eok)}억 ${groupDigits(man)}만 원`;
  return sign(totalMan) + text;
}

/** 58 → "58.0%", 70.5 → "70.5%" */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${sign(value)}${Math.abs(value).toFixed(digits)}%`;
}

/** 12.5 → "+12.5%p", -3.1 → "−3.1%p", 0 → "0.0%p" */
export function formatPercentPoint(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "";
  const body = `${Math.abs(value).toFixed(digits)}%p`;
  if (value > 0) return `+${body}`;
  if (value < 0) return `${MINUS}${body}`;
  return body;
}
