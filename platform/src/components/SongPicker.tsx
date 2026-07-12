"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { KeyBadge } from "./ui";
import { ALL_KEYS, fmtDuration } from "@/lib/music";
import type { LibrarySong } from "@/lib/types";

const CHART_TONE: Record<string, string> = {
  builtin: "bg-coral-100 text-coral-600",
  pdf: "bg-ok-tint text-ok-ink",
  none: "bg-cream-200 text-charcoal-400",
};
const CHART_LABEL: Record<string, string> = {
  builtin: "Chart",
  pdf: "PDF",
  none: "Links",
};

type StagedSong = { lib: LibrarySong; key: string };

// Multi-select song picker. Search the library, stage one or more songs with
// individual key overrides, then commit everything at once with Done.
export function SongPicker({
  open,
  onClose,
  onPick,
  onCreateBlank,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (picks: StagedSong[]) => void;
  onCreateBlank: () => void;
}) {
  const { songLibrary } = useStore();
  const [q, setQ] = useState("");
  const [staged, setStaged] = useState<StagedSong[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setStaged([]);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const sorted = [...songLibrary].sort((a, b) => a.title.localeCompare(b.title));
    const term = q.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((l) =>
      (l.title + " " + l.artist).toLowerCase().includes(term),
    );
  }, [q, songLibrary]);

  const isStaged = (libId: string) => staged.some((s) => s.lib.id === libId);

  const stageIt = (lib: LibrarySong) => {
    if (isStaged(lib.id)) return;
    setStaged((prev) => [...prev, { lib, key: lib.originalKey }]);
  };

  const unstage = (libId: string) =>
    setStaged((prev) => prev.filter((s) => s.lib.id !== libId));

  const setKey = (libId: string, key: string) =>
    setStaged((prev) =>
      prev.map((s) => (s.lib.id === libId ? { ...s, key } : s)),
    );

  const handleDone = () => {
    if (staged.length > 0) onPick(staged);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Add songs from your library"
    >
      <div
        className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 mt-8 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-2xl">

        {/* Header */}
        <div className="border-b border-charcoal-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-charcoal-900">Add from your library</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 transition hover:bg-cream-200 hover:text-charcoal-800"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-charcoal-200 bg-cream-100 px-3 py-2 focus-within:border-coral-400 focus-within:bg-white">
            <Icon name="music" size={16} className="text-charcoal-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or artist…"
              className="w-full bg-transparent text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400"
            />
          </div>
        </div>

        {/* Library list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-charcoal-400">
              {songLibrary.length === 0
                ? "Your library is empty. Create a song to start building it."
                : "No songs match that search."}
            </p>
          ) : (
            results.map((lib) => {
              const already = isStaged(lib.id);
              return (
                <button
                  key={lib.id}
                  onClick={() => stageIt(lib)}
                  disabled={already}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    already
                      ? "opacity-40 cursor-default"
                      : "hover:bg-cream-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-charcoal-800">
                      {lib.title}
                    </div>
                    <div className="truncate text-xs text-charcoal-400">
                      {lib.artist || "—"} · {fmtDuration(lib.durationSec)} · {lib.defaultFlow}
                    </div>
                  </div>
                  <KeyBadge k={lib.originalKey} />
                  <span
                    className={`hidden rounded-full px-2 py-0.5 text-[0.65rem] font-semibold sm:inline ${CHART_TONE[lib.chartSource]}`}
                  >
                    {CHART_LABEL[lib.chartSource]}
                  </span>
                  {already ? (
                    <Icon name="check" size={16} className="text-coral-400 shrink-0" />
                  ) : (
                    <Icon name="plus" size={16} className="text-coral-500 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Staged songs */}
        {staged.length > 0 && (
          <div className="border-t border-charcoal-100 bg-cream-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-400">
              Selected ({staged.length})
            </p>
            <div className="space-y-2">
              {staged.map(({ lib, key }) => (
                <div
                  key={lib.id}
                  className="flex items-center gap-2 rounded-lg border border-charcoal-100 bg-white px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-charcoal-800">
                    {lib.title}
                  </span>
                  <label className="flex items-center gap-1 text-xs text-charcoal-400 shrink-0">
                    Key
                    <select
                      value={key}
                      onChange={(e) => setKey(lib.id, e.target.value)}
                      className="ml-1 rounded-md border border-charcoal-200 bg-white px-1.5 py-0.5 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                    >
                      {ALL_KEYS.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() => unstage(lib.id)}
                    aria-label={`Remove ${lib.title}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-charcoal-400 transition hover:bg-cream-200 hover:text-error"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-charcoal-100 p-3">
          <button
            onClick={onCreateBlank}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
          >
            <Icon name="plus" size={16} /> New song
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={staged.length === 0}
              className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-40 disabled:cursor-default"
            >
              Done{staged.length > 0 ? ` (${staged.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
