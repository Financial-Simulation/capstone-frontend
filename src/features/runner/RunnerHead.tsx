/**
 * 러너 머리 (말랑한 2등신 마스코트). 크고 동그란 얼굴 아래쪽에 반짝이는 눈 · 볼터치 · 작은 입이 모여 있다.
 *  - 성별 · 나이대(look.ts)마다 머리 모양이 다르다.
 *    남성: 20대 초반 몽실한 앞머리와 바보털 · 20대 후반 옆으로 넘긴 머리 · 30대 짧게 친 머리와 구레나룻
 *    여성: 20대 초반 높게 묶은 포니테일(달리면 흔들림) · 20대 후반 귀를 덮는 단발 · 30대 낮게 묶은 머리와 귀걸이
 *  - 표정 네 가지(평소 · 빠르게 · 힘들 때 · 기쁠 때)는 runner.css가 자세마다 골라 보이고, 평소 눈은 가끔 깜빡인다.
 *  - 러너스 하이(high)면 머리카락을 지우고 머리 위 · 뒤에서 불꽃이 바로 솟는다 (RunnerFire). 헤어밴드 · 선글라스 · 묶은 머리는 감추고 귀는 보인다.
 *  - 장비: 헤어밴드(러너 · 프로, 프로는 꼬리) · 선글라스(스포츠 · 미러 고글)는 눈을 가리지 않게 머리 위에 걸친다.
 *    결혼 장면의 신부는 꽃 화관 (면사포는 몸 뒤라 Runner가 그린다).
 * 좌표는 Runner와 같은 viewBox(200 × 250). 얼굴 가운데 (104, 76), 목(머리를 돌리는 중심)은 (104, 128).
 */
import type { ReactNode } from "react";
import type { GearSet } from "./gear";
import type { Look } from "./look";
import { BLUSH, INK, IRIS, LW, MOUTH, MOUTH_LINE, OL, SKIN, SKIN_LINE, SKIN_SHADE, TONGUE } from "./palette";
import { FireHair } from "./RunnerFire";
import type { RunnerIds } from "./RunnerParts";

/** 머리카락: 바탕 · 눈썹 · 결 빛 (러너스 하이 때 눈썹은 runner.css가 진한 빨강으로 바꾼다) */
const HAIR = { base: "#5c3b2f", shade: "#432a21", hi: "#8e5d47" };

/** 선글라스 렌즈 칠하기에 쓰는 SVG id (Runner의 defs) */
type ShadeIds = Pick<RunnerIds, "lens" | "mirror">;
/** 머리에 쓰는 SVG id: 선글라스 렌즈 · 불꽃 머리 색 (Runner가 정한다) */
type HeadIds = ShadeIds & Pick<RunnerIds, "fire">;

/** 얼굴: 큰 타원 (x 44~164, y 21~131) */
const FACE = { cx: 104, cy: 76, rx: 60, ry: 55 };

interface HairStyle {
  /** 머리 뒤로 넘어가는 부분 (포니테일 · 쪽 찐 머리: 얼굴보다 뒤) */
  back?: ReactNode;
  /** 얼굴 위에 얹는 머리 덩어리 (앞머리 포함) */
  cap: string;
  /** 바보털 · 옆머리처럼 덧붙이는 덩어리 */
  extra?: string[];
  /** 머리 결 빛 */
  shine: string[];
  /** 귀가 보이는지 (단발은 가린다) */
  ear: boolean;
}

function hairStyle(look: Look): HairStyle {
  if (look.gender === "M") {
    if (look.band === "young") {
      // 몽실한 앞머리 (끝이 세 갈래로 뭉쳐 있음) + 정수리 바보털
      return {
        cap: "M47 106 C32 76 40 34 77 19 C107 7 150 12 164 40 C169 50 170 58 167 66 C163 61 158 59 154 62 C151 56 145 54 140 58 C136 52 128 51 123 56 C118 52 110 54 106 61 C101 68 96 78 92 92 C86 88 80 86 74 88 C64 92 55 99 47 106 Z",
        extra: ["M110 20 C104 8 111 -1 123 0 C116 3 113 10 115 19 Z"],
        shine: ["M68 36 C80 24 96 18 114 18", "M147 26 C153 30 157 35 159 40"],
        ear: true,
      };
    }
    if (look.band === "adult") {
      // 옆으로 넘긴 머리: 앞머리가 이마를 비스듬히 쓸고 내려간다 (가르마)
      return {
        cap: "M48 104 C35 76 42 37 76 21 C104 8 146 13 162 37 C168 46 169 57 166 64 C158 60 148 57 138 57 C126 57 114 61 104 69 C98 74 94 82 91 91 C86 87 80 85 74 87 C65 91 56 98 48 104 Z",
        extra: [],
        shine: ["M68 36 C80 24 96 19 114 18", "M120 16 C126 25 130 36 132 47"],
        ear: true,
      };
    }
    // 30대: 짧게 친 머리 (이마가 넓게 보이고 구레나룻이 짧다)
    return {
      cap: "M52 102 C40 74 46 40 78 25 C104 14 144 18 158 40 C163 48 164 54 162 59 C150 52 136 49 122 49 C112 49 104 52 98 58 C93 64 90 74 89 84 C84 82 79 82 74 84 C65 88 58 95 52 102 Z",
      extra: ["M86 82 L91 82 L90 97 L85 96 Z"],
      shine: ["M72 36 C84 27 100 22 116 22"],
      ear: true,
    };
  }
  if (look.band === "young") {
    // 높게 묶은 포니테일 + 둥근 앞머리 두 갈래
    return {
      back: (
        <g className="rn-pony">
          <path
            d="M64 36 C42 28 24 44 26 68 C28 92 42 106 36 128 C52 118 56 98 54 80 C52 64 58 52 70 47 Z"
            fill={HAIR.base}
            stroke={OL}
            strokeWidth={LW}
            strokeLinejoin="round"
          />
          <path d="M40 52 C34 64 35 82 42 98" stroke={HAIR.hi} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="63" cy="40" rx="8" ry="10" fill="#ff8fab" stroke={OL} strokeWidth="2.2" />
          <path d="M58 37 q5 -3 10 0" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      ),
      cap: "M49 104 C35 74 42 33 78 19 C108 7 151 13 165 41 C170 51 170 61 166 69 C160 63 152 60 146 63 C141 56 133 54 125 57 C118 63 111 65 105 72 C100 78 96 86 93 94 C87 90 80 88 74 90 C64 94 57 99 49 104 Z",
      shine: ["M66 38 C80 24 98 18 116 18", "M148 26 C154 30 158 35 160 41"],
      ear: true,
    };
  }
  if (look.band === "adult") {
    // 단발: 옆머리가 귀를 덮고 턱선에서 동그랗게 말린다 + 반대쪽 옆머리 한 가닥
    return {
      cap: "M43 118 C29 84 35 36 76 20 C108 7 153 14 166 42 C171 52 171 62 167 71 C160 64 150 61 140 61 C128 61 116 63 106 67 C100 73 97 83 96 95 C95 107 94 117 90 125 C79 131 57 131 43 118 Z",
      extra: ["M162 60 C171 76 172 98 166 116 C162 104 159 86 160 70 Z"],
      shine: ["M64 40 C78 25 98 18 118 18", "M58 70 C56 86 60 102 68 114"],
      ear: false,
    };
  }
  // 30대: 낮게 쪽 찐 머리 + 옆으로 쓸어 넘긴 앞머리
  return {
    back: (
      <g>
        <circle cx="46" cy="98" r="16" fill={HAIR.base} stroke={OL} strokeWidth={LW} />
        <path d="M37 92 C41 86 50 85 55 91" stroke={HAIR.hi} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M54 82 l12 -7" stroke="#e0b04a" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="67" cy="74.4" r="2.6" fill="#f6d06b" stroke={OL} strokeWidth="1.2" />
      </g>
    ),
    cap: "M50 103 C37 73 44 34 78 20 C108 8 151 14 165 40 C170 50 170 58 167 64 C156 56 142 54 130 56 C120 58 110 64 102 72 C97 78 94 86 92 94 C86 90 80 88 74 90 C64 93 57 98 50 103 Z",
    shine: ["M66 38 C80 24 98 18 116 18"],
    ear: true,
  };
}

export function Head({
  look,
  gear,
  ids,
  bride = false,
  high = false,
}: {
  look: Look;
  gear: GearSet;
  ids: HeadIds;
  /** 결혼 장면의 신부: 꽃 화관 (헤어밴드 · 선글라스는 쓰지 않는다) */
  bride?: boolean;
  /** 러너스 하이: 머리 자체가 불꽃이 된다 (헤어밴드 · 선글라스 · 묶은 머리는 감춘다) */
  high?: boolean;
}) {
  const hair = hairStyle(look);
  const female = look.gender === "F";
  const band = bride || high ? 0 : gear.headband;
  const shades = bride || high ? 0 : gear.sunglasses;
  // 나이대: 어릴수록 눈이 크고, 30대는 눈썹이 조금 진하다
  const grow = look.band === "young" ? 0.8 : look.band === "adult" ? 0 : -0.6;
  const brow = look.band === "mature" ? 3.2 : 2.6;

  return (
    <g>
      {band === 2 && <Tails />}
      {!high && hair.back}

      {/* 윤곽: 얼굴 · 머리를 한 덩어리로 */}
      <g fill={OL} stroke={OL} strokeWidth={LW * 2} strokeLinejoin="round">
        <ellipse cx={FACE.cx} cy={FACE.cy} rx={FACE.rx} ry={FACE.ry} />
        {high ? (
          <FireHair pass="outline" id={ids.fire} />
        ) : (
          <>
            <path d={hair.cap} />
            {hair.extra?.map((d) => <path key={d} d={d} />)}
          </>
        )}
      </g>
      <ellipse cx={FACE.cx} cy={FACE.cy} rx={FACE.rx} ry={FACE.ry} fill={SKIN} />
      {/* 턱 그늘 */}
      <path d="M58 104 C76 128 132 136 158 104 C150 124 128 134 104 134 C82 134 66 124 58 104 Z" fill={SKIN_SHADE} opacity="0.7" />

      {/* 머리카락 (러너스 하이 때는 머리 자체가 불꽃) */}
      {high ? (
        <FireHair pass="fill" id={ids.fire} />
      ) : (
        <>
          <path d={hair.cap} fill={HAIR.base} />
          {hair.extra?.map((d) => <path key={d} d={d} fill={HAIR.base} />)}
          {hair.shine.map((d, i) => (
            <path key={d} d={d} stroke={HAIR.hi} strokeWidth={i === 0 ? 4 : 2.6} fill="none" strokeLinecap="round" opacity={i === 0 ? 1 : 0.8} />
          ))}
        </>
      )}

      {/* 귀 (단발이 덮던 귀도 러너스 하이 때는 보인다) */}
      {(hair.ear || high) && (
        <>
          <ellipse cx="74" cy="96" rx="8.4" ry="10.4" fill={SKIN} stroke={OL} strokeWidth={LW} />
          <path d="M75 90 C71 92 70 98 73 102" stroke={SKIN_LINE} strokeWidth="2" fill="none" strokeLinecap="round" />
          {female && look.band === "mature" && <circle cx="74" cy="109" r="3" fill="#f6d06b" stroke={OL} strokeWidth="1.2" />}
        </>
      )}

      {/* 볼터치 */}
      <ellipse cx="110" cy="101" rx="8" ry="5" fill={BLUSH} opacity="0.55" />
      <ellipse cx="154" cy="99" rx="5.6" ry="4.2" fill={BLUSH} opacity="0.55" />

      {/* 표정: 평소 (가끔 깜빡임) */}
      <g className="rn-faceNormal">
        <Brows d="M109 74 Q115 70.6 121 73.4 M139 72 Q144 69 149 71.2" width={brow} />
        <g className="rn-blink">
          <Eyes grow={grow} />
        </g>
        <path d="M127.6 101.4 Q132.6 106.4 137.6 101.4" stroke={MOUTH_LINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>
      {/* 표정: 빠르게 (굳센 눈썹, 이를 보이며 웃는 입) */}
      <g className="rn-faceSprint">
        <Brows d="M108 72 L121 76.4 M140 75 L150 70.6" width={brow + 0.2} />
        <Eyes grow={grow - 1.4} />
        <path d="M125.6 99 H139.8 Q139 108.4 132.7 108.4 Q126.4 108.4 125.6 99 Z" fill={MOUTH} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M126.8 100.4 H138.6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* 표정: 힘들 때 (> <, 헉헉) */}
      <g className="rn-faceRest">
        <Brows d="M109 72.6 C113 73.2 117 75 120 77.6 M150 71 C147 71.6 144 73 142 75.6" width={brow} />
        <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M110 82 L119 87.4 L110 92.8" />
          <path d="M150 80.4 L142.6 85.6 L150 90.8" />
        </g>
        <ellipse cx="132.6" cy="104" rx="4.4" ry="5.4" fill={MOUTH} stroke={OL} strokeWidth="1.8" />
        <ellipse cx="132.6" cy="106.4" rx="2.6" ry="2" fill={TONGUE} />
      </g>
      {/* 표정: 기쁠 때 (^ ^, 활짝) */}
      <g className="rn-faceHappy">
        <Brows d="M109 71.6 Q115 67.8 121 70.6 M139 69.6 Q144 66.4 149 68.6" width={brow} />
        <g stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round">
          <path d="M109.4 90 Q115.6 79.6 121.8 90" />
          <path d="M138.4 88 Q143.8 78.4 149.2 88" />
        </g>
        <path d="M124.4 98.4 H141 Q140.2 111.4 132.7 111.4 Q125.2 111.4 124.4 98.4 Z" fill={MOUTH} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M127.6 107.6 Q132.7 103.6 137.8 107.6 Q135.8 110.6 132.7 110.6 Q129.6 110.6 127.6 107.6 Z" fill={TONGUE} />
        <path d="M104 96 l3 -4 M108.6 97 l3 -4 M113.2 98 l3 -4" stroke="#ff7b93" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </g>
      {/* 표정: 러너스 하이 (별이 반짝이는 눈, 이를 보이며 활짝) */}
      <g className="rn-faceHigh">
        <Brows d="M108.6 71.6 Q115 67.4 121.4 70.4 M139 69.4 Q144.4 66 149.6 68.4" width={brow} />
        <StarEyes grow={grow} />
        <path d="M124.4 98.4 H141 Q140.2 111.4 132.7 111.4 Q125.2 111.4 124.4 98.4 Z" fill={MOUTH} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M125.8 100 H139.6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* 신부: 꽃 화관 */}
      {bride && <FlowerCrown />}
      {/* 헤어밴드 (머리카락 위, 이마 둘레) */}
      {band === 1 && <Headband base="#4f9cff" dark="#2f7be6" stripe="#ffffff" />}
      {band === 2 && <Headband base="#ff5a4e" dark="#d93b30" stripe="#d6ff4a" />}
      {/* 선글라스: 눈을 가리지 않게 머리 위에 걸친다 */}
      {shades > 0 && <Shades kind={shades === 2 ? "mirror" : "dark"} ids={ids} />}

      {/* 땀방울 · 숨 (힘들 때만) */}
      <g className="rn-sweat" fill="#9fd8ff" stroke="#4aa3e6" strokeWidth="1.4">
        <path d="M44 34 q6 9 0 13.4 q-6 -4.4 0 -13.4z" />
        <path d="M32 58 q5 7.6 0 11.4 q-5 -3.8 0 -11.4z" />
      </g>
      <g className="rn-breath" stroke="#a9c0de" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M150 106 q7 -4 14 0" />
        <path d="M153 115 q6 -3.4 12 0" />
      </g>
    </g>
  );
}

/** 눈: 가까운 눈(조금 크게) · 먼 눈, 아래쪽에 밝은 갈색 · 위아래 반짝이. grow는 나이대 · 표정 크기 */
function Eyes({ grow = 0 }: { grow?: number }) {
  const near = 7.4 + grow;
  const far = 6.8 + grow;
  return (
    <>
      <ellipse cx="115.6" cy="88" rx="5.6" ry={near} fill={INK} />
      <ellipse cx="115.6" cy={88 + near * 0.45} rx="3.8" ry={near * 0.38} fill={IRIS} />
      <circle cx="117.8" cy={88 - near * 0.42} r="2.5" fill="#ffffff" />
      <circle cx="113.8" cy={88 + near * 0.42} r="1.2" fill="#ffffff" opacity="0.9" />
      <ellipse cx="143.6" cy="86.4" rx="5" ry={far} fill={INK} />
      <ellipse cx="143.6" cy={86.4 + far * 0.45} rx="3.4" ry={far * 0.38} fill={IRIS} />
      <circle cx="145.6" cy={86.4 - far * 0.42} r="2.2" fill="#ffffff" />
      <circle cx="142" cy={86.4 + far * 0.42} r="1.05" fill="#ffffff" opacity="0.9" />
    </>
  );
}

/** 네 갈래 반짝이 별 (가운데 cx, cy · 반지름 r) */
function sparkle(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}

/** 러너스 하이 눈: 평소 눈 모양에 노란 별이 반짝인다 */
function StarEyes({ grow = 0 }: { grow?: number }) {
  const near = 7.4 + grow;
  const far = 6.8 + grow;
  return (
    <>
      <ellipse cx="115.6" cy="88" rx="5.6" ry={near} fill={INK} />
      <ellipse cx="143.6" cy="86.4" rx="5" ry={far} fill={INK} />
      <path className="rn-starEye" d={sparkle(115.6, 87.6, near * 0.78)} fill="#ffe46b" />
      <path className="rn-starEye" d={sparkle(143.6, 86, far * 0.78)} fill="#ffe46b" />
      <circle cx="117.6" cy={88 - near * 0.5} r="1.5" fill="#ffffff" />
      <circle cx="145.4" cy={86.4 - far * 0.5} r="1.3" fill="#ffffff" />
    </>
  );
}

function Brows({ d, width }: { d: string; width: number }) {
  return <path className="rn-brow" d={d} stroke={HAIR.shade} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

/** 헤어밴드: 이마 둘레를 감싸는 띠 (머리카락 위) */
function Headband({ base, dark, stripe }: { base: string; dark: string; stripe: string }) {
  const arc = "M48 60 C70 36 122 26 166 52";
  return (
    <g>
      <path d={arc} stroke={OL} strokeWidth="14.4" fill="none" strokeLinecap="round" />
      <path d={arc} stroke={base} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M51 63 C73 41 122 31 164 55.6" stroke={dark} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M50 57 C72 33 122 23 165 48.4" stroke={stripe} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 프로 헤어밴드 꼬리 (뒤통수, 달리면 펄럭인다) */
function Tails() {
  return (
    <g className="rn-tails">
      <path d="M52 58 C40 58 28 64 20 74 L30 74 C36 68 44 64 54 63 Z" fill="#ff5a4e" stroke={OL} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M52 62 C42 68 34 78 30 90 L38 86 C41 78 46 71 54 66 Z" fill="#d93b30" stroke={OL} strokeWidth="2.4" strokeLinejoin="round" />
    </g>
  );
}

/** 머리 위에 걸친 선글라스 (스포츠 · 미러 고글) */
function Shades({ kind, ids }: { kind: "dark" | "mirror"; ids: ShadeIds }) {
  const fill = kind === "mirror" ? `url(#${ids.mirror})` : `url(#${ids.lens})`;
  return (
    <g transform="rotate(-8 128 22)">
      <path d="M92 26 C98 20 104 18 110 18 M150 22 C156 24 160 28 162 33" stroke={OL} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path
        d="M108 12 C114 7.6 128 7.6 134 11 C138 13.4 142 12.6 146 11.4 C152 10 156 13 155.4 17.6 C154.6 23.6 150 27.4 144.4 27.4 C139.6 27.4 136.6 24.4 134.4 21.2 C132.2 24.6 127.6 27.8 121.8 27.8 C114.4 27.8 107.4 21.6 108 12 Z"
        fill={fill}
        stroke={OL}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {kind === "mirror" && <path d="M110 13.6 C116 9.6 128 9.6 134 12.8" stroke="#d6ff4a" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      <path d="M113 15.4 L122 13.4" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      <path d="M142 15 L148 13.6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

/** 신부 꽃 화관 */
function FlowerCrown() {
  const flowers: [number, number, string][] = [
    [74, 26, "#ffffff"],
    [86, 18, "#ffd1dc"],
    [99, 13.6, "#ffffff"],
    [112, 12, "#fff1c1"],
    [125, 13, "#ffd1dc"],
    [138, 17, "#ffffff"],
  ];
  return (
    <g>
      <path d="M68 32 C86 14 122 6 146 20" stroke="#8cc178" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {flowers.map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="5.6" fill={color} stroke="#e7a2b4" strokeWidth="1.2" />
          <circle cx={x} cy={y} r="1.8" fill="#f2c14e" />
        </g>
      ))}
    </g>
  );
}
