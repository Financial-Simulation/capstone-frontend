/**
 * 숫자 칸(NumberInput)의 순수 함수: 나이 · 경력 · 금리 · 개월 · 변화율처럼 쉼표 없이 받는 숫자.
 * 금액은 money-input.ts (쉼표 자동).
 */

export interface NumberTextOptions {
  /** 소수 자릿수. 0이면 정수만 (나이 · 개월) */
  decimals?: number;
  /** 맨 앞 '-' 하나를 허용 (예: 연봉 변화율 −10%) */
  allowNegative?: boolean;
  /** 정수 부분 최대 자릿수 */
  maxIntegerDigits?: number;
}

export interface NormalizedNumberText {
  /** 칸에 보여 줄 글자. 예) "27", "1.9", "3.", "-", "-10" */
  text: string;
  /** 비어 있거나 '-'·'.'만 있으면 null */
  value: number | null;
}

/** 사용자가 친 글자에서 숫자 · 소수점 하나 · 맨 앞 '-'만 남긴다 */
export function normalizeNumberText(raw: string, options: NumberTextOptions = {}): NormalizedNumberText {
  const { decimals = 0, allowNegative = false, maxIntegerDigits = 6 } = options;
  const negative = allowNegative && /^\s*[-−]/.test(raw);

  const cleaned = raw.replace(decimals > 0 ? /[^\d.]/g : /\D/g, "");
  const dot = cleaned.indexOf(".");
  let integer = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fraction = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, "").slice(0, decimals);

  integer = integer.replace(/^0+(?=\d)/, "").slice(0, maxIntegerDigits);
  if (fraction !== null && integer === "") integer = "0";

  const sign = negative ? "-" : "";
  if (integer === "" && fraction === null) return { text: sign, value: null };

  const text = `${sign}${integer}${fraction !== null ? `.${fraction}` : ""}`;
  const magnitude = Number(`${integer}.${fraction ?? ""}`.replace(/\.$/, ""));
  const value = negative && magnitude !== 0 ? -magnitude : magnitude;
  return { text, value };
}

/** 값 → 칸에 보여 줄 글자 (지수 표기 없이) */
export function formatNumberText(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (decimals === 0) return String(Math.trunc(value));
  // 1.9 → "1.9", 3.03 → "3.03" (불필요한 0은 붙이지 않는다)
  return String(Number(value.toFixed(decimals)));
}
