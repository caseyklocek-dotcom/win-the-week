"use client";

// ============================================================
// Library Import — bring your whole binder.
//
// Drop any number of chart PDFs, photos, or screenshots on the songs page
// (or paste chart text) and each becomes a complete library song: editable
// chart, title, artist, key, tempo, CCLI number, themes, and a suggested
// flow — read straight off the page. Files process one at a time with a
// visible queue; originals are archived to storage when it's available.
// ============================================================

import { useRef, useState, type DragEvent } from "react";
import { Icon } from "./Icon";
import {
  CHART_FILE_ACCEPT,
  CHART_FILE_MIMES,
  parseChartFromFile,
  parseChartFromText,
} from "@/lib/parseChart";
import { librarySongFromParsed } from "@/lib/library";
import { uploadChartPdf } from "@/lib/storage";
import { useStore } from "@/lib/store";

type QueueItem = {
  id: string;
  name: string;
  status: "waiting" | "reading" | "done" | "failed";
  title?: string;
  error?: string;
};

export function LibraryImport() {
  const { addLibrarySong, updateLibrarySong } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasting, setPasting] = useState(false);
  const busyRef = useRef(false);

  const setItem = (id: string, fields: Partial<QueueItem>) =>
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...fields } : it)));

  const processFiles = async (files: File[]) => {
    const usable = files.filter((f) => CHART_FILE_MIMES.includes(f.type));
    if (usable.length === 0) return;
    const items: QueueItem[] = usable.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      status: "waiting",
    }));
    setQueue((q) => [...q, ...items]);
    if (busyRef.current) return; // an earlier call is already draining
    busyRef.current = true;
    // Drain sequentially — kind to the free-tier reader and easy to follow.
    for (let i = 0; i < usable.length; i++) {
      const file = usable[i];
      const item = items[i];
      setItem(item.id, { status: "reading" });
      const parsed = await parseChartFromFile(file);
      if (!parsed.ok) {
        setItem(item.id, { status: "failed", error: parsed.error });
        continue;
      }
      const lib = librarySongFromParsed(parsed.data);
      addLibrarySong(lib);
      // Archive the original file — best effort, non-blocking for the result.
      const up = await uploadChartPdf(lib.id, file);
      if (up.ok) updateLibrarySong(lib.id, { pdfPath: up.path, pdfName: up.name });
      setItem(item.id, { status: "done", title: lib.title });
    }
    busyRef.current = false;
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    processFiles([...e.dataTransfer.files]);
  };

  const submitPaste = async () => {
    if (!pasteText.trim() || pasting) return;
    setPasting(true);
    const parsed = await parseChartFromText(pasteText);
    setPasting(false);
    if (!parsed.ok) {
      setQueue((q) => [
        ...q,
        { id: `paste-${Date.now()}`, name: "Pasted chart", status: "failed", error: parsed.error },
      ]);
      return;
    }
    const lib = librarySongFromParsed(parsed.data);
    addLibrarySong(lib);
    setQueue((q) => [
      ...q,
      { id: `paste-${Date.now()}`, name: "Pasted chart", status: "done", title: lib.title },
    ]);
    setPasteText("");
    setPasteOpen(false);
  };

  const doneCount = queue.filter((i) => i.status === "done").length;
  const working = queue.some((i) => i.status === "reading" || i.status === "waiting");

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={CHART_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          processFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-dashed px-5 py-4 transition ${
          drag ? "border-coral-400 bg-coral-50" : "border-charcoal-100 bg-white"
        }`}
      >
        <Icon
          name={working ? "rotate" : "upload"}
          size={18}
          className={working ? "animate-spin text-coral-500" : "text-charcoal-400"}
        />
        <p className="min-w-0 flex-1 text-sm text-charcoal-600">
          <span className="font-bold text-charcoal-800">Bring your whole binder.</span> Drop chart
          PDFs, photos, or screenshots here — each becomes a song with its chart, key, tempo, and
          CCLI number filled in.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-coral-500 px-4 py-2 text-xs font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            Choose files
          </button>
          <button
            onClick={() => setPasteOpen(true)}
            className="rounded-full border border-charcoal-100 px-4 py-2 text-xs font-semibold text-charcoal-600 transition hover:border-charcoal-200"
          >
            Paste a chart
          </button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {queue.map((it) => (
            <div key={it.id} className="flex items-center gap-2.5 px-1 text-xs">
              {it.status === "reading" && (
                <Icon name="rotate" size={12} className="animate-spin text-coral-500" />
              )}
              {it.status === "waiting" && (
                <span className="h-2 w-2 rounded-full border border-charcoal-200" />
              )}
              {it.status === "done" && <Icon name="check" size={12} className="text-ok-bar" />}
              {it.status === "failed" && <Icon name="x" size={12} className="text-no-bar" />}
              <span className="font-semibold text-charcoal-700">{it.title ?? it.name}</span>
              <span className="text-charcoal-400">
                {it.status === "reading" && "reading the chart…"}
                {it.status === "waiting" && "in line"}
                {it.status === "done" && "added to your library"}
                {it.status === "failed" && (it.error ?? "couldn't read it")}
              </span>
            </div>
          ))}
          {!working && doneCount > 0 && (
            <button
              onClick={() => setQueue([])}
              className="px-1 text-xs font-semibold text-charcoal-400 hover:text-charcoal-600"
            >
              Clear · {doneCount} added
            </button>
          )}
        </div>
      )}

      {pasteOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal-900/30 p-4 backdrop-blur-[2px]"
          onClick={() => setPasteOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-charcoal-100 bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-charcoal-900">Paste a chart</h3>
            <p className="mt-1 text-xs text-charcoal-400">
              Copied from an email, a site, or a doc — chords over lyrics works best.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              placeholder={"Verse 1\n G          C\n Amazing grace, how sweet…"}
              className="mt-3 w-full rounded-xl border border-charcoal-100 bg-cream-50 p-3 font-mono text-xs text-charcoal-800 outline-none focus:border-coral-400"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setPasteOpen(false)}
                className="rounded-full border border-charcoal-100 px-4 py-2 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                onClick={submitPaste}
                disabled={pasting || !pasteText.trim()}
                className="rounded-full bg-coral-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-coral-600 disabled:opacity-60"
              >
                {pasting ? "Reading…" : "Read it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
