/**
 * 러너스 하이 불꽃 머리 (RunnerHead가 그린다): 머리카락 대신 머리 위 · 뒤에서 불꽃이 솟는다.
 *  - 머리카락 모양(밑바탕)은 없다. 밑동이 둥근 불꽃 여러 개가 머리 위 · 뒤에서 바로 솟아 달리는 반대쪽(뒤)으로 휘어 일렁이고,
 *    이마에는 둥근 밑동들이 물결처럼 닿는다.
 *  - 얼굴 · 머리처럼 두 번 그린다: 진한 굵은 윤곽(pass="outline")을 먼저, 그 위에 같은 모양을 불꽃 색(pass="fill")으로.
 *    그래서 불꽃끼리 겹친 안쪽에는 선이 없고 바깥 둘레만 한 줄로 보인다. 두 번 모두 같은 움직임이라 함께 일렁인다.
 *  - 불꽃 색은 머리 쪽이 밝은 주황, 끝으로 갈수록 빨강. 불꽃 안의 속불(밝은 노랑)은 더 빠르게 일렁이고, 불똥이 뒤로 튄다.
 * 좌표는 Runner와 같은 viewBox(200 × 250). 움직임은 high.css (rn-fireHair · rn-flameSet · rn-flame · rn-flameCore · rn-ember).
 */
import type { CSSProperties } from "react";

/** 불꽃: 둥근 밑동의 가운데(x, y, 머리 안쪽) · 밑동 너비 · 길이 · 뻗는 방향(도, 270 = 위 · 180 = 뒤) · 일렁이는 빠르기(초) · 시작 늦춤(초) */
interface Flame {
  x: number;
  y: number;
  w: number;
  len: number;
  angle: number;
  t: number;
  d: number;
}

/** 이마 위에서 뒤통수까지 머리를 덮는다: 이마 쪽은 거의 위로, 뒤통수로 갈수록 뒤로 눕는다 (밑동은 눈썹보다 위) */
const FLAMES: readonly Flame[] = [
  { x: 146, y: 42, w: 32, len: 56, angle: 252, t: 0.36, d: 0 },
  { x: 124, y: 32, w: 38, len: 76, angle: 241, t: 0.42, d: -0.14 },
  { x: 98, y: 30, w: 42, len: 88, angle: 230, t: 0.38, d: -0.28 },
  { x: 74, y: 38, w: 40, len: 84, angle: 217, t: 0.44, d: -0.06 },
  { x: 58, y: 56, w: 36, len: 72, angle: 204, t: 0.4, d: -0.2 },
  { x: 52, y: 80, w: 30, len: 56, angle: 190, t: 0.46, d: -0.34 },
];

/** 속불: 불꽃 길이의 20%만큼 나간 자리에서 시작하는 48% 크기의 불꽃 */
const CORE = { scale: 0.48, from: 0.2 };

/** 불똥: 불꽃 끝 근처에서 뒤로 튀어 사라진다 (자리 · 시작 늦춤 · 흐름) */
const EMBERS = [
  { x: 118, y: -40, d: 0, dx: -10, dy: -22 },
  { x: 72, y: -40, d: -0.3, dx: -14, dy: -18 },
  { x: 26, y: -8, d: -0.6, dx: -18, dy: -10 },
  { x: -4, y: 40, d: -0.15, dx: -18, dy: -4 },
  { x: 150, y: -10, d: -0.45, dx: -8, dy: -20 },
];

/**
 * 불꽃 하나: 밑동은 둥글고(촛불처럼), 한쪽은 부풀었다가 끝이 살짝 말리며, 다른 쪽은 중간에 작은 불길이 한 번 튀어나온다.
 * 둥근 밑동끼리 겹쳐 이마에 물결 모양으로 닿는다. scale · from은 속불용 (밑동에서 from만큼 나가서 scale배 크기로)
 */
function flamePath({ x, y, w, len, angle }: Flame, scale = 1, from = 0): string {
  const a = (angle * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const [nx, ny] = [-dy, dx];
  // u: 뻗는 쪽으로 길이의 몇 배, v: 옆으로 너비의 몇 배
  const at = (u: number, v: number) =>
    `${(x + dx * (from + u * len * scale) + nx * v * w * scale).toFixed(1)} ${(y + dy * (from + u * len * scale) + ny * v * w * scale).toFixed(1)}`;
  const bottom = -0.62 * (w / len);
  return (
    `M${at(0, 0.5)} C${at(0.3, 0.62)} ${at(0.75, 0.5)} ${at(1, 0.3)} ` +
    `C${at(0.8, 0.02)} ${at(0.64, -0.08)} ${at(0.6, -0.38)} ` +
    `C${at(0.46, -0.3)} ${at(0.3, -0.72)} ${at(0, -0.5)} ` +
    // 둥근 밑동: 반대쪽(머리 안쪽)으로 부풀려 닫는다
    `C${at(bottom, -0.5)} ${at(bottom, 0.5)} ${at(0, 0.5)} Z`
  );
}

/** 불꽃마다 흔들리는 중심(밑동)과 빠르기 */
function swayStyle({ x, y, t, d }: Flame): CSSProperties {
  return { transformOrigin: `${x}px ${y}px`, "--t": `${t}s`, "--d": `${d}s` } as CSSProperties;
}

/**
 * pass="outline": 윤곽 줄 (얼굴 윤곽 무리 안에서 그려 그 무리의 진한 색 · 굵은 선을 이어받는다)
 * pass="fill": 불꽃 색 · 속불 · 불똥 (id는 그라디언트 이름)
 */
export function FireHair({ pass, id }: { pass: "outline" | "fill"; id: string }) {
  const fill = pass === "fill";
  return (
    <g className="rn-fireHair" aria-hidden>
      {fill && (
        <defs>
          <linearGradient id={`${id}-flame`} gradientUnits="userSpaceOnUse" x1="0" y1="110" x2="0" y2="-70">
            <stop offset="0" stopColor="#ff9f2e" />
            <stop offset="0.4" stopColor="#ff6a1f" />
            <stop offset="0.75" stopColor="#f0452b" />
            <stop offset="1" stopColor="#d93a2b" />
          </linearGradient>
          <linearGradient id={`${id}-core`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fff6c4" />
            <stop offset="1" stopColor="#ffc93a" />
          </linearGradient>
        </defs>
      )}
      {/* 불꽃 무리 (쉬는 달에는 작아진다) */}
      <g className="rn-flameSet" fill={fill ? `url(#${id}-flame)` : undefined}>
        {FLAMES.map((flame) => (
          <path key={`${flame.x}-${flame.y}`} className="rn-flame" d={flamePath(flame)} style={swayStyle(flame)} />
        ))}
        {/* 속불: 불꽃과 같이 흔들리면서(같은 rn-flame) 안에서 더 빠르게 일렁인다. 불꽃을 다 칠한 뒤에 얹는다 */}
        {fill &&
          FLAMES.map((flame) => (
            <g key={`core-${flame.x}-${flame.y}`} className="rn-flame" style={swayStyle(flame)}>
              <path className="rn-flameCore" d={flamePath(flame, CORE.scale, flame.len * CORE.from)} fill={`url(#${id}-core)`} opacity="0.9" />
            </g>
          ))}
      </g>
      {fill && (
        <g fill="#ffb347" stroke="#e8590c" strokeWidth="0.8">
          {EMBERS.map((ember) => (
            <circle
              key={`${ember.x}-${ember.y}`}
              className="rn-ember"
              cx={ember.x}
              cy={ember.y}
              r="2.8"
              style={{ "--d": `${ember.d}s`, "--dx": `${ember.dx}px`, "--dy": `${ember.dy}px` } as CSSProperties}
            />
          ))}
        </g>
      )}
    </g>
  );
}
