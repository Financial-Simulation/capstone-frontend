/**
 * 금액 칸(MoneyInput)의 순수 함수: 숫자만 남기고 천 단위 쉼표를 넣는다.
 * 컴포넌트와 떼어 둬서 테스트할 수 있게 했다.
 */
import { groupDigits } from "./format";

/** 9,999조 원 미만. 실제 범위 검사는 서버 규칙(rules.ts)이 한다 */
export const MAX_MONEY_DIGITS = 13;

export interface MoneyTextOptions {
  /** 맨 앞 '-' 하나를 허용 (예: 주거비 변화 −30만 원) */
  allowNegative?: boolean;
  maxDigits?: number;
}

export interface NormalizedMoneyText {
  /** 칸에 보여 줄 글자. 예) "1,234,567", "-300,000", "-" */
  text: string;
  /** 원 단위 정수. 비어 있으면 null */
  value: number | null;
}

/** 사용자가 친 글자에서 숫자(와 맨 앞 '-')만 남겨 쉼표를 다시 넣는다 */
export function normalizeMoneyText(raw: string, options: MoneyTextOptions = {}): NormalizedMoneyText {
  const { allowNegative = false, maxDigits = MAX_MONEY_DIGITS } = options;
  const negative = allowNegative && /^\s*[-−]/.test(raw);
  let digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits.length > maxDigits) digits = digits.slice(0, maxDigits);

  if (digits === "") {
    return { text: negative ? "-" : "", value: null };
  }
  const magnitude = Number(digits);
  const value = negative && magnitude !== 0 ? -magnitude : magnitude;
  return { text: (negative ? "-" : "") + groupDigits(magnitude), value };
}

/** 값 → 칸에 보여 줄 글자 */
export function formatMoneyText(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return (value < 0 ? "-" : "") + groupDigits(value);
}

/** 커서 앞에 있는 숫자 개수 (쉼표를 다시 넣은 뒤 커서를 같은 숫자 뒤에 두려고) */
export function digitsBeforeCaret(text: string, caret: number): number {
  let count = 0;
  for (let i = 0; i < Math.min(caret, text.length); i++) {
    if (text[i] >= "0" && text[i] <= "9") count++;
  }
  return count;
}

/** 쉼표를 넣은 글자에서 n번째 숫자 바로 뒤의 위치 */
export function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return formatted.startsWith("-") ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] >= "0" && formatted[i] <= "9") {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}
