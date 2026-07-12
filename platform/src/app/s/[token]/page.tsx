"use client";

import { use, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ChartSheet } from "@/components/ChartSheet";
import { ALL_KEYS, fmtDuration } from "@/lib/music";
import { readPacket, readResponse, recordResponse } from "@/lib/packets";
import type { ServicePacket, PacketResponse } from "@/lib/packets";
import type { Song, ChartDisplay } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Per-song view options the volunteer can change without touching the leader's
// set: which key to read/practice in, and chords vs. Nashville numbers.
type ChartCfg = { key: string; display: ChartDisplay };

export default function VolunteerPacketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [packet, setPacket] = useState<ServicePacket | null>(null);
  const [response, setResponse] = useState<PacketResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, r] = await Promise.all([readPacket(token), readResponse(token)]);
      if (cancelled) return;
      setPacket(p);
      setResponse(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 text-charcoal-400">
        Loading…
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cream-200 text-charcoal-400">
            <Icon name="info" size={22} />
          </div>
          <h1 className="text-lg font-semibold text-charcoal-900">This link isn&apos;t active</h1>
          <p className="mt-2 text-sm text-charcoal-400">
            It may have expired or been replaced. Text your worship leader for a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return <PacketView packet={packet} response={response} onRespond={setResponse} />;
}

function PacketView({
  packet,
  response,
  onRespond,
}: {
  packet: ServicePacket;
  response: PacketResponse | null;
  onRespond: (r: PacketResponse) => void;
}) {
  const [openSongId, setOpenSongId] = useState<string | null>(null);
  const [chartCfg, setChartCfg] = useState<Record<string, ChartCfg>>({});
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  const cfgFor = (s: Song): ChartCfg =>
    chartCfg[s.id] ?? {
      key: s.chart?.settings.key ?? s.serviceKey ?? "C",
      display: s.chart?.settings.display ?? "chords",
    };
  const setCfg = (s: Song, patch: Partial<ChartCfg>) =>
    setChartCfg((p) => ({ ...p, [s.id]: { ...cfgFor(s), ...patch } }));

  // A copy of the song with the volunteer's chosen key/notation applied, so
  // ChartSheet renders exactly what they picked.
  const withCfg = (s: Song): Song => {
    if (s.chartSource !== "builtin" || !s.chart) return s;
    const c = cfgFor(s);
    return {
      ...s,
      chart: { ...s.chart, settings: { ...s.chart.settings, key: c.key, display: c.display } },
    };
  };

  const confirm = async () => {
    onRespond(await recordResponse(packet.token, "confirmed"));
    setDeclineOpen(false);
  };
  const decline = async () => {
    onRespond(await recordResponse(packet.token, "declined", reason));
    setDeclineOpen(false);
  };

  // ---- single-chart print (reuses the app's global print classes) ----
  const [printChart, setPrintChart] = useState<Song | null>(null);
  const [printing, setPrinting] = useState(false);
  const printOne = (s: Song) => {
    setPrintChart(withCfg(s));
    setPrinting(true);
  };
  useEffect(() => {
    if (!printing) return;
    let done = false;
    let fallback: number | undefined;
    const reset = () => {
      if (done) return;
      done = true;
      setPrinting(false);
      setPrintChart(null);
    };
    window.addEventListener("afterprint", reset);
    const mql = window.matchMedia("print");
    const onMedia = (e: MediaQueryListEvent) => {
      if (!e.matches) reset();
    };
    mql.addEventListener?.("change", onMedia);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.print();
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
  }, [printing]);

  const status = response?.status ?? "pending";

  return (
    <div className={`min-h-screen bg-cream-100 ${printing ? "print-single" : ""}`}>
      <div className="no-print mx-auto max-w-lg px-4 pb-16 pt-8">
        {/* Header */}
        <div className="text-center">
          <div className="label text-charcoal-400">{packet.churchName}</div>
          <h1 className="mt-1 text-2xl font-bold text-charcoal-900">
            {fmtDate(packet.service.date)}
          </h1>
          <p className="mt-1 text-sm text-charcoal-400">
            {packet.service.serviceTime}
            {packet.service.title ? ` · ${packet.service.title}` : ""}
          </p>
        </div>

        {/* Assignment + confirm/decline */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="label text-coral-600">Your spot this week</div>
          <div className="mt-1 text-xl font-bold text-charcoal-900">
            {packet.person.assignment}
          </div>

          {status === "pending" && !declineOpen && (
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={confirm}
                className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-coral-500 px-4 py-3 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
              >
                <Icon name="check" size={16} /> I&apos;m In
              </button>
              <button
                onClick={() => setDeclineOpen(true)}
                className="flex-1 rounded-xl border border-charcoal-200 px-4 py-3 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-400"
              >
                Can&apos;t Make It
              </button>
            </div>
          )}

          {status === "pending" && declineOpen && (
            <div className="mt-4">
              <label className="label mb-1.5 block text-charcoal-400">
                A quick word for {packet.leaderName.split(" ")[0]} (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Out of town, sick, etc."
                className="w-full resize-none rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none focus:border-coral-400"
              />
              <div className="mt-2.5 flex gap-2.5">
                <button
                  onClick={decline}
                  className="flex-1 rounded-xl bg-charcoal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal-900"
                >
                  Send it
                </button>
                <button
                  onClick={() => setDeclineOpen(false)}
                  className="rounded-xl border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-500 transition hover:border-charcoal-400"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {status === "confirmed" && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ok-tint px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-ok-ink">
                <Icon name="check" size={16} /> You&apos;re in. Thank you!
              </span>
              <button
                onClick={() => setDeclineOpen(true)}
                className="text-xs font-semibold text-charcoal-400 underline underline-offset-2"
              >
                Change
              </button>
            </div>
          )}

          {status === "declined" && (
            <div className="mt-4 rounded-xl bg-no-tint px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-error">
                  <Icon name="x" size={16} /> You let {packet.leaderName.split(" ")[0]} know
                </span>
                <button
                  onClick={confirm}
                  className="text-xs font-semibold text-charcoal-400 underline underline-offset-2"
                >
                  Actually, I&apos;m in
                </button>
              </div>
              {response?.reason && (
                <p className="mt-1.5 text-xs text-charcoal-500">&ldquo;{response.reason}&rdquo;</p>
              )}
            </div>
          )}

          {/* Personal note */}
          {packet.personalNote && (
            <div className="mt-4 border-t border-charcoal-100 pt-3">
              <p className="editorial text-charcoal-600">
                &ldquo;{packet.personalNote}&rdquo;
                <span className="ml-1 text-xs not-italic text-charcoal-400">
                  &ndash; {packet.leaderName.split(" ")[0]}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Team note */}
        {packet.teamNote && (
          <div className="mt-3 rounded-xl bg-cream-200 px-4 py-3 text-sm text-charcoal-700">
            {packet.teamNote}
          </div>
        )}

        {/* The set */}
        <div className="mt-6">
          <div className="label mb-2 px-1 text-charcoal-400">
            The set · {packet.songs.length} {packet.songs.length === 1 ? "song" : "songs"}
          </div>
          <div className="space-y-2.5">
            {packet.songs.map((s) => (
              <SongCard
                key={s.id}
                song={s}
                open={openSongId === s.id}
                onToggle={() => setOpenSongId((cur) => (cur === s.id ? null : s.id))}
                cfg={cfgFor(s)}
                onCfg={(patch) => setCfg(s, patch)}
                onPrint={() => printOne(s)}
                withCfg={withCfg}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-charcoal-400">
          Questions? Just text {packet.leaderName.split(" ")[0]} back.
          {packet.ccliNumber && (
            <div className="mt-1 text-charcoal-200">Charts licensed under CCLI #{packet.ccliNumber}</div>
          )}
        </div>
      </div>

      {/* Isolated print surface: one chart on its own page. */}
      <div className="single-only">
        {printChart && (
          <div className="print-page bg-white p-8">
            <ChartSheet song={printChart} />
          </div>
        )}
      </div>
    </div>
  );
}

function SongCard({
  song,
  open,
  onToggle,
  cfg,
  onCfg,
  onPrint,
  withCfg,
}: {
  song: Song;
  open: boolean;
  onToggle: () => void;
  cfg: ChartCfg;
  onCfg: (patch: Partial<ChartCfg>) => void;
  onPrint: () => void;
  withCfg: (s: Song) => Song;
}) {
  const hasChart = song.chartSource === "builtin" && !!song.chart;
  const listenUrl = song.multitracksUrl || song.songSelectUrl;

  return (
    <div
      className={`rounded-2xl bg-white transition ${
        open ? "ring-1 ring-coral-400" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.95rem] font-semibold text-charcoal-900">
            {song.title}
          </div>
          {(song.flow || song.leadName) && (
            <div className="truncate text-xs text-charcoal-400">
              {[song.flow, song.leadName && `${song.leadName} leads`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
        <span className="rounded-lg bg-cream-200 px-2 py-1 text-xs font-bold text-coral-600">
          {song.serviceKey}
        </span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={16} className="text-charcoal-200" />
      </button>

      {open && (
        <div className="border-t border-charcoal-100 px-4 py-3.5">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {hasChart && (
              <>
                <label className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-2 py-1.5">
                  <span className="text-xs font-semibold text-charcoal-400">Key</span>
                  <select
                    value={cfg.key}
                    onChange={(e) => onCfg({ key: e.target.value })}
                    className="bg-transparent text-xs font-bold text-charcoal-800 outline-none"
                    aria-label="Key"
                  >
                    {ALL_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex overflow-hidden rounded-lg border border-charcoal-200 text-xs font-semibold">
                  <button
                    onClick={() => onCfg({ display: "chords" })}
                    className={`px-3 py-1.5 transition ${
                      cfg.display === "chords"
                        ? "bg-charcoal-800 text-white"
                        : "bg-white text-charcoal-400"
                    }`}
                  >
                    Chords
                  </button>
                  <button
                    onClick={() => onCfg({ display: "numbers" })}
                    className={`px-3 py-1.5 transition ${
                      cfg.display === "numbers"
                        ? "bg-charcoal-800 text-white"
                        : "bg-white text-charcoal-400"
                    }`}
                  >
                    Numbers
                  </button>
                </div>
                <button
                  onClick={onPrint}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-2.5 py-1.5 text-xs font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600"
                >
                  <Icon name="printer" size={14} /> Print
                </button>
              </>
            )}
          </div>

          {/* Chart */}
          {hasChart ? (
            <div className="mt-3 overflow-x-auto">
              <ChartSheet song={withCfg(song)} />
            </div>
          ) : (
            <p className="text-sm text-charcoal-400">
              {song.chartSource === "pdf"
                ? "Chart attached as a PDF — check the email version, or ask your leader."
                : "No chart for this song yet."}
            </p>
          )}

          {/* Notes + listen */}
          {(song.notes || listenUrl) && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-charcoal-100 pt-3">
              {song.notes ? (
                <span className="text-xs text-charcoal-500">{song.notes}</span>
              ) : (
                <span />
              )}
              {listenUrl && (
                <a
                  href={listenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-coral-600"
                >
                  <Icon name="music" size={14} /> Listen
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
