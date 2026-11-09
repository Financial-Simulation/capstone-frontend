/**
 * 리포트 한 장 (화면에서는 흰 종이, 인쇄하면 A4). 보여 줄 값은 report.ts의 reportView가 고른다.
 * 인쇄할 때는 표 줄이 페이지 사이에서 잘리지 않고, 작은 묶음은 한 페이지에 모이게 한다 (globals.css의 @page).
 */
import type { ReactNode } from "react";
import { DiffText } from "@/components/ui/Stat";
import { PLAN_COMPARE_HEADERS } from "@/features/plan/plan";
import type { MoneyCell, ReportCell, ReportView } from "./report";

export function ReportPaper({ view }: { view: ReportView }) {
  return (
    <article className="mx-auto max-w-[820px] rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight">{view.title}</h1>
        <p className="mt-1 text-xs text-ink-soft">{view.meta}</p>
        <p className="mt-4 border-l-4 border-primary pl-3 text-[15px] font-bold leading-relaxed">{view.headline}</p>
      </header>

      <Section title="입력 요약">
        <Cells cells={view.summary} />
      </Section>

      <Section title="목표">
        <Cells cells={view.goal} />
      </Section>

      <Section title="앞으로 모을 돈">
        <Table head={["시점", "최악의 경우 (하위 5%)", "아래 10%", "중간값", "위 10%"]} numeric minWidth="min-w-[30rem]">
          {view.forecast.map((row) => (
            <tr key={row.label} className="break-inside-avoid border-b border-line last:border-0">
              <th scope="row" className="whitespace-nowrap py-1.5 pr-3 text-left font-medium">
                {row.label}
              </th>
              <Money cell={row.p5} />
              <Money cell={row.p10} />
              <Money cell={row.p50} strong />
              <Money cell={row.p90} />
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="위험">
        <Cells cells={view.risks} />
        <p className="mt-3">{view.causes}</p>
        {view.notes.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-ink-soft">
            {view.notes.map((note) => (
              <li key={note}>참고: {note}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="세금 (목표 시점까지 평균)">
        <Cells cells={view.tax} />
        <p className="mt-3">{view.allocation}</p>
      </Section>

      <Section title="이렇게 바꿔 보세요 (상위 3개)">
        <Table head={["바꿀 것", "가능성", "차이"]}>
          {view.levers.map((lever) => (
            <tr key={lever.label} className="break-inside-avoid border-b border-line last:border-0">
              <td className="py-1.5 pr-3">{lever.label}</td>
              <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{lever.probability}</td>
              <td className="whitespace-nowrap py-1.5 tabular-nums">{lever.diff}</td>
            </tr>
          ))}
        </Table>
      </Section>

      {view.comparison.length > 0 && (
        <Section title="담은 계획 비교">
          <Table head={PLAN_COMPARE_HEADERS} minWidth="min-w-[44rem]">
            {view.comparison.map((row) => (
              <tr key={row.name} className="break-inside-avoid border-b border-line align-top last:border-0">
                <td className="py-1.5 pr-3 font-semibold">{row.name}</td>
                <td className="whitespace-nowrap py-1.5 pr-3">
                  <span className="font-semibold tabular-nums">{row.probability}</span>
                  <DiffText diff={row.diff} />
                </td>
                <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{row.debt}</td>
                <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{row.worst}</td>
                <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{row.earlyTermination}</td>
                <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{row.subsidy}</td>
                <td className="whitespace-nowrap py-1.5 tabular-nums">{row.taxNetBenefit}</td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      <Section title="근거 (적용 가정)" keepTogether={false}>
        <Table head={["항목", "값", "등급", "출처", "자료 기간"]} minWidth="min-w-[40rem]" small>
          {view.parameters.map((p) => (
            <tr key={p.key} className="break-inside-avoid border-b border-line align-top last:border-0">
              <td className="py-1.5 pr-3 font-medium">{p.label}</td>
              <td className="py-1.5 pr-3">{p.value}</td>
              <td className="py-1.5 pr-3 font-semibold">{p.grade}</td>
              <td className="py-1.5 pr-3 text-ink-soft">{p.source}</td>
              <td className="py-1.5 text-ink-soft">{p.asOf}</td>
            </tr>
          ))}
        </Table>
        {view.gradeLegend && <p className="mt-2 text-xs text-ink-soft">{view.gradeLegend}</p>}
      </Section>

      <p className="mt-6 break-inside-avoid border-t border-line pt-4 font-semibold">{view.disclaimer}</p>
    </article>
  );
}

/** 제목(굵은 밑줄) + 내용. 작은 묶음은 인쇄할 때 페이지 사이에서 나뉘지 않게 */
function Section({ title, keepTogether = true, children }: { title: string; keepTogether?: boolean; children: ReactNode }) {
  return (
    <section className={`mt-6 ${keepTogether ? "break-inside-avoid" : ""}`}>
      <h2 className="break-after-avoid border-b-2 border-ink pb-1 text-[15px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** 이름 · 값 칸들 (휴대폰 2줄, 넓은 화면 · 인쇄 3줄) */
function Cells({ cells }: { cells: ReportCell[] }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0">
          <dt className="text-xs text-ink-soft">{cell.label}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 표. 칸이 많으면(minWidth) 휴대폰에서 옆으로 밀어 보고, 인쇄할 때는 종이 폭에 맞춘다 */
function Table({
  head,
  numeric = false,
  minWidth = "",
  small = false,
  children,
}: {
  head: readonly string[];
  /** 첫 칸 말고는 숫자 (오른쪽 정렬) */
  numeric?: boolean;
  /** 이보다 좁으면 옆으로 민다 (예: "min-w-[40rem]") */
  minWidth?: string;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    // relative: 표 안의 글자가 이 상자 밖으로 나가 페이지를 가로로 늘리지 않게
    <div className="relative mt-3 overflow-x-auto print:overflow-visible">
      <table className={`w-full ${minWidth} ${small ? "text-xs" : ""} print:min-w-0`}>
        <thead>
          <tr className="border-b border-line text-xs text-ink-soft">
            {head.map((label, i) => (
              <th key={label} className={`py-1.5 font-semibold ${i < head.length - 1 ? "pr-3" : ""} ${numeric && i > 0 ? "text-right" : "text-left"}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Money({ cell, strong = false }: { cell: MoneyCell; strong?: boolean }) {
  return (
    <td className={`whitespace-nowrap py-1.5 pr-3 text-right tabular-nums last:pr-0 ${strong ? "font-semibold" : ""} ${cell.negative ? "text-danger" : ""}`}>
      {cell.text}
    </td>
  );
}
