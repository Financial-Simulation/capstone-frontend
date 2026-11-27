/**
 * 캐릭터 모습: 성별(simRunner.v1)과 입력한 나이(person.age)로 정한다. 계산에는 쓰지 않는다.
 *  - 나이대: 19~24세 20대 초반(young) · 25~29세 20대 후반(adult) · 30~39세 30대(mature).
 *    나이대마다 머리 모양 · 눈 크기가 다르다 (RunnerHead).
 *  - 성별을 아직 고르지 않았으면 남성 모습, 나이를 아직 모르면 20대 후반으로 그린다.
 */
import type { RunnerGender } from "@/lib/storage";

export type AgeBand = "young" | "adult" | "mature";

export interface Look {
  gender: RunnerGender;
  band: AgeBand;
}

export const DEFAULT_LOOK: Look = { gender: "M", band: "adult" };

export function ageBand(age: number | null | undefined): AgeBand {
  if (age == null || !Number.isFinite(age)) return "adult";
  if (age <= 24) return "young";
  if (age <= 29) return "adult";
  return "mature";
}

export function lookOf(gender: RunnerGender | null | undefined, age: number | null | undefined): Look {
  return { gender: gender ?? DEFAULT_LOOK.gender, band: ageBand(age) };
}

/** 결혼 장면의 짝: 성별만 반대, 나이대는 같게 */
export function partnerOf(look: Look): Look {
  return { gender: look.gender === "M" ? "F" : "M", band: look.band };
}

