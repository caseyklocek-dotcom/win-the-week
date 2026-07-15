"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { blocksConflict, serviceWeekDays } from "@/lib/calendar";
import type { CalendarEventRecord, CalendarSource, PreparationBlock } from "@/lib/types";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;
const DURATIONS = [30, 45, 60, 90];
const SNAP_MINUTES = 15;

type DragState = {
  blockId: string;
  dayIndex: number;
  minuteOffset: number;
  grabOffsetPx: number;
  pointerId: number;
  mobile: boolean;
  moved: boolean;
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const minutesFromStart = (date: Date) => (date.getHours() - START_HOUR) * 60 + date.getMinutes();
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function UnifiedWeekCalendar({
  serviceDate,
  calendars,
  events,
  blocks,
  previewMode,
  onToggleCalendar,
  selectedCalendarIds,
  onAutoPlace,
  onChangeBlock,
  onRemoveBlock,
}: {
  serviceDate: string;
  calendars: CalendarSource[];
  events: CalendarEventRecord[];
  blocks: PreparationBlock[];
  previewMode?: boolean;
  selectedCalendarIds: string[];
  onToggleCalendar: (id: string) => void;
  onAutoPlace: () => void;
  onChangeBlock: (block: PreparationBlock) => void;
  onRemoveBlock: (id: string) => void;
}) {
  const days = useMemo(() => serviceWeekDays(serviceDate), [serviceDate]);
  const [activeDay, setActiveDay] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const desktopBodyRef = useRef<HTMLDivElement>(null);
  const mobileBodyRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef("");
  const suppressClickRef = useRef(false);
  const visibleEvents = events.filter((event) => !event.calendarId || selectedCalendarIds.includes(event.calendarId));
  const editingBlock = blocks.find((block) => block.id === editing);

  const previewBlock = useMemo(() => {
    if (!drag) return null;
    const block = blocks.find((item) => item.id === drag.blockId);
    if (!block) return null;
    const duration = new Date(block.end).getTime() - new Date(block.start).getTime();
    const start = new Date(days[drag.dayIndex]);
    start.setHours(START_HOUR, drag.minuteOffset, 0, 0);
    return { ...block, start: start.toISOString(), end: new Date(start.getTime() + duration).toISOString() };
  }, [blocks, days, drag]);

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      const body = drag.mobile ? mobileBodyRef.current : desktopBodyRef.current;
      if (!body) return;
      event.preventDefault();
      const rect = body.getBoundingClientRect();
      const dayWidth = drag.mobile ? rect.width : (rect.width - 52) / 7;
      const dayIndex = drag.mobile
        ? activeDay
        : Math.max(0, Math.min(6, Math.floor((event.clientX - rect.left - 52) / dayWidth)));
      const rawMinutes = ((event.clientY - rect.top - drag.grabOffsetPx) / HOUR_HEIGHT) * 60;
      const minuteOffset = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - 30, Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES));
      const tickKey = `${dayIndex}:${minuteOffset}`;
      if (tickKey !== lastTickRef.current) {
        lastTickRef.current = tickKey;
        if (drag.moved && typeof navigator.vibrate === "function") navigator.vibrate(4);
      }
      setDrag((current) => current ? { ...current, dayIndex, minuteOffset, moved: current.moved || Math.abs(rawMinutes - current.minuteOffset) > 4 || dayIndex !== current.dayIndex } : current);
    };
    const finish = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      if (drag.moved && previewBlock) {
        suppressClickRef.current = true;
        onChangeBlock(previewBlock);
        if (typeof navigator.vibrate === "function") navigator.vibrate(8);
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
      setDrag(null);
      lastTickRef.current = "";
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [activeDay, drag, onChangeBlock, previewBlock]);

  const placeBlock = (block: PreparationBlock, dayIndex: number, minuteOffset: number) => {
    const duration = new Date(block.end).getTime() - new Date(block.start).getTime();
    const start = new Date(days[dayIndex]);
    const snapped = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - 30, Math.round(minuteOffset / 15) * 15));
    start.setHours(START_HOUR, snapped, 0, 0);
    onChangeBlock({ ...block, start: start.toISOString(), end: new Date(start.getTime() + duration).toISOString() });
  };

  const renderDay = (day: Date, dayIndex: number, mobile = false) => {
    const dayEvents = visibleEvents.filter((event) => sameDay(new Date(event.start), day));
    const dayBlocks = blocks.filter((block) => sameDay(new Date(block.start), day));
    return (
      <div
        key={day.toISOString()}
        className={`relative border-l border-charcoal-100 bg-white ${mobile ? "block" : "hidden md:block"}`}
        style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
      >
        {Array.from({ length: END_HOUR - START_HOUR }, (_, hour) => (
          <div key={hour} className="absolute inset-x-0 border-t border-cream-200" style={{ top: hour * HOUR_HEIGHT }} />
        ))}
        {dayEvents.map((event) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          const top = Math.max(0, minutesFromStart(start) / 60 * HOUR_HEIGHT);
          const height = Math.max(22, (end.getTime() - start.getTime()) / 3_600_000 * HOUR_HEIGHT);
          return (
            <div key={event.id} className="absolute left-1 right-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-[10px] leading-tight text-charcoal-800 shadow-sm" style={{ top, height, backgroundColor: `${event.color || "#8b7bb7"}26`, borderColor: event.color || "#8b7bb7" }} title={`${event.title}, ${timeLabel(event.start)}–${timeLabel(event.end)}`}>
              <div className="truncate font-bold">{event.title}</div>
              {height > 35 && <div className="mt-0.5 truncate opacity-70">{timeLabel(event.start)}–{timeLabel(event.end)}</div>}
            </div>
          );
        })}
        {dayBlocks.map((block) => {
          const start = new Date(block.start);
          const end = new Date(block.end);
          const conflicts = blocksConflict(block, visibleEvents);
          const top = Math.max(0, minutesFromStart(start) / 60 * HOUR_HEIGHT);
          const height = Math.max(28, (end.getTime() - start.getTime()) / 3_600_000 * HOUR_HEIGHT);
          return (
            <button
              key={block.id}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.setPointerCapture(event.pointerId);
                setDrag({ blockId: block.id, dayIndex, minuteOffset: Math.max(0, minutesFromStart(start)), grabOffsetPx: event.clientY - rect.top, pointerId: event.pointerId, mobile, moved: false });
              }}
              onClick={() => {
                if (!suppressClickRef.current) setEditing(block.id);
              }}
              className={`absolute left-1 right-1 z-10 cursor-grab select-none overflow-hidden rounded-lg px-2 py-1 text-left text-[10px] leading-tight text-white shadow-[0_3px_12px_rgba(255,107,94,.28)] transition hover:brightness-95 active:cursor-grabbing ${conflicts.length ? "ring-2 ring-amber-400" : ""} ${drag?.blockId === block.id ? "opacity-20" : ""}`}
              style={{ top, height, backgroundColor: "var(--color-coral-500)", touchAction: "none" }}
              title="Drag to move or click to edit"
            >
              <div className="truncate font-bold">{block.label}</div>
              {height > 35 && <div className="mt-0.5 truncate text-white/85">{timeLabel(block.start)}–{timeLabel(block.end)}</div>}
            </button>
          );
        })}
        {previewBlock && drag?.dayIndex === dayIndex && drag.mobile === mobile && (
          <div className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg bg-coral-500 px-2 py-1 text-[10px] leading-tight text-white shadow-[0_8px_24px_rgba(255,107,94,.38)] ring-2 ring-white/80 transition-[top] duration-75" style={{ top: drag.minuteOffset / 60 * HOUR_HEIGHT, height: Math.max(28, (new Date(previewBlock.end).getTime() - new Date(previewBlock.start).getTime()) / 3_600_000 * HOUR_HEIGHT) }}>
            <div className="absolute inset-x-0 top-0 h-px -translate-y-px bg-coral-600"><span className="absolute -left-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-coral-600 ring-2 ring-white" /></div>
            <div className="truncate font-bold">{previewBlock.label}</div>
            <div className="mt-0.5 truncate font-bold text-white">{timeLabel(previewBlock.start)}–{timeLabel(previewBlock.end)}</div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-charcoal-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
              {days[drag.dayIndex].toLocaleDateString("en-US", { weekday: "short" })} · {timeLabel(previewBlock.start)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label text-charcoal-400">Your unified week</div>
          <p className="mt-1 text-sm text-charcoal-500">Drag coral preparation blocks into open space. Times snap every 15 minutes with haptic ticks on supported phones.</p>
        </div>
        <button onClick={onAutoPlace} className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)]"><Icon name="sparkle" size={15} /> Auto-Place My Week</button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {calendars.map((calendar) => {
          const active = selectedCalendarIds.includes(calendar.id);
          return <button key={calendar.id} onClick={() => onToggleCalendar(calendar.id)} aria-pressed={active} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-charcoal-200 bg-white text-charcoal-700" : "border-charcoal-100 text-charcoal-400 opacity-60"}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: calendar.color }} />{calendar.name}</button>;
        })}
        {previewMode && <span className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-bold text-charcoal-500">Preview data</span>}
      </div>

      <div className="mt-4 md:hidden">
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => <button key={day.toISOString()} onClick={() => setActiveDay(index)} className={`rounded-lg py-2 text-center ${activeDay === index ? "bg-coral-500 text-white" : "bg-cream-200 text-charcoal-600"}`}><span className="block text-[9px] font-bold uppercase">{day.toLocaleDateString("en-US", { weekday: "narrow" })}</span><span className="block text-xs font-bold">{day.getDate()}</span></button>)}
        </div>
      </div>

      <div className={`mt-3 overflow-hidden rounded-xl border bg-white shadow-[var(--shadow-sm)] transition ${drag ? "border-coral-300 ring-2 ring-coral-100" : "border-charcoal-100"}`}>
        <div className="hidden grid-cols-[52px_repeat(7,minmax(0,1fr))] md:grid">
          <div className="border-b border-charcoal-100" />
          {days.map((day, index) => <div key={day.toISOString()} className={`border-b border-l border-charcoal-100 px-1 py-2 text-center ${index === 6 ? "bg-coral-50" : "bg-cream-50"}`}><div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">{day.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="mt-0.5 text-sm font-bold text-charcoal-800">{day.getDate()}</div></div>)}
        </div>
        <div ref={desktopBodyRef} className="hidden grid-cols-[52px_repeat(7,minmax(0,1fr))] md:grid">
          <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>{Array.from({ length: END_HOUR - START_HOUR }, (_, hour) => <div key={hour} className="absolute right-2 -translate-y-2 text-[9px] text-charcoal-400" style={{ top: hour * HOUR_HEIGHT }}>{new Date(2020, 1, 1, START_HOUR + hour).toLocaleTimeString("en-US", { hour: "numeric" })}</div>)}</div>
          {days.map((day, index) => renderDay(day, index))}
        </div>
        <div ref={mobileBodyRef} className="relative md:hidden" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>{Array.from({ length: END_HOUR - START_HOUR }, (_, hour) => <div key={hour} className="absolute left-1 z-20 -translate-y-2 rounded bg-white/80 px-1 text-[9px] text-charcoal-400" style={{ top: hour * HOUR_HEIGHT }}>{new Date(2020, 1, 1, START_HOUR + hour).toLocaleTimeString("en-US", { hour: "numeric" })}</div>)}{renderDay(days[activeDay], activeDay, true)}</div>
      </div>

      <div aria-live="polite" className="sr-only">
        {previewBlock && drag ? `${previewBlock.label}, ${days[drag.dayIndex].toLocaleDateString("en-US", { weekday: "long" })} at ${timeLabel(previewBlock.start)}` : ""}
      </div>

      {editingBlock && (
        <div className="fixed inset-0 z-50 flex items-end bg-charcoal-900/35 p-3 sm:items-center sm:justify-center" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(null); }}>
          <div role="dialog" aria-modal="true" aria-label={`Edit ${editingBlock.label}`} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3"><div><div className="label text-coral-600">Protected time</div><h3 className="mt-1 text-xl font-bold text-charcoal-900">{editingBlock.label}</h3></div><button onClick={() => setEditing(null)} aria-label="Close"><Icon name="x" /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-charcoal-500">Day<select value={days.findIndex((day) => sameDay(day, new Date(editingBlock.start)))} onChange={(event) => placeBlock(editingBlock, Number(event.target.value), Math.max(0, minutesFromStart(new Date(editingBlock.start))))} className="mt-1 w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-800">{days.map((day, index) => <option key={index} value={index}>{day.toLocaleDateString("en-US", { weekday: "long" })}</option>)}</select></label><label className="text-xs font-bold text-charcoal-500">Start time<input type="time" value={`${String(new Date(editingBlock.start).getHours()).padStart(2, "0")}:${String(new Date(editingBlock.start).getMinutes()).padStart(2, "0")}`} onChange={(event) => { const [hour, minute] = event.target.value.split(":").map(Number); const start = new Date(editingBlock.start); const duration = new Date(editingBlock.end).getTime() - start.getTime(); start.setHours(hour, minute, 0, 0); onChangeBlock({ ...editingBlock, start: start.toISOString(), end: new Date(start.getTime() + duration).toISOString() }); }} className="mt-1 w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-800" /></label></div>
            <div className="mt-4"><div className="text-xs font-bold text-charcoal-500">Duration</div><div className="mt-2 flex flex-wrap gap-2">{DURATIONS.map((duration) => { const selected = Math.round((new Date(editingBlock.end).getTime() - new Date(editingBlock.start).getTime()) / 60_000) === duration; return <button key={duration} onClick={() => onChangeBlock({ ...editingBlock, end: new Date(new Date(editingBlock.start).getTime() + duration * 60_000).toISOString() })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? "border-coral-400 bg-coral-100 text-coral-600" : "border-charcoal-200 text-charcoal-500"}`}>{duration} min</button>; })}</div></div>
            {blocksConflict(editingBlock, visibleEvents).length > 0 && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">This overlaps {blocksConflict(editingBlock, visibleEvents)[0].title}. Move it or keep it intentionally.</div>}
            <div className="mt-5 flex items-center justify-between"><button onClick={() => { onRemoveBlock(editingBlock.id); setEditing(null); }} className="text-sm font-bold text-coral-600">Remove Block</button><button onClick={() => setEditing(null)} className="rounded-full bg-charcoal-900 px-5 py-2.5 text-sm font-bold text-white">Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
