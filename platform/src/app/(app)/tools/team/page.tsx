"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { blankTemplate } from "@/lib/teamTemplate";
import type { TeamTemplate } from "@/lib/types";

export default function TeamTemplatesPage() {
  const router = useRouter();
  const {
    teamTemplates,
    addTeamTemplate,
    removeTeamTemplate,
    starTeamTemplate,
  } = useStore();

  const createTemplate = () => {
    const tpl = blankTemplate();
    addTeamTemplate(tpl);
    router.push(`/tools/team/${tpl.id}`);
  };

  const duplicateTemplate = (t: TeamTemplate) => {
    const copy = blankTemplate(`${t.name} copy`);
    copy.starred = false;
    copy.slots = t.slots.map((s) => ({
      ...s,
      id: `ts_${Math.random().toString(36).slice(2, 9)}`,
      pool: s.pool.map((e) => ({ ...e })),
    }));
    addTeamTemplate(copy);
    router.push(`/tools/team/${copy.id}`);
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
        <h1 className="headline mt-2 text-charcoal-900">TEAM TEMPLATES</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          Build a roster of role slots and a priority pool for each position. Apply a
          template to any Sunday and it auto-schedules everyone based on their availability.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {teamTemplates.map((t) => (
            <Card key={t.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {t.starred && (
                    <span className="text-[0.65rem] font-bold uppercase tracking-wide text-coral-500">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => starTeamTemplate(t.id)}
                    title={t.starred ? "Already default" : "Set as default"}
                    className={`rounded-md p-1.5 transition ${
                      t.starred
                        ? "text-coral-500"
                        : "text-charcoal-300 hover:text-coral-400"
                    }`}
                  >
                    <Icon name="star" size={16} />
                  </button>
                  <button
                    onClick={() => duplicateTemplate(t)}
                    title="Duplicate"
                    className="rounded-md p-1.5 text-charcoal-300 transition hover:text-charcoal-600"
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete "${t.name}"? This can't be undone.`,
                        )
                      )
                        removeTeamTemplate(t.id);
                    }}
                    title="Delete"
                    className="rounded-md p-1.5 text-charcoal-300 transition hover:text-error"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>

              <Link href={`/tools/team/${t.id}`} className="group mt-1 flex-1">
                <h2 className="font-bold text-charcoal-900 transition group-hover:text-coral-600">
                  {t.name}
                </h2>
                <p className="mt-1 text-xs text-charcoal-400">
                  {t.slots.length} {t.slots.length === 1 ? "slot" : "slots"}
                  {t.slots.length > 0 && (
                    <>
                      {" · "}
                      {t.slots
                        .slice(0, 3)
                        .map((s) => s.position)
                        .join(", ")}
                      {t.slots.length > 3 && "…"}
                    </>
                  )}
                </p>
              </Link>

              <div className="mt-4 border-t border-charcoal-100 pt-3">
                <Link
                  href={`/tools/team/${t.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-coral-600 transition hover:underline"
                >
                  Edit template <Icon name="arrowRight" size={13} />
                </Link>
              </div>
            </Card>
          ))}

          {/* Add new card */}
          <button
            onClick={createTemplate}
            className="group flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-charcoal-200 p-6 text-charcoal-400 transition hover:border-coral-300 hover:text-coral-500"
          >
            <Icon name="plus" size={24} />
            <span className="text-sm font-semibold">New template</span>
          </button>
        </div>
      </section>

      {teamTemplates.length === 0 && (
        <p className="text-center text-sm text-charcoal-400">
          Create your first template to get started.
        </p>
      )}
    </div>
  );
}
