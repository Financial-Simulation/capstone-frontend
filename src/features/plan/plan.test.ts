import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { RobustJobResult, SimulationInput } from "@/lib/types";
import {
  EMERGENCY_CHOICES,
  baseHint,
  describeChanges,
  hasChanges,
  planBase,
  planChanges,
  planCompareRows,
  planLabels,
  planRequests,
  previewView,
  robustPlanLines,
  sameAdjustments,
} from "./plan";

const golden = (key: string) => goldenCaseByKey(key)!;
const s1 = golden("S1").input as SimulationInput;

describe("바꿔 볼 값 7개", () => {
  it("S1 지금 값 (비운 칸은 서버 기본값)", () => {
    expect(planBase(s1)).toEqual({
      monthlyVariableExpense: 950_000,
      monthlyFixedExpense: 950_000,
      monthlySaving: 500_000,
      breakThreshold: 500_000,
      goalTargetAmount: 30_000_000,
      goalTargetDate: "2031-11",
      emergencyFirstAmount: 0,
    });
  });

  it("바꾼 값만 보낸다 (비운 칸 · 지금과 같은 값은 빼고)", () => {
    const base = planBase(s1);
    const adjustments = planChanges(
      { ...base, monthlyVariableExpense: 850_000, monthlySaving: null, goalTargetDate: "2032-11", breakThreshold: 500_000 },
      base,
    );
    expect(adjustments).toEqual({ monthlyVariableExpense: 850_000, goalTargetDate: "2032-11" });
    expect(hasChanges(adjustments)).toBe(true);
    expect(hasChanges(planChanges(base, base))).toBe(false);
  });

  it("담은 계획 이름 · 같은 계획인지", () => {
    expect(describeChanges({ monthlyVariableExpense: 850_000, goalTargetDate: "2032-11" })).toBe("변동지출 85만 원 · 목표 시점 2032년 11월");
    expect(describeChanges({ emergencyFirstAmount: 3_000_000 })).toBe("비상금 먼저 300만 원");
    expect(sameAdjustments({ monthlySaving: 400_000 }, { monthlySaving: 400_000 })).toBe(true);
    expect(sameAdjustments({ monthlySaving: 400_000 }, { monthlySaving: 400_000, breakThreshold: 1 })).toBe(false);
  });

  it("칸 아래 '지금 …'과 비상금 선택지", () => {
    const base = planBase(s1);
    expect(baseHint("monthlySaving", base, "적금·청약·연금에 넣는 돈 합계")).toBe("지금 50만 원 · 적금·청약·연금에 넣는 돈 합계");
    expect(baseHint("goalTargetDate", base)).toBe("지금 2031년 11월");
    expect(baseHint("emergencyFirstAmount", base)).toBe("지금 바로 적금 시작");
    expect(EMERGENCY_CHOICES.map((c) => c.label)).toEqual([
      "바로 적금 시작",
      "100만 원 모은 뒤 적금",
      "200만 원 모은 뒤 적금",
      "300만 원 모은 뒤 적금",
      "500만 원 모은 뒤 적금",
    ]);
  });
});

describe("미리보기 (/simulate/preview, 서버 값 그대로)", () => {
  it("S1: 변동지출 85만 원 → 58.0% → 70.5% (의미 있는 차이, 초록)", () => {
    const { adjustments, ...preview } = golden("S1").preview;
    const view = previewView(preview, adjustments!);
    expect(view.current).toEqual({ probability: "58.0%", detail: "70%가 되는 때 2032년 12월" });
    expect(view.adjusted).toEqual({
      title: "바꾼 계획 (변동지출 85만 원)",
      probability: "70.5%",
      detail: "+12.5%p · 70%가 되는 때 2031년 11월",
      tone: "good",
    });
    expect(view.rows.map((r) => [r.label, r.current, r.adjusted, r.diff])).toEqual([
      ["목표 달성 가능성", "58.0%", "70.5%", "+12.5%p"],
      ["빚질 가능성", "18.9%", "15.9%", "−3.1%p"],
      ["최악의 경우 (하위 5%)", "−1,568만 원", "−865만 원", "+703만 원"],
      ["청년미래적금 중도해지", "43.9%", "22.7%", "−21.2%p"],
      ["정부 지원금", "57만 원", "80만 원", "+23만 원"],
    ]);
  });

  it("S3: 청년미래 대상이 아니면 그 줄은 —, 차이가 작으면 '거의 차이 없음'", () => {
    const { adjustments, ...preview } = golden("S3").preview;
    const view = previewView(preview, adjustments!);
    expect(view.adjusted.tone).toBe("default");
    expect(view.adjusted.detail.startsWith("거의 차이 없음")).toBe(true);
    expect(view.rows.at(-1)).toMatchObject({ current: "—", adjusted: "—", diff: "—" });
  });
});

describe("담은 계획 비교 (/compare) · 결론이 같은지 (/robust)", () => {
  it("S1 비교 표", () => {
    const rows = planCompareRows(golden("S1").compare);
    expect(rows.map((r) => [r.name, r.probability, r.diff?.text ?? null])).toEqual([
      ["지금 계획", "58.0%", null],
      ["변동지출 10만 원 줄이기", "70.5%", "+12.5%p"],
      ["비상금 300만 원 먼저", expect.any(String), expect.any(String)],
      ["목표 1년 늦추기", expect.any(String), expect.any(String)],
    ]);
    expect(rows[0]).toMatchObject({ debt: "18.9%", worst: "−1,568만 원", earlyTermination: "43.9%", subsidy: "57만 원" });
  });

  it("S1: 60번 중 몇 번 같은 결론인지", () => {
    const job: RobustJobResult = { jobId: "j", status: "DONE", progress: 100, ...golden("S1").robust };
    expect(robustPlanLines(job)).toEqual([
      {
        name: "변동지출 10만 원 줄이기",
        text: "가정을 60가지로 바꿔도 지금 계획보다 나은 결론이 60번 중 60번 유지돼요 (차이 가운데 +11.4%p, 95% 범위 4.3~15.8%p).",
      },
    ]);
  });

  it("서버에는 이름을 20자까지 보내고 (PlanSpec), 보낸 이름 그대로 돌아온 줄에만 담은 계획 이름을 붙인다", () => {
    const two = { monthlyVariableExpense: 850_000, goalTargetDate: "2032-11" } as const;
    const basket = [
      { name: describeChanges(two), adjustments: two },
      { name: describeChanges({ emergencyFirstAmount: 3_000_000 }), adjustments: { emergencyFirstAmount: 3_000_000 as const } },
    ];
    expect(basket[0].name).toHaveLength(28);
    expect(planRequests(basket)).toEqual([
      { name: "변동지출 85만 원 · 목표 시점…", adjustments: two },
      { name: "비상금 먼저 300만 원", adjustments: { emergencyFirstAmount: 3_000_000 } },
    ]);
    expect(planRequests(basket).every((plan) => plan.name.length <= 20)).toBe(true);
    const labels = planLabels(basket);
    expect(labels.map((l) => l.sent)).toEqual(planRequests(basket).map((p) => p.name));

    // 실제 서버: 보낸 순서 · 보낸 이름 그대로 돌려준다 → 담은 계획 이름으로
    const s1 = golden("S1").compare;
    const answered = { ...s1, plans: [s1.plans[0], ...labels.map((l, i) => ({ ...s1.plans[i + 1], name: l.sent }))] };
    expect(planCompareRows(answered, labels).map((r) => r.name)).toEqual([
      "지금 계획",
      "변동지출 85만 원 · 목표 시점 2032년 11월",
      "비상금 먼저 300만 원",
    ]);
    // 목업: 정답 파일에 없는 계획이면 정답 파일의 예시 계획이 온다 → 그 이름 그대로 (내 계획 이름을 붙이지 않음)
    expect(planCompareRows(s1, labels).map((r) => r.name)).toEqual(["지금 계획", "변동지출 10만 원 줄이기", "비상금 300만 원 먼저", "목표 1년 늦추기"]);

    const job: RobustJobResult = { jobId: "j", status: "DONE", progress: 100, ...golden("S1").robust };
    expect(robustPlanLines(job, labels)[0].name).toBe("변동지출 10만 원 줄이기");
    const sentBack = { ...job, plans: job.plans!.map((p) => ({ ...p, name: labels[0].sent })) };
    expect(robustPlanLines(sentBack, labels)[0].name).toBe("변동지출 85만 원 · 목표 시점 2032년 11월");
  });
});
