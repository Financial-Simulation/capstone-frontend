import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimulationInput, SimulationInputDraft } from "@/lib/types";
import { ApiError, toFieldErrors } from "@/lib/api/errors";
import examplesData from "./data/examples.json";
import { goldenCaseByKey } from "./golden";
import * as mocks from "./handlers";

const input = (key: string) => structuredClone(goldenCaseByKey(key)!.input) as SimulationInput;
const example = (key: string) =>
  structuredClone(examplesData.examples.find((e) => e.key === key)!.input) as unknown as SimulationInput;

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** 목업은 setTimeout으로 기다리므로 가짜 시계를 돌려서 끝낸다 */
async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  const result = promise.then(
    (value): Settled<T> => ({ ok: true, value }),
    (error: unknown): Settled<T> => ({ ok: false, error }),
  );
  await vi.runAllTimersAsync();
  return result;
}

async function ok<T>(promise: Promise<T>): Promise<T> {
  const result = await settle(promise);
  if (!result.ok) throw result.error;
  return result.value;
}

async function fail(promise: Promise<unknown>): Promise<ApiError> {
  const result = await settle(promise);
  if (result.ok) throw new Error("실패해야 하는데 성공했다");
  expect(result.error).toBeInstanceOf(ApiError);
  return result.error as ApiError;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("validate 목업", () => {
  it("S1 (대출 있음): 상환액은 백엔드에서만 계산 → 비워 둔다", async () => {
    const { data, match } = await ok(mocks.validate({ step: "ASSETS", input: example("S1") }));
    expect(data.step).toBe("ASSETS");
    expect(data.summary).toMatchObject({
      monthlyNetIncome: 2_500_000,
      fixedTotal: 950_000,
      variableTotal: 950_000,
      monthlyLoanPayment: null,
      monthlySurplus: null,
      totalAssets: 2_000_000,
      totalLoanBalance: 12_000_000,
    });
    expect(data.policySaving).toEqual({ eligible: true, reason: null, policyMonthly: 500_000, generalMonthly: 0 });
    expect(data.warnings).toEqual([]);
    expect(match.exact).toBe(false);
  });

  it("E5 (대출 없음, 적자): 백엔드와 같은 경고 문장", async () => {
    const { data } = await ok(mocks.validate({ step: "ALL", input: input("E5") }));
    expect(data.summary.monthlyLoanPayment).toBe(0);
    expect(data.summary.monthlySurplus).toBe(-400_000);
    expect(data.warnings).toEqual([
      { code: "WARN_EXPENSE_OVER_INCOME", message: "지출(240만 원)이 월 실수령액(200만 원) 이상이라 매달 모자라요." },
      {
        code: "WARN_MONTHLY_SHORTFALL",
        message: "저축액이 매달 남는 돈(-40만 원)보다 커서 계획만큼 넣지 못하는 달이 생겨요.",
      },
    ]);
  });

  it("S3 (36세): 청년미래적금 비대상 안내", async () => {
    const { data } = await ok(mocks.validate({ input: example("S3") }));
    expect(data.policySaving?.eligible).toBe(false);
    expect(data.warnings.map((w) => w.code)).toContain("INFO_POLICY_INELIGIBLE");
  });

  it("칸 오류 → COMMON400, 여러 칸 오류 → 그 코드", async () => {
    const tooYoung = await fail(mocks.validate({ input: { person: { age: 17 } } }));
    expect(tooYoung.code).toBe("COMMON400");
    expect(toFieldErrors(tooYoung)).toEqual({ "person.age": "19~39 사이로 입력해 주세요" });

    const career = await fail(mocks.validate({ input: { person: { age: 20, careerYears: 6 } } }));
    expect(career.code).toBe("INPUT4001");
    expect(toFieldErrors(career)).toEqual({ "person.careerYears": "경력은 나이 − 15년을 넘을 수 없어요." });
  });

  it("빈 입력도 검사는 통과 (값이 있는 칸만 본다)", async () => {
    const { data } = await ok(mocks.validate({ step: "BASIC", input: {} }));
    expect(Object.values(data.summary).every((v) => v === null)).toBe(true);
  });
});

describe("계산 목업: 입력이 같은 정답 케이스", () => {
  it("simulate: 백엔드 예시 S1 → 정답 S1", async () => {
    const { data, match } = await ok(mocks.simulate({ input: example("S1") }));
    expect(match).toMatchObject({ caseKey: "S1", exact: true });
    expect(data.goal.probability).toBe(58);
    expect(data.warnings).toEqual([]);
  });

  it("10월에 S1 값을 넣어도 정답 S1 (날짜만 한 달 앞)", async () => {
    const october = input("S1");
    october.startMonth = "2026-10";
    october.goal.targetDate = "2031-10";
    const { data, match } = await ok(mocks.simulate({ input: october }));
    expect(match).toMatchObject({ caseKey: "S1", exact: true });
    expect(match.note).toContain("날짜만 옮겼어요");
    expect(data.goal.probability).toBe(58);
    expect(data.startMonth).toBe("2026-10");
    expect(data.goal.reach70Date).toBe("2032-11");

    // 비교 계획의 '목표 1년 늦추기'도 옮긴 날짜로 맞춘다
    const compared = await ok(
      mocks.compare({
        input: october,
        plans: [
          { name: "A", adjustments: { monthlyVariableExpense: 850_000 } },
          { name: "B", adjustments: { emergencyFirstAmount: 3_000_000 } },
          { name: "C", adjustments: { goalTargetDate: "2032-10" } },
        ],
      }),
    );
    expect(compared.match.exact).toBe(true);
  });

  it("simulate: 정답에 없는 입력이면 S1을 주고 exact=false", async () => {
    const changed = input("S2");
    changed.income.monthlyNetIncome += 10_000;
    const { match } = await ok(mocks.simulate({ input: changed }));
    expect(match).toMatchObject({ caseKey: "S1", exact: false });
    expect(match.note).toContain("S1");
  });

  it("simulate: 필수 칸이 비면 서버처럼 COMMON400", async () => {
    const missing = input("S1") as SimulationInputDraft;
    delete missing.goal;
    const error = await fail(mocks.simulate({ input: missing as SimulationInput }));
    expect(error.code).toBe("COMMON400");
    expect(Object.keys(error.fieldErrors)).toEqual(["goal.targetAmount", "goal.targetDate"]);
  });

  it("preview: 정답 조정값이면 exact", async () => {
    const { data, match } = await ok(mocks.preview({ input: input("S1"), adjustments: { monthlyVariableExpense: 850_000 } }));
    expect(match.exact).toBe(true);
    expect(data.adjusted.probability).toBe(70.5);
    expect(data).not.toHaveProperty("adjustments");
  });

  it("preview: 다른 조정값이면 정답 미리보기 + exact=false, 빈 조정값은 COMMON400", async () => {
    const other = await ok(mocks.preview({ input: input("S1"), adjustments: { monthlySaving: 600_000 } }));
    expect(other.match.exact).toBe(false);
    const empty = await fail(mocks.preview({ input: input("S1"), adjustments: {} }));
    expect(empty.fieldErrors).toHaveProperty(["adjustments"]);
  });

  it("compare: 정답 계획 3개 (이름은 보낸 대로)", async () => {
    const { data, match } = await ok(
      mocks.compare({
        input: input("S1"),
        plans: [
          { name: "A", adjustments: { monthlyVariableExpense: 850_000 } },
          { name: "B", adjustments: { emergencyFirstAmount: 3_000_000 } },
          { name: "C", adjustments: { goalTargetDate: "2032-11" } },
        ],
      }),
    );
    expect(match.exact).toBe(true);
    expect(data.plans.map((p) => p.name)).toEqual(["지금 계획", "A", "B", "C"]);
  });

  it("compare: 계획이 0개 · 4개면 SIM4003", async () => {
    expect((await fail(mocks.compare({ input: input("S1"), plans: [] }))).code).toBe("SIM4003");
    const four = Array.from({ length: 4 }, (_, i) => ({ name: `${i}`, adjustments: { monthlySaving: i } }));
    expect((await fail(mocks.compare({ input: input("S1"), plans: four }))).code).toBe("SIM4003");
  });

  it("reverse: 목표 확률 70%일 때만 exact", async () => {
    expect((await ok(mocks.reverse({ input: input("S1") }))).match.exact).toBe(true);
    const at80 = await ok(mocks.reverse({ input: input("S1"), targetProbability: 80 }));
    expect(at80.match.exact).toBe(false);
    expect(at80.data.targetProbability).toBe(70);
  });

  it("robust: 시작 → 진행 중 → 3초 뒤 끝", async () => {
    const start = await ok(mocks.startRobust({ input: input("S1") }));
    expect(start.data.status).toBe("RUNNING");

    const running = mocks.robustJob(start.data.jobId);
    await vi.advanceTimersByTimeAsync(200);
    expect((await running).data).toMatchObject({ status: "RUNNING", probability: null });

    await vi.advanceTimersByTimeAsync(3_000);
    const done = await ok(mocks.robustJob(start.data.jobId));
    expect(done.data).toMatchObject({ status: "DONE", progress: 100, probability: { median: 66.4, low: 51.4, high: 83.4 } });

    expect((await fail(mocks.robustJob("nope"))).code).toBe("JOB404");
  });
});

describe("고정값 목업", () => {
  it("presets · examples · meta", async () => {
    expect((await ok(mocks.presets())).data.presets).toHaveLength(5);
    expect((await ok(mocks.examples())).data.examples.map((e) => e.key)).toEqual(["S1", "S2", "S3"]);
    const meta = (await ok(mocks.meta())).data;
    expect(meta.paths).toBe(2000);
    expect(meta.parameters).toHaveLength(11);
  });

  it("대출 상환액은 목업이 없다", async () => {
    const error = await fail(
      mocks.repaymentPreview({ loanType: "STUDENT", principal: 12_000_000, annualRate: 1.9, remainingMonths: 96 }),
    );
    expect(error.code).toBe("MOCK_UNAVAILABLE");
  });
});
