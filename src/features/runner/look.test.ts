import { describe, expect, it } from "vitest";
import { ageBand, lookOf, partnerOf } from "./look";

describe("캐릭터 모습", () => {
  it("나이대: 24세까지 20대 초반, 29세까지 20대 후반, 30세부터 30대", () => {
    expect([19, 24, 25, 29, 30, 39].map(ageBand)).toEqual(["young", "young", "adult", "adult", "mature", "mature"]);
  });

  it("성별을 안 골랐으면 남성, 나이를 모르면 20대 후반", () => {
    expect(lookOf(null, undefined)).toEqual({ gender: "M", band: "adult" });
    expect(lookOf("F", 33)).toEqual({ gender: "F", band: "mature" });
  });

  it("결혼 장면의 짝은 성별만 반대", () => {
    expect(partnerOf({ gender: "M", band: "young" })).toEqual({ gender: "F", band: "young" });
    expect(partnerOf({ gender: "F", band: "mature" })).toEqual({ gender: "M", band: "mature" });
  });
});
