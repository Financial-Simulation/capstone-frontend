/**
 * 그림 색 한곳 ('인생은 마라톤'). 캐릭터 · 꼬마 관중 · 하객 · 소품 · 배경이 같은 색을 써서 한 그림체로 보이게 한다.
 *  - 캐릭터(마스코트, viewBox 200 × 250): 진한 갈색 윤곽(OL) · 윤곽 두께(LW), 피부 · 눈 · 볼 · 입
 *  - 배경과 소품(길가 칸 240 × 40 기준): 조금 연한 갈색 테두리(OUT) · 두께(NW). 캐릭터 윤곽보다 연해서 캐릭터가 앞으로 나와 보인다
 */

/** 캐릭터 윤곽 색 · 두께 (두께의 두 배로 윤곽을 칠한 뒤 색을 얹어 바깥에 LW만큼 남는다) */
export const OL = "#4a3533";
export const LW = 3;

/** 피부 · 그늘 · 손과 귀 안쪽 선 */
export const SKIN = "#ffe1cf";
export const SKIN_SHADE = "#f7c7ae";
export const SKIN_LINE = "#e3a08a";

/** 얼굴: 눈 · 홍채 · 볼터치 · 입 · 입선 · 혀 */
export const INK = "#3b2a2c";
export const IRIS = "#7b4c3a";
export const BLUSH = "#ff94a6";
export const MOUTH = "#e85d6f";
export const MOUTH_LINE = "#8f3a42";
export const TONGUE = "#ffa3a3";

/** 배경 · 소품 테두리 색과 두께 */
export const OUT = "#5a4744";
export const NW = 1.6;
