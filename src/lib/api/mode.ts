/**
 * 엔드포인트별 목업(mock) / 실제(real) 스위치.
 *
 * 정하는 순서 (뒤가 이긴다)
 *  1. DEFAULT_MODE: 백엔드에 이미 있는 API는 real, 아직 없는 계산 API는 mock (10/27 기준)
 *  2. .env.local의 NEXT_PUBLIC_API_MODE (빌드할 때 들어감)
 *  3. 브라우저 localStorage의 apiMode.dev (개발 점검 화면 /dev 에서 바꿈, 새로고침해도 유지)
 *
 * 형식: "all-mock" · "all-real" · "simulate=real,preview=mock" (쉼표로 여러 개, all-*와 섞어도 됨)
 * /simulate가 백엔드에 붙으면 DEFAULT_MODE의 simulate만 'real'로 바꾸면 된다.
 */

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
  "meta",
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
  meta: "GET /meta",
};

export const DEFAULT_MODE: Record<Endpoint, ApiSource> = {
  validate: "real",
  repaymentPreview: "real",
  presets: "real",
  examples: "real",
  simulate: "mock",
  preview: "mock",
  compare: "mock",
  reverse: "mock",
  robust: "mock",
  meta: "mock",
};

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

const ENV_MODE = parseModeSpec(process.env.NEXT_PUBLIC_API_MODE);

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
  return override[endpoint] ?? ENV_MODE[endpoint] ?? DEFAULT_MODE[endpoint];
}

/** 지금 적용되는 전체 표 (개발 점검 화면용) */
export function currentModes(override: ModeMap = readModeOverride()): Record<Endpoint, ApiSource> {
  return Object.fromEntries(ENDPOINTS.map((e) => [e, resolveMode(e, override)])) as Record<Endpoint, ApiSource>;
}
