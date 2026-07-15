"use client";

// ============================================================
// Send — the leader's comms board for one Sunday.
//
// One tap publishes a personal packet link for every assigned person: their
// role, the set with charts in their key, the leader's note, confirm/decline,
// a practice checklist, and a note box back. This board then shows the whole
// conversation at a glance — sent → seen → in/out → practiced — with one-tap
// copy and nudge actions per person, and copy-all for the group text.
//
// Links stay stable: re-publishing only creates packets for people who don't
// have one yet (so a link already texted never dies). "Refresh the set in
// their packets" rebuilds everyone's snapshot on the same tokens.
// ============================================================

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { resolveName, nameKey } from "@/lib/people";
import {
  PRACTICE_STEPS,
  buildPacket,
  publishPacket,
  packetUrl,
  readResponses,
  type PacketResponse,
} from "@/lib/packets";
import { fmtDuration, weekdayName } from "@/lib/music";
import { serviceSetDurationSec } from "@/lib/set";
import type { Person, Service } from "@/lib/types";
import { ReadinessNotice } from "@/components/ReadinessNotice";
import { pcsMode } from "@/lib/mode";
import { serviceReadiness } from "@/lib/readiness";

function fmtFullDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// One row per distinct person assigned anywhere on this service's teams.
interface BoardPerson {
  key: string; // personId or name key
  name: string;
  assignments: string[];
  person?: Person; // library record when linked (for email/phone later)
}

function boardPeople(svc: Service, people: Person[]): BoardPerson[] {
  const byKey = new Map<string, BoardPerson>();
  for (const team of svc.teams) {
    for (const slot of team.roles) {
      const name = resolveName(slot, people).trim();
      if (!name) continue;
      const person = slot.personId ? people.find((p) => p.id === slot.personId) : undefined;
      const key = person?.id ?? nameKey(name);
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.assignments.includes(slot.position)) existing.assignments.push(slot.position);
      } else {
        byKey.set(key, { key, name, assignments: [slot.position], person });
      }
    }
  }
  return [...byKey.values()];
}

export default function SendPage() {
  const { state, activeService: svc, people, songLibrary, updateService } = useStore();

  const roster = useMemo(() => boardPeople(svc, people), [svc, people]);
  const sent = svc.sentPackets ?? {};
  const sentCount = roster.filter((r) => sent[r.key]).length;

  const [teamNote, setTeamNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [responses, setResponses] = useState<Record<string, PacketResponse>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [allowIncomplete, setAllowIncomplete] = useState(false);
  const readiness = serviceReadiness(svc, pcsMode(state.profile));
  const blocked = readiness.blockerCount > 0 && !allowIncomplete;

  // Pull the latest replies for every sent link.
  const refresh = useCallback(async () => {
    const tokens = Object.values(sent).map((s) => s.token);
    if (tokens.length === 0) return;
    setResponses(await readResponses(tokens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc.id, sentCount]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Publish links — new packets for the unsent, same tokens for the sent.
  const publish = async (rebuildAll: boolean) => {
    if (blocked) return;
    setPublishing(true);
    const next: NonNullable<Service["sentPackets"]> = { ...sent };
    for (const bp of roster) {
      const already = next[bp.key];
      if (already && !rebuildAll) continue;
      const person: Person =
        bp.person ??
        ({ id: bp.key, name: bp.name, roles: bp.assignments, active: true } as Person);
      const packet = buildPacket(svc, person, state.profile, {
        teamNote: teamNote.trim() || undefined,
        library: songLibrary, // pick up practice links added after set-building
      });
      if (already) packet.token = already.token; // stable links on rebuild
      await publishPacket(packet);
      next[bp.key] = {
        token: packet.token,
        sentAt: new Date().toISOString(),
        personName: bp.name,
      };
    }
    updateService(svc.id, (s) => ({ ...s, sentPackets: next }));
    setPublishing(false);
    refresh();
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const nudgeText = (bp: BoardPerson, token: string) =>
    `Hey ${bp.name.split(" ")[0]}! You're on ${bp.assignments.join(" + ")} this ${weekdayName(
      svc.date,
    )} (${fmtFullDate(svc.date)}). Everything you need is here: ${packetUrl(token)}`;

  const copyAll = () => {
    const lines = roster
      .filter((bp) => sent[bp.key])
      .map((bp) => `${bp.name}: ${packetUrl(sent[bp.key].token)}`);
    copy("__all__", lines.join("\n"));
  };

  const totalSec = serviceSetDurationSec(svc);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-2xl text-charcoal-900 lg:text-3xl">Send the week</h1>
          <p className="mt-1 max-w-xl text-sm text-charcoal-400">
            One personal link per person: their role, the set in their key, and a way to say
            &ldquo;I&rsquo;m in&rdquo; — then watch it all come back here.
          </p>
        </div>
        <span className="text-xs text-charcoal-400">
          {svc.songs.length > 0 ? `${fmtDuration(totalSec)} set · ` : ""}
          {roster.length} people
        </span>
      </div>

      <div className="mt-5">
        <ReadinessNotice
          allowOverride
          overridden={allowIncomplete}
          onOverride={() => setAllowIncomplete((value) => !value)}
        />
      </div>

      {roster.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-charcoal-200 px-6 py-10 text-center">
          <p className="text-sm text-charcoal-500">
            Nobody&rsquo;s on the roster yet. Build the team first, then send the week in one tap.
          </p>
          <Link
            href="/team"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)]"
          >
            Build the team <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      ) : (
        <>
          {/* Compose + publish */}
          <div className="mt-6 rounded-2xl border border-charcoal-100 bg-white p-5">
            <label className="label block text-charcoal-400">
              A word for the whole team (optional)
            </label>
            <textarea
              value={teamNote}
              onChange={(e) => setTeamNote(e.target.value)}
              rows={2}
              placeholder='e.g. "We&rsquo;re keeping Steadfast gentle this week — listen for the new outro."'
              className="mt-2 w-full resize-none rounded-xl border border-charcoal-100 bg-cream-50 px-3 py-2.5 text-sm text-charcoal-800 outline-none focus:border-coral-400"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {(sentCount < roster.length || publishing) && (
                <button
                  onClick={() => publish(false)}
                  disabled={publishing || blocked}
                  className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {publishing ? (
                    <>
                      <Icon name="rotate" size={15} className="animate-spin" /> Publishing…
                    </>
                  ) : sentCount === 0 ? (
                    <>Publish links for the team</>
                  ) : (
                    <>Publish for the {roster.length - sentCount} unsent</>
                  )}
                </button>
              )}
              {sentCount === roster.length && !publishing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-tint px-4 py-2 text-sm font-bold text-ok-ink">
                  <Icon name="check" size={14} /> Everyone has a link
                </span>
              )}
              {sentCount > 0 && (
                <>
                  <button
                    onClick={() => publish(true)}
                    disabled={publishing || blocked}
                    className="rounded-full border border-charcoal-100 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200 disabled:opacity-60"
                  >
                    Refresh the set in their packets
                  </button>
                  <button
                    onClick={copyAll}
                    className="rounded-full border border-charcoal-100 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200"
                  >
                    {copiedKey === "__all__" ? "Copied ✓" : "Copy all links"}
                  </button>
                </>
              )}
              <span className="text-xs text-charcoal-400">
                Links stay stable — re-publishing never breaks one already texted.
              </span>
            </div>
          </div>

          {/* The board */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="label text-charcoal-400">
                The team · {sentCount} of {roster.length} sent
              </h2>
              {sentCount > 0 && (
                <button
                  onClick={refresh}
                  className="text-xs font-semibold text-coral-600 hover:underline"
                >
                  Refresh replies
                </button>
              )}
            </div>
            <div className="mt-1">
              {roster.map((bp) => {
                const pkt = sent[bp.key];
                const resp = pkt ? responses[pkt.token] : undefined;
                const practiceCount = resp?.practice?.length ?? 0;
                return (
                  <div
                    key={bp.key}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-cream-200 py-3.5"
                  >
                    <div className="min-w-0 flex-1 basis-52">
                      <span className="block truncate text-sm font-bold text-charcoal-900">
                        {bp.name}
                      </span>
                      <span className="block truncate text-xs text-charcoal-400">
                        {bp.assignments.join(" · ")}
                      </span>
                    </div>

                    {/* status chain */}
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      {!pkt ? (
                        <span className="rounded-full bg-cream-200 px-2.5 py-1 text-charcoal-400">
                          Not sent
                        </span>
                      ) : (
                        <>
                          <span className="rounded-full bg-cream-200 px-2.5 py-1 text-charcoal-600">
                            Sent
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              resp?.openedAt
                                ? "bg-teal-100 text-teal-600"
                                : "bg-cream-100 text-charcoal-300"
                            }`}
                          >
                            {resp?.openedAt ? "Seen" : "Unseen"}
                          </span>
                          {resp?.status === "confirmed" && (
                            <span className="rounded-full bg-ok-tint px-2.5 py-1 text-ok-ink">
                              In ✓
                            </span>
                          )}
                          {resp?.status === "declined" && (
                            <span
                              className="rounded-full bg-no-tint px-2.5 py-1 text-no-ink"
                              title={resp.reason}
                            >
                              Out{resp.reason ? " · why?" : ""}
                            </span>
                          )}
                          {!resp?.status && (
                            <span className="rounded-full bg-wait-tint px-2.5 py-1 text-wait-ink">
                              No reply
                            </span>
                          )}
                          {/* practice dots */}
                          <span
                            className="ml-1 flex items-center gap-1"
                            title={`Practice: ${practiceCount} of ${PRACTICE_STEPS.length}`}
                          >
                            {PRACTICE_STEPS.map((s, i) => (
                              <span
                                key={s.id}
                                className={`h-2 w-2 rounded-full ${
                                  i < practiceCount ? "bg-teal-500" : "bg-cream-200"
                                }`}
                              />
                            ))}
                          </span>
                        </>
                      )}
                    </div>

                    {/* actions */}
                    {pkt && (
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <button
                          onClick={() => copy(bp.key, packetUrl(pkt.token))}
                          className="text-charcoal-500 hover:text-charcoal-800"
                        >
                          {copiedKey === bp.key ? "Copied ✓" : "Copy link"}
                        </button>
                        <button
                          onClick={() => copy(`nudge-${bp.key}`, nudgeText(bp, pkt.token))}
                          className="text-coral-600 hover:underline"
                          title="Copies a ready-to-text message with their link"
                        >
                          {copiedKey === `nudge-${bp.key}` ? "Copied ✓" : "Nudge"}
                        </button>
                        <a
                          href={packetUrl(pkt.token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-charcoal-400 hover:text-charcoal-700"
                          title="Preview what they see"
                        >
                          <Icon name="link" size={13} />
                        </a>
                      </div>
                    )}

                    {/* their note back */}
                    {resp?.note && (
                      <p className="w-full text-xs text-charcoal-500">
                        <span className="editorial">&ldquo;{resp.note}&rdquo;</span>
                        {resp.reason && resp.status === "declined" && (
                          <span className="ml-2 text-charcoal-400">({resp.reason})</span>
                        )}
                      </p>
                    )}
                    {!resp?.note && resp?.reason && resp.status === "declined" && (
                      <p className="w-full text-xs text-charcoal-500">
                        <span className="editorial">&ldquo;{resp.reason}&rdquo;</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-charcoal-400">
              Text the links from your phone — that&rsquo;s where your team already talks. Copy one,
              or copy all and paste into the group thread.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
