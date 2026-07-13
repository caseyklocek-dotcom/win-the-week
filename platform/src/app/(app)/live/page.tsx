"use client";

// ============================================================
// Sunday Live — the phone on the music stand.
//
// One tap from home on Sunday morning: the whole service in running order,
// huge type a musician reads from a stand, the current moment held in warm
// light, elapsed time in the corner. Tap advances; tap any row to jump.
// The current song's chart is one tap away. After the last item, one gentle
// question ("How did it go?") files straight into the week's reflection.
//
// The surface is deliberately stage-dark in BOTH themes (raw hex, not
// tokens) — dark on a stand, light in the room.
// ============================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { ChartSheet } from "@/components/ChartSheet";
import { fmtDuration } from "@/lib/music";
import { rowTitle, rowDurationSec } from "@/lib/set";
import type { Service, Song } from "@/lib/types";

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface LiveRow {
  key: string;
  title: string;
  durationSec: number;
  song?: Song;
  meta: string;
}

function liveRows(svc: Service): LiveRow[] {
  const out: LiveRow[] = [];
  for (const sec of svc.setSections) {
    for (const row of sec.rows ?? []) {
      const title = rowTitle(row, svc);
      if (!title) continue;
      const song = row.kind === "song" ? svc.songs.find((s) => s.id === row.refId) : undefined;
      const meta = song
        ? [
            `Key ${song.serviceKey}`,
            song.leadName && `${song.leadName.split(" ")[0]} leads`,
            fmtDuration(song.durationSec),
          ]
            .filter(Boolean)
            .join(" · ")
        : fmtDuration(rowDurationSec(row, svc));
      out.push({
        key: `${sec.id}-${row.refId}`,
        title,
        durationSec: rowDurationSec(row, svc),
        song,
        meta,
      });
    }
  }
  return out;
}

export default function SundayLivePage() {
  const router = useRouter();
  const { state, activeService: svc, updateService } = useStore();
  const rows = useMemo(() => liveRows(svc), [svc]);

  const [idx, setIdx] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [reflection, setReflection] = useState("");
  const doneAll = idx >= rows.length;

  // Elapsed since Live opened for this service (survives refresh).
  const timerKey = `wtw_live_start_${svc.id}`;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let start = Number(sessionStorage.getItem(timerKey));
    if (!start) {
      start = Date.now();
      sessionStorage.setItem(timerKey, String(start));
    }
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timerKey]);

  useEffect(() => {
    setShowChart(false);
  }, [idx]);

  const finish = () => {
    if (reflection.trim()) {
      updateService(svc.id, (s) => ({
        ...s,
        carryForward: s.carryForward
          ? `${s.carryForward}\n${reflection.trim()}`
          : reflection.trim(),
        status: { ...s.status, prep: "done" },
      }));
    }
    sessionStorage.removeItem(timerKey);
    router.push("/");
  };

  const current = rows[idx];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#1a1a1a]">
      <div className="mx-auto max-w-md px-5 pb-32 pt-5">
        {/* status bar */}
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d877e]">
          <Link href="/" className="flex items-center gap-1.5 hover:text-[#f5f0e8]">
            <Icon name="x" size={13} /> Exit
          </Link>
          <span>
            {new Date().toLocaleDateString("en-US", { weekday: "short" })}{" "}
            {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
          <span className="flex items-center gap-1.5 text-[#ff6b5e]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff6b5e]" /> Live ·{" "}
            <span className="tabular-nums">{fmtClock(elapsed)}</span>
          </span>
        </div>

        {rows.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-lg font-bold text-[#f5f0e8]">Nothing in the set yet.</p>
            <Link href="/set" className="mt-3 inline-block text-sm font-semibold text-[#ff8c82]">
              Build the set first →
            </Link>
          </div>
        )}

        {/* running order */}
        {!doneAll && (
          <div className="mt-5">
            {rows.map((row, i) => {
              const isDone = i < idx;
              const isNow = i === idx;
              return (
                <div key={row.key}>
                  <button
                    onClick={() => setIdx(i)}
                    className={`w-full text-left transition ${
                      isNow
                        ? "my-2.5 rounded-2xl bg-gradient-to-br from-[#2b2320] to-[#33241f] px-4 py-4"
                        : "border-b border-[#33302c] px-1 py-3.5"
                    }`}
                  >
                    <span
                      className={`block font-bold leading-tight ${
                        isNow
                          ? "text-[26px] text-white"
                          : isDone
                            ? "text-base text-[#5c5852] line-through decoration-1"
                            : "text-base text-[#8d877e]"
                      }`}
                    >
                      {row.title}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${
                        isNow ? "font-semibold text-[#ffb3ac]" : "text-[#6b665f]"
                      }`}
                    >
                      {row.meta}
                      {isDone && " · done"}
                    </span>
                  </button>
                  {/* the chart, one tap away, only for the current song */}
                  {isNow && row.song?.chart && row.song.chartSource === "builtin" && (
                    <div className="mb-2">
                      <button
                        onClick={() => setShowChart((v) => !v)}
                        className="text-xs font-bold uppercase tracking-wide text-[#ff8c82]"
                      >
                        {showChart ? "Hide chart" : "Show chart"}
                      </button>
                      {showChart && (
                        <div className="mt-2 overflow-x-auto rounded-xl bg-white p-4 dark:bg-white">
                          <ChartSheet song={row.song} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* the gentle close */}
        {doneAll && (
          <div className="mt-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d877e]">
              That&rsquo;s the service
            </p>
            <h1 className="mt-2 text-3xl font-extrabold uppercase leading-tight text-white">
              Well led{state.profile.name ? `, ${state.profile.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-3 text-sm text-[#b0aca6]">
              One question while it&rsquo;s fresh, and it files itself into next week&rsquo;s plan:
            </p>
            <p className="mt-4 text-lg font-bold text-[#f5f0e8]">How did it go?</p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="What worked, what to carry forward…"
              className="mt-2 w-full rounded-xl border border-[#3d3a34] bg-[#242220] p-3 text-sm text-[#f5f0e8] outline-none placeholder:text-[#6b665f] focus:border-[#ff6b5e]"
            />
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={finish}
                className="flex-1 rounded-full bg-[#ff6b5e] px-5 py-3.5 text-sm font-extrabold text-white"
              >
                {reflection.trim() ? "Save & finish" : "Finish"}
              </button>
              <button
                onClick={() => setIdx(rows.length - 1)}
                className="rounded-full border border-[#3d3a34] px-5 py-3.5 text-sm font-semibold text-[#b0aca6]"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* the big Next */}
      {!doneAll && rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/95 to-transparent px-5 pb-6 pt-8">
          <button
            onClick={() => setIdx((i) => i + 1)}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-[#ff6b5e] px-6 py-4 text-base font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(255,107,94,0.5)]"
          >
            {idx === rows.length - 1 ? "That's a wrap" : "Next"}{" "}
            <Icon name="arrowRight" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
