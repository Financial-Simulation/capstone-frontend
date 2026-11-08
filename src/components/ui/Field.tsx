import type { ReactNode } from "react";

/**
 * 입력 칸 하나: 이름 · 칸 · 안내 또는 오류 문장.
 * data-field(입력 경로)로 '다음'을 눌렀을 때 첫 번째 오류 칸을 찾아간다.
 * 고르는 칸(라디오 묶음 · 연월)은 group으로 fieldset/legend를 쓴다.
 */
export function Field({
  id,
  path,
  label,
  required = false,
  hint,
  error,
  highlight = false,
  group = false,
  aside,
  mark = true,
  children,
}: {
  /** 칸(input)의 id. 오류 문장의 id는 `${id}-error`, 안내는 `${id}-hint` */
  id: string;
  /** 입력 경로 ("person.age") */
  path?: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** 경고 모달의 '수정하기'로 왔을 때 강조 */
  highlight?: boolean;
  group?: boolean;
  /** 이름 오른쪽에 붙는 작은 글 (예: 기본값) */
  aside?: ReactNode;
  /** (필수)/(선택) 표시. 묶음 제목에 이미 있으면 끈다 */
  mark?: boolean;
  children: ReactNode;
}) {
  const title = (
    <>
      {label}
      {mark && <span className="ml-1 text-xs font-medium text-muted">{required ? "(필수)" : "(선택)"}</span>}
      {aside && <span className="ml-2 text-xs font-normal text-muted">{aside}</span>}
    </>
  );
  const labelClass = "text-sm font-semibold text-ink";
  const message = error ? (
    <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
      {error}
    </p>
  ) : hint ? (
    <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
      {hint}
    </p>
  ) : null;
  const frame = highlight ? "rounded-lg outline-2 outline-offset-4 outline-warn-line [outline-style:solid]" : "";

  if (group) {
    return (
      <fieldset data-field={path} className={`min-w-0 ${frame}`}>
        <legend className={labelClass}>{title}</legend>
        <div className="mt-1.5">{children}</div>
        {message}
      </fieldset>
    );
  }
  return (
    <div data-field={path} className={frame}>
      <label htmlFor={id} className={labelClass}>
        {title}
      </label>
      <div className="mt-1.5">{children}</div>
      {message}
    </div>
  );
}

/** 칸의 aria-describedby: 오류가 있으면 오류, 없으면 안내 */
export function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
