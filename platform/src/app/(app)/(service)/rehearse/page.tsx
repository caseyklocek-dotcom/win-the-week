"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import {
  PRE_CHECKLIST,
  POST_EVAL,
  TRANSITION_TYPES,
  instantiatePlan,
  countItems,
} from "@/lib/rehearsal";
import { sectionSongIds } from "@/lib/set";
import { weekdayName } from "@/lib/music";
import type {
  RehearsalPlan,
  Service,
  SongRehearsalNote,
  FlowBlock,
  CheckGroup,
  RehearsalTemplate,
} from "@/lib/types";

const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

function emptyNote(): SongRehearsalNote {
  return {
    startingPosition: "",
    intro: "",
    build: "",
    ending: "",
    transitionIn: "",
    transitionOut: "",
    special: "",
  };
}

export default function RehearsalPage() {
  const { activeService: svc, updateService, rehearsalTemplates } = useStore();
  // null = calm glance. Otherwise we're editing one section (or "all").
  const [editing, setEditing] = useState<
    "checklist" | "flow" | "songs" | "all" | null
  >(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const starred =
    rehearsalTemplates.find((t) => t.starred) ?? rehearsalTemplates[0];

  // A fresh plan to render before the persisting effect runs (or if no plan yet).
  const fallback = useMemo<RehearsalPlan>(
    () =>
      starred
        ? instantiatePlan(starred)
        : {
            checklistGroups: PRE_CHECKLIST,
            evalGroups: POST_EVAL,
            checklist: {},
            evaluation: {},
            flow: [],
            songNotes: {},
            nextWeek: "",
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [starred?.id, svc.id],
  );

  const plan = svc.rehearsal ?? fallback;

  // Persist a stamped plan the first time a service is opened with none.
  useEffect(() => {
    if (!svc.rehearsal && starred) {
      updateService(svc.id, (s: Service) => ({
        ...s,
        rehearsal: s.rehearsal ?? instantiatePlan(starred),
      }));
    }
  }, [svc.id, svc.rehearsal, starred, updateService]);

  // Back to a calm glance whenever the service changes.
  useEffect(() => {
    setEditing(null);
    setChecklistOpen(false);
    setPicking(false);
  }, [svc.id]);

  const patch = (updater: (r: RehearsalPlan) => RehearsalPlan) =>
    updateService(svc.id, (s: Service) => ({
      ...s,
      rehearsal: updater(s.rehearsal ?? plan),
    }));

  // Structure (snapshots) with legacy fallback to the constants.
  const checklistGroups = plan.checklistGroups ?? PRE_CHECKLIST;
  const evalGroups = plan.evalGroups ?? POST_EVAL;
  const totalCheck = countItems(checklistGroups);

  const currentTemplate = rehearsalTemplates.find((t) => t.id === plan.templateId);

  // ---- ticking ----
  const toggleCheck = (itemId: string) =>
    patch((r) => ({ ...r, checklist: { ...r.checklist, [itemId]: !r.checklist[itemId] } }));
  const toggleEval = (itemId: string) =>
    patch((r) => ({ ...r, evaluation: { ...r.evaluation, [itemId]: !r.evaluation[itemId] } }));
  const setNextWeek = (v: string) => patch((r) => ({ ...r, nextWeek: v }));

  // ---- checklist structure (edit mode) ----
  const setChecklistGroups = (groups: CheckGroup[]) =>
    patch((r) => ({ ...r, checklistGroups: groups }));

  // ---- flow ----
  const setFlow = (flow: FlowBlock[]) => patch((r) => ({ ...r, flow }));
  const updateBlock = (bid: string, fields: Partial<FlowBlock>) =>
    setFlow(plan.flow.map((b) => (b.id === bid ? { ...b, ...fields } : b)));
  const updateItem = (bid: string, i: number, text: string) =>
    setFlow(
      plan.flow.map((b) =>
        b.id === bid ? { ...b, items: b.items.map((it, j) => (j === i ? text : it)) } : b,
      ),
    );
  const addItem = (bid: string) =>
    setFlow(plan.flow.map((b) => (b.id === bid ? { ...b, items: [...b.items, "New step"] } : b)));
  const removeItem = (bid: string, i: number) =>
    setFlow(
      plan.flow.map((b) =>
        b.id === bid ? { ...b, items: b.items.filter((_, j) => j !== i) } : b,
      ),
    );
  const addBlock = () =>
    setFlow([...plan.flow, { id: rid("f"), start: "", end: "", title: "New block", items: [] }]);
  const removeBlock = (bid: string) => setFlow(plan.flow.filter((b) => b.id !== bid));

  // ---- song notes ----
  const songNote = (sid: string): SongRehearsalNote => plan.songNotes[sid] ?? emptyNote();
  const setSongNote = (sid: string, fields: Partial<SongRehearsalNote>) =>
    patch((r) => ({
      ...r,
      songNotes: { ...r.songNotes, [sid]: { ...songNote(sid), ...fields } },
    }));

  // ---- template switching ----
  const checkedCount = Object.values(plan.checklist).filter(Boolean).length;
  const checkPct = totalCheck ? Math.round((checkedCount / totalCheck) * 100) : 0;

  const selectTemplate = (t: RehearsalTemplate) => {
    const hasProgress =
      checkedCount > 0 || Object.keys(plan.songNotes).length > 0 || !!plan.nextWeek;
    if (
      t.id !== plan.templateId &&
      hasProgress &&
      !confirm(
        `Switch to "${t.name}"? This week's checklist and run-of-night will be replaced. Your song notes and debrief are kept.`,
      )
    ) {
      setPicking(false);
      return;
    }
    const fresh = instantiatePlan(t);
    patch((r) => ({
      ...fresh,
      songNotes: r.songNotes, // tied to the set, not the template
      nextWeek: r.nextWeek,
      evaluation: r.evaluation,
    }));
    setPicking(false);
  };

  // songs in set order
  const songs = svc.setSections
    .flatMap((sec) => sectionSongIds(sec).map((sid) => svc.songs.find((s) => s.id === sid)))
    .filter(Boolean) as Service["songs"];

  // ============================================================
  // EDIT MODE  (scoped to the section the user tapped)
  // ============================================================
  if (editing !== null) {
    const all = editing === "all";
    const showChecklist = all || editing === "checklist";
    const showFlow = all || editing === "flow";
    const showSongs = all || editing === "songs";

    const heading = all
      ? "EDIT THE PLAN"
      : editing === "checklist"
        ? "EDIT CHECKLIST"
        : editing === "flow"
          ? "EDIT RUN OF THE NIGHT"
          : "EDIT SONG NOTES";

    const subhead = all
      ? `Shape this week's rehearsal. Changes save as you go and stay with ${svc.title}.`
      : editing === "checklist"
        ? "Add, rename, or remove the items you'll tick before walking in."
        : editing === "flow"
          ? "Your run of the night. Edit times and steps to fit."
          : "Capture the cues you'll forget by Sunday morning.";

    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              onClick={() => setEditing(null)}
              className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-charcoal-400 transition hover:text-coral-600"
            >
              <Icon name="arrowRight" size={12} className="rotate-180" /> Back to glance
            </button>
            <h1 className="headline text-charcoal-900">{heading}</h1>
            <p className="mt-1 text-sm text-charcoal-400">{subhead}</p>
          </div>
          <button
            onClick={() => setEditing(null)}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Done
          </button>
        </div>

        {/* checklist structure */}
        {showChecklist && (
        <section className="space-y-4">
          <SectionHead
            n={all ? 1 : undefined}
            title="Checklist"
            sub="Add, rename, or remove the items you'll tick before walking in."
          />
          <ChecklistStructure groups={checklistGroups} onChange={setChecklistGroups} />
        </section>
        )}

        {/* flow */}
        {showFlow && (
        <section className="space-y-4">
          <SectionHead
            n={all ? 2 : undefined}
            title="Rehearsal flow"
            sub="Your run of the night. Edit times and steps to fit."
          />
          <div className="space-y-3">
            {plan.flow.map((b) => (
              <Card key={b.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 text-white dark:bg-coral-500">
                    <Icon name="clock" size={16} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={b.start}
                      onChange={(e) => updateBlock(b.id, { start: e.target.value })}
                      placeholder="Start"
                      className="w-24 rounded-md border border-charcoal-100 bg-cream-100 px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400 focus:bg-white"
                    />
                    <span className="text-charcoal-300">–</span>
                    <input
                      value={b.end}
                      onChange={(e) => updateBlock(b.id, { end: e.target.value })}
                      placeholder="End"
                      className="w-24 rounded-md border border-charcoal-100 bg-cream-100 px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400 focus:bg-white"
                    />
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <EditableText
                      value={b.title}
                      onCommit={(v) => updateBlock(b.id, { title: v })}
                      className="font-semibold"
                    />
                  </div>
                  <button
                    onClick={() => removeBlock(b.id)}
                    className="shrink-0 text-charcoal-300 transition hover:text-error"
                    title="Remove block"
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
                <ul className="mt-3 space-y-1.5 pl-12">
                  {b.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral-400" />
                      <div className="flex-1">
                        <EditableText value={it} onCommit={(v) => updateItem(b.id, i, v)} />
                      </div>
                      <button
                        onClick={() => removeItem(b.id, i)}
                        className="shrink-0 text-charcoal-300 transition hover:text-error"
                        title="Remove step"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => addItem(b.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"
                    >
                      <Icon name="plus" size={13} /> Add step
                    </button>
                  </li>
                </ul>
              </Card>
            ))}
          </div>
          <button
            onClick={addBlock}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-charcoal-200 py-3 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
          >
            <Icon name="plus" size={15} /> Add a block
          </button>
        </section>
        )}

        {/* song notes */}
        {showSongs && (
        <section className="space-y-4">
          <SectionHead
            n={all ? 3 : undefined}
            title="Song-by-song notes"
            sub="One card per song in this Sunday's set. Capture the cues you'll forget by Sunday morning."
          />
          {songs.length === 0 ? (
            <Card>
              <p className="text-sm text-charcoal-400">
                No songs in the set yet.{" "}
                <Link href="/set" className="font-semibold text-coral-600 hover:underline">
                  Build the set
                </Link>{" "}
                and they&apos;ll show up here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {songs.map((s) => {
                const note = songNote(s.id);
                return (
                  <Card key={s.id}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-charcoal-900">{s.title}</h3>
                        <p className="truncate text-xs text-charcoal-400">{s.artist}</p>
                      </div>
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-charcoal-200 px-2 text-sm font-semibold text-charcoal-800">
                        {s.serviceKey}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Starting position">
                        <EditableText
                          value={note.startingPosition}
                          onCommit={(v) => setSongNote(s.id, { startingPosition: v })}
                          placeholder="Who starts, and how?"
                        />
                      </Field>
                      <Field label="Special notes">
                        <EditableText
                          value={note.special}
                          onCommit={(v) => setSongNote(s.id, { special: v })}
                          placeholder="Dynamics, repeats, cuts…"
                        />
                      </Field>
                      <Field label="Intro">
                        <EditableText
                          value={note.intro}
                          onCommit={(v) => setSongNote(s.id, { intro: v })}
                          placeholder="How it opens"
                        />
                      </Field>
                      <Field label="Build / bridge">
                        <EditableText
                          value={note.build}
                          onCommit={(v) => setSongNote(s.id, { build: v })}
                          placeholder="Where it lifts"
                        />
                      </Field>
                      <Field label="Transition in">
                        <EditableText
                          value={note.transitionIn}
                          onCommit={(v) => setSongNote(s.id, { transitionIn: v })}
                          placeholder="From the song before"
                        />
                      </Field>
                      <Field label="Transition out / ending">
                        <EditableText
                          value={note.transitionOut}
                          onCommit={(v) => setSongNote(s.id, { transitionOut: v })}
                          placeholder="How it lands or hands off"
                        />
                      </Field>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Card>
            <Label>Transition types to reach for</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TRANSITION_TYPES.map((t) => (
                <div key={t.title} className="rounded-lg bg-cream-100 px-3 py-2">
                  <div className="text-sm font-semibold text-charcoal-800">{t.title}</div>
                  <div className="text-xs text-charcoal-500">{t.detail}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>
        )}

        <div className="flex items-center justify-between border-t border-charcoal-100 pt-5">
          <span className="flex items-center gap-2 text-sm text-charcoal-400">
            <Icon name="check" size={15} /> Everything saves automatically.
          </span>
          <button
            onClick={() => setEditing(null)}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // GLANCE MODE
  // ============================================================
  return (
    <div className="mx-auto max-w-4xl space-y-5" data-coach="rehearse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="headline text-charcoal-900">REHEARSAL</h1>
          <p className="mt-1 text-sm text-charcoal-400">This {weekdayName(svc.date)} at a glance.</p>
        </div>
        <button
          onClick={() => setEditing("all")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          <Icon name="settings" size={15} /> Edit plan
        </button>
      </div>

      {/* template chip */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-100 text-coral-600">
              <Icon name="clock" size={18} />
            </span>
            <div>
              <Label>Template</Label>
              <div className="text-sm font-bold text-charcoal-900">
                {currentTemplate?.name ?? "Custom plan"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPicking((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-3 py-1.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
          >
            Change <Icon name={picking ? "chevronUp" : "chevronDown"} size={14} />
          </button>
        </div>
        {picking && (
          <div className="mt-3 space-y-1.5 border-t border-charcoal-100 pt-3">
            {rehearsalTemplates.map((t) => {
              const active = t.id === plan.templateId;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-coral-300 bg-coral-100/50"
                      : "border-charcoal-100 hover:bg-cream-100"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-charcoal-800">{t.name}</div>
                    <div className="text-xs text-charcoal-400">
                      {countItems(t.checklist)} items · {t.flow.length} blocks
                    </div>
                  </div>
                  {active ? (
                    <span className="text-xs font-semibold text-coral-600">In use</span>
                  ) : (
                    <Icon name="arrowRight" size={15} className="text-charcoal-300" />
                  )}
                </button>
              );
            })}
            <Link
              href="/tools"
              className="mt-1 inline-flex items-center gap-1 px-1 text-xs font-semibold text-charcoal-400 hover:text-coral-600"
            >
              Manage templates in Tools <Icon name="arrowRight" size={12} />
            </Link>
          </div>
        )}
      </Card>

      {/* readiness + collapsible checklist */}
      <Card>
        <button
          onClick={() => setChecklistOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div className="flex items-center gap-4">
            <Ring pct={checkPct} />
            <div>
              <div className="font-bold text-charcoal-900">Pre-rehearsal checklist</div>
              <div className="text-sm text-charcoal-500">
                {checkedCount} of {totalCheck} done
                {checkPct === 100 ? ". You're set." : "."}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-coral-600">
            {checklistOpen ? "Hide" : "Run it"}
            <Icon name={checklistOpen ? "chevronUp" : "chevronDown"} size={15} />
          </span>
        </button>

        {checklistOpen && (
          <div className="mt-4 border-t border-charcoal-100 pt-4">
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setEditing("checklist")}
              className="text-xs font-semibold text-coral-600 hover:underline"
            >
              Edit checklist
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {checklistGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-100 text-coral-600">
                    <Icon name={group.icon} size={15} />
                  </span>
                  <h3 className="text-sm font-bold text-charcoal-800">{group.label}</h3>
                </div>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const done = !!plan.checklist[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-cream-100"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            done
                              ? "border-coral-500 bg-coral-500 text-white"
                              : "border-charcoal-200 bg-white text-transparent"
                          }`}
                        >
                          <Icon name="check" size={13} />
                        </span>
                        <span
                          className={`text-sm transition ${
                            done ? "text-charcoal-400 line-through" : "text-charcoal-700"
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          </div>
        )}
      </Card>

      {/* flow summary */}
      <Card>
        <div className="flex items-center justify-between">
          <Label>Run of the night</Label>
          <button
            onClick={() => setEditing("flow")}
            className="text-xs font-semibold text-coral-600 hover:underline"
          >
            Edit
          </button>
        </div>
        {plan.flow.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">No flow blocks yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {plan.flow.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs font-semibold text-charcoal-400">
                  {b.start && b.end ? `${b.start}–${b.end}` : b.start || "—"}
                </span>
                <span className="text-sm font-medium text-charcoal-800">{b.title}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* songs */}
      <Card>
        <div className="flex items-center justify-between">
          <Label>Songs in the set</Label>
          {songs.length > 0 && (
            <button
              onClick={() => setEditing("songs")}
              className="text-xs font-semibold text-coral-600 hover:underline"
            >
              Add notes
            </button>
          )}
        </div>
        {songs.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">
            No songs yet.{" "}
            <Link href="/set" className="font-semibold text-coral-600 hover:underline">
              Build the set
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {songs.map((s) => {
              const hasNote = !!plan.songNotes[s.id];
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-charcoal-800">
                      {s.title}
                    </div>
                    <div className="truncate text-xs text-charcoal-400">{s.artist}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasNote && (
                      <span className="text-xs font-medium text-charcoal-400">noted</span>
                    )}
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-charcoal-200 px-2 text-sm font-semibold text-charcoal-800">
                      {s.serviceKey}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* debrief glance card */}
      <Card>
        <Label>After rehearsal</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          A two-minute debrief while it&apos;s fresh. Tap what&apos;s true; jot what&apos;s next.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {evalGroups.flatMap((g) =>
            g.items.map((item) => {
              const done = !!plan.evaluation[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleEval(item.id)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition lg:min-h-0 lg:px-2.5 ${
                    done
                      ? "border-[#3d9970] bg-ok-tint text-ok-ink"
                      : "border-charcoal-200 text-charcoal-500 hover:border-charcoal-300"
                  }`}
                >
                  {done && <Icon name="check" size={12} />}
                  {item.text}
                </button>
              );
            }),
          )}
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-charcoal-500">Notes for next week</div>
          <EditableText
            value={plan.nextWeek}
            onCommit={setNextWeek}
            multiline
            placeholder="What do you want to carry into next week?"
          />
        </div>
      </Card>
    </div>
  );
}

// ---- checklist structure editor (edit mode) ----
function ChecklistStructure({
  groups,
  onChange,
}: {
  groups: CheckGroup[];
  onChange: (g: CheckGroup[]) => void;
}) {
  const setGroupLabel = (gid: string, label: string) =>
    onChange(groups.map((g) => (g.id === gid ? { ...g, label } : g)));
  const removeGroup = (gid: string) => onChange(groups.filter((g) => g.id !== gid));
  const addGroup = () =>
    onChange([
      ...groups,
      { id: rid("grp"), label: "New group", icon: "check", items: [{ id: rid("it"), text: "First item" }] },
    ]);
  const setItemText = (gid: string, iid: string, text: string) =>
    onChange(
      groups.map((g) =>
        g.id === gid
          ? { ...g, items: g.items.map((it) => (it.id === iid ? { ...it, text } : it)) }
          : g,
      ),
    );
  const removeItem = (gid: string, iid: string) =>
    onChange(
      groups.map((g) => (g.id === gid ? { ...g, items: g.items.filter((it) => it.id !== iid) } : g)),
    );
  const addItem = (gid: string) =>
    onChange(
      groups.map((g) =>
        g.id === gid ? { ...g, items: [...g.items, { id: rid("it"), text: "New item" }] } : g,
      ),
    );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.id}>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-coral-600">
                <Icon name={g.icon} size={16} />
              </span>
              <input
                value={g.label}
                onChange={(e) => setGroupLabel(g.id, e.target.value)}
                className="flex-1 rounded-md border border-transparent bg-transparent text-sm font-bold text-charcoal-800 outline-none focus:border-charcoal-100 focus:bg-cream-100 focus:px-2 focus:py-1"
              />
              <button
                onClick={() => removeGroup(g.id)}
                className="shrink-0 text-charcoal-300 transition hover:text-error"
                title="Remove group"
              >
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="mt-3 space-y-1.5">
              {g.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-charcoal-200 text-transparent">
                    <Icon name="check" size={13} />
                  </span>
                  <div className="flex-1">
                    <EditableText value={it.text} onCommit={(v) => setItemText(g.id, it.id, v)} />
                  </div>
                  <button
                    onClick={() => removeItem(g.id, it.id)}
                    className="shrink-0 text-charcoal-300 transition hover:text-error"
                    title="Remove item"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem(g.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"
              >
                <Icon name="plus" size={13} /> Add item
              </button>
            </div>
          </Card>
        ))}
      </div>
      <button
        onClick={addGroup}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-charcoal-200 py-3 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
      >
        <Icon name="plus" size={15} /> Add a group
      </button>
    </>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-cream-200, #efe9dd)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#ff6b5e"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-charcoal-800">
        {pct}%
      </span>
    </div>
  );
}

function SectionHead({ n, title, sub }: { n?: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      {n !== undefined && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal-800 text-xs font-bold text-white dark:bg-coral-500">
          {n}
        </span>
      )}
      <div>
        <h2 className="text-lg font-bold text-charcoal-900">{title}</h2>
        <p className="text-sm text-charcoal-400">{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-charcoal-500">{label}</div>
      {children}
    </div>
  );
}
