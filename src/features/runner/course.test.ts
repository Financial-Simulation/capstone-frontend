import { describe, expect, it } from "vitest";
import {
  RACES,
  ROUTES,
  bibOf,
  distanceKm,
  finishScene,
  formatKm,
  raceForMonths,
  raceOfGoal,
  raceText,
  routeFor,
  sceneAt,
  startScene,
  targetDateFor,
} from "./course";

describe("레이스 거리", () => {
  it("3년 10km · 5년 하프 · 10년 풀코스", () => {
    expect(raceForMonths(36)).toMatchObject({ label: "10km", km: 10 });
    expect(raceForMonths(60)).toMatchObject({ label: "하프", km: 21.0975 });
    expect(raceForMonths(120)).toMatchObject({ label: "풀코스", km: 42.195 });
  });

  it("다른 기간은 맞춤 코스 (세 거리 사이를 곧게 잇는다)", () => {
    const oneYear = raceForMonths(12);
    expect(oneYear.race).toBeNull();
    expect(oneYear.label).toBe("맞춤 코스");
    expect(oneYear.km).toBeCloseTo(10 / 3);
    expect(distanceKm(48)).toBeCloseTo(10 + (21.0975 - 10) / 2);
    expect(distanceKm(90)).toBeCloseTo((21.0975 + 42.195) / 2);
    expect(distanceKm(200)).toBe(42.195);
  });

  it("거리 글자", () => {
    expect(formatKm(10)).toBe("10km");
    expect(formatKm(21.0975)).toBe("21.1km");
    expect(formatKm(42.195)).toBe("42.195km");
    expect(formatKm(10 / 3)).toBe("3.3km");
  });

  it("목표 시점으로 고른 거리", () => {
    expect(raceOfGoal("2026-11", "2031-11")?.label).toBe("하프");
    expect(raceOfGoal("2026-11", "2029-11")?.label).toBe("10km");
    expect(raceOfGoal(null, "2031-11")).toBeNull();
    expect(raceOfGoal("2026-11", "2026-11")).toBeNull();
  });

  it("화면 글자와 싱글렛 번호", () => {
    expect(raceText(raceForMonths(36))).toBe("10km");
    expect(raceText(raceForMonths(60))).toBe("하프 21.1km");
    expect(raceText(raceForMonths(12))).toBe("맞춤 코스 약 3.3km");
    expect([36, 60, 120].map((m) => bibOf(raceForMonths(m)))).toEqual(["10", "21", "42"]);
    expect(bibOf(null)).toBe("42");
  });

  it("거리 카드를 누르면 기준 달 + 기간", () => {
    expect(RACES.map((race) => targetDateFor("2026-11", race))).toEqual(["2029-11", "2031-11", "2036-11"]);
  });
});

describe("거리로 정해지는 코스", () => {
  it("10km는 JTBC 10km(상암 → 여의도), 하프는 서울마라톤 앞 절반, 풀코스는 서울마라톤(광화문 → 잠실)", () => {
    expect(routeFor(raceForMonths(36))).toBe(ROUTES["10K"]);
    expect(startScene(ROUTES["10K"]).name).toBe("상암 월드컵공원");
    expect(finishScene(ROUTES["10K"]).name).toBe("여의도");
    expect(routeFor(raceForMonths(60)).title).toBe("광화문 → 흥인지문");
    expect(routeFor(raceForMonths(120)).event).toBe("서울마라톤");
    expect(finishScene(ROUTES.FULL).name).toBe("잠실종합운동장");
  });

  it("맞춤 거리는 그 거리가 들어가는 코스, 거리를 모르면 풀코스", () => {
    expect(routeFor(raceForMonths(12)).race).toBe("10K");
    expect(routeFor(raceForMonths(48)).race).toBe("HALF");
    expect(routeFor(raceForMonths(90)).race).toBe("FULL");
    expect(routeFor(null).race).toBe("FULL");
  });

  it("달린 비율에 맞는 장면 (구간이 시작하는 자리부터)", () => {
    const full = ROUTES.FULL;
    expect(sceneAt(full, 0).key).toBe("gwanghwamun");
    expect(sceneAt(full, 0.12).key).toBe("cheonggye");
    expect(sceneAt(full, 0.49).key).toBe("dongdaemun");
    expect(sceneAt(full, 0.5).key).toBe("hangang");
    expect(sceneAt(full, 1).key).toBe("jamsil");
  });

  it("구간은 0에서 시작해 차례로 늘어난다", () => {
    for (const route of Object.values(ROUTES)) {
      expect(route.sections[0].from).toBe(0);
      route.sections.slice(1).forEach((section, i) => expect(section.from).toBeGreaterThan(route.sections[i].from));
    }
  });
});
