import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong disabled:bg-line-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-canvas disabled:text-muted",
  ghost: "text-ink-soft hover:bg-canvas hover:text-ink disabled:text-muted",
  danger: "border border-danger-line bg-surface text-danger hover:bg-danger-soft",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-3 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors",
    "disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

/** 입력 화면의 묶음 (나 · 소득 · 지출 …) */
export function FormSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

/** 글자 칸 (이름 등) */
export function textInputClass(invalid = false): string {
  return [
    "h-11 w-full rounded-lg border bg-surface px-3 text-[15px] placeholder:text-muted",
    invalid ? "border-danger-line" : "border-line-strong",
  ].join(" ");
}

type Tone = "neutral" | "primary" | "danger" | "warn" | "mock";

const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-soft",
  primary: "bg-primary-soft text-primary",
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  mock: "bg-mock-soft text-mock",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
