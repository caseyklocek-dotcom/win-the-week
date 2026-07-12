"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { countItems } from "@/lib/rehearsal";
import type { CheckGroup, FlowBlock } from "@/lib/types";

const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { rehearsalTemplates, updateRehearsalTemplate, starRehearsalTemplate } = useStore();

  const tpl = rehearsalTemplates.find((t) => t.id === id);

  if (!tpl) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-charcoal-500">That template no longer exists.</p>
        <Link href="/tools/rehearsal" className="text-sm font-semibold text-coral-600 hover:underline">
          ← Back to Rehearsal Templates
        </Link>
      </div>
    );
  }

  const setChecklist = (groups: CheckGroup[]) =>
    updateRehearsalTemplate(id, { checklist: groups });
  const setEvaluation = (groups: CheckGroup[]) =>
    updateRehearsalTemplate(id, { evaluation: groups });
  const setFlow = (flow: FlowBlock[]) => updateRehearsalTemplate(id, { flow });

  // ---- flow helpers ----
  const updateBlock = (bid: string, fields: Partial<FlowBlock>) =>
    setFlow(tpl.flow.map((b) => (b.id === bid ? { ...b, ...fields } : b)));
  const updateFlowItem = (bid: string, i: number, text: string) =>
    setFlow(
      tpl.flow.map((b) =>
        b.id === bid ? { ...b, items: b.items.map((it, j) => (j === i ? text : it)) } : b,
      ),
    );
  const addFlowItem = (bid: string) =>
    setFlow(
      tpl.flow.map((b) => (b.id === bid ? { ...b, items: [...b.items, "New step"] } : b)),
    );
  const removeFlowItem = (bid: string, i: number) =>
    setFlow(
      tpl.flow.map((b) =>
        b.id === bid ? { ...b, items: b.items.filter((_, j) => j !== i) } : b,
      ),
    );
  const addBlock = () =>
    setFlow([...tpl.flow, { id: rid("f"), start: "", end: "", title: "New block", items: [] }]);
  const removeBlock = (bid: string) => setFlow(tpl.flow.filter((b) => b.id !== bid));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* header */}
      <div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/tools" className="font-semibold text-charcoal-400 hover:underline">
            Tools
          </Link>
          <span className="text-charcoal-300">/</span>
          <Link href="/tools/rehearsal" className="font-semibold text-charcoal-400 hover:underline">
            Rehearsal Templates
          </Link>
          <span className="text-charcoal-300">/</span>
          <span className="font-semibold text-charcoal-600">{tpl.name}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <input
            value={tpl.name}
            onChange={(e) => updateRehearsalTemplate(id, { name: e.target.value })}
            className="headline w-full max-w-md rounded-lg border border-transparent bg-transparent text-charcoal-900 outline-none focus:border-charcoal-100 focus:bg-cream-100 focus:px-2"
          />
          <button
            onClick={() => starRehearsalTemplate(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              tpl.starred
                ? "border-coral-300 bg-coral-100 text-coral-600"
                : "border-charcoal-200 text-charcoal-500 hover:border-charcoal-300"
            }`}
          >
            <StarIcon filled={tpl.starred} /> {tpl.starred ? "Default" : "Make default"}
          </button>
        </div>
        <p className="mt-1 text-sm text-charcoal-400">
          {countItems(tpl.checklist)} checklist items · {tpl.flow.length} flow blocks. Edits
          here only affect new services. Sundays already using this template keep their plan.
        </p>
      </div>

      {/* checklist structure */}
      <GroupEditor
        title="Pre-rehearsal checklist"
        sub="The boxes a leader ticks before walking in. Group and label them however you work."
        groups={tpl.checklist}
        onChange={setChecklist}
      />

      {/* flow */}
      <section className="space-y-4">
        <SectionHead
          title="Default run-of-night"
          sub="The flow this template starts every rehearsal with. Times and steps stay editable per week."
        />
        <div className="space-y-3">
          {tpl.flow.map((b) => (
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
                      <EditableText value={it} onCommit={(v) => updateFlowItem(b.id, i, v)} />
                    </div>
                    <button
                      onClick={() => removeFlowItem(b.id, i)}
                      className="shrink-0 text-charcoal-300 transition hover:text-error"
                      title="Remove step"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => addFlowItem(b.id)}
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

      {/* debrief structure */}
      <GroupEditor
        title="After-rehearsal debrief"
        sub="The quick reflection prompts a leader ticks once rehearsal ends."
        groups={tpl.evaluation}
        onChange={setEvaluation}
      />

      <div className="flex items-center justify-between border-t border-charcoal-100 pt-5">
        <span className="flex items-center gap-2 text-sm text-charcoal-400">
          <Icon name="check" size={15} /> Saved automatically.
        </span>
        <button
          onClick={() => router.push("/tools/rehearsal")}
          className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// Reusable editor for a list of CheckGroups (checklist or debrief).
function GroupEditor({
  title,
  sub,
  groups,
  onChange,
}: {
  title: string;
  sub: string;
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
      groups.map((g) =>
        g.id === gid ? { ...g, items: g.items.filter((it) => it.id !== iid) } : g,
      ),
    );
  const addItem = (gid: string) =>
    onChange(
      groups.map((g) =>
        g.id === gid ? { ...g, items: [...g.items, { id: rid("it"), text: "New item" }] } : g,
      ),
    );

  return (
    <section className="space-y-4">
      <SectionHead title={title} sub={sub} />
      <div className="grid gap-4 md:grid-cols-2">
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
    </section>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-charcoal-900">{title}</h2>
      <p className="text-sm text-charcoal-400">{sub}</p>
    </div>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.8l6.5-.9L12 2.5Z" />
    </svg>
  );
}
