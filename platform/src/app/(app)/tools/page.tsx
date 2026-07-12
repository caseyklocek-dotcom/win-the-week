"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { countItems } from "@/lib/rehearsal";

export default function ToolsPage() {
  const { rehearsalTemplates, teamTemplates } = useStore();

  const starred = rehearsalTemplates.find((t) => t.starred);
  const templateCount = rehearsalTemplates.length;

  const starredTeam = teamTemplates.find((t) => t.starred);
  const teamTemplateCount = teamTemplates.length;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="headline text-charcoal-900">TOOLS</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          Build the reusable pieces of your week here, so planning a service is just a
          matter of grabbing one. More tools land here over time.
        </p>
      </div>

      <section data-tour="tools" className="space-y-4">
        <Label>Your tools</Label>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Rehearsal Templates tool */}
          <Link href="/tools/rehearsal" className="group block h-full">
            <Card className="flex h-full flex-col transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-coral-200 group-hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-100 text-coral-600 transition group-hover:bg-coral-500 group-hover:text-white">
                  <Icon name="clock" size={22} />
                </span>
                <Icon
                  name="arrowRight"
                  size={18}
                  className="text-charcoal-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-coral-600"
                />
              </div>
              <h2 className="mt-4 font-bold text-charcoal-900">Rehearsal Templates</h2>
              <p className="mt-1 text-sm text-charcoal-400">
                Reusable rehearsal scaffolds, checklist and run-of-night, ready to grab in
                any service.
              </p>
              <p className="mt-4 text-xs font-semibold text-charcoal-500">
                {templateCount} {templateCount === 1 ? "template" : "templates"}
                {starred && (
                  <>
                    {" · "}
                    <span className="text-coral-600">{starred.name}</span> is default
                    {starred ? ` (${countItems(starred.checklist)} items)` : ""}
                  </>
                )}
              </p>
            </Card>
          </Link>

          {/* Team Templates tool */}
          <Link href="/tools/team" className="group block h-full">
            <Card className="flex h-full flex-col transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-coral-200 group-hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-100 text-coral-600 transition group-hover:bg-coral-500 group-hover:text-white">
                  <Icon name="users" size={22} />
                </span>
                <Icon
                  name="arrowRight"
                  size={18}
                  className="text-charcoal-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-coral-600"
                />
              </div>
              <h2 className="mt-4 font-bold text-charcoal-900">Team Templates</h2>
              <p className="mt-1 text-sm text-charcoal-400">
                Set each person&apos;s schedule frequency, then auto-fill your team for any
                Sunday in one click.
              </p>
              <p className="mt-4 text-xs font-semibold text-charcoal-500">
                {teamTemplateCount} {teamTemplateCount === 1 ? "template" : "templates"}
                {starredTeam && (
                  <>
                    {" · "}
                    <span className="text-coral-600">{starredTeam.name}</span> is default
                    {` (${starredTeam.slots.length} slots)`}
                  </>
                )}
              </p>
            </Card>
          </Link>
        </div>
      </section>

      {/* More tools coming */}
      <section className="space-y-4">
        <Label>More tools coming</Label>
        <Card className="border-dashed bg-transparent">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-200 text-charcoal-400">
              <Icon name="sparkle" size={20} />
            </span>
            <div>
              <p className="text-sm text-charcoal-600">
                Set-list templates, transposing charts, and team check-ins will live here too.
                The reusable scaffolds that aren&apos;t tied to a single Sunday.
              </p>
              <p className="mt-2 text-xs text-charcoal-400">
                Looking for the Worship Leadership Compass? It lives in{" "}
                <Link href="/invest/compass" className="font-semibold text-coral-600 hover:underline">
                  Goals &amp; Growth
                </Link>
                , alongside the goals it sets.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
