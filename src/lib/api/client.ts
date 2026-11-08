/**
 * fetch 래퍼: ApiResponse { isSuccess, code, message, result }를 풀어서 result만 돌려주고,
 * 실패하면 ApiError를 던진다.
 *
 * 주소는 같은 출처의 /api/* 이다 (src/config/env.ts의 API_BASE). 개발 중에는 next.config.ts의 rewrites가
 * 백엔드(BACKEND_URL)로 넘긴다. 백엔드에 CORS 설정이 없어서 브라우저가 백엔드 주소를 바로 부르면 막힌다.
 */
import { API_BASE } from "@/config/env";
import type { ApiResponse, FieldErrorMap } from "@/lib/types";
import { ApiError } from "./errors";

export { API_BASE };

export const CLIENT_MESSAGES = {
  network: "서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
  backendUnavailable: "백엔드가 응답하지 않아요. 백엔드 서버가 켜져 있는지 확인해 주세요.",
  badResponse: "서버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.",
  unknown: "요청을 처리하지 못했어요.",
} as const;

export interface RequestOptions {
  signal?: AbortSignal;
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiResponse<unknown>).isSuccess === "boolean" &&
    typeof (value as ApiResponse<unknown>).code === "string"
  );
}

function isMessageMap(value: unknown): value is FieldErrorMap {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
      cache: "no-store",
    });
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ApiError("NETWORK", CLIENT_MESSAGES.network, null);
  }

  const text = await response.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!isApiResponse(json)) {
    // 백엔드는 처리 못 한 오류도 ApiResponse(COMMON500)로 감싼다. 그러니 JSON이 아닌 5xx는
    // 백엔드가 꺼져 있거나 30초 안에 답하지 않아 개발 서버의 프록시가 대신 돌려준 500이다
    if (response.status >= 500) {
      throw new ApiError("BACKEND_UNAVAILABLE", CLIENT_MESSAGES.backendUnavailable, response.status);
    }
    throw new ApiError("BAD_RESPONSE", CLIENT_MESSAGES.badResponse, response.status);
  }

  if (!json.isSuccess) {
    const fieldErrors = json.code === "COMMON400" && isMessageMap(json.result) ? json.result : {};
    throw new ApiError(json.code, json.message || CLIENT_MESSAGES.unknown, response.status, fieldErrors);
  }

  return json.result as T;
}
