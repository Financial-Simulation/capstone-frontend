/**
 * API 오류와, 오류를 화면 칸 오류로 바꾸는 규칙.
 *
 *  - COMMON400: result의 칸별 메시지 맵 → 그 칸 아래에 ("person.age" → 나이 칸)
 *  - INPUT4001 → 경력 칸 / LOAN4001 → 대출 있음·없음 / GOAL4001·4002 → 목표 시점
 *  - EVENT4001·4002·4004 → 해당 예정된 일 카드 ("events[0]"). 서버가 몇 번째인지 알려 주지 않아서 입력에서 다시 찾는다
 *  - 나머지(네트워크, 서버 오류 등) → 화면 위 안내 (formErrorMessage)
 */
import type { FieldErrorMap, SimulationInputDraft } from "@/lib/types";
import { eventDateInRange, eventFieldsMatch, jobChangeInRange } from "@/lib/rules";

export class ApiError extends Error {
  /** 서버 코드(COMMON400, INPUT4001 …) 또는 프론트 코드(NETWORK, BACKEND_UNAVAILABLE, BAD_RESPONSE, MOCK_UNAVAILABLE) */
  readonly code: string;
  /** HTTP 상태. 서버에 닿지 못했으면 null */
  readonly status: number | null;
  /** COMMON400일 때 서버가 준 칸별 메시지 (서버 경로 그대로) */
  readonly fieldErrors: FieldErrorMap;

  constructor(code: string, message: string, status: number | null, fieldErrors: FieldErrorMap = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** 비즈니스 오류 → 칸 */
const BUSINESS_ERROR_FIELD: Record<string, string> = {
  INPUT4001: "person.careerYears",
  LOAN4001: "loans.hasNoLoan",
  GOAL4001: "goal.targetDate",
  GOAL4002: "goal.targetDate",
};

const EVENT_ERROR_CODES = new Set(["EVENT4001", "EVENT4002", "EVENT4004"]);

/**
 * 서버 칸 경로 → 화면 칸 키.
 * 계산 API 본문의 "input." 접두사를 떼고, 여러 칸을 보는 검사(@AssertTrue)의 이름을 실제 칸으로 바꾼다.
 */
export function normalizeFieldPath(path: string): string {
  const p = path.replace(/^input\./, "");
  if (/\.(resolvedTotalInRange|totalPresentWhenTotalMode)$/.test(p)) {
    return p.replace(/\.(resolvedTotalInRange|totalPresentWhenTotalMode)$/, ".total");
  }
  if (p === "assets.cashAndDepositsInRange") return "assets.cash";
  if (p === "savingPlan.emergencyFirstAmountAllowed") return "savingPlan.emergencyFirstAmount";
  return p;
}

/** 예정된 일 오류가 몇 번째 카드인지 입력에서 다시 찾는다 */
export function locateEventErrors(code: string, input?: SimulationInputDraft | null): number[] {
  const events = input?.events ?? [];
  return events.flatMap((event, index) => {
    if (!event) return [];
    const bad =
      code === "EVENT4001"
        ? !eventFieldsMatch(event)
        : code === "EVENT4002"
          ? !eventDateInRange(input?.startMonth, event)
          : code === "EVENT4004"
            ? !jobChangeInRange(event)
            : false;
    return bad ? [index] : [];
  });
}

/**
 * 오류를 화면 칸 오류로. 키는 입력 경로 ("person.age", "loans.items[0].principal", "events[1]").
 * 칸에 붙일 수 없는 오류면 빈 객체를 돌려준다 → formErrorMessage()로 화면 위에 보여 준다.
 */
export function toFieldErrors(error: unknown, input?: SimulationInputDraft | null): FieldErrorMap {
  if (!isApiError(error)) return {};

  if (error.code === "COMMON400") {
    const mapped: FieldErrorMap = {};
    for (const [path, message] of Object.entries(error.fieldErrors)) {
      const key = normalizeFieldPath(path);
      if (!(key in mapped)) mapped[key] = message;
    }
    return mapped;
  }

  const field = BUSINESS_ERROR_FIELD[error.code];
  if (field) return { [field]: error.message };

  if (EVENT_ERROR_CODES.has(error.code)) {
    const indexes = locateEventErrors(error.code, input);
    if (indexes.length === 0) return { events: error.message };
    return Object.fromEntries(indexes.map((i) => [`events[${i}]`, error.message]));
  }

  return {};
}

/** 칸에 붙이지 못한 오류의 안내 문장. 칸 오류로 보여 줄 수 있으면 null */
export function formErrorMessage(error: unknown, input?: SimulationInputDraft | null): string | null {
  if (!error) return null;
  if (isApiError(error)) {
    if (Object.keys(toFieldErrors(error, input)).length > 0) return null;
    return error.message;
  }
  return "알 수 없는 오류가 났어요. 잠시 후 다시 시도해 주세요.";
}

/** 칸 오류 하나 꺼내기. 그 칸 아래 경로(예: "loans.items[0]" 아래 "loans.items[0].principal")까지 보려면 prefix */
export function fieldError(errors: FieldErrorMap, path: string, options: { prefix?: boolean } = {}): string | undefined {
  if (errors[path]) return errors[path];
  if (!options.prefix) return undefined;
  const hit = Object.keys(errors).find((key) => key.startsWith(`${path}.`) || key.startsWith(`${path}[`));
  return hit ? errors[hit] : undefined;
}
