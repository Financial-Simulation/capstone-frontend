/**
 * 00 시작 화면. '시뮬레이션 시작하기' · '예시 결과 보기'는 StartActions(저장값이 있으면 '이어서 할까요?').
 */
import { SIMULATION_PATHS } from "@/config/policy";
import { StartActions } from "./StartActions";

export function StartScreen() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-primary">00 시작</p>
      <h1 className="mt-2 text-3xl font-bold leading-snug tracking-tight">
        5년 뒤 목표 금액, 실제로 모을 수 있을까요?
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        월급·지출·대출과 목표를 넣으면, 실직이나 급한 지출이 생기는 미래 {SIMULATION_PATHS.toLocaleString("ko-KR")}개를 계산해서 목표를 모을 가능성을
        알려 줘요. 계산기 결과도 나란히 보여 드려요.
      </p>

      <StartActions />

      <p className="mt-6 text-sm text-muted">
        입력한 값은 이 브라우저에만 저장돼요. 내가 입력한 값은 예시 결과를 봐도 바뀌지 않아요.
      </p>
    </div>
  );
}
