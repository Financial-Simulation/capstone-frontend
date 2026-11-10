"use client";

/**
 * 리포트 저장 (FR-11, 04 결과 위쪽의 '리포트 저장'). 내 입력(simInput.v1)과 담은 계획(simPlans.v1)으로
 * POST /reports를 불러 한 장짜리 리포트를 그린다. '인쇄 · PDF로 저장'은 브라우저 인쇄를 열고(대상: PDF로 저장),
 * 인쇄할 때는 머리글 · 버튼을 빼고 리포트만 나온다. 입력이 덜 끝났거나 계산하지 못했을 때는 결과 화면과 같은 안내.
 */
import { Button, LinkButton } from "@/components/ui";
import { planLabels, planRequests } from "@/features/plan/plan";
import { MockNote } from "@/features/result/Hero";
import { Computing, Empty, Failed, NotReady } from "@/features/result/StateViews";
import { useResult } from "@/features/result/use-result";
import { readiness } from "@/features/result/result";
import { useHydrated, useSavedPlans, useSimInput } from "@/lib/hooks";
import { ROUTES } from "@/lib/steps";
import type { SimulationInput } from "@/lib/types";
import { ReportPaper } from "./ReportPaper";
import { reportView } from "./report";
import { useReport } from "./use-report";

export function ReportScreen() {
  const hydrated = useHydrated();
  const { input } = useSimInput();
  const { plans: basket } = useSavedPlans();
  const ready = hydrated ? readiness(input) : null;
  const report = useReport(ready?.ok && input ? (input as SimulationInput) : null, planRequests(basket));
  // 그래프 · 세금 안내 · 70% 역산: 결과 화면과 같은 /simulate · /reverse (같은 입력 · 같은 seed라 숫자가 같다). 못 받아도 리포트는 그린다
  const detail = useResult(ready?.ok && input ? (input as SimulationInput) : null);

  if (!ready) return <Computing />;
  if (!ready.ok) return ready.reason === "empty" ? <Empty /> : <NotReady step={ready.step} message={ready.message} />;
  if (report.status === "failed") return <Failed error={report.error} onRetry={report.retry} />;
  if (!report.result) return <Computing />;

  const view = reportView(report.result.data, report.gradeLegend, planLabels(basket));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-primary">04</p>
          <p className="text-2xl font-bold tracking-tight">자세한 결과 (리포트)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>인쇄 · PDF로 저장</Button>
          <LinkButton href={ROUTES.result} variant="secondary">
            결과로 돌아가기
          </LinkButton>
        </div>
      </div>
      <p className="text-sm text-ink-soft print:hidden">
        인쇄 창에서 대상(프린터)을 &lsquo;PDF로 저장&rsquo;으로 고르면 PDF 파일이 돼요.{" "}
        {basket.length > 0
          ? `담은 계획 ${basket.length}개를 ‘담은 계획 비교’에 넣었어요.`
          : "결과 화면의 ‘계획 바꿔 보기’에서 계획을 담으면 비교도 함께 들어가요."}
      </p>
      {report.result.source === "mock" && <MockNote match={report.result.mock} />}
      <ReportPaper
        view={view}
        detail={{ sim: detail.data?.sim.data ?? null, reverse: detail.data?.reverse?.data ?? null, input: input ?? {} }}
      />
    </div>
  );
}
