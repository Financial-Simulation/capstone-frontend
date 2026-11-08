"use client";

/**
 * 확인 · 경고 모달. 브라우저의 <dialog>를 써서 포커스가 모달 안에 머물고, Esc로 닫힌다.
 *
 *   <Modal open={open} title="이어서 할까요?" onClose={close} actions={<Button …/>}>본문</Modal>
 */
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({
  open,
  title,
  tone = "neutral",
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  /** warn: 경고 모달 (주황 띠) */
  tone?: "neutral" | "warn";
  /** Esc · ✕ · 바깥 클릭 */
  onClose: () => void;
  children?: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // 바깥(배경)을 누르면 닫는다
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {open && (
        <div className={tone === "warn" ? "border-t-4 border-warn-line" : ""}>
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <h2 id={titleId} className="text-lg font-bold leading-snug">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-mr-1 -mt-1 rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-canvas hover:text-ink"
            >
              ✕
            </button>
          </div>
          {children && <div className="px-5 pt-2 text-[15px] leading-relaxed text-ink-soft">{children}</div>}
          <div className="flex flex-wrap justify-end gap-2 px-5 pb-5 pt-5">{actions}</div>
        </div>
      )}
    </dialog>
  );
}
