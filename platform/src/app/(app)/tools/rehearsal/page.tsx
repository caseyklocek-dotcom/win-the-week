"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EditButton } from "@/components/EditButton";
import { blankTemplate, countItems } from "@/lib/rehearsal";
import type { RehearsalTemplate } from "@/lib/types";

export default function RehearsalTemplatesPage() {
  const router = useRouter();
  const {
    rehearsalTemplates,
    addRehearsalTemplate,
    removeRehearsalTemplate,
    starRehearsalTemplate,
  } = useStore();

  const createTemplate = () => {
    const tpl = blankTemplate();
    addRehearsalTemplate(tpl);
    router.push(`/tools/rehearsal/${tpl.id}`);
  };

  const duplicateTemplate = (t: RehearsalTemplate) => {
    const copy = blankTemplate(`${t.name} copy`);
    copy.checklist = t.checklist.map((g) => ({
      ...g,
      id: `${g.id}_${Math.random().toString(36).slice(2, 6)}`,
      items: g.items.map((it) => ({
        ...it,
        id: `${it.id}_${Math.random().toString(36).slice(2, 6)}`,
      })),
    }));
    copy.evaluation = t.evaluation.map((g) => ({
      ...g,
      id: `${g.id}_${Math.random().toString(36).slice(2, 6)}`,
      items: g.items.map((it) => ({
        ...it,
        id: `${it.id}_${Math.random().toString(36).slice(2, 6)}`,
      })),
    }));
    copy.flow = t.flow.map((b) => ({
      ...b,
      id: `${b.id}_${Math.random().toString(36).slice(2, 6)}`,
      items: [...b.items],
    }));
    copy.starred = false;
    addRehearsalTemplate(copy);
    router.push(`/tools/rehearsal/${copy.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/tools"
          className="group inline-flex items-center gap-1 text-sm font-semibold text-charcoal-400 transition hover:text-charcoal-700"
        >
          <Icon
            name="arrowRight"
            size={14}
            className="rotate-180 transition-transform group-hover:-translate-x-0.5"
          />
          Tools
        </Link>
        <h1 className="headline mt-2 text-charcoal-900">REHEARSAL TEMPLATES</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          Name a rehearsal scaffold once, checklist and run-of-night, then pick it in any
          service. Your starred template loads automatically for new Sundays.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {rehearsalTemplates.map((t) => (
            <Card key={t.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-100 text-coral-600">
                    <Icon name="clock" size={20} />
                  </span>
                  <div>
                    <h2 className="font-bold text-charcoal-900">{t.name}</h2>
                    <p className="text-xs text-charcoal-400">
                      {countItems(t.checklist)} checklist items · {t.flow.length} flow blocks
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => starRehearsalTemplate(t.id)}
                  title={t.starred ? "Default template" : "Make default"}
                  className={`shrink-0 rounded-lg p-1.5 transition ${
                    t.starred
                      ? "text-coral-600"
                      : "text-charcoal-300 hover:text-charcoal-500"
                  }`}
                >
                  <StarIcon filled={t.starred} />
                </button>
              </div>

              {t.starred && (
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-semibold text-coral-600">
                  <StarIcon filled small /> Default
                </span>
              )}

              <div className="mt-4 flex flex-1 items-end gap-3 text-sm font-semibold">
                <EditButton href={`/tools/rehearsal/${t.id}`} />
                <button
                  onClick={() => duplicateTemplate(t)}
                  className="inline-flex items-center gap-1 text-charcoal-400 transition hover:text-charcoal-700"
                >
                  <Icon name="copy" size={14} /> Duplicate
                </button>
                {rehearsalTemplates.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete the "${t.name}" template? Services already using it keep their plan.`)) {
                        removeRehearsalTemplate(t.id);
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-1 text-charcoal-300 transition hover:text-error"
                  >
                    <Icon name="x" size={14} /> Delete
                  </button>
                )}
              </div>
            </Card>
          ))}

          <button
            onClick={createTemplate}
            className="flex h-full min-h-[8rem] flex-col items-start justify-center rounded-xl border border-dashed border-charcoal-200 bg-transparent p-5 text-left transition hover:border-coral-400"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-200 text-charcoal-500">
              <Icon name="plus" size={20} />
            </span>
            <h2 className="mt-4 font-bold text-charcoal-700">New template</h2>
            <p className="mt-1 text-sm text-charcoal-400">
              Start a fresh rehearsal scaffold from scratch.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}

function StarIcon({ filled, small }: { filled?: boolean; small?: boolean }) {
  const s = small ? 12 : 18;
  return (
    <svg
      width={s}
      height={s}
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
