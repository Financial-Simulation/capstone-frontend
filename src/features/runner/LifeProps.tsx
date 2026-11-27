/**
 * 인생 장면 소품 (LifeScene이 장면마다 한 번 그린다). 배경과 같은 갈색 테두리 그림체.
 *  - 결혼: 장미가 핀 둥근 아치 (WeddingArch)
 *  - 독립: 문이 열린 부모님 집과 손 흔드는 가족 (FamilyHouse)
 *  - 전세 이사: 소파 · 상자 · 화분을 실은 이삿짐 트럭 (MovingTruck)
 *  - 이직: '환영합니다!' 현수막이 걸린 새 회사 (NewOffice)
 *  - 자동차: 선물 리본을 단 오픈카, 운전하는 캐릭터 뒤(CarBack) · 앞(CarFront) 두 겹
 * 움직임(바퀴 · 연기 · 손 흔들기 · 하트)은 life.css. 그림은 꾸밈이라 aria-hidden.
 */
import { heart, miniHead, rad } from "./ArtKit";
import { BLUSH, INK, OL, OUT, SKIN } from "./palette";

/** 바퀴 (가운데 cx, cy · 반지름 r): 안쪽(rn-wheel)이 돈다 */
const wheel = (cx: number, cy: number, r = 13, sw = 1.6) => (
  <g key={`wheel${cx}`}>
    <circle cx={cx} cy={cy} r={r} fill="#4d5361" stroke={OUT} strokeWidth={sw} />
    <g className="rn-wheel">
      <circle cx={cx} cy={cy} r={r * 0.56} fill="#e8ebf0" stroke={OUT} strokeWidth={sw * 0.7} />
      <path d={`M${cx - r * 0.42} ${cy} H${cx + r * 0.42} M${cx} ${cy - r * 0.42} V${cy + r * 0.42}`} stroke="#a3abb8" strokeWidth={r * 0.14} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.17} fill="#a3abb8" />
    </g>
    <path d={`M${cx - r * 0.7} ${cy - r * 0.38} A${r * 0.8} ${r * 0.8} 0 0 1 ${cx - r * 0.24} ${cy - r * 0.76}`} stroke="#ffffff" strokeWidth={r * 0.1} opacity="0.35" fill="none" strokeLinecap="round" />
  </g>
);

/** 결혼: 장미가 핀 둥근 아치 (viewBox 200 × 170). 두 사람이 그 앞에 서면 아치가 둘을 감싼다 */
export function WeddingArch({ className = "h-full w-auto" }: { className?: string }) {
  // 아치(타원) 위 한 점: 가운데 (100, 70), 가로 73 · 세로 56
  const arc = (deg: number, grow = 0) => [100 + (73 + grow) * Math.cos(rad(deg)), 70 - (56 + grow) * Math.sin(rad(deg))] as const;
  const roses: [number, number, string, string][] = [
    [176, 8, "#ffffff", "#f2b3c3"],
    [163, 9.5, "#ffc4d2", "#ec8aa4"],
    [150, 10, "#ffffff", "#f2b3c3"],
    [137, 9, "#ff9fb6", "#e0708d"],
    [124, 8.5, "#fff1c1", "#e8c46f"],
    [111, 7.5, "#ffffff", "#f2b3c3"],
    [98, 6.5, "#ffc4d2", "#ec8aa4"],
    [44, 7, "#ffc4d2", "#ec8aa4"],
    [30, 8.5, "#ffffff", "#f2b3c3"],
    [16, 7.5, "#ff9fb6", "#e0708d"],
    [4, 6.5, "#fff1c1", "#e8c46f"],
  ];
  return (
    <svg viewBox="0 0 200 170" aria-hidden overflow="visible" className={className}>
      {/* 쉬폰 천 */}
      <path d="M30 48 C56 72 46 110 36 146" stroke="#ffffff" strokeWidth="9" fill="none" opacity="0.85" strokeLinecap="round" />
      <path d="M170 48 C144 72 154 110 164 146" stroke="#ffffff" strokeWidth="9" fill="none" opacity="0.85" strokeLinecap="round" />
      {/* 아치 띠 (테두리 → 흰 띠) */}
      <path d="M27 70 A73 56 0 0 1 173 70" stroke={OUT} strokeWidth="11.6" fill="none" />
      <path d="M27 70 A73 56 0 0 1 173 70" stroke="#ffffff" strokeWidth="8.4" fill="none" />
      {/* 기둥 */}
      {[27, 173].map((x) => (
        <g key={`col${x}`}>
          <rect x={x - 6} y="66" width="12" height="96" rx="4" fill="#ffffff" stroke={OUT} strokeWidth="1.6" />
          <path d={`M${x - 2} 74 V154`} stroke="#f1e4da" strokeWidth="2" strokeLinecap="round" />
          <rect x={x - 9} y="61.4" width="18" height="7" rx="3.5" fill="#fff8f1" stroke={OUT} strokeWidth="1.6" />
        </g>
      ))}
      {/* 잎 · 장미 */}
      {[172, 156, 142, 128, 114, 100, 40, 24, 8].map((deg) => {
        const [x, y] = arc(deg, 6);
        return <ellipse key={`leaf${deg}`} cx={x} cy={y} rx="8" ry="3.4" fill="#8fd07e" stroke={OUT} strokeWidth="1.2" transform={`rotate(${-deg + 60} ${x} ${y})`} />;
      })}
      {roses.map(([deg, r, color, line]) => {
        const [x, y] = arc(deg);
        return (
          <g key={`rose${deg}`}>
            <circle cx={x} cy={y} r={r} fill={color} stroke={OUT} strokeWidth="1.3" />
            <path d={`M${x - r * 0.42} ${y + r * 0.05} a${r * 0.42} ${r * 0.42} 0 1 1 ${r * 0.42} ${r * 0.42}`} stroke={line} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d={`M${x - r * 0.62} ${y - r * 0.4} q${r * 0.3} ${-r * 0.3} ${r * 0.62} ${-r * 0.34}`} stroke="#ffffff" strokeWidth="1" opacity="0.8" fill="none" strokeLinecap="round" />
          </g>
        );
      })}
      {/* 가운데 매단 하트 */}
      <path d="M100 14 v10" stroke="#e4bd62" strokeWidth="1.4" />
      {heart(100, 31, 1.35, "#ff7d96", { stroke: true })}
      <path d="M95.6 27.4 q1 -1.8 3 -2" stroke="#ffffff" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" />
      {/* 기둥 아래 꽃 화분 */}
      {[27, 173].map((x) => (
        <g key={`pot${x}`}>
          <path d={`M${x - 11} 160.6 h22 l-3 9 h-16 z`} fill="#f6e7da" stroke={OUT} strokeWidth="1.4" strokeLinejoin="round" />
          {(
            [
              [-7, 156, "#ffffff"],
              [7, 156, "#ffffff"],
              [0, 151, "#ffc4d2"],
              [-3, 159, "#ff9fb6"],
              [4, 160, "#fff1c1"],
            ] as const
          ).map(([dx, y, color]) => (
            <circle key={`${dx}-${y}`} cx={x + dx} cy={y} r="5.4" fill={color} stroke={OUT} strokeWidth="1" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** 집 지붕의 비늘 기와 한 줄 (높이 y): 지붕 양쪽 경사 안쪽을 반원으로 채운다 */
function roofRow(y: number): string {
  const xl = 2.6 + (65.4 - y) * 1.53 + 3;
  const xr = 170 - xl;
  const n = Math.max(1, Math.floor((xr - xl) / 9));
  const w = (xr - xl) / n;
  return `M${xl.toFixed(2)} ${y}` + Array.from({ length: n }, () => ` q${(w / 2).toFixed(2)} 4 ${w.toFixed(2)} 0`).join("");
}

/**
 * 독립: 부모님 집 (viewBox 170 × 150). 문(가운데 x 123)이 활짝 열려 안이 따뜻하고,
 * 2층 창에서 엄마 · 아빠(꼬마 마스코트)가 손을 흔들며 '잘 지내!' (손 · 하트 · 굴뚝 연기가 움직인다)
 */
export function FamilyHouse({ className = "h-full w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 150" aria-hidden overflow="visible" className={className}>
      {/* 굴뚝과 연기 */}
      <g className="rn-smoke" fill="#ffffff" stroke="#d6dbe4" strokeWidth="1.2">
        <circle cx="127" cy="10" r="4" />
        <circle cx="131" cy="2" r="5" />
        <circle cx="126" cy="-7" r="6" />
      </g>
      <rect x="119" y="22" width="15" height="30" rx="2" fill="#ec8f74" stroke={OUT} strokeWidth="1.6" />
      <rect x="116.6" y="17.4" width="19.8" height="6.4" rx="3" fill="#d9745c" stroke={OUT} strokeWidth="1.6" />
      {/* 벽 */}
      <rect x="12" y="60" width="146" height="85" rx="3" fill="#fff6e6" stroke={OUT} strokeWidth="1.6" />
      {[76, 88, 110, 122].map((y) => (
        <path key={y} d={`M13 ${y}h144`} stroke="#f4e5cc" strokeWidth="1.2" />
      ))}
      {/* 둥근 지붕 · 비늘 기와 · 다락 창 */}
      <path
        d="M4 70 C1.6 70 0.6 67 2.6 65.4 L80.6 14.4 C83.4 12.6 86.6 12.6 89.4 14.4 L167.4 65.4 C169.4 67 168.4 70 166 70 Z"
        fill="#ff917a"
        stroke={OUT}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {[58, 46, 34].map((y) => (
        <path key={y} d={roofRow(y)} stroke="#e8735c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      ))}
      <path d="M14 61 L80 18" stroke="#ffffff" strokeWidth="2.4" opacity="0.35" strokeLinecap="round" />
      <circle cx="85" cy="44" r="8" fill="#fff3c4" stroke={OUT} strokeWidth="1.6" />
      <path d="M85 36.4v15.2M77.4 44h15.2" stroke={OUT} strokeWidth="1.1" />
      {/* 2층 창: 손 흔드는 엄마 · 아빠 */}
      <rect x="24" y="74" width="52" height="30" rx="4" fill="#ffeec8" stroke={OUT} strokeWidth="1.6" />
      <path d="M25.6 75.6 h9 q-3 6 -9 12 z M74.4 75.6 h-9 q3 6 9 12 z" fill="#ffbccb" />
      <rect x="32" y="96" width="14" height="10" rx="4" fill="#8cc1ff" stroke={OUT} strokeWidth="1.2" />
      {miniHead(39, 89.2, 6.4, "#5c3b2f", { long: true })}
      <rect x="49" y="96" width="14" height="10" rx="4" fill="#7fd6b0" stroke={OUT} strokeWidth="1.2" />
      {miniHead(56, 88.8, 6.6, "#3b2a24")}
      <g className="rn-wavehand">
        <path d="M61.6 98.6 L67.6 86.6" stroke={OUT} strokeWidth="4.2" strokeLinecap="round" />
        <path d="M61.6 98.6 L67.6 86.6" stroke={SKIN} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="68.2" cy="85" r="2.8" fill={SKIN} stroke={OUT} strokeWidth="1.1" />
      </g>
      <rect x="21" y="103" width="58" height="4.4" rx="2.2" fill="#f2dcc0" stroke={OUT} strokeWidth="1.2" />
      {/* 2층 오른쪽 창 · 1층 창과 꽃 상자 */}
      <rect x="98" y="74" width="40" height="26" rx="4" fill="#cfe8fb" stroke={OUT} strokeWidth="1.6" />
      <path d="M118 74v26M98 87h40" stroke={OUT} strokeWidth="1.1" />
      <path d="M102 82 l6 -5" stroke="#ffffff" strokeWidth="1.8" opacity="0.8" strokeLinecap="round" />
      <rect x="22" y="112" width="40" height="22" rx="4" fill="#cfe8fb" stroke={OUT} strokeWidth="1.6" />
      <path d="M42 112v22" stroke={OUT} strokeWidth="1.1" />
      <path d="M26 120 l6 -5" stroke="#ffffff" strokeWidth="1.8" opacity="0.8" strokeLinecap="round" />
      {[25, 32, 39, 46, 53, 59].map((x, i) => (
        <circle key={x} cx={x} cy="132.4" r="3" fill={["#ff7a7a", "#ffd166", "#ff9fb6", "#ff7a7a", "#c3a2ff", "#ffd166"][i]} stroke={OUT} strokeWidth="0.9" />
      ))}
      <rect x="20" y="133.4" width="44" height="6.4" rx="2" fill="#d6a47a" stroke={OUT} strokeWidth="1.3" />
      {/* 문: 활짝 열려 안의 불빛이 보인다 */}
      <rect x="104" y="98" width="38" height="47" rx="3" fill="#cf9566" stroke={OUT} strokeWidth="1.6" />
      <rect x="108" y="102" width="30" height="43" rx="2" fill="#ffd98e" />
      <path d="M108 104 c0 -1 1 -2 2 -2 h26 c1 0 2 1 2 2 v10 q-15 -6 -30 0 z" fill="#ffeabf" />
      <path d="M138 102 L149 97 V149 L138 145 Z" fill="#e5a878" stroke={OUT} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="145.4" cy="124" r="1.6" fill="#ffd34d" stroke={OUT} strokeWidth="0.8" />
      <rect x="96.6" y="104" width="5" height="7" rx="2" fill="#fff1a8" stroke={OUT} strokeWidth="1" />
      {/* 기초 · 계단 · 매트 */}
      <rect x="8" y="144" width="154" height="6" rx="2" fill="#ddd6ca" stroke={OUT} strokeWidth="1.4" />
      <rect x="100" y="143" width="46" height="5" rx="2" fill="#cfc7ba" stroke={OUT} strokeWidth="1.2" />
      <rect x="111" y="141.4" width="24" height="3" rx="1.5" fill="#ff8080" />
      {/* '잘 지내!' · 떠오르는 하트 (좁은 화면에서 집 왼쪽이 화면 밖으로 나가도 보이게 창 바로 위 x 38~94) */}
      <g>
        <path d="M56 63 l7 0 l-4.6 8.4 z" fill="#ffffff" stroke={OUT} strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="38" y="46" width="56" height="18" rx="9" fill="#ffffff" stroke={OUT} strokeWidth="1.4" />
        <path d="M57 64 h5" stroke="#ffffff" strokeWidth="2.2" />
        <text x="66" y="58.6" textAnchor="middle" fontSize="10" fontWeight="800" fill={OL} fontFamily="system-ui, sans-serif">
          잘 지내!
        </text>
      </g>
      {heart(68, 72, 0.9, "#ff6b8a", { className: "rn-float" })}
    </svg>
  );
}

/** 이삿짐 상자 (테이프, face면 웃는 얼굴) */
const box = (x: number, y: number, w: number, h: number, face = false) => (
  <g key={`box${x}-${y}`}>
    <rect x={x} y={y} width={w} height={h} rx="2.4" fill="#ebb985" stroke={OUT} strokeWidth="2" />
    {face ? (
      <>
        <rect x={x + 1} y={y + 1} width={w - 2} height="4.4" fill="#f7d6ab" />
        <circle cx={x + w * 0.34} cy={y + h * 0.56} r="1.5" fill={INK} />
        <circle cx={x + w * 0.66} cy={y + h * 0.56} r="1.5" fill={INK} />
        <ellipse cx={x + w * 0.22} cy={y + h * 0.72} rx="2.2" ry="1.3" fill={BLUSH} opacity="0.7" />
        <ellipse cx={x + w * 0.78} cy={y + h * 0.72} rx="2.2" ry="1.3" fill={BLUSH} opacity="0.7" />
        <path d={`M${x + w * 0.44} ${y + h * 0.7} q${w * 0.06} ${h * 0.1} ${w * 0.12} 0`} stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <rect x={x + w / 2 - 2.4} y={y + 1} width="4.8" height={h - 2} fill="#f7d6ab" />
    )}
  </g>
);

/** 전세 이사: 소파 · 상자 · 화분을 실은 이삿짐 트럭 (viewBox 240 × 120, 오른쪽으로 간다). 모자 쓴 꼬마 운전사 */
export function MovingTruck({ className = "h-full w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 120" aria-hidden overflow="visible" className={className}>
      {/* 배기 연기 */}
      <g className="rn-exhaust" fill="#ffffff" stroke="#d6dbe4" strokeWidth="1.4">
        <circle cx="4" cy="97" r="4" />
        <circle cx="-5" cy="93" r="5" />
        <circle cx="-15" cy="89" r="6" />
      </g>
      {/* 차대 · 짐칸 바닥 */}
      <rect x="10" y="90" width="218" height="9" rx="4.5" fill="#717b93" stroke={OUT} strokeWidth="2" />
      <rect x="6" y="82" width="160" height="10" rx="3" fill="#e6ebf2" stroke={OUT} strokeWidth="2" />
      {/* 소파 */}
      <path d="M14 82 V50 C14 46 16.6 44 20 44 H26 C29.4 44 32 46 32 50 V63 H60 C63 63 65 65 65 68 V82 Z" fill="#ffc35a" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
      <rect x="57" y="56" width="12" height="26" rx="5" fill="#ffd27e" stroke={OUT} strokeWidth="2" />
      <path d="M36 72 H54" stroke="#e7a43e" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.6 51 v8" stroke="#ffffff" strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
      {/* 상자들 · 화분 */}
      {box(74, 54, 36, 28)}
      {box(80, 28, 28, 26, true)}
      {box(112, 60, 44, 22)}
      <path d="M148 47 C146 36 139 30 131 28 M148 47 C150 34 156 27 163 24 M148 47 C148 37 149 28 148 19" stroke="#5aa04f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="132" cy="29" rx="7" ry="4" fill="#86cf74" stroke={OUT} strokeWidth="1.5" transform="rotate(-22 132 29)" />
      <ellipse cx="163" cy="24.6" rx="7" ry="4" fill="#86cf74" stroke={OUT} strokeWidth="1.5" transform="rotate(22 163 24.6)" />
      <ellipse cx="148" cy="17" rx="4" ry="7" fill="#9bd987" stroke={OUT} strokeWidth="1.5" />
      <path d="M140 60 l2 -14 h13 l2 14 z" fill="#f2906a" stroke={OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M141.4 50 h14.2" stroke="#d9714d" strokeWidth="1.4" />
      {/* 짐 묶은 끈 */}
      <path d="M12 82 L82 30 M160 82 L106 30" stroke="#a8825e" strokeWidth="1.4" opacity="0.8" />
      {/* 운전석 */}
      <path
        d="M164 91 V52 C164 46.4 168.4 42 174 42 H197 C202.6 42 206.4 44 209.6 48.4 L223.6 67.4 C226.4 71.2 228 75 228 79.4 V91 Z"
        fill="#6cb6ff"
        stroke={OUT}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M176 50 H196 C198.6 50 200.6 51.2 202.4 53.6 L212.6 67.4 H176 Z" fill="#e3f2ff" stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
      {miniHead(189, 60.4, 6.8, "#3b2a24", { right: true, cap: "#ffcf5a" })}
      <path d="M200.4 61.6 l5.4 4" stroke={OUT} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M174 70 V88" stroke={OUT} strokeWidth="1.2" opacity="0.6" />
      <rect x="178" y="72.4" width="8" height="2.8" rx="1.4" fill="#3f73b8" />
      <path d="M167 80.6 H225" stroke="#ffffff" strokeWidth="3" opacity="0.85" strokeLinecap="round" />
      <ellipse cx="224.2" cy="72" rx="3.2" ry="4.2" fill="#fff3b0" stroke={OUT} strokeWidth="1.3" />
      <rect x="205" y="47" width="4" height="10" rx="2" fill="#3f73b8" stroke={OUT} strokeWidth="1.1" />
      <rect x="158" y="87" width="76" height="7" rx="3.5" fill="#cbd2dc" stroke={OUT} strokeWidth="1.6" />
      {/* 바퀴 */}
      {wheel(56, 104, 13, 1.8)}
      {wheel(198, 104, 13, 1.8)}
    </svg>
  );
}

/** 이직: 새 회사 (viewBox 150 × 190). 둥근 유리 빌딩 정문 위에 '환영합니다!' 현수막 · 줄무늬 차양 · 화분 옆 풍선 */
export function NewOffice({ className = "h-full w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 190" aria-hidden overflow="visible" className={className}>
      {/* 건물 · 유리창 */}
      <path d="M10 188 V24 C10 15 16 10 25 10 H125 C134 10 140 15 140 24 V188 Z" fill="#a9cff5" stroke={OUT} strokeWidth="1.8" strokeLinejoin="round" />
      {[0, 1, 2, 3, 4, 5].map((r) =>
        [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={22 + c * 27} y={34 + r * 11} width="21" height="7.4" rx="3" fill="#e8f5ff" opacity="0.9" />),
      )}
      <path d="M12 80 L62 32 H82 L12 98 Z" fill="#ffffff" opacity="0.16" />
      {/* 꼭대기 간판 */}
      <rect x="42" y="15" width="66" height="13" rx="6.5" fill="#ffffff" stroke={OUT} strokeWidth="1.4" />
      <circle cx="53" cy="21.5" r="4.6" fill="#ffd34d" stroke={OUT} strokeWidth="1.1" />
      <path d="M53 18.6 l0.9 1.9 2.1 0.3 -1.5 1.5 0.4 2.1 -1.9 -1 -1.9 1 0.4 -2.1 -1.5 -1.5 2.1 -0.3 z" fill="#ffffff" />
      <rect x="61" y="19" width="38" height="2.4" rx="1.2" fill="#9fb3cf" />
      <rect x="61" y="23" width="26" height="2.2" rx="1.1" fill="#c3d0e2" />
      {/* '환영합니다!' 현수막 */}
      <path d="M18 104 L12 98 M132 104 L138 98" stroke={OUT} strokeWidth="1.2" />
      <rect x="15" y="101" width="120" height="23" rx="4" fill="#ff6f6f" stroke={OUT} strokeWidth="1.6" />
      <path d="M20 104.6 H130" stroke="#ffffff" strokeWidth="1" opacity="0.45" strokeLinecap="round" />
      <text x="75" y="117.2" textAnchor="middle" fontSize="12.5" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif">
        환영합니다!
      </text>
      {/* 줄무늬 차양 */}
      {Array.from({ length: 10 }, (_, i) => {
        const x0 = 22 + i * 10.6;
        const fill = i % 2 ? "#ffffff" : "#ff8a8a";
        return (
          <g key={`aw${i}`}>
            <rect x={x0} y="131" width="10.6" height="8" fill={fill} />
            <path d={`M${x0} 139 a5.3 5.3 0 0 0 10.6 0 Z`} fill={fill} />
          </g>
        );
      })}
      <path d={`M22 139 V131 H128 V139${Array.from({ length: 10 }, () => " a5.3 5.3 0 0 1 -10.6 0").join("")}`} fill="none" stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" />
      {/* 정문 */}
      <rect x="40" y="145" width="70" height="42" rx="2" fill="#e6f3ff" stroke={OUT} strokeWidth="1.8" />
      <path d="M75 145 V187 M57.5 145 V187 M92.5 145 V187" stroke="#9fb8d3" strokeWidth="1.4" />
      <path d="M71 162 v8 M79 162 v8" stroke={OUT} strokeWidth="2" strokeLinecap="round" />
      <path d="M44 152 l7 -5" stroke="#ffffff" strokeWidth="2" opacity="0.9" strokeLinecap="round" />
      {/* 화분과 풍선 */}
      {(
        [
          [18, "#ff9fb6", 12, 112],
          [116, "#ffd166", 136, 108],
        ] as const
      ).map(([x, balloon, bx, by]) => (
        <g key={x}>
          <path d={`M${x + 8} 172 C${x + 8} 150 ${bx} 140 ${bx} ${by + 8}`} stroke="#9aa3b1" strokeWidth="0.9" fill="none" />
          <ellipse cx={bx} cy={by} rx="6" ry="7.2" fill={balloon} stroke={OUT} strokeWidth="1.3" />
          <path d={`M${bx - 2.6} ${by - 3} q1.2 -2 3.2 -1.8`} stroke="#ffffff" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" />
          <path d={`M${bx - 1.2} ${by + 7.4} h2.4 l-1.2 2 z`} fill={balloon} stroke={OUT} strokeWidth="0.8" strokeLinejoin="round" />
          <circle cx={x + 4} cy="171" r="5.4" fill="#79c167" stroke={OUT} strokeWidth="1.3" />
          <circle cx={x + 11} cy="169.6" r="6.4" fill="#8fd07e" stroke={OUT} strokeWidth="1.3" />
          <rect x={x} y="174" width="16" height="12" rx="2.6" fill="#f2906a" stroke={OUT} strokeWidth="1.4" />
        </g>
      ))}
      <rect x="32" y="186" width="86" height="4" rx="2" fill="#d4dbe5" stroke={OUT} strokeWidth="1.2" />
    </svg>
  );
}

/** 자동차: 오픈카 뒤쪽 (viewBox 230 × 100). 의자 등받이 · 실내 가장자리 (운전하는 캐릭터보다 뒤) */
export function CarBack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 230 100" aria-hidden overflow="visible" className={className}>
      <path d="M44 62 V45 C44 39.6 47.6 36.4 53 36.4 H58 C63.4 36.4 67 39.6 67 45 V62 Z" fill="#ffe2b6" stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M50 44 V58" stroke="#f3c98e" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M82 62 V40 C82 34.6 85.6 31.4 91 31.4 H95 C100.4 31.4 104 34.6 104 40 V62 Z" fill="#ffe2b6" stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M88 40 V58" stroke="#f3c98e" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M72 57.2 H154" stroke="#2f8f84" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 자동차: 오픈카 앞쪽 (viewBox 230 × 100). 몸체 · 앞유리 · 운전대 · 바퀴 · 트렁크의 선물 리본 (캐릭터 다리를 가린다).
 * 운전대 고리는 앞으로 뻗은 두 손(캐릭터 손 ≈ x 117 · 141, y 56)에 걸친다
 */
export function CarFront({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 230 100" aria-hidden overflow="visible" className={className}>
      {/* 앞유리 */}
      <path
        d="M158 60 L149.4 33.6 C149 32.2 149.8 31 151.2 31 H153.4 C154.8 31 155.8 31.8 156.2 33 L165.4 60 Z"
        fill="#e8f5ff"
        fillOpacity="0.75"
        stroke={OUT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* 운전대 */}
      <path d="M154 64 L130 55" stroke={OUT} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M154 64 L130 55" stroke="#9aa3b1" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="128.8" cy="54.6" rx="12.8" ry="3.4" transform="rotate(-10 128.8 54.6)" fill="none" stroke={OUT} strokeWidth="3.8" />
      <ellipse cx="128.8" cy="54.6" rx="12.8" ry="3.4" transform="rotate(-10 128.8 54.6)" fill="none" stroke="#6b7385" strokeWidth="1.6" />
      {/* 몸체 */}
      <path
        d="M18 86 C10 86 6 81 6 74 V68 C6 62.6 10.6 59 17 59 H150 C170 59 196 61 212 65 C221 67.4 226 72 226 78 C226 82.6 222.6 86 218 86 Z"
        fill="#5fd0c2"
        stroke={OUT}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M35 86 a17 17 0 0 1 34 0 Z M163 86 a17 17 0 0 1 34 0 Z" fill="#3f5059" stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 66 H200" stroke="#ffffff" strokeWidth="2.6" opacity="0.45" strokeLinecap="round" />
      <path d="M76 60 V82 M146 60 V80" stroke={OUT} strokeWidth="1.1" opacity="0.55" />
      <rect x="126" y="65.6" width="11" height="3" rx="1.5" fill="#3a9f93" stroke={OUT} strokeWidth="0.9" />
      <ellipse cx="221.6" cy="70" rx="3.4" ry="4.4" fill="#fff4b8" stroke={OUT} strokeWidth="1.3" />
      <rect x="5" y="64" width="5" height="8" rx="2" fill="#ff6b6b" stroke={OUT} strokeWidth="1.1" />
      <rect x="202" y="80" width="27" height="6.4" rx="3.2" fill="#e1e6ec" stroke={OUT} strokeWidth="1.4" />
      <rect x="2" y="80" width="24" height="6.4" rx="3.2" fill="#e1e6ec" stroke={OUT} strokeWidth="1.4" />
      <path d="M160 59 l5 -6 h6 c1.6 0 2.4 1.4 1.6 2.8 l-1.4 2.4 -6.8 3.6 z" fill="#5fd0c2" stroke={OUT} strokeWidth="1.2" strokeLinejoin="round" />
      {/* 트렁크의 선물 리본 */}
      <path d="M36 59.6 V84.6" stroke={OUT} strokeWidth="6.4" />
      <path d="M36 60.4 V83.8" stroke="#ff6b6b" strokeWidth="4" />
      <path d="M34 60 l-6 11 M38 60 l6 11" stroke={OUT} strokeWidth="4.8" strokeLinecap="round" />
      <path d="M34 60 l-6 11 M38 60 l6 11" stroke="#ff6b6b" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36 56 C24 42 16 56 29.6 60 Z M36 56 C48 42 56 56 42.4 60 Z" fill="#ff6b6b" stroke={OUT} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="36" cy="57" r="3.8" fill="#ff8585" stroke={OUT} strokeWidth="1.3" />
      {/* 바퀴 */}
      {wheel(52, 85, 14)}
      {wheel(180, 85, 14)}
    </svg>
  );
}
