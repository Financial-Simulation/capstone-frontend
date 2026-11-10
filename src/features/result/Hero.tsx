/**
 * 목업 응답이면 그렇다고 밝힌다 (MockNote, 정할 것 1번). 결과 맨 위 결론은 SimpleSections.tsx의 SimpleHero.
 */
import { Badge } from "@/components/ui";
import type { MockMatch } from "@/mocks/handlers";

/** 목업이면 그렇다고 밝힌다 (정할 것 1번) */
export function MockNote({ match }: { match?: MockMatch }) {
  const exact = match?.exact ?? false;
  return (
    <div
      role="note"
      className={`rounded-lg border px-4 py-3 text-sm ${exact ? "border-line bg-mock-soft/60" : "border-warn-line bg-warn-soft"}`}
    >
      <p className="font-semibold">
        <Badge tone="mock">목업</Badge>{" "}
        {exact
          ? `정답 파일(analysis_golden.json)의 ${match?.caseKey ?? ""} 계산 결과예요.`
          : "입력한 값과 같은 정답 케이스가 없어 S1 결과를 대신 보여 줘요. 숫자가 내 입력과 달라요."}
      </p>
      <p className="mt-1 text-ink-soft">
        백엔드 /simulate가 붙으면 같은 seed로 같은 숫자가 나와요.{match?.note && exact ? ` ${match.note}.` : ""}
      </p>
    </div>
  );
}
