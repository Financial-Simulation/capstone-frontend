/**
 * 화면에서 쓰는 API 함수. 전부 같은 모양 ApiResult<T>를 돌려준다.
 *
 *   const { data, source } = await api.simulate({ input });
 *
 * 목업/실제는 엔드포인트마다 mode.ts가 정한다. 화면 코드는 바뀌지 않는다.
 * 실패하면 ApiError를 던진다 → toFieldErrors(error, input)로 칸 오류, formErrorMessage(error)로 화면 위 안내.
 */
import type {
  CompareRequest,
  CompareResult,
  ExamplesResult,
  MetaResult,
  PresetsResult,
  PreviewRequest,
  PreviewResult,
  RepaymentPreviewRequest,
  RepaymentPreviewResult,
  ReverseRequest,
  ReverseResult,
  RobustJobResult,
  RobustRequest,
  RobustStartResult,
  SimulateRequest,
  SimulateResult,
  ValidateRequest,
  ValidateResult,
} from "@/lib/types";
import type { MockMatch, MockReturn } from "@/mocks/handlers";
import { request, type RequestOptions } from "./client";
import { resolveMode, type ApiSource, type Endpoint } from "./mode";

export interface ApiResult<T> {
  data: T;
  /** 'mock'이면 정답 파일·고정값으로 만든 응답 */
  source: ApiSource;
  /** 목업일 때 어떤 정답 케이스를 썼는지 */
  mock?: MockMatch;
}

type Mocks = typeof import("@/mocks/handlers");

/** 목업 코드(정답 파일 포함)는 목업을 쓸 때만 내려받는다 */
const loadMocks = (): Promise<Mocks> => import("@/mocks/handlers");

async function call<T>(
  endpoint: Endpoint,
  real: () => Promise<T>,
  mock: (mocks: Mocks) => Promise<MockReturn<T>>,
): Promise<ApiResult<T>> {
  if (resolveMode(endpoint) === "mock") {
    const { data, match } = await mock(await loadMocks());
    return { data, source: "mock", mock: match };
  }
  return { data: await real(), source: "real" };
}

export const api = {
  /** 입력 검사 (저장 없음). '다음' 버튼마다 */
  validate(body: ValidateRequest, options?: RequestOptions) {
    return call<ValidateResult>(
      "validate",
      () => request("POST", "/inputs/validate", body, options),
      (m) => m.validate(body),
    );
  },

  /** 대출 한 건의 월 상환액 (칸이 다 차면 0.3초 뒤) */
  repaymentPreview(body: RepaymentPreviewRequest, options?: RequestOptions) {
    return call<RepaymentPreviewResult>(
      "repaymentPreview",
      () => request("POST", "/loans/repayment-preview", body, options),
      (m) => m.repaymentPreview(body),
    );
  },

  /** 예정된 일 프리셋 5종 */
  presets(options?: RequestOptions) {
    return call<PresetsResult>("presets", () => request("GET", "/events/presets", undefined, options), (m) => m.presets());
  },

  /** 예시 사용자 S1~S3 (내 입력에는 저장하지 않는다) */
  examples(options?: RequestOptions) {
    return call<ExamplesResult>("examples", () => request("GET", "/examples", undefined, options), (m) => m.examples());
  },

  /** 기본 결과: 확률·범위·위험·원인·확정 계산·첫 문장 */
  simulate(body: SimulateRequest, options?: RequestOptions) {
    return call<SimulateResult>("simulate", () => request("POST", "/simulate", body, options), (m) => m.simulate(body));
  },

  /** 조절 막대: 지금 계획 vs 바꾼 계획 1개 */
  preview(body: PreviewRequest, options?: RequestOptions) {
    return call<PreviewResult>(
      "preview",
      () => request("POST", "/simulate/preview", body, options),
      (m) => m.preview(body),
    );
  },

  /** 지금 계획 + 비교 계획 1~3개 */
  compare(body: CompareRequest, options?: RequestOptions) {
    return call<CompareResult>("compare", () => request("POST", "/compare", body, options), (m) => m.compare(body));
  },

  /** 역산 · 비상금 전략 · '이렇게 바꿔 보세요' */
  reverse(body: ReverseRequest, options?: RequestOptions) {
    return call<ReverseResult>("reverse", () => request("POST", "/reverse", body, options), (m) => m.reverse(body));
  },

  /** 가능성 범위 작업 시작 (202) */
  startRobust(body: RobustRequest, options?: RequestOptions) {
    return call<RobustStartResult>(
      "robust",
      () => request("POST", "/robust", body, options),
      (m) => m.startRobust(body),
    );
  },

  /** 가능성 범위 진행률·결과 (1초 간격으로 부른다) */
  robustJob(jobId: string, options?: RequestOptions) {
    return call<RobustJobResult>(
      "robust",
      () => request("GET", `/robust/${encodeURIComponent(jobId)}`, undefined, options),
      (m) => m.robustJob(jobId),
    );
  },

  /** 근거·파라미터 */
  meta(options?: RequestOptions) {
    return call<MetaResult>("meta", () => request("GET", "/meta", undefined, options), (m) => m.meta());
  },
};

export type Api = typeof api;
