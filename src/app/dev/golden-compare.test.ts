import { afterEach, describe, expect, it, vi } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import { compareWithGolden, firstDifference } from "./golden-compare";

describe("처음 다른 곳 찾기", () => {
  it("같으면 null, 응답에만 있는 칸은 보지 않는다", () => {
    expect(firstDifference({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2], warnings: [] })).toBeNull();
  });

  it("처음 다른 곳의 경로와 두 값", () => {
    expect(firstDifference({ plans: [{ p: 58 }, { p: 70.5 }] }, { plans: [{ p: 58 }, { p: 70.4 }] })).toEqual({
      path: "plans[1].p",
      expected: 70.5,
      actual: 70.4,
    });
  });

  it("배열 길이 · 빠진 칸 · 모양이 다른 값", () => {
    expect(firstDifference({ a: [1, 2] }, { a: [1] })).toEqual({ path: "a.length", expected: 2, actual: 1 });
    expect(firstDifference({ a: null }, {})).toEqual({ path: "a", expected: null, actual: undefined });
    expect(firstDifference({ a: { b: 1 } }, { a: null })).toEqual({ path: "a", expected: "객체", actual: null });
  });
});

describe("정답 파일 대조 (백엔드 자리에 가짜 응답)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const respond = (result: unknown) =>
    vi.fn(
      async () =>
        new Response(JSON.stringify({ isSuccess: true, code: "COMMON200", message: "", result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
  const signal = () => new AbortController().signal;

  it("정답과 같은 응답이면 같음, 숫자 하나라도 다르면 다름 + 경로", async () => {
    const s1 = goldenCaseByKey("S1")!;
    vi.stubGlobal("fetch", respond({ ...s1.simulate, warnings: [] }));
    expect(await compareWithGolden(s1, "simulate", signal())).toMatchObject({ status: "same" });

    const changed = structuredClone(s1.simulate);
    changed.goal.probability = 57.9;
    vi.stubGlobal("fetch", respond(changed));
    expect(await compareWithGolden(s1, "simulate", signal())).toMatchObject({
      status: "different",
      difference: { path: "goal.probability", expected: 58, actual: 57.9 },
    });
  });

  it("정답 파일의 요청을 그대로 보낸다 (미리보기 조정값 · 비교 계획)", async () => {
    const t1 = goldenCaseByKey("T1")!;
    const previewMock = respond(t1.preview);
    vi.stubGlobal("fetch", previewMock);
    expect(await compareWithGolden(t1, "preview", signal())).toMatchObject({ status: "same" });
    const previewBody = JSON.parse((previewMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(previewBody.adjustments).toEqual({ monthlyVariableExpense: 850_000 });

    // 백엔드(GitHub main)의 비교 줄에는 보낸 조정값(adjustments)이 없다 → 정답 파일의 그 칸은 보지 않는다
    const compareMock = respond({ ...t1.compare, plans: t1.compare.plans.map((plan) => ({ ...plan, adjustments: undefined })) });
    vi.stubGlobal("fetch", compareMock);
    expect(await compareWithGolden(t1, "compare", signal())).toMatchObject({ status: "same" });
    const compareBody = JSON.parse((compareMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(compareBody.plans.map((p: { name: string }) => p.name)).toEqual([
      "변동지출 10만 원 줄이기",
      "목표 1년 늦추기",
      "청년미래·일반 적금만",
    ]);
  });

  it("백엔드가 꺼져 있으면 오류", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    expect(await compareWithGolden(goldenCaseByKey("S1")!, "reverse", signal())).toMatchObject({
      status: "error",
      message: expect.stringContaining("BACKEND_UNAVAILABLE"),
    });
  });
});
