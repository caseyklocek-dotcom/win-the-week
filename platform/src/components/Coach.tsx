"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

const HOUR = 3600; // seconds — the reference for one "hour"

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Which on-page section to spotlight for a given task target.
function spotFor(target?: string): string | null {
  if (!target) return null;
  if (target.startsWith("/set")) return "set";
  if (target.startsWith("/team")) return "team";
  if (target.startsWith("/calendar")) return "runway";
  if (target.startsWith("/rehearse")) return "rehearse";
  if (target.includes("tab=pray")) return "pray";
  if (target.includes("tab=prep")) return "prep";
  return null;
}

// Dims the whole page except the element marked data-coach="<spot>", with a
// coral ring around it. The lit section stays interactive (panels frame it, the
// docked coach sits above). Self-hides until the element is on the page.
function Spotlight({ spot }: { spot: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const selector = `[data-coach="${spot}"]`;
    let last = "";
    let scrolled = false;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        if (last !== "") {
          last = "";
          setRect(null);
        }
        return;
      }
      const r = el.getBoundingClientRect();
      if (!scrolled) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolled = true;
      }
      const key = `${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.width)},${Math.round(r.height)}`;
      if (key !== last) {
        last = key;
        setRect(r);
      }
    };
    measure();
    const iv = setInterval(measure, 120);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(iv);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [spot]);

  if (!rect) return null;
  const pad = 10;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const right = rect.right + pad;
  const bottom = rect.bottom + pad;
  const dim = "rgba(0,0,0,0.6)";
  const panel = (style: React.CSSProperties) => (
    <div className="no-print" style={{ position: "fixed", background: dim, pointerEvents: "auto", ...style }} />
  );
  return (
    <div className="no-print fixed inset-0 z-30" style={{ pointerEvents: "none" }}>
      {panel({ top: 0, left: 0, right: 0, height: top })}
      {panel({ top: bottom, left: 0, right: 0, bottom: 0 })}
      {panel({ top, left: 0, width: left, height: bottom - top })}
      {panel({ top, left: right, right: 0, height: bottom - top })}
      <div
        style={{
          position: "fixed",
          top,
          left,
          width: right - left,
          height: bottom - top,
          border: "2px solid var(--color-coral-500)",
          borderRadius: 12,
          boxShadow: "0 0 0 4px rgba(255,107,94,0.25)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// The guided "walk me through it" coach. Lives in the app shell so it stays
// with the leader as they move between pages. The current hour/task is derived
// from the actual checkboxes (so checking/unchecking anywhere keeps it honest);
// it focuses the screen on one step at a time, times each hour, and banks the
// time onto the service for Hour 5.
export function Coach() {
  const { state, setState, setActiveService } = useStore();
  const router = useRouter();
  const [, force] = useState(0);
  const [mode, setMode] = useState<"focus" | "work">("focus");
  const coach = state.coach;

  const svc = coach ? state.services.find((s) => s.id === coach.serviceId) : undefined;
  const firstIncomplete = svc
    ? svc.blocks.findIndex((b) => !(b.tasks.length > 0 && b.tasks.every((t) => t.done)))
    : -1;
  const block = svc?.blocks[coach!.hourIndex];
  const task = block?.tasks.find((t) => !t.done) ?? null;

  // Re-render once a second while the timer runs.
  useEffect(() => {
    if (!coach || coach.status !== "active") return;
    const iv = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [coach?.status, coach?.serviceId, coach?.hourIndex]);

  // Keep the coach's hour honest with the checkboxes: snap to the first
  // incomplete hour (handles both finishing an hour and un-checking earlier).
  useEffect(() => {
    if (!coach || coach.status !== "active") return;
    if (firstIncomplete === -1 || firstIncomplete === coach.hourIndex) return;
    setState((s) => {
      if (!s.coach) return s;
      const { serviceId, hourIndex, runningSince } = s.coach;
      const add = runningSince ? Math.round((Date.now() - runningSince) / 1000) : 0;
      return {
        ...s,
        services: s.services.map((x) =>
          x.id !== serviceId
            ? x
            : { ...x, loopSeconds: { ...(x.loopSeconds ?? {}), [hourIndex]: (x.loopSeconds?.[hourIndex] ?? 0) + add } },
        ),
        coach: { ...s.coach, hourIndex: firstIncomplete, runningSince: Date.now() },
      };
    });
  }, [firstIncomplete, coach?.hourIndex, coach?.status]);

  // A fresh step re-focuses the screen.
  useEffect(() => {
    setMode("focus");
  }, [task?.id, coach?.hourIndex]);

  if (!coach || !svc || !block) return null;

  const banked = svc.loopSeconds?.[coach.hourIndex] ?? 0;
  const elapsed =
    banked +
    (coach.status === "active" && coach.runningSince ? (Date.now() - coach.runningSince) / 1000 : 0);
  const over = elapsed >= HOUR;
  const dcount = block.tasks.filter((t) => t.done).length;
  const tcount = block.tasks.length;
  const paused = coach.status === "paused";
  const loopComplete = firstIncomplete === -1;
  const seconds = (since?: number) => (since ? Math.round((Date.now() - since) / 1000) : 0);

  const toggleTask = (taskId: string) =>
    setState((s) => ({
      ...s,
      services: s.services.map((x) =>
        x.id !== svc.id
          ? x
          : {
              ...x,
              blocks: x.blocks.map((b, i) =>
                i !== coach.hourIndex
                  ? b
                  : { ...b, tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) },
              ),
            },
      ),
    }));

  const pause = () =>
    setState((s) => {
      if (!s.coach || s.coach.status !== "active") return s;
      const { serviceId, hourIndex, runningSince } = s.coach;
      return {
        ...s,
        services: s.services.map((x) =>
          x.id !== serviceId
            ? x
            : { ...x, loopSeconds: { ...(x.loopSeconds ?? {}), [hourIndex]: (x.loopSeconds?.[hourIndex] ?? 0) + seconds(runningSince) } },
        ),
        coach: { ...s.coach, status: "paused", runningSince: undefined },
      };
    });

  const resume = () =>
    setState((s) => (s.coach ? { ...s, coach: { ...s.coach, status: "active", runningSince: Date.now() } } : s));

  const exit = () =>
    setState((s) => {
      if (!s.coach) return s;
      const { serviceId, hourIndex, runningSince, status } = s.coach;
      return {
        ...s,
        services: s.services.map((x) =>
          x.id !== serviceId
            ? x
            : {
                ...x,
                loopHour: hourIndex,
                loopSeconds:
                  status === "active"
                    ? { ...(x.loopSeconds ?? {}), [hourIndex]: (x.loopSeconds?.[hourIndex] ?? 0) + seconds(runningSince) }
                    : x.loopSeconds ?? {},
              },
        ),
        coach: null,
      };
    });

  const takeMeThere = () => {
    if (!task?.target) return;
    setActiveService(svc.id);
    setMode("work");
    router.push(task.target);
  };

  const timerPill = (
    <span
      className="rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
      style={{
        color: over ? "var(--color-no-ink)" : "var(--color-ok-ink)",
        background: over ? "var(--color-no-tint)" : "var(--color-ok-tint)",
      }}
      title={over ? "Over an hour on this one" : "Time on this hour"}
    >
      {fmt(elapsed)}
      <span className="text-charcoal-400"> / 60:00</span>
    </span>
  );

  const dots = (
    <div className="flex items-center gap-1">
      {svc.blocks.map((b, i) => (
        <div
          key={b.hour}
          className={`h-1.5 flex-1 rounded-full ${
            loopComplete || i < coach.hourIndex
              ? "bg-ok-bar"
              : i === coach.hourIndex
                ? "bg-coral-500"
                : "bg-cream-200"
          }`}
        />
      ))}
    </div>
  );

  const checklist = (
    <div className="space-y-1">
      {block.tasks.map((t) => {
        const current = task?.id === t.id;
        return (
          <button
            key={t.id}
            onClick={() => toggleTask(t.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-cream-200 ${current ? "bg-coral-50" : ""}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                t.done ? "border-coral-500 bg-coral-500 text-white" : "border-charcoal-200 text-transparent"
              }`}
            >
              <Icon name="check" size={13} />
            </span>
            <span className={`text-sm ${t.done ? "text-charcoal-400 line-through" : current ? "font-semibold text-charcoal-900" : "text-charcoal-700"}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  // ---------- FOCUS MODE: dim the screen, one step in front of you ----------
  if (mode === "focus" && !paused) {
    return (
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-coral-300 bg-white p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between gap-2">
            <span className="label text-coral-600">The loop · Hour {coach.hourIndex + 1} of 5</span>
            <div className="flex items-center gap-2">
              {timerPill}
              <button onClick={pause} className="text-xs font-semibold text-charcoal-400 transition hover:text-charcoal-800">Pause</button>
              <button onClick={exit} title="Pause & exit, saved for next time" aria-label="Pause and exit" className="text-charcoal-300 transition hover:text-charcoal-700">
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>
          <div className="mt-3">{dots}</div>

          {loopComplete ? (
            <div className="mt-5">
              <h2 className="text-2xl font-bold text-charcoal-900">The loop&rsquo;s complete.</h2>
              <p className="mt-1 text-sm text-charcoal-500">Every hour&rsquo;s in. Your time is banked for the Hour 5 report. Rest well.</p>
              <button onClick={exit} className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
                Done <Icon name="check" size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 text-xs text-charcoal-400">{block.focus}</div>
              <h2 className="mt-1 text-xl font-bold text-charcoal-900">{task?.label}</h2>
              {task?.how && (
                <p className="mt-2 rounded-lg bg-cream-100 px-3 py-2.5 text-sm text-charcoal-600">{task.how}</p>
              )}

              <div className="mt-4 flex gap-2">
                {task?.target ? (
                  <>
                    <button onClick={takeMeThere} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600">
                      Take me there <Icon name="arrowRight" size={15} />
                    </button>
                    <button onClick={() => task && toggleTask(task.id)} className="rounded-lg border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300">
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setMode("work")} className="rounded-lg border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300">
                      Got it
                    </button>
                    <button onClick={() => task && toggleTask(task.id)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600">
                      Mark complete <Icon name="check" size={15} />
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 border-t border-charcoal-100 pt-3">
                <div className="label mb-1 text-charcoal-400">This hour · {dcount}/{tcount}</div>
                {checklist}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- WORK / PAUSED: a small docked card so you can do the task ----------
  const spot = !paused && task ? spotFor(task.target) : null;
  return (
    <>
      {spot && <Spotlight spot={spot} />}
    {/* Docked above the phone bottom nav (nav height + safe area), bottom-4 on desktop */}
    <div className="no-print fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 w-80 max-w-[calc(100vw-2rem)] lg:bottom-4">
      <div className="overflow-hidden rounded-2xl border border-coral-300 bg-white shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between gap-2 border-b border-charcoal-100 px-4 py-2.5">
          <span className="label text-coral-600">Hour {coach.hourIndex + 1}/5</span>
          <div className="flex items-center gap-2">
            {timerPill}
            {!paused && (
              <button onClick={pause} className="text-xs font-semibold text-charcoal-400 transition hover:text-charcoal-800">Pause</button>
            )}
            <button onClick={exit} title="Pause & exit, saved for next time" aria-label="Pause and exit" className="text-charcoal-300 transition hover:text-charcoal-700">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="text-xs text-charcoal-400">{block.focus}</div>
          {task ? (
            <>
              <p className="mt-1 text-base font-semibold text-charcoal-900">{task.label}</p>
              {task.how && <p className="mt-1 text-xs text-charcoal-500">{task.how}</p>}
            </>
          ) : (
            <p className="mt-1 text-base font-semibold text-charcoal-900">Hour complete. Nice work.</p>
          )}

          {paused ? (
            <button onClick={resume} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
              <Icon name="rotate" size={15} /> Resume the loop
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setMode("focus")} className="rounded-lg border border-charcoal-200 px-3 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300" title="Back to focus" aria-label="Back to focus">
                <Icon name="target" size={15} />
              </button>
              <button onClick={() => task && toggleTask(task.id)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-3 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600">
                {task ? "Mark complete" : "Done"} <Icon name="check" size={14} />
              </button>
            </div>
          )}

          <div className="mt-2 text-center text-xs text-charcoal-400">
            {paused ? "Paused · saved for next time" : `${dcount}/${tcount} done this hour`}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
