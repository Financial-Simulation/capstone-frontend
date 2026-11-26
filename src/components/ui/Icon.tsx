/** 선 아이콘 (이모지 대신). 24칸 격자, 색은 글자색을 따라간다 */
const PATHS = {
  cash: "M3 7h18v10H3z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M6.5 10v4 M17.5 10v4",
  tax: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",
  saving: "M12 3v18 M16.5 7.5c-.8-1-2.3-1.5-4.5-1.5-2.4 0-4 1-4 2.8 0 4 9 1.700 9 5.700 0 1.800-1.700 3-4.500 3-2.200 0-3.800-.6-4.800-1.800",
  loan: "M3 11l9-7 9 7 M5.500 9.500V20h13V9.500 M10 20v-6h4v6",
  safety: "M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6z M9 12l2.200 2.200L15.500 10",
  check: "M5 12.500l4.500 4.500L19 7.500",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .900-1 1.700 M12 17h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  close: "M6 6l12 12 M18 6L6 18",
  edit: "M4 20h4L19 9l-4-4L4 16z M13.500 6.500l4 4",
  chevron: "M9 6l6 6-6 6",
  chart: "M4 20V4 M4 20h16 M8 15l4-4 3 3 5-6",
  pie: "M12 3v9h9 M20.500 14A9 9 0 1 1 10 3.500",
  sliders: "M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4",
  link: "M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1 M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3.500-6 8-6s8 2 8 6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
