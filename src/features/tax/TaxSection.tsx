/**
 * 결과 화면 '세금' (위험 아래, 명세서 v1.7 9.2). 보여 줄 값은 tax.ts의 taxView가 서버 응답(/simulate의 tax)에서 고른다.
 * 04 결과에만 붙인다 (04-E 예시에는 붙이지 않는다, 명세서 9.1).
 */
import Link from "next/link";
import { StatCard } from "@/components/ui/Stat";
import type { TaxView } from "./tax";

export function TaxSection({ view }: { view: TaxView }) {
  return (
    <section aria-labelledby="tax-title">
      <h2 id="tax-title" className="text-base font-bold">
        세금
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{view.intro}</p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.cards.map((card) => (
          <StatCard key={card.key} title={card.title} value={card.value} tone={card.tone} detail={card.detail} />
        ))}
      </ul>
      {view.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1.5 rounded-xl border border-line bg-surface py-4 pl-9 pr-5 text-sm text-ink-soft">
          {view.notes.map((note) => (
            <li key={note.key}>
              {note.text}
              {note.link && (
                <Link href={note.link.href} className="ml-1.5 font-semibold text-primary underline-offset-2 hover:underline">
                  {note.link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
