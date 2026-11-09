"use client";

/**
 * 둘~넷 중 하나 고르기 (정규직/계약직, 합계로/항목별로, 대출 있음/없음).
 * 진짜 라디오 버튼이라 화살표 키로 옮겨 가고, 화면 읽기 프로그램도 그대로 읽는다.
 */
export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export function Choice<T extends string>({
  id,
  name,
  value,
  options,
  onChange,
  invalid = false,
  describedBy,
  label,
}: {
  /** 첫 번째 라디오의 id (Field 라벨이 가리킴) */
  id: string;
  name: string;
  value: T | null | undefined;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  invalid?: boolean;
  describedBy?: string;
  /** 화면 읽기 프로그램용 묶음 이름 */
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`inline-flex flex-wrap gap-1 rounded-lg border p-1 ${invalid ? "border-danger-line" : "border-line-strong"} bg-surface`}
    >
      {options.map((option, index) => {
        const checked = value === option.value;
        const optionId = index === 0 ? id : `${id}-${option.value.toLowerCase()}`;
        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className={[
              "cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-primary",
              checked ? "bg-primary text-white" : "text-ink-soft hover:bg-canvas",
            ].join(" ")}
          >
            <input
              id={optionId}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
