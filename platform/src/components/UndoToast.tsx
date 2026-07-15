"use client";

import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

export function UndoToast() {
  const { undoAction, undo, saveStatus } = useStore();

  return (
    <>
      <div
        className="no-print fixed right-3 top-[4.75rem] z-50 rounded-full border border-charcoal-100 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-charcoal-500 shadow-sm backdrop-blur lg:bottom-4 lg:right-5 lg:top-auto"
        role="status"
        aria-live="polite"
      >
        {saveStatus === "saving" ? "Saving…" : "Saved"}
      </div>
      {undoAction && (
        <div
          className="no-print anim-sheet-up fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl bg-charcoal-900 px-4 py-3 text-white shadow-[var(--shadow-lg)] lg:bottom-7"
          role="status"
          aria-live="assertive"
        >
          <Icon name="check" size={16} className="shrink-0 text-coral-400" />
          <span className="min-w-0 flex-1 text-sm font-semibold">{undoAction.label}</span>
          <button
            onClick={undo}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}
