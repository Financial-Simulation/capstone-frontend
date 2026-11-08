import { describe, expect, it } from "vitest";
import { goldenCaseByKey } from "@/mocks/golden";
import type { RobustJobResult } from "@/lib/types";
import { robustView } from "./robust";

const golden = (key: string) => goldenCaseByKey(key)!;
const done = (key: string): RobustJobResult => ({ jobId: "job-1", status: "DONE", progress: 100, ...golden(key).robust });

describe("띠 그림과 문장 (서버 값 그대로)", () => {
  it("S1: 51.4%~83.4%, 지금 58.0%", () => {
    expect(robustView(done("S1"), 58)).toEqual({
      low: 51.4,
      high: 83.4,
      current: 58,
      message: "가정을 60가지로 바꿔 다시 계산하면 대부분 51%~83% 사이예요. 정확한 한 숫자보다 이 범위를 봐 주세요.",
      detail: "60번의 가운데 값 66.4%, 95% 범위 51.4%~83.4%. 파란 띠가 이 범위예요.",
      label: "가능성 범위 51.4%~83.4%, 지금 결과 58.0%",
      markerAlign: "center",
    });
  });

  it("'지금' 글자가 막대 끝에서 잘리지 않게 (S3 96.6% · E4 1.3%)", () => {
    expect(robustView(done("S3"), 96.6)?.markerAlign).toBe("end");
    expect(robustView(done("E4"), 1.3)?.markerAlign).toBe("start");
  });

  it("아직 끝나지 않았으면 그리지 않는다", () => {
    expect(robustView({ ...done("S1"), status: "RUNNING", probability: null }, 58)).toBeNull();
  });
});
