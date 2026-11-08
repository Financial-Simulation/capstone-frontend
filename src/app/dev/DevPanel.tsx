"use client";

/**
 * 개발 점검 화면 (/dev). 데모 화면이 아니라 우리끼리 확인하는 곳이다.
 *  1. 목업 스위치: 엔드포인트마다 mock / real (이 브라우저에만 저장, 새로고침해도 유지)
 *  2. API 점검: 프록시 → 백엔드, ApiResponse 풀기, 오류 → 칸 오류 변환, 목업 ↔ 정답 파일
 *  3. 저장값: simInput.v1 · simProgress.v1 · simPlans.v1, 단계 표시 미리보기
 *  4. 금액 칸 연습
 */
import Link from "next/link";
import { useState } from "react";
import { MoneyInput } from "@/components/MoneyInput";
import { StepIndicator } from "@/components/StepIndicator";
import { Badge, Button, Card } from "@/components/ui";
import {
  API_BASE,
  DEFAULT_MODE,
  ENDPOINTS,
  ENDPOINT_LABELS,
  formatModeSpec,
  parseModeSpec,
  type ApiSource,
  type Endpoint,
  type ModeMap,
} from "@/lib/api";
import { formatKoreanWon, formatManwon, formatWon } from "@/lib/format";
import { useApiModes, useHydrated, useProgress, useSavedPlans, useSimInput, useStorageAvailable } from "@/lib/hooks";
import { INPUT_KEY, PLANS_KEY, PROGRESS_KEY } from "@/lib/storage";
import { ROUTES, STEPS, finishedSteps } from "@/lib/steps";
import type { SimulationInputDraft } from "@/lib/types";
import { formatYearMonth } from "@/lib/year-month";
import { ApiChecks } from "./ApiChecks";
import { EXAMPLE_S1 } from "./checks";

/** .env.local의 NEXT_PUBLIC_API_MODE (빌드할 때 들어간 값) */
const ENV_SPEC = process.env.NEXT_PUBLIC_API_MODE ?? "";

export function DevPanel({ backendUrl }: { backendUrl: string }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge tone="mock">개발 점검</Badge>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">개발 점검</h1>
        <p className="mt-1 text-sm text-ink-soft">
          브라우저는 같은 주소의 <code className="rounded bg-canvas px-1">{`${API_BASE}/*`}</code>만 부르고, 개발 서버가{" "}
          <code className="rounded bg-canvas px-1">{`${backendUrl}/api/*`}</code>로 넘겨요 (next.config.ts rewrites). 그래서
          백엔드에 CORS 설정이 없어도 붙어요.
        </p>
        <ScreenLinks />
      </div>
      <ModeSwitch />
      <ApiChecks />
      <StorageViewer />
      <MoneyPlayground />
    </div>
  );
}

function ScreenLinks() {
  const screens = [
    { href: ROUTES.start, label: "00 시작" },
    ...STEPS.map((s) => ({ href: s.href, label: `${s.screen} ${s.label}` })),
    { href: ROUTES.result, label: "04 결과" },
    { href: ROUTES.example, label: "04-E 예시 결과" },
  ];
  return (
    <nav aria-label="화면 바로가기" className="mt-3 flex flex-wrap gap-2 text-sm">
      {screens.map((s) => (
        <Link key={s.href} href={s.href} className="rounded-md border border-line bg-surface px-2.5 py-1 hover:border-primary">
          {s.label} <span className="font-mono text-xs text-muted">{s.href}</span>
        </Link>
      ))}
    </nav>
  );
}

// ===== 1. 목업 스위치 =====

function ModeSwitch() {
  const hydrated = useHydrated();
  const { override, modes, setOverride } = useApiModes();
  const env = parseModeSpec(ENV_SPEC);

  const decidedBy = (endpoint: Endpoint) =>
    override[endpoint] ? "이 브라우저" : env[endpoint] ? ".env.local" : "기본값";

  const setEndpoint = (endpoint: Endpoint, value: ApiSource) => {
    const next: ModeMap = { ...override };
    // 기본값(.env 포함)과 같으면 덮어쓴 값을 지워 둔다
    if (value === (env[endpoint] ?? DEFAULT_MODE[endpoint])) delete next[endpoint];
    else next[endpoint] = value;
    setOverride(next);
  };

  const spec = formatModeSpec(override);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">목업 스위치</h2>
          <p className="mt-1 text-sm text-ink-soft">
            mock은 정답 파일(analysis_golden.json)에서 입력이 같은 케이스를 돌려줘요. 바꾸면 바로 모든 화면에 적용되고, 이
            브라우저에만 저장돼요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setOverride(parseModeSpec("all-mock"))}>
            전부 mock
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOverride(parseModeSpec("all-real"))}>
            전부 real
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOverride(null)} disabled={!spec}>
            기본값으로
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-semibold">API</th>
              <th className="py-2 pr-3 font-semibold">정한 곳</th>
              <th className="py-2 font-semibold">mock / real</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((endpoint) => {
              const current = hydrated ? modes[endpoint] : null;
              return (
                <tr key={endpoint} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-semibold">{endpoint}</span>
                    <span className="block break-all font-mono text-xs text-muted sm:ml-2 sm:inline">
                      {ENDPOINT_LABELS[endpoint]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-ink-soft">{hydrated ? decidedBy(endpoint) : ""}</td>
                  <td className="py-2">
                    <div role="group" aria-label={`${endpoint} 응답`} className="inline-flex rounded-lg border border-line-strong p-0.5">
                      {(["mock", "real"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={current === value}
                          onClick={() => setEndpoint(endpoint, value)}
                          className={[
                            "rounded-md px-3 py-1 text-xs font-semibold",
                            current === value
                              ? value === "mock"
                                ? "bg-mock text-white"
                                : "bg-primary text-white"
                              : "text-ink-soft hover:bg-canvas",
                          ].join(" ")}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        이 브라우저: <code>{hydrated ? spec || "(없음)" : ""}</code> · .env.local NEXT_PUBLIC_API_MODE:{" "}
        <code>{ENV_SPEC || "(없음)"}</code>
      </p>
    </Card>
  );
}

// ===== 3. 저장값 =====

function StorageViewer() {
  const hydrated = useHydrated();
  const available = useStorageAvailable();
  const { input, update, clear } = useSimInput();
  const { visited, markVisited } = useProgress();
  const { plans } = useSavedPlans();

  const fillS1 = () => {
    update(structuredClone(EXAMPLE_S1) as SimulationInputDraft);
    for (const step of STEPS) markVisited(step.key);
  };

  /** 빈 상태에서 첫 값을 넣으면 startMonth가 이번 달로 정해지는지 */
  const firstInput = () => {
    clear();
    update({ income: { monthlyNetIncome: 2_500_000 } });
  };

  const done = hydrated ? finishedSteps(input, visited) : new Set();

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">저장값 (이 브라우저)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            입력은 서버가 아니라 localStorage에만 있어요. 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서도 화면은 계속 돼요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={fillS1}>
            S1 값으로 채우기
          </Button>
          <Button size="sm" variant="secondary" onClick={firstInput}>
            첫 입력 시험 (startMonth)
          </Button>
          <Button size="sm" variant="danger" onClick={clear}>
            저장값 모두 지우기
          </Button>
        </div>
      </div>

      {hydrated && (
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">저장소</dt>
            <dd>{available ? "사용 가능" : "사용 못 함 (이번 화면에서만 기억)"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">기준 연월 (startMonth)</dt>
            <dd>{input?.startMonth ? `${input.startMonth} (${formatYearMonth(input.startMonth)})` : "아직 없음"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">거쳐 간 단계 ({PROGRESS_KEY})</dt>
            <dd>{visited.length > 0 ? visited.join(" → ") : "없음"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">끝낸 단계 (단계 표시에서 누를 수 있음)</dt>
            <dd>{done.size > 0 ? [...done].join(", ") : "없음"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">비교 계획 ({PLANS_KEY})</dt>
            <dd>{plans.length} / 3개</dd>
          </div>
        </dl>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold text-muted">단계 표시 미리보기 (끝낸 단계만 링크)</p>
        <div className="mt-2">
          <StepIndicator />
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-ink-soft">{INPUT_KEY} 원본</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-line bg-canvas p-3 text-xs leading-relaxed">
          {hydrated ? JSON.stringify(input, null, 2) : ""}
        </pre>
      </details>
    </Card>
  );
}

// ===== 4. 금액 칸 =====

function MoneyPlayground() {
  const [value, setValue] = useState<number | null>(null);
  const [allowNegative, setAllowNegative] = useState(false);

  return (
    <Card>
      <h2 className="text-lg font-bold">금액 칸</h2>
      <p className="mt-1 text-sm text-ink-soft">
        숫자만 받고 쉼표는 자동이에요. 가운데를 고쳐도 커서가 제자리에 있고, &lsquo;2,500,000원&rsquo;을 붙여 넣어도 숫자만 남아요.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dev-money" className="text-sm font-semibold">
            금액
          </label>
          <div className="mt-1.5">
            <MoneyInput id="dev-money" value={value} onChange={setValue} allowNegative={allowNegative} />
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={allowNegative}
              onChange={(event) => {
                setAllowNegative(event.target.checked);
                if (!event.target.checked && value !== null && value < 0) setValue(-value);
              }}
            />
            음수 허용 (예: 이사 후 주거비 −30만 원)
          </label>
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">값 (서버로 보내는 숫자)</dt>
            <dd className="font-mono">{value === null ? "null" : value}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">formatWon</dt>
            <dd>{formatWon(value)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">formatKoreanWon</dt>
            <dd>{formatKoreanWon(value)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">formatManwon (첫 문장 표기)</dt>
            <dd>{formatManwon(value)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
