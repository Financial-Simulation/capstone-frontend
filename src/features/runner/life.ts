/**
 * 인생 장면 ('인생은 마라톤' 미래 다시 보기). 예정된 일 가운데 결혼 · 독립 · 전세 이사 · 이직 · 자동차는
 * 그달에 레이스 대신 그 일의 '실제 모습'을 보여 준다 (LifeScene.tsx).
 *  - 결혼: 신랑 · 신부가 꽃잎 날리는 버진로드를 함께 걸어 꽃 아치 앞에 선다
 *  - 독립: 배낭을 메고 여행 가방을 끌며 부모님 집을 나선다 (창문에서 손 흔드는 가족)
 *  - 전세 이사: 이삿짐을 실은 트럭과 나란히 상자를 들고 간다
 *  - 이직: 정장에 서류 가방을 들고 '환영합니다' 현수막이 걸린 새 회사 앞에 닿는다
 *  - 자동차: 리본을 단 새 차를 몰고 강변을 달린다
 * 돈 숫자는 입력 값 그대로 (race.ts plannedMarkers의 설명을 잇는다). 여기서는 고르기만 한다.
 */
import { plannedEventName } from "@/features/input/events";
import type { PresetKey, SimulationInputDraft, StoryMonth, YearMonth } from "@/lib/types";
import { isYearMonth, monthsBetween } from "@/lib/year-month";
import { plannedMarkers } from "./race";

export type LifeKind = Exclude<PresetKey, "CUSTOM">;

/** 장면 한 줄 (말풍선 첫 줄) */
export const LIFE_LINES: Record<LifeKind, string> = {
  WEDDING: "버진로드를 함께 걸어요",
  INDEPENDENCE: "부모님 집을 나서 독립해요",
  JEONSE_MOVE: "새 전셋집으로 이사 가요",
  JOB_CHANGE: "새 회사로 첫 출근해요",
  CAR: "새 차를 몰고 달려요",
};

export interface LifeMoment {
  kind: LifeKind;
  month: YearMonth;
  /** 예정된 일 이름 (비었으면 프리셋 이름) */
  title: string;
  /** 그 일의 돈 ("한 번에 500만 원 · 매달 30만 원 더 나가요"). 돈 칸이 모두 비었으면 "" */
  detail: string;
}

function isLifeKind(key: PresetKey | null | undefined): key is LifeKind {
  return key != null && key !== "CUSTOM";
}

/**
 * 입력의 예정된 일 → 달마다 인생 장면. 시점이 없거나 기준 달 밖(0~119개월)이면 뺀다.
 * 한 달에 장면이 둘 이상이면 입력 순서로 먼저 넣은 일. 같은 프리셋의 일(자동차 = 차 값 + 유지비)은 설명을 이어 붙인다.
 */
export function lifeMoments(input: SimulationInputDraft | null | undefined, start: YearMonth | null): Map<YearMonth, LifeMoment> {
  const moments = new Map<YearMonth, LifeMoment>();
  if (!start) return moments;
  const markers = plannedMarkers(input, start);
  for (const event of input?.events ?? []) {
    const kind = event?.presetKey;
    if (!event || !isLifeKind(kind) || !isYearMonth(event.occurDate) || moments.has(event.occurDate)) continue;
    const months = monthsBetween(start, event.occurDate);
    if (months < 0 || months > 119) continue;
    const month = event.occurDate;
    const detail = markers
      .filter((m) => m.month === month && m.preset === kind)
      .map((m) => m.detail)
      .join(" · ");
    moments.set(month, { kind, month, title: plannedEventName(event), detail });
  }
  return moments;
}

/**
 * 이 달에 레이스 대신 보여 줄 인생 장면. 결승 달(목표 시점)은 완주 · 메달 장면이 먼저라 없음
 * (결승 달에 일이 있어도 미래 다시 보기가 완주 · 메달 없이 끝나지 않게)
 */
export function lifeSceneAt(
  moments: ReadonlyMap<YearMonth, LifeMoment>,
  month: Pick<StoryMonth, "month" | "afterMonths">,
  goalMonths: number,
): LifeMoment | null {
  if (month.afterMonths === goalMonths) return null;
  return moments.get(month.month) ?? null;
}
