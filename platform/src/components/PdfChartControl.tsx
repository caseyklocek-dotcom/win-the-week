"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "./Icon";
import { uploadChartPdf, chartPdfUrl, removeChartPdf } from "@/lib/storage";
import { parseChartFromFile, parseChartFromPath } from "@/lib/parseChart";
import type { ChartSection, ChartSettings, ChartSource } from "@/lib/types";

// Upload / view / replace a PDF chord chart (stored in Supabase Storage), and
// auto-convert it into an editable chart by reading it with AI. Works for both
// library songs and per-service songs — it only needs an id for the storage
// path and a callback to save the resulting fields.
//
// On a successful drop we: store the original PDF, read it, and (if it parses)
// hand back an editable chart with chartSource "builtin". If reading fails we
// silently keep it as a plain PDF — nothing breaks.

type ChartFields = {
  pdfPath?: string;
  pdfName?: string;
  chart?: { sections: ChartSection[]; settings: ChartSettings };
  chartSource?: ChartSource;
  originalKey?: string;
};

export function PdfChartControl({
  songId,
  pdfPath,
  pdfName,
  onChange,
}: {
  songId: string;
  pdfPath?: string;
  pdfName?: string;
  onChange: (fields: ChartFields) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "reading">("idle");
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const busy = phase !== "idle";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setNote(null);

    // 1) Store the original PDF so the source is always recoverable.
    setPhase("uploading");
    const up = await uploadChartPdf(songId, file);
    if (!up.ok) {
      setPhase("idle");
      setErr(up.error);
      return;
    }

    // 2) Read it into an editable chart.
    setPhase("reading");
    const parsed = await parseChartFromFile(file);
    setPhase("idle");

    if (parsed.ok) {
      // The parsed chords are concrete in the key we detected, so set the song's
      // "written in" key to match — otherwise the chart gets re-transposed.
      const detected = parsed.data.meta.originalKey;
      onChange({
        pdfPath: up.path,
        pdfName: up.name,
        chart: parsed.data.chart,
        chartSource: "builtin",
        ...(detected ? { originalKey: detected } : {}),
      });
    } else {
      // Keep it as a plain PDF; let the leader convert later if they want.
      onChange({ pdfPath: up.path, pdfName: up.name });
      setNote("Saved as a PDF. Couldn't auto-convert it to an editable chart. You can try again.");
    }
  };

  const convertExisting = async () => {
    if (!pdfPath) return;
    setErr(null);
    setNote(null);
    setPhase("reading");
    const parsed = await parseChartFromPath(pdfPath);
    setPhase("idle");
    if (parsed.ok) {
      const detected = parsed.data.meta.originalKey;
      onChange({
        chart: parsed.data.chart,
        chartSource: "builtin",
        ...(detected ? { originalKey: detected } : {}),
      });
    } else {
      setNote(parsed.error);
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    if (!busy) handleFile(e.dataTransfer.files?.[0]);
  };

  const view = async () => {
    if (!pdfPath) return;
    const url = await chartPdfUrl(pdfPath);
    if (url) window.open(url, "_blank", "noopener");
    else setErr("Couldn't open that file.");
  };

  const remove = async () => {
    if (pdfPath) await removeChartPdf(pdfPath);
    onChange({ pdfPath: undefined, pdfName: undefined });
  };

  const readingLabel = phase === "uploading" ? "Saving…" : "Reading your chart…";

  return (
    <div className="mt-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onFile}
        className="hidden"
      />
      {pdfPath ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2">
          <Icon name="file" size={16} className="text-charcoal-500" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal-800">
            {pdfName ?? "Chart.pdf"}
          </span>
          {busy ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600">
              <Icon name="rotate" size={13} className="animate-spin" /> {readingLabel}
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={convertExisting}
                className="text-xs font-semibold text-coral-600 hover:underline"
              >
                Make editable
              </button>
              <button type="button" onClick={view} className="text-xs font-semibold text-charcoal-500 transition hover:text-charcoal-800">
                View
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs font-semibold text-charcoal-500 transition hover:text-charcoal-800"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                className="text-xs font-semibold text-charcoal-400 transition hover:text-error"
              >
                Remove
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            drag ? "border-coral-400 bg-coral-50" : "border-charcoal-200 bg-cream-50"
          }`}
        >
          <Icon
            name={busy ? "rotate" : "upload"}
            size={20}
            className={busy ? "animate-spin text-coral-500" : "text-charcoal-400"}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-60"
          >
            <Icon name="upload" size={14} /> {busy ? readingLabel : "Choose a PDF"}
          </button>
          <p className="text-xs text-charcoal-400">
            {busy
              ? "Hang tight. Turning it into an editable chart."
              : "Drop a PDF and we'll turn it into an editable chart."}
          </p>
        </div>
      )}
      {note && <p className="mt-1.5 text-xs text-charcoal-500">{note}</p>}
      {err && <p className="mt-1.5 text-xs text-error">{err}</p>}
    </div>
  );
}
