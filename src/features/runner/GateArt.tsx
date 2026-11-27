/**
 * 레이스 장면의 문과 출발선 (캐릭터와 같은 말랑한 그림체). 꾸밈이라 aria-hidden (뜻은 말풍선과 칩이 전한다).
 *  - 출발선(StartPost): 캐릭터 바로 앞, 'START' 팻말을 단 체크무늬 기둥
 *  - 문(GateArch): 금빛 '목표 달성' 문 · 결승 아치. 달이 바뀔 때마다 자리를 옮겨(transition) 오른쪽에서 다가와 캐릭터를 지나 뒤로 멀어진다.
 *    캐릭터보다 뒤에 그려 캐릭터가 문 안으로 들어가 보인다
 *  - 테이프(GateTape): 캐릭터가 지나는 달에 배 높이에서 가운데가 끊어져 양쪽 기둥으로 늘어진다 (캐릭터보다 앞에 그린다)
 */
import { OUT } from "./palette";
import type { RaceGate } from "./race";

/** 출발선: 상자(className으로 자리 · 높이)를 채우고 아래에 붙는다 */
export function StartPost({ className }: { className: string }) {
  return (
    <div aria-hidden className={`absolute bottom-0 w-11 -translate-x-1/2 ${className}`}>
      <svg viewBox="0 0 44 96" preserveAspectRatio="xMidYMax meet" overflow="visible" className="size-full">
        <rect x="19" y="18" width="6" height="78" rx="3" fill="#ffffff" stroke={OUT} strokeWidth="1.5" />
        {[24, 36, 48, 60, 72, 84].map((y) => (
          <rect key={y} x="19.75" y={y} width="4.5" height="6" fill="#3d3a48" />
        ))}
        <rect x="1.5" y="2" width="41" height="17" rx="6" fill="#4f9cff" stroke={OUT} strokeWidth="1.5" />
        <path d="M6.5 5.4 H37" stroke="#ffffff" strokeWidth="1.3" opacity="0.45" strokeLinecap="round" />
        <text x="22" y="14.2" textAnchor="middle" fontSize="8.4" fontWeight="900" letterSpacing="1.2" fill="#ffffff" fontFamily="system-ui, sans-serif">
          START
        </text>
        <ellipse cx="22" cy="95" rx="9" ry="2" fill="#000000" opacity="0.12" />
      </svg>
    </div>
  );
}

/** 문이 캐릭터보다 몇 달 앞인지 → 자리 (0 = 캐릭터 몸 가운데 --rx + 3.5rem, −1 = 왼쪽 밖으로 멀어짐) */
const GATE_LEFT: Record<number, string> = {
  2: "88%",
  1: "66%",
  0: "calc(var(--rx) + 3.5rem)",
  [-1]: "-16%",
};

/** 목표 달성 문 · 결승 아치 (목표를 이뤘으면 금빛) */
export function GateArch({ gate }: { gate: RaceGate }) {
  const gold = gate.kind === "goal" || gate.gold;
  const left = GATE_LEFT[gate.ahead] ?? GATE_LEFT[2];
  return (
    <div aria-hidden className="absolute bottom-0 h-[84%] w-28 -translate-x-1/2 transition-[left] duration-500 ease-out" style={{ left }}>
      <ArchArt gold={gold} label={gate.kind === "goal" ? "목표 달성" : "FINISH"} />
    </div>
  );
}

/** 캐릭터 배 높이의 테이프 (금빛 · 빨강 흰 줄무늬) */
export function GateTape({ gold }: { gold: boolean }) {
  const color = gold ? "bg-[#ffd34d]" : "bg-[repeating-linear-gradient(90deg,#ff6b6b_0_8px,#fff_8px_14px)]";
  return (
    <div aria-hidden className="absolute bottom-[28%] flex w-[6.4rem] -translate-x-1/2" style={{ left: GATE_LEFT[0] }}>
      <span className={`rn-tape-l h-2 flex-1 rounded-l-full border-y border-l shadow-sm ${color}`} style={{ borderColor: OUT }} />
      <span className={`rn-tape-r h-2 flex-1 rounded-r-full border-y border-r shadow-sm ${color}`} style={{ borderColor: OUT }} />
    </div>
  );
}

/**
 * 문 그림: 꼭대기에 풍선을 단 둥근 기둥 두 개 · 글자 띠 · 체크무늬 줄.
 * 금빛(목표 달성 · 금메달 결승) 또는 빨강(완주 메달 결승). 상자를 채우고 아래에 붙는다
 */
function ArchArt({ gold, label }: { gold: boolean; label: string }) {
  const c = gold
    ? { post: "#ffd34d", postHi: "#fff1b8", head: "#ffd34d", headHi: "#fff3c2", text: "#5b3b00", checkA: "#d79a12", checkB: "#fff4cc", balloons: ["#ff9fb6", "#7cc4ff"] }
    : { post: "#e6ebf2", postHi: "#ffffff", head: "#ff6b6b", headHi: "#ffb3b3", text: "#ffffff", checkA: "#3d3a48", checkB: "#ffffff", balloons: ["#ffd166", "#7cc4ff"] };
  return (
    <svg viewBox="0 0 112 161" preserveAspectRatio="xMidYMax meet" overflow="visible" className="size-full">
      {[10, 102].map((x, i) => (
        <g key={`b${x}`}>
          <path d={`M${x} 13 C${x + (i ? 3 : -3)} 8 ${x + (i ? -2 : 2)} 3 ${x} -2`} stroke="#9aa3b1" strokeWidth="0.9" fill="none" />
          <ellipse cx={x} cy="-9" rx="6.4" ry="7.6" fill={c.balloons[i]} stroke={OUT} strokeWidth="1.4" />
          <path d={`M${x - 2.8} -12.4 q1.2 -2 3.4 -1.8`} stroke="#ffffff" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" />
        </g>
      ))}
      {[10, 102].map((x) => (
        <g key={`p${x}`}>
          <rect x={x - 4.4} y="28" width="8.8" height="128" rx="4" fill={c.post} stroke={OUT} strokeWidth="1.6" />
          <path d={`M${x - 1.6} 44 V148`} stroke={c.postHi} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <rect x={x - 8} y="154" width="16" height="7" rx="3.5" fill={c.post} stroke={OUT} strokeWidth="1.6" />
        </g>
      ))}
      <rect x="4.5" y="33" width="103" height="6" fill={c.checkB} />
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={`c${i}`} x={5 + i * 6} y={i % 2 ? 36 : 33} width="6" height="3" fill={c.checkA} />
      ))}
      <rect x="4.5" y="33" width="103" height="6" fill="none" stroke={OUT} strokeWidth="1.4" />
      <rect x="1" y="12" width="110" height="22" rx="8" fill={c.head} stroke={OUT} strokeWidth="1.6" />
      <path d="M9 16.4 H103" stroke={c.headHi} strokeWidth="2.2" opacity="0.7" strokeLinecap="round" />
      {gold && <path d="M27 17.6 l1.9 3.9 4.3 0.6 -3.1 3 0.7 4.2 -3.8 -2 -3.8 2 0.7 -4.2 -3.1 -3 4.3 -0.6 z" fill={c.text} />}
      <text x={gold ? 61 : 56} y="27.4" textAnchor="middle" fontSize={gold ? 11 : 10.5} fontWeight="900" letterSpacing={gold ? 0.6 : 2.4} fill={c.text} fontFamily="system-ui, sans-serif">
        {label}
      </text>
    </svg>
  );
}
