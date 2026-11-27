/**
 * 코스 배경 그림 (캐릭터와 같은 말랑한 그림체). 먼 풍경(400 × 100) · 길가(240 × 40) · 길(200 × 34) 세 겹을 옆으로 이어 붙여,
 * 달리면 서로 다른 빠르기로 왼쪽으로 흐르게 한다 (scene.css rn-strip · rn-near · rn-road). 하늘에는 해와 몽실한 구름.
 *  - 먼 풍경: 테두리 없는 파스텔 실루엣 (서울 마라톤 코스의 랜드마크를 장난감처럼 둥글게: 상암 월드컵경기장 · 하늘공원 바람개비,
 *    한강 아치 다리 · 여의도 금빛 빌딩과 벚꽃 · 광화문과 북악산 · 청계천 돌다리와 버드나무 · 흥인지문과 성곽 · 잠실 타워와 경기장)
 *  - 길가: 테두리를 두른 나무 · 덤불 · 난간과 응원하는 꼬마 관중 (ArtKit)
 * 한 칸 안에서만 그려서 이어 붙여도 끊기지 않는다. 주인공 랜드마크는 칸 가운데쯤(x 170~290)에 두어 좁은 패널에서도 보이게 했다.
 * 그림은 꾸밈이라 aria-hidden.
 */
import type { ReactNode } from "react";
import { farBlock, farGround, farHill, farTree, nBush, nFan, nFlowers, nLamp, nRail, nTree } from "./ArtKit";
import type { NearKind, SceneDef, SceneKey } from "./course";
import { NW, OUT } from "./palette";

/** 먼 풍경 한 칸 (viewBox 0 0 400 100, 아래쪽 100이 땅과 맞닿는다) */
export function FarTile({ scene, className = "h-full w-auto" }: { scene: SceneDef; className?: string }) {
  return (
    <svg viewBox="0 0 400 100" aria-hidden overflow="visible" className={`shrink-0 ${className}`} preserveAspectRatio="xMidYMax meet">
      {FAR[scene.key]}
      {farGround(scene.ground)}
    </svg>
  );
}

/** 길 한 칸 (viewBox 0 0 200 34): 풀 · 둥근 보도 턱 · 아스팔트 · 차선 · 마라톤 파란 선 */
export function RoadTile({ scene, className = "h-full w-auto" }: { scene: SceneDef; className?: string }) {
  return (
    <svg viewBox="0 0 200 34" aria-hidden overflow="visible" className={`shrink-0 ${className}`} preserveAspectRatio="xMidYMax meet">
      {/* 이어 붙인 칸 사이에 실금이 보이지 않게 양옆으로 1만큼 넘쳐 그린다 */}
      <rect x="-1" width="202" height="34" fill={scene.ground} />
      <rect x="-1" y="3.4" width="202" height="6" fill="#eef1f5" />
      <path d="M24 3.4v6M74 3.4v6M124 3.4v6M174 3.4v6" stroke="#d3dae3" strokeWidth="1.4" />
      <path d="M-1 3.4h202M-1 9.4h202" stroke={OUT} strokeWidth="1.2" opacity="0.5" />
      <rect x="-1" y="9.4" width="202" height="25" fill={scene.road} />
      <path d="M-1 10.6h202" stroke="#000" strokeWidth="1.2" opacity="0.06" />
      {[10, 60, 110, 160].map((x) => (
        <rect key={x} x={x} y="18.6" width="28" height="3" rx="1.5" fill="#ffffff" opacity="0.95" />
      ))}
      <path d="M-1 28.8h202" stroke="#4f9cff" strokeWidth="2.8" />
      <path d="M-1 27.8h202" stroke="#a9cdff" strokeWidth="0.8" />
      <path d="M36 14.4h2M96 25h2.4M150 13.6h2M182 24.6h2" stroke="#ffffff" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
}

/** 길가 한 칸 (viewBox 0 0 240 40, 아래쪽이 길과 맞닿는다) */
export function NearTile({ scene, className = "h-full w-auto" }: { scene: SceneDef; className?: string }) {
  return (
    <svg viewBox="0 0 240 40" aria-hidden overflow="visible" className={`shrink-0 ${className}`} preserveAspectRatio="xMidYMax meet">
      {NEAR[scene.near]}
    </svg>
  );
}

/** 하늘의 몽실한 구름 하나 */
export function Cloud({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 66 30" aria-hidden className={className}>
      <path
        d="M11 27 H55 C61 27 64 22 62 16.6 C60.6 12 55.6 10.6 52 12 C51 5.6 45 2 39 3 C34 3.8 31 7 30 10 C27 7.2 21 7.2 18 10.4 C15.4 13 15 16 16 18 C11.6 17 7.6 19.6 7.6 23 C7.6 25.4 9 27 11 27 Z"
        fill="#ffffff"
        stroke="#c6d8ef"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 24.4 H54" stroke="#e4eefa" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M36 7.4 C39 6 43 6.6 45 9" stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ===== 먼 풍경 부품 =====

/** 하늘공원 바람개비 발전기: 기둥 위 날개가 돈다 */
const TURBINE = (x: number, top: number) => (
  <g key={`tb${x}`}>
    <path d={`M${x} ${top + 26} V${top}`} stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    <g className="rn-turbine" style={{ transformOrigin: `${x}px ${top}px` }}>
      <path d={`M${x} ${top} L${x} ${top - 12} M${x} ${top} L${x + 10.4} ${top + 6} M${x} ${top} L${x - 10.4} ${top + 6}`} stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    </g>
    <circle cx={x} cy={top} r="2" fill="#e3ebf6" />
  </g>
);

/** 전통 성문 (광화문 · 흥인지문): 가운데 cx, 돌 기단 + 붉은 누각 + 끝이 올라간 두 겹 지붕 */
const GATE = (cx: number, opts: { arches: 1 | 3; stone: string; ong?: boolean }) => (
  <g key={`gate${cx}`}>
    {/* 돌 기단과 홍예문 */}
    <rect x={cx - 48} y="68" width="96" height="30" rx="4" fill={opts.stone} />
    <path d={`M${cx - 48} 76h96M${cx - 48} 84h96M${cx - 48} 91h96`} stroke="#000" strokeWidth="0.7" opacity="0.06" />
    {opts.arches === 3 ? (
      <path d={`M${cx - 34} 98v-10a8 8 0 0 1 16 0v10zM${cx - 10} 98v-12a10 10 0 0 1 20 0v12zM${cx + 18} 98v-10a8 8 0 0 1 16 0v10z`} fill="#7a6252" />
    ) : (
      <path d={`M${cx - 11} 98v-13a11 11 0 0 1 22 0v13z`} fill="#7a6252" />
    )}
    {/* 아래 지붕 */}
    <path d={`M${cx - 62} 70 C${cx - 50} 62 ${cx + 50} 62 ${cx + 62} 70 C${cx + 58} 66 ${cx + 56} 62 ${cx + 52} 60 H${cx - 52} C${cx - 56} 62 ${cx - 58} 66 ${cx - 62} 70 Z`} fill="#5f6a80" />
    {/* 누각 */}
    <rect x={cx - 34} y="46" width="68" height="15" fill="#d9574a" />
    <rect x={cx - 34} y="46" width="68" height="3.4" fill="#73b49e" />
    <path d={`M${cx - 26} 51h6v9h-6zM${cx - 9} 51h6v9h-6zM${cx + 3} 51h6v9h-6zM${cx + 20} 51h6v9h-6z`} fill="#f4dfae" />
    {/* 위 지붕 */}
    <path d={`M${cx - 50} 48 C${cx - 40} 40 ${cx + 40} 40 ${cx + 50} 48 C${cx + 46} 44 ${cx + 44} 40 ${cx + 40} 38 H${cx - 40} C${cx - 44} 40 ${cx - 46} 44 ${cx - 50} 48 Z`} fill="#5f6a80" />
    <path d={`M${cx - 34} 38 C${cx - 20} 30 ${cx + 20} 30 ${cx + 34} 38 Z`} fill="#4f5a70" />
    <path d={`M${cx - 30} 33.4 H${cx + 30}`} stroke="#3f4860" strokeWidth="2" strokeLinecap="round" />
    {/* 흥인지문 옹성: 문 앞을 반달처럼 감싼 성벽 */}
    {opts.ong && (
      <>
        <path d={`M${cx - 66} 100 C${cx - 64} 78 ${cx + 64} 78 ${cx + 66} 100 Z`} fill="#e9dcc2" />
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          const x = cx - 60 + t * 120;
          const y = 100 - 20 * Math.sin(Math.PI * (0.08 + t * 0.84));
          return <rect key={i} x={x - 3.6} y={y - 4} width="7.2" height="5" rx="1.4" fill="#e1d2b4" />;
        })}
      </>
    )}
  </g>
);

/** 버드나무: 늘어진 가지 */
const WILLOW = (x: number) => (
  <g key={`willow${x}`}>
    <path d={`M${x} 98 V70`} stroke="#9b7b5e" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx={x} cy="62" rx="20" ry="12" fill="#a9d98f" />
    <path
      d={`M${x - 18} 64 C${x - 20} 74 ${x - 17} 84 ${x - 14} 90 M${x - 9} 66 C${x - 11} 78 ${x - 9} 86 ${x - 7} 92 M${x + 2} 66 C${x + 1} 78 ${x + 3} 86 ${x + 4} 92 M${x + 12} 65 C${x + 12} 76 ${x + 15} 84 ${x + 17} 89`}
      stroke="#93cf78"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

// ===== 먼 풍경 =====

const FAR: Record<SceneKey, ReactNode> = {
  // 상암: 하늘공원 언덕과 바람개비 발전기 · 월드컵경기장 (흰 지붕 돛)
  sangam: (
    <>
      {farHill(110, 240, 54, "#cbe9bb", "#e4f5d8")}
      {TURBINE(62, 40)}
      {TURBINE(104, 30)}
      {TURBINE(146, 40)}
      <g>
        <path d="M206 98 C208 72 236 61 290 61 C344 61 372 72 374 98 Z" fill="#eef3fa" />
        <path d="M216 82 C240 75 340 75 364 82" stroke="#cbd8ea" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M220 90 C246 86 334 86 360 90" stroke="#dde6f2" strokeWidth="4" fill="none" strokeLinecap="round" />
        {[226, 252, 278, 304, 330, 356].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 66 C${x + 4} ${44 - (i % 2) * 6} ${x + 14} ${40 - (i % 2) * 6} ${x + 20} ${50 - (i % 2) * 4}`} stroke="#ffffff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <path d={`M${x + 20} ${50 - (i % 2) * 4} l5 -1.4 l-3 3.6 z`} fill={["#ff8a8a", "#6fb0ff", "#ffd36b"][i % 3]} />
          </g>
        ))}
        <path d="M270 98 v-7 a6 6 0 0 1 12 0 v7z M300 98 v-7 a6 6 0 0 1 12 0 v7z" fill="#b8c7dc" />
      </g>
      {farTree(26, 1, "#94d47f")}
      {farTree(196, 1.1, "#86cc74")}
      {farTree(390, 0.95, "#9ad884")}
    </>
  ),
  // 한강: 먼 도시 · 강물 · 파란 아치 다리 · 유람선
  hangang: (
    <>
      {[0, 46, 80, 132, 170, 214, 262, 300, 350].map((x, i) => (
        <rect key={x} x={x} y={52 - (i % 3) * 7} width={[34, 26, 40, 30, 36, 32, 28, 38, 44][i]} height="30" rx="3" fill="#dfe6f5" />
      ))}
      {farHill(60, 150, 16, "#cfe5d6")}
      {farHill(330, 180, 18, "#cfe5d6")}
      <rect x="-1" y="66" width="402" height="30" fill="#ade0fb" />
      <path d="M20 76h18M90 84h24M170 74h14M236 88h22M320 78h18M372 86h16" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      {[0, 200].map((x0) => (
        <g key={x0}>
          <rect x={x0 + 96} y="60" width="8" height="26" rx="2" fill="#c7d3e3" />
          <path d={`M${x0 + 8} 57 C${x0 + 44} 20 ${x0 + 156} 20 ${x0 + 192} 57`} stroke="#6aa8ec" strokeWidth="5" fill="none" strokeLinecap="round" />
          {[40, 70, 100, 130, 160].map((dx) => (
            <path key={dx} d={`M${x0 + dx} ${dx === 100 ? 30 : dx === 70 || dx === 130 ? 33 : 41} V57`} stroke="#9cc6f2" strokeWidth="1.6" />
          ))}
        </g>
      ))}
      <rect x="-1" y="55" width="402" height="7" rx="2" fill="#7fb4ee" />
      <path d="M-1 55.6h402" stroke="#bcd9fb" strokeWidth="1.4" />
      <g>
        <path d="M280 86 H330 L324 93 H286 Z" fill="#ffffff" />
        <rect x="292" y="79" width="26" height="7" rx="2.4" fill="#ffd36b" />
        <path d="M296 82h3M302 82h3M308 82h3" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </>
  ),
  // 여의도: 금빛 빌딩 · 둥근 지붕 건물 · 벚나무
  yeouido: (
    <>
      {farHill(300, 280, 26, "#d6eccf")}
      {farBlock(126, 26, 48, "#d7e5f7")}
      {farBlock(158, 22, 36, "#ece0f6")}
      {farBlock(288, 30, 56, "#d6e8f8")}
      {farBlock(324, 24, 40, "#f4dfe8")}
      <g>
        <path d="M226 98 L230 22 C234 15 250 15 254 22 L258 98 Z" fill="#f3c862" />
        {[30, 40, 50, 60, 70, 80, 90].map((y) => (
          <path key={y} d={`M${231 - (y - 22) * 0.05} ${y} H${253 + (y - 22) * 0.05}`} stroke="#ffe5a0" strokeWidth="2" />
        ))}
        <path d="M233 24 L236 96" stroke="#ffffff" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
      </g>
      <g>
        <rect x="40" y="74" width="66" height="24" rx="3" fill="#f3f0e8" />
        <path d="M48 76v20M58 76v20M68 76v20M78 76v20M88 76v20M98 76v20" stroke="#dcd6c8" strokeWidth="2" />
        <path d="M46 75 C50 54 96 54 100 75 Z" fill="#8fcaa9" />
        <path d="M58 62 C64 58 74 57 80 58" stroke="#c6ebd6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      {farTree(18, 1.1, "#f7bfd0")}
      {farTree(140, 1.2, "#f9c6d6")}
      {farTree(204, 1, "#f5b3c8")}
      {farTree(378, 1.15, "#f7bfd0")}
    </>
  ),
  // 광화문: 북악산 · 궁궐 담 · 광화문
  gwanghwamun: (
    <>
      <path d="M90 100 C120 56 152 30 204 24 C256 30 292 58 332 100 Z" fill="#bcd8c1" />
      <path d="M150 52 C170 36 190 30 206 28" stroke="#d6ead8" strokeWidth="3" fill="none" strokeLinecap="round" />
      {farHill(40, 120, 22, "#cbe2c9")}
      {farHill(380, 120, 24, "#cbe2c9")}
      <rect x="-1" y="80" width="160" height="18" fill="#efdcbf" />
      <rect x="-1" y="77" width="160" height="5" rx="2.5" fill="#6b7590" />
      <rect x="300" y="80" width="101" height="18" fill="#efdcbf" />
      <rect x="300" y="77" width="101" height="5" rx="2.5" fill="#6b7590" />
      {GATE(230, { arches: 3, stone: "#e6d8c2" })}
      {farTree(30, 1, "#7fb98e")}
      {farTree(120, 0.9, "#86c094")}
      {farTree(350, 1, "#7fb98e")}
    </>
  ),
  // 청계천: 도심 건물 · 버드나무 · 돌담 아래 물길과 징검다리 · 돌다리
  cheonggye: (
    <>
      {farBlock(0, 40, 50, "#e3e9f5", { rows: 4, cols: 3 })}
      {farBlock(44, 30, 38, "#f6e6d8", { rows: 2, cols: 2 })}
      {farBlock(150, 34, 56, "#dfeaf6", { rows: 4, cols: 3 })}
      {farBlock(188, 28, 42, "#efe3f4", { rows: 3, cols: 2 })}
      {farBlock(320, 36, 52, "#e2ecf5", { rows: 4, cols: 3 })}
      {farBlock(360, 40, 36, "#f7eadb", { rows: 2, cols: 3 })}
      {WILLOW(96)}
      {WILLOW(290)}
      <rect x="-1" y="76" width="402" height="7" fill="#ece0ca" />
      <path d="M20 79.4h14M60 79.4h14M100 79.4h14M140 79.4h14M180 79.4h14M220 79.4h14M260 79.4h14M300 79.4h14M340 79.4h14M380 79.4h14" stroke="#ddcfb5" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="-1" y="83" width="402" height="13" fill="#a2dbf8" />
      <path d="M14 88h12M70 91h16M150 87h10M228 91h14M330 88h12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {[40, 58, 76, 326, 344, 362].map((x) => (
        <ellipse key={x} cx={x} cy="90" rx="6" ry="2.6" fill="#dfe3e8" />
      ))}
      <path d="M164 92 C176 74 226 74 238 92 V96 H164 Z" fill="#e6decd" />
      <path d="M182 96 C186 86 216 86 220 96 Z" fill="#a2dbf8" />
    </>
  ),
  // 흥인지문: 낙산 · 한양도성 성곽 · 옹성을 두른 흥인지문
  dongdaemun: (
    <>
      {farHill(220, 320, 34, "#cfe5c6", "#e6f3dd")}
      <path d="M-1 76 H401 V98 H-1 Z" fill="#e6d8bd" />
      {Array.from({ length: 34 }, (_, i) => (
        <rect key={i} x={i * 12} y="71" width="7" height="6" rx="1.4" fill="#e6d8bd" />
      ))}
      <path d="M-1 84h402M-1 91h402" stroke="#000" strokeWidth="0.7" opacity="0.05" />
      {GATE(230, { arches: 1, stone: "#e8dac3", ong: true })}
      {farTree(40, 1, "#7fb98e")}
      {farTree(120, 0.9, "#8cc29a")}
      {farTree(360, 1, "#7fb98e")}
    </>
  ),
  // 잠실: 높은 타워 · 둥근 종합운동장
  jamsil: (
    <>
      {farHill(330, 220, 22, "#d4ebcd")}
      {farBlock(300, 26, 44, "#e3e9f4", { rows: 3, cols: 2 })}
      {farBlock(334, 22, 32, "#f3e3da", { rows: 2, cols: 2 })}
      <g>
        <path d="M251 98 L256 14 C258 2 268 2 270 14 L275 98 Z" fill="#cfdcec" />
        <path d="M262 4 V-6" stroke="#cfdcec" strokeWidth="2" strokeLinecap="round" />
        <path d="M257 26 L259 96" stroke="#ffffff" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
        {[30, 46, 62, 78].map((y) => (
          <path key={y} d={`M${256 - (y - 14) * 0.06} ${y} H${270 + (y - 14) * 0.06}`} stroke="#e3ecf7" strokeWidth="1.4" />
        ))}
      </g>
      <g>
        <path d="M50 98 C52 72 88 60 126 60 C164 60 200 72 202 98 Z" fill="#f2f5f9" />
        <path d="M58 70 C76 60 98 64 126 58 C154 64 176 60 194 70" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M60 84 C86 78 166 78 192 84" stroke="#d1dcea" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M110 98 v-8 a6 6 0 0 1 12 0 v8z M134 98 v-8 a6 6 0 0 1 12 0 v8z" fill="#bccadd" />
      </g>
      {farTree(24, 1, "#94d47f")}
      {farTree(226, 0.9, "#8ccf78")}
      {farTree(388, 1, "#94d47f")}
    </>
  ),
};

// ===== 길가 =====

const NEAR: Record<NearKind, ReactNode> = {
  // 공원: 덤불 · 꽃 · 나무 · 가로등 · 응원
  park: (
    <>
      {nBush(14, "#7cc46a")}
      {nFan(42, "#ffb84d", "#4a2c23", "flag", "#ff6b6b")}
      {nFlowers(70)}
      {nTree(100, 1, "#8fd07e")}
      {nFan(132, "#7cc4ff", "#3b2a24", "up")}
      {nLamp(166)}
      {nFan(198, "#c29bff", "#5c3b2f", "balloon", "#ff8fab")}
      {nBush(228, "#6fb85e", 0.9)}
    </>
  ),
  // 한강: 응원하는 사람들 앞 흰 난간 · 갈대
  river: (
    <>
      {nFan(56, "#5fd3a5", "#3b2a24", "up")}
      {nFan(152, "#ff9e6b", "#5c3b2f", "flag", "#4f9cff")}
      {nFan(206, "#ffd166", "#2b2230", "balloon", "#7cc4ff")}
      {nRail(-2, 242, 21, "#ffffff", 24)}
      <path d="M22 40 q2 -12 6 -16 M27 40 q1 -10 -2 -15 M110 40 q2 -12 6 -16 M115 40 q1 -10 -2 -15" stroke="#c8b07a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  // 여의도: 벚나무 · 꽃잎 · 가로등 · 응원
  blossom: (
    <>
      {nTree(24, 1.05, "#f9bdd0")}
      {nFan(62, "#a78bfa", "#3b2a24", "flag", "#4f9cff")}
      {nLamp(96)}
      {nTree(146, 1.15, "#f7b2c6")}
      {nFan(186, "#ff8fab", "#5c3b2f", "up")}
      {nTree(222, 0.9, "#fbcfdc")}
      <path d="M40 31l2.4 1.2M120 22l2.2 1.6M168 34l2.4 0.8M204 18l1.8 1.4" stroke="#f49ab4" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  // 광화문: 기와 얹은 낮은 담 · 석등 · 응원
  palace: (
    <>
      <rect x="-2" y="24" width="244" height="16" fill="#ecd7b3" stroke={OUT} strokeWidth={NW} />
      <rect x="-2" y="19" width="244" height="6.4" rx="3.2" fill="#6b7590" stroke={OUT} strokeWidth={NW} />
      <path d="M-2 32h244" stroke="#d9c098" strokeWidth="1" />
      <g>
        <rect x="56" y="13" width="12" height="4.4" rx="1.6" fill="#8b7d6b" stroke={OUT} strokeWidth="1.1" />
        <rect x="58" y="17" width="8" height="9" fill="#b3a592" stroke={OUT} strokeWidth="1.1" />
        <rect x="57" y="8.6" width="10" height="5" rx="2.4" fill="#6f6252" stroke={OUT} strokeWidth="1.1" />
        <rect x="60.4" y="19" width="3.2" height="3.2" rx="0.8" fill="#ffe58a" />
      </g>
      {nFan(118, "#ef5b5b", "#3b2a24", "up")}
      {nFan(140, "#4f9cff", "#5c3b2f", "flag", "#ffd166")}
      {nFan(198, "#3ccf91", "#2b2230", "balloon", "#ff8fab")}
    </>
  ),
  // 청계천: 돌난간 · 버드나무 가지 · 응원
  stream: (
    <>
      {nFan(96, "#ff9e6b", "#3b2a24", "up")}
      {nFan(148, "#818cf8", "#5c3b2f", "flag", "#ef5b5b")}
      {nRail(-2, 242, 22, "#e9e4d8", 24)}
      <path d="M52 0 q-4 14 1 26 M58 0 q-1 12 4 22 M64 2 q2 10 0 18 M186 0 q-4 12 1 22 M192 0 q0 12 4 18" stroke="#8fcf74" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  // 흥인지문: 한양도성 성벽(여장) · 소나무 · 응원
  fortress: (
    <>
      <path
        d="M-2 22h24v-5h10v5h24v-5h10v5h24v-5h10v5h24v-5h10v5h24v-5h10v5h24v-5h10v5h26V40H-2z"
        fill="#e2d5ba"
        stroke={OUT}
        strokeWidth={NW}
        strokeLinejoin="round"
      />
      <path d="M-2 31h244" stroke="#c9b993" strokeWidth="1" />
      <path d="M20 22v9M60 31v9M100 22v9M140 31v9M180 22v9M220 31v9" stroke="#c9b993" strokeWidth="1" />
      {nTree(76, 0.85, "#6fae7e")}
      {nFan(158, "#22b8e6", "#3b2a24", "up")}
      {nFan(178, "#ffd166", "#5c3b2f", "flag", "#4f9cff")}
    </>
  ),
  // 잠실: 결승 앞 응원단 · 펜스 · 현수막
  stadium: (
    <>
      {nFan(14, "#ef5b5b", "#3b2a24", "up")}
      {nFan(32, "#4f9cff", "#5c3b2f", "balloon", "#ffd166")}
      {nFan(54, "#3ccf91", "#2b2230", "clap")}
      {nFan(102, "#ffb84d", "#3b2a24", "flag", "#ef5b5b")}
      {nFan(120, "#a78bfa", "#5c3b2f", "up")}
      {nFan(178, "#ff8fab", "#2b2230", "balloon", "#7cc4ff")}
      {nFan(198, "#5fd3a5", "#3b2a24", "up")}
      <rect x="-2" y="26" width="244" height="14" fill="#ffffff" opacity="0.5" />
      {nRail(-2, 242, 25, "#d6dde7", 40)}
      <g>
        <rect x="132" y="24" width="38" height="11" rx="3" fill="#ffffff" stroke={OUT} strokeWidth="1.1" />
        <text x="151" y="32.6" textAnchor="middle" fontSize="7.4" fontWeight="900" fill="#ef5b5b" fontFamily="system-ui, sans-serif">
          화이팅!
        </text>
      </g>
    </>
  ),
};
