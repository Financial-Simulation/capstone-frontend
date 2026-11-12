/**
 * 엔드포인트별 목업(mock) / 실제(real) 스위치.
 *
 * 기본은 전부 실제 API다 (백엔드에 API가 다 있다). 목업은 테스트와 오프라인(백엔드 없이 화면만 볼 때)용이다.
 *
 * 정하는 순서 (뒤가 이긴다)
 *  1. 기본값: 전부 real (DEFAULT_SOURCE)
 *  2. .env.local의 NEXT_PUBLIC_API_MODE (src/config/env.ts가 읽음, 빌드할 때 들어감)
 *  3. 브라우저 localStorage의 apiMode.dev (개발 점검 화면 /dev 에서 바꿈, 새로고침해도 유지)
 *
 * 형식: "all-mock" · "all-real" · "simulate=mock,preview=mock" (쉼표로 여러 개, all-*와 섞어도 됨)
 */
import { API_MODE_SPEC } from "@/config/env";

export const ENDPOINTS = [
  "validate",
  "repaymentPreview",
  "presets",
  "examples",
  "simulate",
  "preview",
  "compare",
  "reverse",
  "robust",
  "recommend",
  "reports",
  "meta",
  "story",
] as const;

export type Endpoint = (typeof ENDPOINTS)[number];
export type ApiSource = "mock" | "real";
export type ModeMap = Partial<Record<Endpoint, ApiSource>>;

export const ENDPOINT_LABELS: Record<Endpoint, string> = {
  validate: "POST /inputs/validate",
  repaymentPreview: "POST /loans/repayment-preview",
  presets: "GET /events/presets",
  examples: "GET /examples",
  simulate: "POST /simulate",
  preview: "POST /simulate/preview",
  compare: "POST /compare",
  reverse: "POST /reverse",
  robust: "POST /robust · GET /robust/{jobId}",
  recommend: "POST /allocations/recommend",
  reports: "POST /reports",
  meta: "GET /meta",
  story: "POST /simulate/story (데모)",
};

/** 아무 데서도 정하지 않은 엔드포인트는 실제 API */
export const DEFAULT_SOURCE: ApiSource = "real";

export const MODE_OVERRIDE_KEY = "apiMode.dev";

function isEndpoint(value: string): value is Endpoint {
  return (ENDPOINTS as readonly string[]).includes(value);
}

/** "all-mock,simulate=real" → { 전부 mock, simulate만 real } */
export function parseModeSpec(spec: string | null | undefined): ModeMap {
  const result: ModeMap = {};
  if (!spec) return result;
  for (const raw of spec.split(",")) {
    const token = raw.trim();
    if (token === "all-mock" || token === "all-real") {
      const source: ApiSource = token === "all-mock" ? "mock" : "real";
      for (const endpoint of ENDPOINTS) result[endpoint] = source;
      continue;
    }
    const [name, value] = token.split("=").map((s) => s.trim());
    if (name && isEndpoint(name) && (value === "mock" || value === "real")) {
      result[name] = value;
    }
  }
  return result;
}

/** ModeMap → "simulate=real,preview=mock" */
export function formatModeSpec(map: ModeMap): string {
  return ENDPOINTS.filter((e) => map[e])
    .map((e) => `${e}=${map[e]}`)
    .join(",");
}

/** .env.local의 NEXT_PUBLIC_API_MODE로 정한 엔드포인트 (빌드할 때 정해짐) */
export const ENV_MODE: ModeMap = parseModeSpec(API_MODE_SPEC);

export function readModeOverride(): ModeMap {
  if (typeof window === "undefined") return {};
  try {
    return parseModeSpec(window.localStorage.getItem(MODE_OVERRIDE_KEY));
  } catch {
    return {};
  }
}

/** 개발 점검 화면에서 바꾼 값을 저장. null이면 지운다 */
export function writeModeOverride(map: ModeMap | null): void {
  if (typeof window === "undefined") return;
  try {
    const spec = map ? formatModeSpec(map) : "";
    if (spec) window.localStorage.setItem(MODE_OVERRIDE_KEY, spec);
    else window.localStorage.removeItem(MODE_OVERRIDE_KEY);
  } catch {
    // 저장소를 못 쓰는 브라우저면 이번 화면에서만 기본값으로 동작
  }
}

export function resolveMode(endpoint: Endpoint, override: ModeMap = readModeOverride()): ApiSource {
  return override[endpoint] ?? ENV_MODE[endpoint] ?? DEFAULT_SOURCE;
}

/** 지금 적용되는 전체 표 (개발 점검 화면용) */
export function currentModes(override: ModeMap = readModeOverride()): Record<Endpoint, ApiSource> {
  return Object.fromEntries(ENDPOINTS.map((e) => [e, resolveMode(e, override)])) as Record<Endpoint, ApiSource>;
}
