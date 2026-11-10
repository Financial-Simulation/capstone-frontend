import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import * as mocks from "@/mocks/handlers";
import type { ReportResult, SimulationInput } from "@/lib/types";
import { generatedText, reportView } from "./report";

const input = (key: string) => structuredClone(goldenCaseByKey(key)!.input) as SimulationInput;

// 목업은 setTimeout으로 기다리므로 가짜 시계를 돌려서 끝낸다
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** 목업 /reports (정답 파일 simulate · reverse · compare + meta). 만든 시각만 고정 */
async function report(key: string, plans: { name: string; adjustments: Record<string, unknown> }[] = []): Promise<ReportResult> {
  const pending = mocks.report({ input: input(key), plans, seed: null });
  await vi.runAllTimersAsync();
  const { data } = await pending;
  return { ...data, generatedAt: "2026-11-08T22:50:12" };
}

describe("리포트 한 장 (POST /reports, 숫자는 서버 값 그대로)", () => {
  it("S1 + 담은 계획 1개: 머리 · 목표 · 앞으로 모을 돈 · 위험 · 세금 · 개선 포인트 · 비교", async () => {
    const view = reportView(await report("S1", [{ name: "변동지출 85만 원", adjustments: { monthlyVariableExpense: 850_000 } }]));
    expect(view.meta).toBe("만든 시각 2026년 11월 8일 22:50 · 기준 연월 2026년 11월 · 모델 1.7 · 미래 2,000개 (난수 시드 20261007)");
    expect(view.headline).toContain("4,440만 원");
    expect(view.goal.map((c) => c.value)).toEqual(["3,000만 원", "58.0% (가능성 보통)", "±1.1%p", "2031년 6월", "2032년 12월", "4,440만 원"]);
    expect(view.forecast.map((r) => [r.label, r.p5.text, r.p50.text])).toEqual([
      ["1년 뒤", "107만 원", "659만 원"],
      ["3년 뒤", "−1,123만 원", "1,818만 원"],
      ["5년 뒤", "−1,568만 원", "3,310만 원"],
      ["10년 뒤", "−1,264만 원", "9,571만 원"],
    ]);
    expect(view.forecast[1].p5.negative).toBe(true);
    expect(view.risks.map((c) => [c.label, c.value])).toEqual([
      ["빚질 가능성", "18.9%"],
      ["처음 빚지는 때 (중간값)", "2028년 4월"],
      ["최악의 경우 (하위 5%)", "−1,568만 원"],
      ["청년미래적금 중도해지", "43.9%"],
      ["정부 지원금 (4년 안)", "57만 40원"],
    ]);
    expect(view.causes).toBe("적금을 처음 깬 이유: 실직 직후 21.9% · 실업 장기화 0.0% · 급한 지출 75.9% · 매달 부족 2.2%");
    expect(view.tax.at(-1)).toEqual({ label: "세금으로 본 순이득", value: "−4만 6,625원" });
    expect(view.allocation).toBe("월 배분: 청년미래 50만 원 · 청약 0원 · 연금 0원 · 일반 0원");
    expect(view.levers).toEqual([
      { label: "변동지출을 월 10만 원 줄이기", probability: "70.5%", diff: "+12.5%p" },
      { label: "목표 시점을 1년 늦추기", probability: "69.7%", diff: "+11.7%p" },
      { label: "목표 금액을 10% 낮추기", probability: "64.4%", diff: "+6.4%p" },
    ]);
    // 결과 화면 '계획 바꿔 보기'의 비교 표와 같은 줄
    expect(view.comparison.map((r) => [r.name, r.probability, r.diff?.text ?? null])).toEqual([
      ["지금 계획", "58.0%", null],
      ["변동지출 85만 원", "70.5%", "+12.5%p"],
    ]);
    expect(view.parameters).toHaveLength(15);
    expect(view.disclaimer).toContain("투자 권유가 아니에요");
  });

  it("비교 줄 이름은 담은 계획 이름 (서버에는 20자로 줄여 보낸 이름)", async () => {
    const data = await report("S1", [{ name: "변동지출 85만 원 · 목표 시…", adjustments: { monthlyVariableExpense: 850_000 } }]);
    expect(reportView(data).comparison[1].name).toBe("변동지출 85만 원 · 목표 시…");
    const labels = [{ sent: "변동지출 85만 원 · 목표 시…", label: "변동지출 85만 원 · 목표 시점 2032년 11월" }];
    expect(reportView(data, null, labels).comparison.map((r) => r.name)).toEqual(["지금 계획", "변동지출 85만 원 · 목표 시점 2032년 11월"]);
  });

  it("담은 계획이 없으면 비교 없음, 등급 설명은 /meta를 받았을 때만", async () => {
    const data = await report("S1");
    expect(reportView(data).comparison).toEqual([]);
    expect(reportView(data).gradeLegend).toBeNull();
    expect(reportView(data, { A: "법령·제도", E: "가정" }).gradeLegend).toBe("근거 등급: A 법령·제도 · E 가정");
  });

  it("S3 청년미래적금 대상 아님 · T2 지원금 없음: 칸은 '대상 아님' · '없음', 서버 경고 문장은 참고로", async () => {
    const s3 = reportView(await report("S3"));
    expect(s3.risks.slice(3).map((c) => c.value)).toEqual(["대상 아님", "대상 아님"]);
    expect(s3.causes).toBe("적금을 처음 깬 이유: 청년미래적금 대상이 아니라 해당 없음");
    expect(s3.notes).toEqual(["만 34세를 넘어 청년미래적금 대상이 아니에요. 일반 적금으로 계산해요."]);

    const t2 = reportView(await report("T2"));
    expect(t2.risks.at(-1)?.value).toBe("없음");
    expect(t2.notes[0]).toContain("정부 지원금은 없어요");
    expect(t2.allocation).toBe("월 배분: 청년미래 50만 원 · 청약 25만 원 · 연금 45만 원 · 일반 0원");
  });

  it("만든 시각 표기", () => {
    expect(generatedText("2026-01-05T09:03:59")).toBe("2026년 1월 5일 09:03");
    expect(generatedText("어제")).toBe("어제");
  });
});
