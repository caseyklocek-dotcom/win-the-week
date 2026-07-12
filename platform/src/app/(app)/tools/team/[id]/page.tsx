"use client";

import { use, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PositionTray } from "@/components/PositionTray";
import {
  blankSlot,
  blankEntry,
  FREQ_LABELS,
  WEEK_LABELS,
  entryLabel,
} from "@/lib/teamTemplate";
import { GROUP_ORDER, GROUP_META, renumberFamily } from "@/lib/positions";
import type {
  TeamTemplate,
  TeamTemplateSlot,
  TeamTemplatePoolEntry,
  TeamFrequency,
  PositionGroup,
  PositionDef,
  Person,
} from "@/lib/types";

// ---- Frequency picker (inline dropdown) ----
function FreqPicker({
  entry,
  onChange,
}: {
  entry: TeamTemplatePoolEntry;
  onChange: (fields: Partial<TeamTemplatePoolEntry>) => void;
}) {
  const [open, setOpen] = useState(false);

  const FREQS: TeamFrequency[] = ["weekly", "biweekly", "monthly", "custom"];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs font-semibold text-charcoal-600 transition hover:border-coral-300 hover:text-coral-600"
      >
        {entryLabel(entry)}
        <Icon name="chevronDown" size={11} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-40 mt-1 min-w-[180px] rounded-xl border border-charcoal-100 bg-white shadow-lg">
            {FREQS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  onChange({
                    frequency: f,
                    customWeeks:
                      f === "custom" ? entry.customWeeks ?? [] : undefined,
                  });
                  if (f !== "custom") setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold transition first:rounded-t-xl last:rounded-b-xl ${
                  entry.frequency === f
                    ? "bg-coral-50 text-coral-600"
                    : "text-charcoal-700 hover:bg-cream-100"
                }`}
              >
                {FREQ_LABELS[f]}
                {entry.frequency === f && <Icon name="check" size={12} />}
              </button>
            ))}

            {/* Custom week picker — multi-select, shown when "custom" is selected */}
            {entry.frequency === "custom" && (
              <div className="rounded-b-xl border-t border-charcoal-100 bg-cream-50 px-3 py-2.5">
                <p className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-charcoal-400">
                  Which Sundays? Select all that apply
                </p>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, 5] as const).map((w) => {
                    const weeks = entry.customWeeks ?? [];
                    const on = weeks.includes(w);
                    return (
                      <button
                        key={w}
                        onClick={() => {
                          const next = on
                            ? weeks.filter((x) => x !== w)
                            : [...weeks, w].sort((a, b) => a - b);
                          onChange({ customWeeks: next });
                        }}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                          on
                            ? "bg-coral-500 text-white shadow-sm"
                            : "bg-white text-charcoal-600 ring-1 ring-charcoal-200 hover:ring-coral-300"
                        }`}
                      >
                        {WEEK_LABELS[w]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Person picker modal ----
function PersonPickerModal({
  people,
  excludeIds,
  onPick,
  onClose,
}: {
  people: Person[];
  excludeIds: string[];
  onPick: (personId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const active = people.filter((p) => p.active && !excludeIds.includes(p.id));
  const filtered = q.trim()
    ? active.filter((p) =>
        (p.name + " " + p.roles.join(" "))
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : active;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
      <div className="flex max-h-[75vh] w-full max-w-xs flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-charcoal-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
            Add to pool
          </h2>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roster…"
            className="mt-2 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-charcoal-400">
              {active.length === 0 ? "No active team members yet." : "No matches."}
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-cream-100"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal-800 text-[0.6rem] font-bold text-white">
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-charcoal-800">{p.name}</div>
                  {p.roles.length > 0 && (
                    <div className="truncate text-xs text-charcoal-400">{p.roles.join(", ")}</div>
                  )}
                </div>
                <Icon name="plus" size={14} className="shrink-0 text-coral-500" />
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end border-t border-charcoal-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Avatar chip ----
function AvatarChip({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      title={name}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal-700 text-[0.55rem] font-bold text-white ring-2 ring-white -ml-1.5 first:ml-0"
    >
      {initials}
    </span>
  );
}

// ---- Slot row (accordion) ----
function SlotRow({
  slot,
  people,
  index,
  expanded,
  dragging,
  rowStyle,
  registerRow,
  dragHandleProps,
  onToggle,
  onUpdate,
  onRemove,
  onAddPerson,
  onUpdateEntry,
  onRemoveEntry,
  onMoveEntryUp,
  onMoveEntryDown,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
}: {
  slot: TeamTemplateSlot;
  people: Person[];
  index: number;
  expanded: boolean;
  dragging: boolean;
  rowStyle: React.CSSProperties;
  registerRow: (el: HTMLElement | null) => void;
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  onToggle: () => void;
  onUpdate: (fields: Partial<TeamTemplateSlot>) => void;
  onRemove: () => void;
  onAddPerson: (personId: string) => void;
  onUpdateEntry: (personId: string, fields: Partial<TeamTemplatePoolEntry>) => void;
  onRemoveEntry: (personId: string) => void;
  onMoveEntryUp: (personId: string) => void;
  onMoveEntryDown: (personId: string) => void;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
}) {
  const pool = slot.pool ?? [];
  const poolPeople = pool
    .map((e) => ({ entry: e, person: people.find((p) => p.id === e.personId) }))
    .filter((x) => x.person) as { entry: TeamTemplatePoolEntry; person: Person }[];

  return (
    <div ref={registerRow} style={rowStyle}>
      {pickerOpen && (
        <PersonPickerModal
          people={people}
          excludeIds={pool.map((e) => e.personId)}
          onPick={(pid) => { onAddPerson(pid); onClosePicker(); }}
          onClose={onClosePicker}
        />
      )}

      <Card
        className={`relative p-0 ${
          dragging
            ? "z-30 scale-[1.02] border-coral-300 shadow-lg ring-2 ring-coral-300"
            : expanded
              ? "z-20 overflow-visible transition-shadow"
              : "overflow-hidden transition-shadow"
        }`}
      >
        {/* Collapsed header — always visible */}
        <div className="flex items-center gap-2 px-3 py-3">
          {/* Drag handle — click-drag on desktop, press-drag on touch */}
          <button
            {...dragHandleProps}
            aria-label="Drag to reorder"
            title="Drag to reorder"
            className="flex h-9 w-6 shrink-0 touch-none cursor-grab items-center justify-center rounded text-charcoal-300 transition hover:text-charcoal-600 active:cursor-grabbing"
          >
            <Icon name="grip" size={16} />
          </button>

          {/* Slot number */}
          <span className="w-5 text-center text-xs font-bold text-charcoal-300">
            {index + 1}
          </span>

          {/* Position name — click to expand, edit when open */}
          {expanded ? (
            <input
              autoFocus
              value={slot.position}
              onChange={(e) => onUpdate({ position: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-lg border border-coral-300 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none"
            />
          ) : (
            <button
              onClick={onToggle}
              className="flex-1 text-left text-sm font-semibold text-charcoal-800 hover:text-coral-600"
            >
              {slot.position || <span className="text-charcoal-400">Untitled slot</span>}
            </button>
          )}

          {/* Avatar chips preview (when collapsed) */}
          {!expanded && poolPeople.length > 0 && (
            <div className="flex items-center">
              {poolPeople.slice(0, 4).map(({ person }) => (
                <AvatarChip key={person.id} name={person.name} />
              ))}
              {poolPeople.length > 4 && (
                <span className="ml-1.5 text-xs text-charcoal-400">
                  +{poolPeople.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            {expanded && (
              <button
                onClick={onRemove}
                className="rounded-md p-1.5 text-charcoal-300 transition hover:text-error"
                title="Remove slot"
              >
                <Icon name="trash" size={14} />
              </button>
            )}
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-charcoal-400 transition hover:text-charcoal-700"
            >
              <Icon
                name={expanded ? "chevronUp" : "chevronDown"}
                size={15}
              />
            </button>
          </div>
        </div>

        {/* Expanded pool editor */}
        {expanded && (
          <div className="border-t border-charcoal-100 px-4 pb-4 pt-3 space-y-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-charcoal-400">
              Scheduling pool. First eligible person is auto-assigned
            </p>

            {poolPeople.length === 0 && (
              <p className="text-xs text-charcoal-400">
                No one in this pool yet.
              </p>
            )}

            {poolPeople.map(({ entry, person }, idx) => (
              <div
                key={entry.personId}
                className="flex items-center gap-2 rounded-lg border border-charcoal-100 bg-white px-2 py-2"
              >
                <span className="w-4 shrink-0 text-center text-xs font-bold text-charcoal-300">
                  {idx + 1}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal-800 text-[0.55rem] font-bold text-white">
                  {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 text-sm font-semibold text-charcoal-800 truncate">
                  {person.name}
                </span>

                {/* Frequency picker */}
                <FreqPicker
                  entry={entry}
                  onChange={(fields) => onUpdateEntry(entry.personId, fields)}
                />

                {/* Up/down/remove */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onMoveEntryUp(entry.personId)}
                    disabled={idx === 0}
                    className="rounded p-1 text-charcoal-300 hover:text-charcoal-600 disabled:opacity-20"
                  >
                    <Icon name="chevronUp" size={12} />
                  </button>
                  <button
                    onClick={() => onMoveEntryDown(entry.personId)}
                    disabled={idx === poolPeople.length - 1}
                    className="rounded p-1 text-charcoal-300 hover:text-charcoal-600 disabled:opacity-20"
                  >
                    <Icon name="chevronDown" size={12} />
                  </button>
                  <button
                    onClick={() => onRemoveEntry(entry.personId)}
                    className="rounded p-1 text-charcoal-300 hover:text-error"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={onOpenPicker}
              className="inline-flex items-center gap-1 text-xs font-semibold text-coral-600 transition hover:underline"
            >
              <Icon name="userPlus" size={13} /> Add person
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- Page ----
export default function TeamTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { teamTemplates, people, updateTeamTemplate, starTeamTemplate } = useStore();

  const saved = teamTemplates.find((t) => t.id === id);

  // Draft — changes are NOT written to store until Save is clicked
  const [draft, setDraft] = useState<TeamTemplate | null>(
    saved ? JSON.parse(JSON.stringify(saved)) : null,
  );

  // Which slot is expanded
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(
    saved?.slots[0]?.id ?? null,
  );

  // Which slot's person picker is open
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // ---- Drag-to-reorder (pointer based: click-drag on desktop, press-drag on
  // touch). The dragged row tracks the pointer 1:1 via a live transform; the
  // other rows in its group smoothly slide open a gap (classic FLIP-style
  // reorder preview). Nothing in `draft` actually moves until the pointer is
  // released, so the preview never fights the real data. ----
  interface DragState {
    id: string;
    group: PositionGroup;
    groupIds: string[]; // this group's slot ids, in order, captured at drag start
    originIndex: number; // index of the dragged slot within groupIds
    startY: number;
    currentY: number;
    dragHeight: number; // the dragged row's own height, used to size the gap
    // Each row's vertical center at the moment the drag began — fixed for the
    // whole gesture, so hit-testing never has to account for the shifts we're
    // applying to the very rows we're testing against.
    originalCenters: Map<string, number>;
    settleTo: number | null; // set on drop: the pixel offset to animate into before committing
  }
  const [dragState, setDragState] = useState<DragState | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pending = useRef<{ pointerId: number; startY: number; timer?: number } | null>(null);

  const registerRow = useCallback((rid: string, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(rid, el);
    else rowRefs.current.delete(rid);
  }, []);

  if (!draft) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-charcoal-400">Template not found.</p>
        <Link
          href="/tools/team"
          className="mt-2 text-sm font-semibold text-coral-600 hover:underline"
        >
          Back to Team Templates
        </Link>
      </div>
    );
  }

  // ---- Draft mutations (local only) ----
  const setSlots = (slots: TeamTemplateSlot[]) =>
    setDraft((d) => d ? { ...d, slots } : d);

  const updateSlot = (slotId: string, fields: Partial<TeamTemplateSlot>) =>
    setSlots(draft.slots.map((s) => (s.id === slotId ? { ...s, ...fields } : s)));

  const addSlot = (def: PositionDef, group: PositionGroup) => {
    const slot = blankSlot(def.label, group);
    const appended = [...draft.slots, slot];
    // Keep stacking families numbered the same way the weekly page does.
    setSlots(def.stacks ? renumberFamily(appended, def.label) : appended);
    setExpandedSlotId(slot.id);
  };

  const removeSlot = (slotId: string) => {
    setSlots(draft.slots.filter((s) => s.id !== slotId));
    if (expandedSlotId === slotId) setExpandedSlotId(null);
  };

  // Commit a group's new slot order into the flat draft array, preserving
  // whatever positions the OTHER groups' slots already occupy.
  const applyGroupOrder = (group: PositionGroup, newGroupIds: string[]) => {
    const byId = new Map(draft.slots.map((s) => [s.id, s] as const));
    const queue = [...newGroupIds];
    setSlots(
      draft.slots.map((s) => {
        if (s.group !== group) return s;
        const nextId = queue.shift();
        return nextId !== undefined ? (byId.get(nextId) ?? s) : s;
      }),
    );
  };

  // How many rows (originIndex, targetIndex] shift up, or [targetIndex, originIndex)
  // shift down, to visually open the gap the dragged row will land in.
  const shiftFor = (rowIndex: number, d: DragState): number => {
    if (rowIndex === d.originIndex) return 0;
    const target = liveTargetIndex(d);
    if (d.originIndex < target && rowIndex > d.originIndex && rowIndex <= target) return -d.dragHeight;
    if (target < d.originIndex && rowIndex >= target && rowIndex < d.originIndex) return d.dragHeight;
    return 0;
  };

  // Where the dragged row would land right now, expressed as an index into
  // groupIds (0..length-1) — computed against each OTHER row's ORIGINAL
  // center (captured at drag start), so the maths stays stable even though
  // those rows are themselves being visually shifted for the preview.
  const liveTargetIndex = (d: DragState): number => {
    let count = 0;
    for (const gid of d.groupIds) {
      if (gid === d.id) continue;
      const center = d.originalCenters.get(gid);
      if (center !== undefined && center < d.currentY) count++;
    }
    return Math.max(0, Math.min(d.groupIds.length - 1, count));
  };

  const beginDrag = (e: React.PointerEvent, slotId: string, group: PositionGroup) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const startY = e.clientY;
    const activate = () => {
      const groupIds = draft.slots.filter((s) => s.group === group).map((s) => s.id);
      const el = rowRefs.current.get(slotId);
      const dragHeight = el?.getBoundingClientRect().height ?? 56;
      const originalCenters = new Map<string, number>();
      for (const gid of groupIds) {
        const r = rowRefs.current.get(gid)?.getBoundingClientRect();
        if (r) originalCenters.set(gid, r.top + r.height / 2);
      }
      setExpandedSlotId(null); // collapse so rows keep a stable height while dragging
      setDragState({
        id: slotId,
        group,
        groupIds,
        originIndex: groupIds.indexOf(slotId),
        startY,
        currentY: startY,
        dragHeight,
        originalCenters,
        settleTo: null,
      });
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; drag still works via the window-level move */
    }
    pending.current = { pointerId: e.pointerId, startY };
    // Mouse drags start immediately; touch waits a beat so a normal scroll from
    // the handle still works and only a deliberate press starts a drag.
    if (e.pointerType === "mouse") activate();
    else pending.current.timer = window.setTimeout(activate, 180);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (dragState) {
      if (dragState.settleTo !== null) return; // already dropped, settling
      e.preventDefault();
      setDragState({ ...dragState, currentY: e.clientY });
      return;
    }
    if (pending.current && Math.abs(e.clientY - pending.current.startY) > 8) {
      if (pending.current.timer) clearTimeout(pending.current.timer);
      pending.current = null;
    }
  };

  const endDrag = () => {
    if (pending.current?.timer) clearTimeout(pending.current.timer);
    pending.current = null;
    if (!dragState || dragState.settleTo !== null) return;

    const target = liveTargetIndex(dragState);
    if (target === dragState.originIndex) {
      setDragState(null); // no move — nothing to settle or commit
      return;
    }
    // Snap the dragged row to its exact resting offset and let it transition
    // there smoothly before the underlying data changes — the "drop into
    // place" beat — then commit the reorder once the animation has landed.
    const settleTo = (target - dragState.originIndex) * dragState.dragHeight;
    setDragState({ ...dragState, settleTo });
    window.setTimeout(() => {
      const others = dragState.groupIds.filter((gid) => gid !== dragState.id);
      const newGroupIds = [...others.slice(0, target), dragState.id, ...others.slice(target)];
      applyGroupOrder(dragState.group, newGroupIds);
      setDragState(null);
    }, 160);
  };

  // Pool mutations
  const addEntry = (slotId: string, personId: string) => {
    const slot = draft.slots.find((s) => s.id === slotId);
    if (!slot || slot.pool.some((e) => e.personId === personId)) return;
    updateSlot(slotId, { pool: [...slot.pool, blankEntry(personId)] });
  };

  const updateEntry = (
    slotId: string,
    personId: string,
    fields: Partial<TeamTemplatePoolEntry>,
  ) => {
    const slot = draft.slots.find((s) => s.id === slotId);
    if (!slot) return;
    updateSlot(slotId, {
      pool: slot.pool.map((e) =>
        e.personId === personId ? { ...e, ...fields } : e,
      ),
    });
  };

  const removeEntry = (slotId: string, personId: string) => {
    const slot = draft.slots.find((s) => s.id === slotId);
    if (!slot) return;
    updateSlot(slotId, { pool: slot.pool.filter((e) => e.personId !== personId) });
  };

  const moveEntry = (slotId: string, personId: string, dir: -1 | 1) => {
    const slot = draft.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const idx = slot.pool.findIndex((e) => e.personId === personId);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= slot.pool.length) return;
    const arr = [...slot.pool];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    updateSlot(slotId, { pool: arr });
  };

  // ---- Save / Cancel ----
  const handleSave = () => {
    setIsSaving(true);
    updateTeamTemplate(id, draft);
    // Small delay so the user sees feedback before navigating
    setTimeout(() => router.push("/tools/team"), 300);
  };

  const handleCancel = () => router.push("/tools/team");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pb-3 pt-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/tools/team"
            className="shrink-0 rounded-md p-1 text-charcoal-400 transition hover:text-charcoal-700"
            title="Back"
          >
            <Icon name="arrowRight" size={16} className="rotate-180" />
          </Link>

          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => d ? { ...d, name: e.target.value } : d)}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold text-charcoal-900 outline-none transition hover:border-charcoal-200 focus:border-coral-400 focus:bg-white"
          />

          <button
            onClick={() => {
              starTeamTemplate(id);
              setDraft((d) => d ? { ...d, starred: !d.starred } : d);
            }}
            title={draft.starred ? "Default template" : "Set as default"}
            className={`shrink-0 rounded-md p-1.5 transition ${
              draft.starred ? "text-coral-500" : "text-charcoal-300 hover:text-coral-400"
            }`}
          >
            <Icon name="star" size={16} />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-charcoal-200 px-4 py-1.5 text-sm font-semibold text-charcoal-600 transition hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save template"}
          </button>
          <span className="ml-auto text-xs text-charcoal-400">
            {draft.slots.length} slot{draft.slots.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-2.5 rounded-lg border border-charcoal-100 bg-cream-50 px-3 py-2.5">
        <Icon name="info" size={14} className="mt-0.5 shrink-0 text-charcoal-400" />
        <p className="text-xs text-charcoal-500">
          Each slot has a priority pool. #1 gets scheduled first. Set how often each person
          serves and the template auto-fills when you apply it to a Sunday.
        </p>
      </div>

      {/* Slots, grouped into Band / Tech / Teaching so the roster reads the
          same way here as it does on the weekly Team page. */}
      {GROUP_ORDER.map((group) => {
        const groupSlots = draft.slots.filter((s) => s.group === group);
        return (
          <div key={group} className="space-y-2">
            <div className="flex items-center gap-2 pt-1">
              <Icon name={GROUP_META[group].icon} size={15} className="text-charcoal-400" />
              <Label>{GROUP_META[group].label}</Label>
            </div>

            <PositionTray
              group={group}
              onAdd={(def) => addSlot(def, group)}
            />

            {groupSlots.length === 0 ? (
              <p className="text-sm text-charcoal-400">No slots yet. Add one from the tray above.</p>
            ) : (
              groupSlots.map((slot, idx) => {
                const isDragging = dragState?.group === group && dragState.id === slot.id;
                const rowStyle: React.CSSProperties =
                  dragState && dragState.group === group
                    ? isDragging
                      ? {
                          position: "relative",
                          zIndex: 40,
                          transform: `translateY(${
                            dragState.settleTo !== null
                              ? dragState.settleTo
                              : dragState.currentY - dragState.startY
                          }px)`,
                          transition: dragState.settleTo !== null ? "transform 160ms ease" : "none",
                        }
                      : {
                          position: "relative",
                          transform: `translateY(${shiftFor(idx, dragState)}px)`,
                          transition: "transform 160ms ease",
                        }
                    : {};
                return (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  people={people}
                  index={idx}
                  expanded={expandedSlotId === slot.id}
                  dragging={isDragging}
                  rowStyle={rowStyle}
                  registerRow={(el) => registerRow(slot.id, el)}
                  dragHandleProps={{
                    onPointerDown: (e) => beginDrag(e, slot.id, group),
                    onPointerMove: onDragMove,
                    onPointerUp: endDrag,
                    onPointerCancel: endDrag,
                  }}
                  onToggle={() =>
                    setExpandedSlotId((cur) => (cur === slot.id ? null : slot.id))
                  }
                  onUpdate={(fields) => updateSlot(slot.id, fields)}
                  onRemove={() => removeSlot(slot.id)}
                  onAddPerson={(pid) => addEntry(slot.id, pid)}
                  onUpdateEntry={(pid, fields) => updateEntry(slot.id, pid, fields)}
                  onRemoveEntry={(pid) => removeEntry(slot.id, pid)}
                  onMoveEntryUp={(pid) => moveEntry(slot.id, pid, -1)}
                  onMoveEntryDown={(pid) => moveEntry(slot.id, pid, 1)}
                  pickerOpen={pickerSlotId === slot.id}
                  onOpenPicker={() => setPickerSlotId(slot.id)}
                  onClosePicker={() => setPickerSlotId(null)}
                />
                );
              })
            )}
          </div>
        );
      })}

      {/* Bottom save bar */}
      <div className="flex justify-end gap-2 border-t border-charcoal-100 pt-4">
        <button
          onClick={handleCancel}
          className="rounded-lg border border-charcoal-200 px-5 py-2 text-sm font-semibold text-charcoal-600 transition hover:bg-cream-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-coral-500 px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save template"}
        </button>
      </div>
    </div>
  );
}
