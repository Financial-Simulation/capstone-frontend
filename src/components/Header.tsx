import Link from "next/link";
import { devToolsEnabled } from "@/config/env";
import { ROUTES } from "@/lib/steps";

/** 모든 화면 공통 헤더: '처음으로' → 00 시작, '예시 결과' → 04-E */
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href={ROUTES.start} className="min-w-0 truncate text-sm font-bold tracking-tight text-ink sm:text-[15px]">
          사회초년생 금융 시뮬레이터
        </Link>
        <nav aria-label="주요 메뉴" className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
          <Link
            href={ROUTES.start}
            className="whitespace-nowrap rounded-md px-2 py-2 text-ink-soft hover:bg-canvas hover:text-ink sm:px-3"
          >
            처음으로
          </Link>
          <Link
            href={ROUTES.example}
            className="whitespace-nowrap rounded-md px-2 py-2 text-ink-soft hover:bg-canvas hover:text-ink sm:px-3"
          >
            예시 결과
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted">
        <p>입력한 값은 이 브라우저에만 저장돼요. 서버에는 저장하지 않고, 계산할 때마다 입력 전체를 보내요.</p>
        {devToolsEnabled() && (
          <Link href={ROUTES.dev} className="font-semibold text-mock hover:underline">
            개발 점검
          </Link>
        )}
      </div>
    </footer>
  );
}
