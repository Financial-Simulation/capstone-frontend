import { describe, expect, it } from "vitest";
import { DEFAULT_MODE, ENDPOINTS, currentModes, formatModeSpec, parseModeSpec, resolveMode } from "./mode";

describe("목업 스위치", () => {
  it("기본값: 백엔드에 있는 4개만 real", () => {
    const real = ENDPOINTS.filter((e) => DEFAULT_MODE[e] === "real");
    expect(real).toEqual(["validate", "repaymentPreview", "presets", "examples"]);
  });

  it("all-mock · all-real", () => {
    expect(Object.values(parseModeSpec("all-mock"))).toEqual(ENDPOINTS.map(() => "mock"));
    expect(Object.values(parseModeSpec("all-real"))).toEqual(ENDPOINTS.map(() => "real"));
  });

  it("뒤에 쓴 것이 이긴다", () => {
    const map = parseModeSpec("all-mock,simulate=real");
    expect(map.simulate).toBe("real");
    expect(map.validate).toBe("mock");
  });

  it("모르는 이름·값은 무시", () => {
    expect(parseModeSpec(" simulate = real , preview=mock, bogus=real, meta=maybe,")).toEqual({
      simulate: "real",
      preview: "mock",
    });
    expect(parseModeSpec(null)).toEqual({});
    expect(parseModeSpec("")).toEqual({});
  });

  it("글자로 되돌리기 (엔드포인트 순서)", () => {
    expect(formatModeSpec({ simulate: "real", validate: "mock" })).toBe("validate=mock,simulate=real");
    expect(parseModeSpec(formatModeSpec({ robust: "real", meta: "real" }))).toEqual({ robust: "real", meta: "real" });
    expect(formatModeSpec({})).toBe("");
  });

  it("브라우저에서 바꾼 값이 기본값보다 먼저", () => {
    expect(resolveMode("simulate", {})).toBe("mock");
    expect(resolveMode("simulate", { simulate: "real" })).toBe("real");
    expect(resolveMode("validate", { simulate: "real" })).toBe("real");
    expect(currentModes({})).toEqual(DEFAULT_MODE);
  });
});
