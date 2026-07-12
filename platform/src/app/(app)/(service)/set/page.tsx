"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label, KeyBadge } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { SongPicker } from "@/components/SongPicker";
import { PdfChartControl } from "@/components/PdfChartControl";
import { ALL_KEYS, countLabel, fmtDuration, semitonesBetween } from "@/lib/music";
import {
  blankLibrarySong,
  catalogPatchFromSong,
  songFromLibrary,
} from "@/lib/library";
import {
  blankElement,
  sectionDurationSec,
  sectionSongIds,
  serviceSetDurationSec,
} from "@/lib/set";
import type {
  LibrarySong,
  Service,
  Song,
  SetSection,
  SetElement,
  SetRow,
} from "@/lib/types";

function id(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const FLOWS = ["Opener", "Adoration", "Communion", "Response", "Sending", "Special"];

function parseDuration(v: string): number {
  const t = v.trim();
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    return (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
  }
  return (parseInt(t, 10) || 0) * 60;
}

export default function SetPage() {
  const { activeService, updateService, addLibrarySong, updateLibrarySong } = useStore();
  const svc = activeService;
  const patch = (updater: (s: Service) => Service) => updateService(svc.id, updater);

  // ---- popup state ----
  const [pickerSection, setPickerSection] = useState<string | null>(null);
  const [addMenu, setAddMenu] = useState<string | null>(null); // section whose Add chooser is open
  const [sectionDraft, setSectionDraft] = useState<{ afterId: string } | null>(null);
  const [elementDraft, setElementDraft] = useState<{ sectionId: string } | null>(null);

  // ---- cross-section row drag ----
  const dragRow = useRef<{ sec: string; idx: number } | null>(null);

  const songById = (sid: string) => svc.songs.find((s) => s.id === sid);
  const elementById = (eid: string) => (svc.elements ?? []).find((e) => e.id === eid);
  const totalSec = serviceSetDurationSec(svc);
  const songCount = svc.setSections.reduce((n, s) => n + sectionSongIds(s).length, 0);

  // ---- song mutations ----
  const updateSong = (sid: string, fields: Partial<Song>) => {
    patch((s) => ({
      ...s,
      songs: s.songs.map((sg) => (sg.id === sid ? { ...sg, ...fields } : sg)),
    }));
    const song = svc.songs.find((sg) => sg.id === sid);
    if (song?.libraryId) {
      const catalog = catalogPatchFromSong(fields);
      if (Object.keys(catalog).length) updateLibrarySong(song.libraryId, catalog);
    }
  };

  const addSongRow = (sectionId: string, newSong: Song) =>
    patch((s) => ({
      ...s,
      songs: [...s.songs, newSong],
      setSections: s.setSections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, rows: [...sec.rows, { kind: "song", refId: newSong.id }] }
          : sec,
      ),
    }));

  const addFromLibrary = (
    sectionId: string,
    picks: { lib: LibrarySong; key: string }[],
  ) => {
    for (const { lib, key } of picks) {
      addSongRow(sectionId, { ...songFromLibrary(lib), serviceKey: key });
    }
    setPickerSection(null);
  };

  const createBlankSong = (sectionId: string) => {
    const lib = blankLibrarySong();
    addLibrarySong(lib);
    addSongRow(sectionId, songFromLibrary(lib));
    setPickerSection(null);
  };

  // ---- element mutations ----
  const addElement = (sectionId: string, draft: { title: string; durationSec: number }) =>
    patch((s) => {
      const el = blankElement(draft.title || "New element", draft.durationSec);
      return {
        ...s,
        elements: [...(s.elements ?? []), el],
        setSections: s.setSections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, rows: [...sec.rows, { kind: "element", refId: el.id }] }
            : sec,
        ),
      };
    });

  const updateElement = (eid: string, fields: Partial<SetElement>) =>
    patch((s) => ({
      ...s,
      elements: (s.elements ?? []).map((e) => (e.id === eid ? { ...e, ...fields } : e)),
    }));

  // ---- row mutations (remove / move) ----
  const removeRow = (sectionId: string, idx: number) =>
    patch((s) => {
      const sec = s.setSections.find((x) => x.id === sectionId);
      const row = sec?.rows[idx];
      if (!row) return s;
      const setSections = s.setSections.map((x) =>
        x.id === sectionId ? { ...x, rows: x.rows.filter((_, i) => i !== idx) } : x,
      );
      if (row.kind === "song")
        return { ...s, songs: s.songs.filter((sg) => sg.id !== row.refId), setSections };
      return {
        ...s,
        elements: (s.elements ?? []).filter((e) => e.id !== row.refId),
        setSections,
      };
    });

  // Move a row within its section, or across to an adjacent section at the edges.
  const nudgeRow = (sectionId: string, idx: number, dir: -1 | 1) =>
    patch((s) => {
      const secIdx = s.setSections.findIndex((x) => x.id === sectionId);
      const sec = s.setSections[secIdx];
      if (!sec) return s;
      const target = idx + dir;
      if (target >= 0 && target < sec.rows.length) {
        const sections = [...s.setSections];
        sections[secIdx] = { ...sec, rows: reorder(sec.rows, idx, target) };
        return { ...s, setSections: sections };
      }
      // crossing a section boundary
      const adjIdx = secIdx + dir;
      if (adjIdx < 0 || adjIdx >= s.setSections.length) return s;
      const adj = s.setSections[adjIdx];
      const row = sec.rows[idx];
      const sections = [...s.setSections];
      sections[secIdx] = { ...sec, rows: sec.rows.filter((_, i) => i !== idx) };
      const adjRows = [...adj.rows];
      adjRows.splice(dir === 1 ? 0 : adjRows.length, 0, row);
      sections[adjIdx] = { ...adj, rows: adjRows };
      return { ...s, setSections: sections };
    });

  // Drag drop: move the dragged row to land before `toIdx` in `toSec`.
  const moveRowTo = (toSec: string, toIdx: number) => {
    const from = dragRow.current;
    dragRow.current = null;
    if (!from) return;
    if (from.sec === toSec && (toIdx === from.idx || toIdx === from.idx + 1)) return;
    patch((s) => {
      const sections = s.setSections.map((sec) => ({ ...sec, rows: [...sec.rows] }));
      const src = sections.find((x) => x.id === from.sec);
      const dst = sections.find((x) => x.id === toSec);
      if (!src || !dst) return s;
      const [row] = src.rows.splice(from.idx, 1);
      let target = toIdx;
      if (from.sec === toSec && from.idx < toIdx) target -= 1;
      dst.rows.splice(target, 0, row);
      return { ...s, setSections: sections };
    });
  };

  // ---- section mutations ----
  const renameSection = (sectionId: string, label: string) =>
    patch((s) => ({
      ...s,
      setSections: s.setSections.map((sec) =>
        sec.id === sectionId ? { ...sec, label } : sec,
      ),
    }));

  const addSectionBelow = (afterId: string, label: string) =>
    patch((s) => {
      const i = s.setSections.findIndex((x) => x.id === afterId);
      const newSec: SetSection = { id: id("setsec"), label: label || "New section", rows: [] };
      const next = [...s.setSections];
      next.splice(i < 0 ? next.length : i + 1, 0, newSec);
      return { ...s, setSections: next };
    });

  const removeSection = (section: SetSection) =>
    patch((s) => {
      const songIds = sectionSongIds(section);
      const elemIds = section.rows
        .filter((r) => r.kind === "element")
        .map((r) => r.refId);
      return {
        ...s,
        songs: s.songs.filter((sg) => !songIds.includes(sg.id)),
        elements: (s.elements ?? []).filter((e) => !elemIds.includes(e.id)),
        setSections: s.setSections.filter((sec) => sec.id !== section.id),
      };
    });

  const moveSection = (from: number, to: number) =>
    patch((s) => ({ ...s, setSections: reorder(s.setSections, from, to) }));

  return (
    <div className="space-y-6" data-coach="set">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-charcoal-900">WORSHIP SET</h1>
          <p className="mt-1 text-sm text-charcoal-400">
            {svc.title} · Order the whole service. Songs, moments, and timing at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-charcoal-500">
          <span className="flex items-center gap-1.5">
            <Icon name="music" size={16} /> {countLabel(songCount, "song")}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-charcoal-800">
            <Icon name="calendar" size={16} /> {fmtDuration(totalSec)} total
          </span>
        </div>
      </div>

      {svc.setSections.map((section, secIdx) => (
        <SectionCard
          key={section.id}
          section={section}
          subtotalSec={sectionDurationSec(section, svc)}
          isFirst={secIdx === 0}
          isLast={secIdx === svc.setSections.length - 1}
          songById={songById}
          elementById={elementById}
          onRename={(v) => renameSection(section.id, v)}
          onRemoveSection={() => removeSection(section)}
          onMoveSectionUp={() => moveSection(secIdx, secIdx - 1)}
          onMoveSectionDown={() => moveSection(secIdx, secIdx + 1)}
          onAdd={() => setAddMenu(section.id)}
          onRemoveRow={(idx) => removeRow(section.id, idx)}
          onNudgeRow={(idx, dir) => nudgeRow(section.id, idx, dir)}
          onUpdateSong={updateSong}
          onUpdateElement={updateElement}
          onRowDragStart={(idx) => (dragRow.current = { sec: section.id, idx })}
          onRowDrop={(idx) => moveRowTo(section.id, idx)}
        />
      ))}

      <button
        onClick={() =>
          setSectionDraft({
            afterId: svc.setSections[svc.setSections.length - 1]?.id ?? "",
          })
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-charcoal-200 py-3 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
      >
        <Icon name="plus" size={16} /> Add a section
      </button>

      {/* Add chooser */}
      {addMenu && (
        <AddChooser
          onClose={() => setAddMenu(null)}
          onPickSection={() => {
            setSectionDraft({ afterId: addMenu });
            setAddMenu(null);
          }}
          onPickElement={() => {
            setElementDraft({ sectionId: addMenu });
            setAddMenu(null);
          }}
          onPickSong={() => {
            setPickerSection(addMenu);
            setAddMenu(null);
          }}
        />
      )}

      {/* Name a new section */}
      {sectionDraft && (
        <NameModal
          title="New section"
          label="Section name"
          placeholder="Worship, The Word, Response…"
          onCancel={() => setSectionDraft(null)}
          onDone={(name) => {
            addSectionBelow(sectionDraft.afterId, name);
            setSectionDraft(null);
          }}
        />
      )}

      {/* Name a new element */}
      {elementDraft && (
        <NameModal
          title="New element"
          label="What's happening?"
          placeholder="Welcome, Testimony, Baptism, Offering…"
          withDuration
          onCancel={() => setElementDraft(null)}
          onDone={(name, durationSec) => {
            addElement(elementDraft.sectionId, { title: name, durationSec: durationSec ?? 300 });
            setElementDraft(null);
          }}
        />
      )}

      <SongPicker
        open={pickerSection !== null}
        onClose={() => setPickerSection(null)}
        onPick={(picks) => pickerSection && addFromLibrary(pickerSection, picks)}
        onCreateBlank={() => pickerSection && createBlankSong(pickerSection)}
      />
    </div>
  );
}

// ============================================================
// Section card
// ============================================================
function SectionCard({
  section,
  subtotalSec,
  isFirst,
  isLast,
  songById,
  elementById,
  onRename,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onAdd,
  onRemoveRow,
  onNudgeRow,
  onUpdateSong,
  onUpdateElement,
  onRowDragStart,
  onRowDrop,
}: {
  section: SetSection;
  subtotalSec: number;
  isFirst: boolean;
  isLast: boolean;
  songById: (sid: string) => Song | undefined;
  elementById: (eid: string) => SetElement | undefined;
  onRename: (v: string) => void;
  onRemoveSection: () => void;
  onMoveSectionUp: () => void;
  onMoveSectionDown: () => void;
  onAdd: () => void;
  onRemoveRow: (idx: number) => void;
  onNudgeRow: (idx: number, dir: -1 | 1) => void;
  onUpdateSong: (sid: string, fields: Partial<Song>) => void;
  onUpdateElement: (eid: string, fields: Partial<SetElement>) => void;
  onRowDragStart: (idx: number) => void;
  onRowDrop: (idx: number) => void;
}) {
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={section.label}
            onChange={(e) => onRename(e.target.value)}
            className="label w-full max-w-xs border-none bg-transparent p-0 text-charcoal-700 outline-none focus:text-charcoal-900"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-xs font-semibold text-charcoal-400">
            {fmtDuration(subtotalSec)}
          </span>
          <IconBtn name="chevronUp" title="Move section up" disabled={isFirst} onClick={onMoveSectionUp} />
          <IconBtn name="chevronDown" title="Move section down" disabled={isLast} onClick={onMoveSectionDown} />
          <button
            onClick={onRemoveSection}
            className="ml-1 flex min-h-11 items-center rounded-md px-2 py-1 text-xs font-semibold text-charcoal-400 transition hover:bg-cream-200 hover:text-error lg:min-h-0"
            title="Remove section"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {section.rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-charcoal-200 px-3 py-3 text-center text-sm text-charcoal-400">
            Empty. Add a song or a moment below.
          </p>
        )}
        {section.rows.map((row, idx) => {
          const dropProps = {
            onDragOver: (e: React.DragEvent) => {
              e.preventDefault();
              setOverIdx(idx);
            },
            onDrop: () => {
              onRowDrop(idx);
              setOverIdx(null);
            },
            isOver: overIdx === idx,
          };
          const common = {
            isFirst: idx === 0,
            isLast: idx === section.rows.length - 1,
            onUp: () => onNudgeRow(idx, -1),
            onDown: () => onNudgeRow(idx, 1),
            onRemove: () => onRemoveRow(idx),
            onDragStart: () => onRowDragStart(idx),
            ...dropProps,
          };
          if (row.kind === "song") {
            const song = songById(row.refId);
            if (!song) return null;
            return <SongCard key={row.refId} song={song} onUpdate={(f) => onUpdateSong(song.id, f)} {...common} />;
          }
          const el = elementById(row.refId);
          if (!el) return null;
          return <ElementCard key={row.refId} element={el} onUpdate={(f) => onUpdateElement(el.id, f)} {...common} />;
        })}
        {/* trailing drop zone — append to this section */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOverIdx(section.rows.length);
          }}
          onDrop={() => {
            onRowDrop(section.rows.length);
            setOverIdx(null);
          }}
          className={`h-2 rounded transition ${
            overIdx === section.rows.length ? "bg-coral-300" : ""
          }`}
        />
      </div>

      <button
        onClick={onAdd}
        className="mt-3 flex min-h-11 items-center gap-1.5 rounded-lg border border-dashed border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600 lg:min-h-0"
      >
        <Icon name="plus" size={16} /> Add
      </button>
    </Card>
  );
}

// Small shared move/drag control cluster + container for a row.
function RowShell({
  children,
  isOver,
  isFirst,
  isLast,
  onUp,
  onDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  expandable,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  isOver: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  expandable?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      draggable={!open}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-lg border bg-cream-100 p-3 transition ${
        isOver ? "border-coral-400 ring-1 ring-coral-300" : "border-charcoal-100"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="cursor-grab pt-1 text-charcoal-300 active:cursor-grabbing" title="Drag to reorder">
          <Icon name="grip" size={16} />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn name="chevronUp" title="Move up" disabled={isFirst} onClick={onUp} />
          <IconBtn name="chevronDown" title="Move down" disabled={isLast} onClick={onDown} />
          <button
            onClick={onToggle}
            className="flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800 lg:min-h-0"
          >
            {open ? "Close" : "Edit"}
            <Icon name="chevronDown" size={14} className={open ? "rotate-180" : ""} />
          </button>
          <button
            onClick={onRemove}
            className="flex min-h-11 min-w-8 items-center justify-center rounded-md p-1 text-charcoal-300 transition hover:text-error lg:min-h-0 lg:min-w-0"
            title="Remove"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      </div>
      {open && expandable}
    </div>
  );
}

function IconBtn({
  name,
  title,
  disabled,
  onClick,
}: {
  name: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex min-h-11 min-w-8 items-center justify-center rounded-md p-1 text-charcoal-400 transition hover:bg-cream-200 hover:text-charcoal-800 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent lg:min-h-0 lg:min-w-0"
    >
      <Icon name={name} size={15} />
    </button>
  );
}

// ============================================================
// Element row
// ============================================================
function ElementCard({
  element,
  onUpdate,
  isOver,
  isFirst,
  isLast,
  onUp,
  onDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  element: SetElement;
  onUpdate: (fields: Partial<SetElement>) => void;
  isOver: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <RowShell
      isOver={isOver}
      isFirst={isFirst}
      isLast={isLast}
      onUp={onUp}
      onDown={onDown}
      onRemove={onRemove}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      expandable={
        <div className="mt-3 space-y-4 border-t border-charcoal-100 pt-3">
          <Field label="Title">
            <EditableText value={element.title} onCommit={(v) => onUpdate({ title: v })} />
          </Field>
          <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
            Length
            <input
              type="text"
              defaultValue={fmtDuration(element.durationSec)}
              onBlur={(e) => onUpdate({ durationSec: parseDuration(e.target.value) })}
              placeholder="5:00"
              className="w-16 rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
            />
          </label>
          <Field label="Notes">
            <EditableText
              value={element.notes ?? ""}
              onCommit={(v) => onUpdate({ notes: v })}
              multiline
              placeholder="Who's leading it, cues, anything the team needs…"
            />
          </Field>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-cream-200 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-charcoal-500">
          <Icon name="calendar" size={11} /> Moment
        </span>
        <span className="text-sm font-semibold text-charcoal-800">{element.title}</span>
        <span className="text-xs text-charcoal-400">· {fmtDuration(element.durationSec)}</span>
      </div>
    </RowShell>
  );
}

// ============================================================
// Song row (rich editor preserved)
// ============================================================
const CHART_SOURCE_META: Record<string, { label: string; tone: string }> = {
  builtin: { label: "Editable chart", tone: "bg-coral-100 text-coral-600" },
  pdf: { label: "PDF chart", tone: "bg-ok-tint text-ok-ink" },
  none: { label: "No chart", tone: "bg-cream-200 text-charcoal-400" },
};

function SongCard({
  song,
  onUpdate,
  isOver,
  isFirst,
  isLast,
  onUp,
  onDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  song: Song;
  onUpdate: (fields: Partial<Song>) => void;
  isOver: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = CHART_SOURCE_META[song.chartSource];
  const transposed = semitonesBetween(song.originalKey, song.serviceKey);

  return (
    <RowShell
      isOver={isOver}
      isFirst={isFirst}
      isLast={isLast}
      onUp={onUp}
      onDown={onDown}
      onRemove={onRemove}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      expandable={
        <div className="mt-3 space-y-4 border-t border-charcoal-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <EditableText value={song.title} onCommit={(v) => onUpdate({ title: v })} />
            </Field>
            <Field label="Artist">
              <EditableText value={song.artist} onCommit={(v) => onUpdate({ artist: v })} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <KeySelect label="Chart key" value={song.originalKey} onChange={(v) => onUpdate({ originalKey: v })} />
            <KeySelect label="Sunday key" value={song.serviceKey} onChange={(v) => onUpdate({ serviceKey: v })} />
            <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
              Flow
              <select
                value={song.flow}
                onChange={(e) => onUpdate({ flow: e.target.value })}
                className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
              >
                {FLOWS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
              Length
              <input
                type="text"
                defaultValue={fmtDuration(song.durationSec)}
                onBlur={(e) => onUpdate({ durationSec: parseDuration(e.target.value) })}
                placeholder="4:00"
                className="w-16 rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Lead">
              <EditableText value={song.leadName} onCommit={(v) => onUpdate({ leadName: v })} />
            </Field>
            <Field label="CCLI #">
              <EditableText value={song.ccli ?? ""} onCommit={(v) => onUpdate({ ccli: v })} placeholder="e.g. 7016161" />
            </Field>
          </div>

          <div>
            <Label>Chart</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <ChartSourceButton active={song.chartSource === "builtin"} onClick={() => onUpdate({ chartSource: "builtin" })} icon="music" text="Editable chart" />
              <ChartSourceButton active={song.chartSource === "pdf"} onClick={() => onUpdate({ chartSource: "pdf" })} icon="upload" text="Upload PDF" />
              <ChartSourceButton active={song.chartSource === "none"} onClick={() => onUpdate({ chartSource: "none" })} icon="link" text="Links only" />
            </div>
            {song.chartSource === "pdf" && (
              <PdfChartControl
                songId={song.id}
                pdfPath={song.pdfPath}
                pdfName={song.pdfName}
                onChange={(f) => onUpdate(f)}
              />
            )}
            {song.chartSource === "builtin" && (
              <Link
                href={`/chart?song=${song.id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"
              >
                <Icon name="music" size={14} /> Open chart editor · transpose, numbers, print
              </Link>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Multitracks link">
              <EditableText value={song.multitracksUrl ?? ""} onCommit={(v) => onUpdate({ multitracksUrl: v })} placeholder="https://www.multitracks.com/..." />
            </Field>
            <Field label="SongSelect link">
              <EditableText value={song.songSelectUrl ?? ""} onCommit={(v) => onUpdate({ songSelectUrl: v })} placeholder="https://songselect.ccli.com/..." />
            </Field>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-charcoal-800">{song.title}</span>
        {song.artist && <span className="text-xs text-charcoal-400">{song.artist}</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-charcoal-400">
        <KeyBadge k={song.serviceKey} />
        {transposed !== 0 && (
          <span className="text-coral-600">
            from {song.originalKey} ({transposed > 0 ? "+" : ""}
            {transposed})
          </span>
        )}
        <span>·</span>
        <span>{song.flow}</span>
        {song.leadName && (
          <>
            <span>·</span>
            <span>Lead: {song.leadName}</span>
          </>
        )}
        <span>·</span>
        <span>{fmtDuration(song.durationSec)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.tone}`}>
          {meta.label}
        </span>
        {song.chartSource === "builtin" && (
          <Link href={`/chart?song=${song.id}`} className="flex items-center gap-1 text-xs font-semibold text-coral-600 hover:underline">
            <Icon name="music" size={13} /> Open editor
          </Link>
        )}
        {song.pdfName && (
          <span className="flex items-center gap-1 text-xs text-charcoal-400">
            <Icon name="file" size={13} /> {song.pdfName}
          </span>
        )}
        {song.multitracksUrl && (
          <a href={song.multitracksUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-coral-600 hover:underline">
            <Icon name="link" size={13} /> Multitracks
          </a>
        )}
        {song.songSelectUrl && (
          <a href={song.songSelectUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-coral-600 hover:underline">
            <Icon name="link" size={13} /> SongSelect
          </a>
        )}
      </div>
    </RowShell>
  );
}

// ============================================================
// Add chooser + Name modal
// ============================================================
function AddChooser({
  onClose,
  onPickSection,
  onPickElement,
  onPickSong,
}: {
  onClose: () => void;
  onPickSection: () => void;
  onPickElement: () => void;
  onPickSong: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-charcoal-100 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">Add to the set</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-md text-charcoal-400 transition hover:bg-cream-200 hover:text-charcoal-800 lg:h-7 lg:w-7">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="space-y-2">
          <ChooserBtn icon="music" title="Song" desc="Pull one from your library" onClick={onPickSong} />
          <ChooserBtn icon="calendar" title="Element" desc="A moment: welcome, testimony, baptism" onClick={onPickElement} />
          <ChooserBtn icon="plus" title="Section" desc="A new block, added below this one" onClick={onPickSection} />
        </div>
      </div>
    </div>
  );
}

function ChooserBtn({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-charcoal-100 px-3 py-3 text-left transition hover:border-coral-400 hover:bg-coral-100/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-200 text-charcoal-600">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className="text-sm font-semibold text-charcoal-800">{title}</div>
        <div className="text-xs text-charcoal-400">{desc}</div>
      </div>
    </button>
  );
}

function NameModal({
  title,
  label,
  placeholder,
  withDuration,
  onCancel,
  onDone,
}: {
  title: string;
  label: string;
  placeholder: string;
  withDuration?: boolean;
  onCancel: () => void;
  onDone: (name: string, durationSec?: number) => void;
}) {
  const [name, setName] = useState("");
  const [dur, setDur] = useState("5:00");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const done = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      ref.current?.focus();
      return;
    }
    onDone(trimmed, withDuration ? parseDuration(dur) : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">{title}</h2>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <Label>{label}</Label>
            <input
              ref={ref}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && done()}
              placeholder={placeholder}
              className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
            />
          </div>
          {withDuration && (
            <div>
              <Label>How long?</Label>
              <input
                value={dur}
                onChange={(e) => setDur(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && done()}
                placeholder="5:00"
                className="mt-1 w-24 rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-charcoal-100 px-6 py-4">
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800">
            Cancel
          </button>
          <button onClick={done} className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Small shared bits
// ============================================================
function KeySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
      >
        {ALL_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ChartSourceButton({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        active
          ? "border-coral-400 bg-coral-100 text-coral-600"
          : "border-charcoal-200 text-charcoal-500 hover:border-charcoal-300"
      }`}
    >
      <Icon name={icon} size={15} /> {text}
    </button>
  );
}
