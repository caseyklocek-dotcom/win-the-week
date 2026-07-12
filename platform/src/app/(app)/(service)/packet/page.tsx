"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui";
import { ChartSheet } from "@/components/ChartSheet";
import { countLabel, fmtDuration, ALL_KEYS } from "@/lib/music";
import { serviceDisplayTitle, serviceSetDurationSec } from "@/lib/set";
import { chartPdfUrl, downloadMergedChartPdfs } from "@/lib/storage";
import type { Song, ChartDisplay } from "@/lib/types";

const NOTATIONS: { value: ChartDisplay; label: string }[] = [
  { value: "chords", label: "Chords" },
  { value: "numbers", label: "Numbers" },
  { value: "numerals", label: "Numerals" },
  { value: "solfege", label: "Do-Re-Mi" },
];

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PacketPage() {
  const { activeService, state } = useStore();
  const svc = activeService;

  const chartSongs = svc.songs.filter((s) => s.chartSource === "builtin" && s.chart);
  const pdfChartSongs = svc.songs.filter((s) => s.chartSource === "pdf" && s.pdfPath);

  const openPdf = async (path: string) => {
    const url = await chartPdfUrl(path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeErr, setMergeErr] = useState<string | null>(null);
  const downloadAllCharts = async () => {
    setMergeBusy(true);
    setMergeErr(null);
    const err = await downloadMergedChartPdfs(
      pdfChartSongs.filter((s) => s.pdfPath).map((s) => ({ pdfPath: s.pdfPath as string })),
      `${svc.title || "service"}-charts.pdf`,
    );
    setMergeBusy(false);
    if (err) setMergeErr(err);
  };

  // Order-of-service sections only (charts now print per-song below).
  const [include, setInclude] = useState({
    overview: true,
    runningOrder: true,
    team: true,
    avl: true,
    rehearsal: true,
  });
  const toggle = (k: keyof typeof include) =>
    setInclude((p) => ({ ...p, [k]: !p[k] }));

  const totalSec = serviceSetDurationSec(svc);

  // Per-chart print options: key + notation (chords / numbers / …).
  type ChartCfg = { key: string; display: ChartDisplay };
  const [chartCfg, setChartCfg] = useState<Record<string, ChartCfg>>({});
  const cfgFor = (s: Song): ChartCfg =>
    chartCfg[s.id] ?? {
      key: s.chart?.settings.key ?? s.serviceKey ?? "C",
      display: s.chart?.settings.display ?? "chords",
    };
  const setCfg = (s: Song, patch: Partial<ChartCfg>) =>
    setChartCfg((p) => ({ ...p, [s.id]: { ...cfgFor(s), ...patch } }));
  const withChartSettings = (s: Song): Song => {
    if (s.chartSource !== "builtin" || !s.chart) return s;
    const c = cfgFor(s);
    return { ...s, chart: { ...s.chart, settings: { ...s.chart.settings, key: c.key, display: c.display } } };
  };

  // Printing: the order of service (its sections) OR a single chord chart on
  // its own. Each print job is isolated, so songs never spill together.
  //
  // Lifecycle: the buttons only set state. The effect below fires the actual
  // window.print() after React has committed the print-mode class to the DOM
  // (two animation frames, so the print CSS is definitely applied), and the
  // class stays on until the browser says printing is over. On phones,
  // window.print() returns immediately while the preview is still open, so
  // resetting synchronously would swap the content out from under the user.
  const [printMode, setPrintMode] = useState<"none" | "service" | "single">("none");
  const [printChart, setPrintChart] = useState<Song | null>(null);

  const printService = () => setPrintMode("service");
  const printOneChart = (s: Song) => {
    setPrintChart(withChartSettings(s));
    setPrintMode("single");
  };

  useEffect(() => {
    if (printMode === "none") return;

    let finished = false;
    let fallback: number | undefined;
    const reset = () => {
      if (finished) return;
      finished = true;
      setPrintMode("none");
      setPrintChart(null);
    };

    // Reset when the browser reports the print flow ended — afterprint where
    // supported, plus the print media query flipping back off.
    window.addEventListener("afterprint", reset);
    const mql = window.matchMedia("print");
    const onMedia = (e: MediaQueryListEvent) => {
      if (!e.matches) reset();
    };
    mql.addEventListener?.("change", onMedia);

    // Double rAF: the first frame runs after the class is committed, the
    // second guarantees styles are painted before the print snapshot.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.print();
        // Safety net only, for browsers that never fire afterprint.
        fallback = window.setTimeout(reset, 10000);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (fallback !== undefined) window.clearTimeout(fallback);
      window.removeEventListener("afterprint", reset);
      mql.removeEventListener?.("change", onMedia);
    };
  }, [printMode]);

  return (
    <div
      className={`space-y-6 ${
        printMode === "service" ? "print-service" : printMode === "single" ? "print-single" : ""
      }`}
    >
      {/* Header */}
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-charcoal-900">SERVICE PACKET</h1>
          <p className="mt-1 text-sm text-charcoal-400">
            Pick what to include, then print or save as PDF for the whole team.
          </p>
        </div>
        <button
          onClick={printService}
          className="flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,107,94,0.35)] transition hover:bg-coral-600"
        >
          <Icon name="printer" size={16} /> Print order of service
        </button>
      </div>

      {/* Order-of-service options */}
      <div className="no-print rounded-xl border border-charcoal-100 bg-white p-5">
        <div className="label mb-3 text-charcoal-400">Order of service · what to include</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <CheckRow label="Service overview" on={include.overview} onClick={() => toggle("overview")} />
          <CheckRow label="Running order" on={include.runningOrder} onClick={() => toggle("runningOrder")} />
          <CheckRow label="Team assignments" on={include.team} onClick={() => toggle("team")} />
          <CheckRow label="AV / lighting notes" on={include.avl} onClick={() => toggle("avl")} />
          <CheckRow label="Rehearsal notes" on={include.rehearsal} onClick={() => toggle("rehearsal")} />
        </div>
      </div>

      {/* Chord charts — print each song on its own */}
      <div className="no-print rounded-xl border border-charcoal-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="label text-charcoal-400">Chord charts</div>
            <p className="mt-0.5 text-xs text-charcoal-400">
              Set the key and notation, then print each song on its own page.
            </p>
          </div>
          {pdfChartSongs.length > 1 && (
            <button
              onClick={downloadAllCharts}
              disabled={mergeBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600 disabled:opacity-60"
            >
              <Icon name="file" size={13} /> {mergeBusy ? "Building…" : "All PDFs as 1 file"}
            </button>
          )}
        </div>

        {chartSongs.length === 0 && pdfChartSongs.length === 0 ? (
          <p className="text-xs text-charcoal-400">
            No charts yet. Add an editable chart or upload a PDF on a song in the worship set.
          </p>
        ) : (
          <div className="space-y-2">
            {chartSongs.map((s) => {
              const cfg = cfgFor(s);
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-charcoal-100 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-charcoal-800">{s.title}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <select
                      value={cfg.key}
                      onChange={(e) => setCfg(s, { key: e.target.value })}
                      className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                      title="Key"
                    >
                      {ALL_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cfg.display}
                      onChange={(e) => setCfg(s, { display: e.target.value as ChartDisplay })}
                      className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                      title="Notation"
                    >
                      {NOTATIONS.map((n) => (
                        <option key={n.value} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => printOneChart(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
                    >
                      <Icon name="printer" size={13} /> Print
                    </button>
                  </div>
                </div>
              );
            })}
            {pdfChartSongs.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-charcoal-100 px-3 py-2"
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal-800">
                  <Icon name="file" size={14} className="text-charcoal-400" /> {s.title}
                </span>
                <span className="rounded-full bg-ok-tint px-2 py-0.5 text-[0.65rem] font-semibold text-ok-ink">
                  PDF
                </span>
                <button
                  onClick={() => s.pdfPath && openPdf(s.pdfPath)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600"
                >
                  <Icon name="printer" size={13} /> Open / print
                </button>
              </div>
            ))}
          </div>
        )}
        {mergeErr && <p className="mt-1.5 text-xs text-error">{mergeErr}</p>}
      </div>

      {/* ---------- PACKET PREVIEW / PRINT SURFACE ---------- */}
      <div className="space-y-6">
        {/* Cover + overview */}
        <div className="service-only print-page rounded-xl border border-charcoal-100 bg-white p-8">
          <div className="border-b border-charcoal-100 pb-4">
            <div className="label text-coral-600">{state.profile.churchName}</div>
            <h2 className="mt-1 text-3xl font-bold text-charcoal-900">{serviceDisplayTitle(svc)}</h2>
            <p className="mt-1 text-charcoal-400">{fmtDate(svc.date)}</p>
          </div>

          {include.overview && (
            <div className="packet-block mt-5 grid gap-5 sm:grid-cols-2">
              <PacketField label="Scripture" value={svc.scripture} />
              <PacketField label="Theme" value={svc.theme} />
              <div className="sm:col-span-2">
                <div className="label mb-1 text-charcoal-400">The one thing</div>
                <p className="editorial text-lg text-charcoal-800">{svc.oneThing}</p>
              </div>
            </div>
          )}

          {include.runningOrder && (
            <div className="mt-6">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="label text-charcoal-400">Running order</div>
                <div className="text-xs text-charcoal-400">
                  {countLabel(svc.songs.length, "song")} · {fmtDuration(totalSec)}
                </div>
              </div>
              <div className="divide-y divide-charcoal-100 border-t border-charcoal-100">
                {svc.setSections.map((sec) => (
                  <div key={sec.id} className="packet-block py-2">
                    <div className="text-xs font-bold uppercase tracking-wide text-coral-600">
                      {sec.label}
                    </div>
                    {sec.rows.map((row, i) => {
                      if (row.kind === "song") {
                        const song = svc.songs.find((s) => s.id === row.refId);
                        if (!song) return null;
                        return (
                          <div
                            key={song.id}
                            className="flex items-center justify-between py-1 text-sm"
                          >
                            <span className="text-charcoal-800">
                              <span className="font-semibold">{song.title}</span>
                              {song.artist && (
                                <span className="text-charcoal-400"> · {song.artist}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-3 text-charcoal-500">
                              <span className="font-semibold text-charcoal-900">
                                {song.serviceKey}
                              </span>
                              <span>{song.flow}</span>
                              {song.leadName && <span>{song.leadName}</span>}
                              <span>{fmtDuration(song.durationSec)}</span>
                            </span>
                          </div>
                        );
                      }
                      const el = (svc.elements ?? []).find((e) => e.id === row.refId);
                      if (!el) return null;
                      return (
                        <div
                          key={el.id}
                          className="flex items-center justify-between py-1 text-sm"
                        >
                          <span className="italic text-charcoal-600">{el.title}</span>
                          <span className="text-charcoal-500">
                            {fmtDuration(el.durationSec)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {include.team && (
            <div className="mt-6">
              <div className="label mb-2 text-charcoal-400">Team</div>
              <div className="grid gap-4 sm:grid-cols-3">
                {svc.teams.map((team) => (
                  <div key={team.id} className="packet-block">
                    <div
                      className="mb-1 text-sm font-bold"
                      style={{ color: team.color }}
                    >
                      {team.name}
                    </div>
                    <div className="space-y-1">
                      {team.roles.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-charcoal-500">{r.position}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-charcoal-800">{r.person || "—"}</span>
                            <Pill status={r.status} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(include.avl || include.rehearsal) && (
            <div className="packet-block mt-6 grid gap-5 sm:grid-cols-2">
              {include.avl && <PacketField label="AV / lighting" value={svc.avlNotes} />}
              {include.rehearsal && (
                <PacketField label="Rehearsal notes" value={svc.rehearsalNotes} />
              )}
            </div>
          )}
        </div>

        {/* Single chart, printed on its own when you hit Print on a song. */}
        <div className="single-only">
          {printChart && (
            <div className="print-page rounded-xl border border-charcoal-100 bg-white p-8">
              <ChartSheet song={printChart} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg border border-charcoal-100 px-3 py-2.5 text-left text-sm transition hover:border-charcoal-200"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
          on ? "border-coral-500 bg-coral-500 text-white" : "border-charcoal-200"
        }`}
      >
        {on && <Icon name="check" size={13} />}
      </span>
      <span className={on ? "font-semibold text-charcoal-800" : "text-charcoal-500"}>
        {label}
      </span>
    </button>
  );
}

function PacketField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label mb-1 text-charcoal-400">{label}</div>
      <p className="text-sm text-charcoal-800">{value || "—"}</p>
    </div>
  );
}
