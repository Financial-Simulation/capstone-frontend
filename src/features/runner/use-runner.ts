"use client";

/**
 * 캐릭터 상태 한곳: 지금 입력으로 정한 코인 · 저절로 입는 장비 · 레이스 거리와 그 거리로 정해지는 코스 · 캐릭터 모습.
 * 장비도 코스도 사용자가 고르지 않는다. 저축 · 지출을 고치는 대로 코인이 바뀌어 그 안의 가장 좋은 장비(bestSet)를 바로 입고,
 * 목표 시점(레이스 거리)이 바뀌면 코스(routeFor)가 바뀐다.
 * 모습(look)은 입력한 나이(person.age)의 나이대와 01-1에서 고른 캐릭터 성별(simRunner.v1, 계산에는 쓰지 않음)로 정한다.
 * 입력은 저장한 입력(simInput.v1)이 기본이다. 결과 화면 레이스는 보여 주는 결과의 입력(예시 결과 · 계획 바꿔 보기를 덮어쓴 값)을 넘긴다.
 */
import { useCallback, useMemo } from "react";
import { useRunnerPrefs, useSimInput } from "@/lib/hooks";
import type { RunnerGender } from "@/lib/storage";
import type { SimulationInputDraft } from "@/lib/types";
import { raceOfGoal, routeFor } from "./course";
import { bestSet, runnerCoins } from "./gear";
import { lookOf } from "./look";

/** @param displayed 저장한 입력 대신 쓸 입력 (결과 화면 레이스: gear.ts runnerInputOf). 없으면 저장한 입력 */
export function useRunner(displayed?: SimulationInputDraft) {
  const { input: saved } = useSimInput();
  const input = displayed ?? saved;
  const { prefs, setPrefs } = useRunnerPrefs();

  const coins = runnerCoins(input);
  const budget = coins?.total ?? 0;
  // 코인이 그대로면 같은 객체 (다시 그릴 때마다 새 장비 객체를 만들지 않게)
  const worn = useMemo(() => bestSet(budget), [budget]);
  const race = raceOfGoal(input?.startMonth, input?.goal?.targetDate);
  const age = input?.person?.age;
  const look = useMemo(() => lookOf(prefs.gender, age), [prefs.gender, age]);
  const setGender = useCallback((gender: RunnerGender) => setPrefs({ ...prefs, gender }), [prefs, setPrefs]);

  return {
    /** 지금 입력 (말풍선이 '입력이 멈춘 뒤'를 알아채는 데 쓴다) */
    input,
    coins,
    budget,
    /** 코인 안에서 저절로 입는 장비 */
    worn,
    /** 목표 시점으로 정한 레이스 거리 (목표가 아직 없으면 null) */
    race,
    /** 거리로 정해지는 코스 (거리를 모르면 풀코스) */
    route: routeFor(race),
    /** 캐릭터 모습 (성별 · 나이대) */
    look,
    /** 고른 캐릭터 성별 (아직 안 골랐으면 null, 그림은 남성) */
    gender: prefs.gender,
    setGender,
  };
}

export type RunnerState = ReturnType<typeof useRunner>;
