"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { makeServiceFromTemplate, nextSunday } from "@/lib/seed";
import { serviceDisplayTitle } from "@/lib/set";
import type { CalendarProvider, PrepStatus, PreparationBlock, Service } from "@/lib/types";
import {
  eventsForServiceWeek,
  parseIcs,
  preparationBlocksToIcs,
  previewCalendar,
  serviceWeekDays,
  suggestPreparationBlocks,
  weeksUntilService,
} from "@/lib/calendar";
import { weekdayName } from "@/lib/music";
import { CalendarSetupWizard } from "@/components/CalendarSetupWizard";
import { UnifiedWeekCalendar } from "@/components/UnifiedWeekCalendar";

const STAGE_CYCLE: Record<PrepStatus, PrepStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo",
};

const STAGES = [
  { key: "pray", label: "Pray" },
  { key: "plan", label: "Plan" },
  { key: "prep", label: "Prep" },
] as const;

const RUNWAY = [
  {
    weeksOut: 8,
    kicker: "Set the theme",
    items: [
      ["themeSet", "Theme set"],
      ["scriptureChosen", "Scripture chosen"],
      ["songsDrafted", "Songs drafted"],
    ],
  },
  {
    weeksOut: 4,
    kicker: "Coordinate the set",
    items: [
      ["setDrafted", "Set drafted"],
      ["teamsAdded", "Teams added"],
      ["slidesStarted", "Slides started"],
    ],
  },
  {
    weeksOut: 3,
    kicker: "Get emails out",
    items: [
      ["teamEmailSent", "Team email sent"],
      ["rehearsalOutlined", "Rehearsal Outlined"],
      ["setListLocked", "Set List Locked"],
    ],
  },
  {
    weeksOut: 2,
    kicker: "Lock the details",
    items: [
      ["rehearsalNotesLocked", "Rehearsal notes locked"],
      ["reminderTextsSent", "Reminder texts sent"],
      ["chordChartsSent", "Chord Charts sent"],
      ["allRehearsalNotesSent", "All Rehearsal notes sent"],
    ],
  },
  {
    weeksOut: 1,
    kicker: "Show up ready",
    items: [
      ["weekOfPray", "Pray"],
      ["weekOfPrep", "Prep"],
      ["weekOfRehearsal", "Rehearsal"],
    ],
  },
] as const;

function monthDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function CalendarPage() {
  const router = useRouter();
  const { state, activeService, updateService, addService, setActiveService, setState, checkpoint } = useStore();
  const [importMessage, setImportMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  // services sorted by date (soonest first)
  const services = [...state.services].sort((a, b) => a.date.localeCompare(b.date));
  const latestDate = services.reduce((m, s) => (s.date > m ? s.date : m), services[0].date);
  const defaultNew = nextSunday(new Date(latestDate + "T00:00:00"));

  const [adding, setAdding] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newDate, setNewDate] = useState(defaultNew);
  const [newSeason, setNewSeason] = useState("Ordinary Time");

  const weekEvents = useMemo(
    () => eventsForServiceWeek(state.calendar?.events ?? [], activeService.date),
    [state.calendar?.events, activeService.date],
  );
  const proposedBlocks = useMemo(
    () => suggestPreparationBlocks(activeService, weekEvents),
    [activeService, weekEvents],
  );
  const protectedBlocks = activeService.calendarPlan?.protectedBlocks ?? [];

  const refreshLiveCalendar = useCallback(async (provider: "google" | "microsoft") => {
    const days = serviceWeekDays(activeService.date);
    const end = new Date(days[6]);
    end.setDate(end.getDate() + 1);
    setSyncing(true);
    try {
      const response = await fetch(`/api/calendar/${provider}/events?start=${encodeURIComponent(days[0].toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setState((current) => ({ ...current, calendar: { provider, connected: true, setupComplete: true, previewMode: false, calendarName: provider === "google" ? "Google Calendar" : "Microsoft Outlook", lastSyncedAt: new Date().toISOString(), detailMode: current.calendar?.detailMode ?? "titles", calendars: data.calendars, selectedCalendarIds: data.calendars.map((calendar: { id: string }) => calendar.id), events: data.events.map((event: { title: string }) => ({ ...event, title: current.calendar?.detailMode === "busy" ? "Busy" : event.title })) } }));
      setSyncMessage("Calendar refreshed");
    } catch {
      setSyncMessage("Calendar refresh needs attention. Reconnect from Calendar Setup.");
    } finally {
      setSyncing(false);
    }
  }, [activeService.date, setState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("calendar_connected");
    const notice = params.get("calendar_notice");
    const message = notice === "not-configured"
      ? "Live sign-in is ready for deployment credentials. Use preview or import for now."
      : notice === "apple-import"
        ? "Apple Calendar currently connects through a calendar file. Direct access is being prepared."
        : notice === "authorization-failed"
          ? "Calendar sign-in was not completed. Nothing changed."
          : "";
    const timer = window.setTimeout(() => {
      if (connected === "google" || connected === "microsoft") void refreshLiveCalendar(connected);
      if (message) setImportMessage(message);
    }, 0);
    if (connected || notice) window.history.replaceState({}, "", "/calendar");
    return () => window.clearTimeout(timer);
  }, [refreshLiveCalendar]);

  useEffect(() => {
    const onFocus = () => {
      const provider = state.calendar?.connected ? state.calendar.provider : undefined;
      if (provider === "google" || provider === "microsoft") void refreshLiveCalendar(provider);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshLiveCalendar, state.calendar?.connected, state.calendar?.provider]);

  const importCalendar = async (file: File, provider: CalendarProvider, detailMode: "titles" | "busy") => {
    const parsed = parseIcs(await file.text(), provider);
    const source = { id: `imported-${provider}`, name: file.name.replace(/\.ics$/i, ""), provider, color: "#8b7bb7", writable: false };
    const events = parsed.map((event) => ({ ...event, calendarId: source.id, color: source.color, title: detailMode === "busy" ? "Busy" : event.title }));
    setImportMessage(
      events.length
        ? `${events.length} calendar ${events.length === 1 ? "event" : "events"} imported.`
        : "No calendar events were found in that file.",
    );
    if (!events.length) return;
    setState((current) => ({
      ...current,
      calendar: {
        provider,
        connected: false,
        setupComplete: true,
        previewMode: false,
        calendarName: file.name,
        lastImportedAt: new Date().toISOString(),
        calendars: [source],
        selectedCalendarIds: [source.id],
        detailMode,
        events,
      },
    }));
  };

  const openPreview = (detailMode: "titles" | "busy") => {
    const preview = previewCalendar(activeService.date);
    setState((current) => ({
      ...current,
      calendar: {
        provider: "manual",
        connected: false,
        setupComplete: true,
        previewMode: true,
        calendarName: "Unified calendar preview",
        detailMode,
        calendars: preview.calendars,
        selectedCalendarIds: preview.calendars.map((calendar) => calendar.id),
        events: preview.events.map((event) => ({ ...event, title: detailMode === "busy" ? "Busy" : event.title })),
      },
    }));
  };

  const protectBlock = (block: PreparationBlock) =>
    updateService(activeService.id, (service) => ({
      ...service,
      calendarPlan: {
        ...service.calendarPlan,
        protectedBlocks: [
          ...(service.calendarPlan?.protectedBlocks ?? []).filter((item) => item.id !== block.id),
          block,
        ],
      },
    }));

  const removeBlock = (id: string) => {
    checkpoint("Protected time removed");
    updateService(activeService.id, (service) => ({
      ...service,
      calendarPlan: {
        ...service.calendarPlan,
        protectedBlocks: (service.calendarPlan?.protectedBlocks ?? []).filter((item) => item.id !== id),
      },
    }));
  };

  const changeCalendar = () => {
    checkpoint("Calendar setup changed");
    setState((current) => ({ ...current, calendar: undefined }));
  };

  const autoPlace = () => {
    checkpoint("Preparation times auto-placed");
    updateService(activeService.id, (service) => ({
      ...service,
      calendarPlan: { ...service.calendarPlan, protectedBlocks: proposedBlocks },
    }));
  };

  const toggleCalendar = (id: string) => setState((current) => {
    if (!current.calendar) return current;
    const selected = current.calendar.selectedCalendarIds ?? current.calendar.calendars?.map((calendar) => calendar.id) ?? [];
    return { ...current, calendar: { ...current.calendar, selectedCalendarIds: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] } };
  });

  const markReviewed = () =>
    updateService(activeService.id, (service) => ({
      ...service,
      calendarPlan: {
        ...service.calendarPlan,
        reviewedAt: new Date().toISOString(),
        protectedBlocks: service.calendarPlan?.protectedBlocks ?? [],
      },
      blocks: service.blocks.map((block) => ({
        ...block,
        tasks: block.tasks.map((task) =>
          /review your week|scan the week|check your calendar/i.test(task.label)
            ? { ...task, done: true }
            : task,
        ),
      })),
    }));

  const addProtectedTimesToCalendar = async () => {
    if (!protectedBlocks.length) return;
    if (state.calendar?.connected && (state.calendar.provider === "google" || state.calendar.provider === "microsoft")) {
      const writable = state.calendar.calendars?.find((calendar) => calendar.writable && (calendar.primary || state.calendar?.selectedCalendarIds?.includes(calendar.id)));
      if (!writable) { setSyncMessage("Choose a writable calendar before syncing protected times."); return; }
      setSyncing(true);
      try {
        const response = await fetch(`/api/calendar/${state.calendar.provider}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ calendarId: writable.id, blocks: protectedBlocks }) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const ids = new Map<string, string>(data.created.map((item: { blockId: string; externalEventId: string }) => [item.blockId, item.externalEventId]));
        updateService(activeService.id, (service) => ({ ...service, calendarPlan: { ...service.calendarPlan, protectedBlocks: (service.calendarPlan?.protectedBlocks ?? []).map((block) => ids.has(block.id) ? { ...block, externalEventId: ids.get(block.id), syncedProvider: state.calendar!.provider } : block) } }));
        setSyncMessage(data.created.length ? `${data.created.length} protected times added to ${writable.name}.` : data.updated ? `Protected times updated in ${writable.name}.` : "Protected times are already synced.");
        void refreshLiveCalendar(state.calendar.provider);
      } catch { setSyncMessage("Protected times were not added. Your Win the Week plan is still safe here."); }
      finally { setSyncing(false); }
      return;
    }
    const blob = new Blob([preparationBlocksToIcs(protectedBlocks, activeService)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `win-the-week-${activeService.date}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    setSyncMessage("Calendar file downloaded");
  };

  const openService = (id: string) => {
    setActiveService(id);
    router.push("/plan");
  };

  const cycleStage = (svc: Service, key: "pray" | "plan" | "prep") =>
    updateService(svc.id, (s) => ({
      ...s,
      status: { ...s.status, [key]: STAGE_CYCLE[s.status[key]] },
    }));

  const cycleMilestone = (svc: Service, mkey: string) =>
    updateService(svc.id, (s) => ({
      ...s,
      milestones: { ...s.milestones, [mkey]: STAGE_CYCLE[s.milestones[mkey] ?? "todo"] },
    }));

  const guided = state.profile.guidedSetup ?? true;
  const dest = guided ? "/plan?setup=new" : "/plan";

  const planNextWeek = () => {
    const template = services[0];
    const svc = makeServiceFromTemplate(template, defaultNew);
    addService(svc);
    router.push(dest);
  };

  const createForDate = () => {
    const template = services[0];
    const svc = makeServiceFromTemplate(template, newDate, newSeason || "Ordinary Time");
    addService(svc);
    router.push(dest);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* ---------- Review the real week ---------- */}
      <section data-coach="week-review" className="rounded-2xl border border-charcoal-100 bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label text-coral-600">Review your week</div>
            <h1 className="mt-1 headline text-3xl text-charcoal-900">
              Protect the time this {weekdayName(activeService.date)} needs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
              Bring your real commitments into view, then keep the preparation windows that work.
              Event details stay in this local beta unless you later connect an account.
            </p>
          </div>
          {activeService.calendarPlan?.reviewedAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-tint px-3 py-1.5 text-xs font-bold text-ok-ink">
              <Icon name="check" size={13} /> Week reviewed
            </span>
          )}
        </div>

        {!state.calendar?.setupComplete ? (
          <CalendarSetupWizard onImport={importCalendar} onPreview={openPreview} />
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${state.calendar.connected ? "bg-ok-tint text-ok-ink" : "bg-coral-100 text-coral-600"}`}><Icon name={state.calendar.connected ? "check" : "calendar"} size={17} /></span>
                <div>
                  <div className="text-sm font-bold text-charcoal-800">{state.calendar.calendarName || "Unified calendar"}</div>
                  <div className="text-xs text-charcoal-500">{state.calendar.connected ? `Live sync · ${weekEvents.length} commitments this week` : state.calendar.previewMode ? "Previewing the complete workflow with sample commitments" : `Imported snapshot · ${weekEvents.length} commitments this week`}</div>
                </div>
              </div>
              <button onClick={changeCalendar} className="text-xs font-bold text-coral-600">Calendar Setup</button>
            </div>

            <UnifiedWeekCalendar
              serviceDate={activeService.date}
              calendars={state.calendar.calendars ?? []}
              events={weekEvents}
              blocks={protectedBlocks}
              previewMode={state.calendar.previewMode}
              selectedCalendarIds={state.calendar.selectedCalendarIds ?? state.calendar.calendars?.map((calendar) => calendar.id) ?? []}
              onToggleCalendar={toggleCalendar}
              onAutoPlace={autoPlace}
              onChangeBlock={protectBlock}
              onRemoveBlock={removeBlock}
            />

            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-charcoal-100 pt-5">
              <button onClick={markReviewed} className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)]"><Icon name="check" size={14} /> Finish Week Review</button>
              {protectedBlocks.length > 0 && (
                <button disabled={syncing} onClick={() => void addProtectedTimesToCalendar()} className="inline-flex items-center gap-1.5 rounded-full border border-coral-300 px-4 py-2.5 text-sm font-bold text-coral-600 disabled:opacity-50"><Icon name={syncing ? "rotate" : "calendar"} size={14} /> {syncing ? "Syncing…" : state.calendar.connected ? "Sync Protected Times" : "Export Protected Times"}</button>
              )}
              {importMessage && <span className="text-xs font-semibold text-charcoal-500">{importMessage}</span>}
              {syncMessage && <span role="status" className="text-xs font-semibold text-charcoal-500">{syncMessage}</span>}
            </div>
          </>
        )}
        {!state.calendar?.setupComplete && importMessage && (
          <div role="status" className="mt-3 rounded-lg border border-coral-200 bg-coral-50 px-4 py-3 text-sm font-semibold text-charcoal-600">
            {importMessage}
          </div>
        )}
      </section>

      {/* ---------- The runway (lead) ---------- */}
      <section>
        <div className="label text-coral-600">The runway</div>
        <h1 className="mt-1 headline text-3xl text-charcoal-900">8 · 4 · 3 · 2 · 1 weeks out</h1>
        <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
          The matrix shows what is coming. The runway shows what to do when, and so you stop
          carrying the calendar in your head. Set themes early, coordinate future sets, then get
          emails, meetings, and sessions out on time every week.
        </p>

        <div data-coach="runway" data-tour="runway" className="mt-6 border-t border-charcoal-100">
          {!RUNWAY.some((stage) => services.some((service) => weeksUntilService(service.date) === stage.weeksOut)) && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-charcoal-700">
                Your runway fills in as you plan ahead.
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-charcoal-500">
                Add services a few weeks out and each one shows up here with what to do when.
              </p>
              <button
                onClick={() => {
                  setAdding(true);
                  setCalendarOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
              >
                <Icon name="plus" size={16} /> Plan a service
              </button>
            </div>
          )}
          {RUNWAY.map((stage) => {
            const svc = services.find(
              (service) => service.date >= new Date().toISOString().slice(0, 10) && weeksUntilService(service.date) === stage.weeksOut,
            );
            if (!svc) return null;
            return (
              <div
                key={stage.weeksOut}
                className="flex flex-wrap items-center gap-5 border-b border-cream-200 py-5"
              >
                <div className="w-28 shrink-0">
                  <div className="text-3xl font-bold leading-none text-charcoal-900">
                    {stage.weeksOut}
                  </div>
                  <div className="label mt-1 text-charcoal-400">weeks out</div>
                  <div className="label mt-2 text-coral-600">{stage.kicker}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-charcoal-900">
                    {monthDay(svc.date)} · {svc.season}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stage.items.map(([mkey, mlabel]) => (
                      <MilestoneChip
                        key={mkey}
                        label={mlabel}
                        status={svc.milestones[mkey] ?? "todo"}
                        onClick={() => cycleMilestone(svc, mkey)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 border-l-2 border-teal-300 pl-4 text-sm text-charcoal-500">
          <span className="font-semibold text-charcoal-700">Coming soon:</span> the planning
          assistant will drive this runway for you, firing each reminder and drafting the emails
          on schedule so the cadence happens whether or not you remember it.
        </p>
      </section>

      {/* ---------- Upcoming services (collapsed by default) ---------- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setCalendarOpen((v) => !v)}
            className="group flex items-center gap-2.5 text-left"
            aria-expanded={calendarOpen}
          >
            <Icon
              name={calendarOpen ? "chevronDown" : "chevronRight"}
              size={18}
              className="text-charcoal-400 transition group-hover:text-coral-500"
            />
            <span>
              <span className="label block text-coral-600">Upcoming services</span>
              <span className="headline block text-2xl text-charcoal-900">The next 8 weeks</span>
            </span>
          </button>
          <button
            onClick={() => {
              setAdding((v) => !v);
              setCalendarOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            <Icon name="plus" size={16} /> Plan a service
          </button>
        </div>

        {adding && (
          <div className="mt-4 border-l-2 border-coral-400 py-1 pl-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="label mb-1 text-charcoal-400">Service date</div>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                />
              </div>
              <div>
                <div className="label mb-1 text-charcoal-400">Occasion</div>
                <input
                  value={newSeason}
                  onChange={(e) => setNewSeason(e.target.value)}
                  placeholder="Ordinary Time"
                  className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                />
              </div>
              <button
                onClick={createForDate}
                className="rounded-full bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
              >
                Create + open
              </button>
              <button
                onClick={planNextWeek}
                className="rounded-lg border border-charcoal-200 px-4 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600"
              >
                Plan next week ({monthDay(defaultNew)})
              </button>
            </div>
            <p className="mt-3 text-xs text-charcoal-400">
              Your team roster, five-hour schedule, set sections, and email drafts carry over
              automatically. Just fill in the theme and songs.
            </p>
          </div>
        )}

        {calendarOpen && (
          <>
            <p className="mt-4 max-w-xl text-sm text-charcoal-500">
              Every service in one view. The pills show how far Pray, Plan, and Prep have come for
              each week. Pick any week to open its plan and start editing.
            </p>
            <div className="mt-4 border-t border-charcoal-100">
              {services.slice(0, 8).map((svc) => {
                const active = svc.id === activeService.id;
                return (
                  <div
                    key={svc.id}
                    className={`group flex flex-wrap items-center gap-4 border-b border-cream-200 px-2 py-4 transition ${
                      active ? "bg-coral-50/60" : "hover:bg-cream-200/50"
                    }`}
                  >
                    <button
                      onClick={() => openService(svc.id)}
                      className="flex flex-1 items-center gap-4 text-left"
                    >
                      <div className="w-16 shrink-0">
                        <div className="text-lg font-bold leading-none text-charcoal-900">
                          {monthDay(svc.date)}
                        </div>
                        <div className="label mt-1 text-charcoal-400">{svc.season}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-charcoal-900">
                          {serviceDisplayTitle(svc)}
                        </div>
                        <div className="truncate text-sm text-charcoal-400">
                          {svc.scripture || "Add a scripture"}
                        </div>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {STAGES.map((st) => (
                        <StagePill
                          key={st.key}
                          label={st.label}
                          status={svc.status[st.key]}
                          onClick={() => cycleStage(svc, st.key)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StagePill({
  label,
  status,
  onClick,
}: {
  label: string;
  status: PrepStatus;
  onClick: () => void;
}) {
  const styles: Record<PrepStatus, string> = {
    done: "bg-ok-tint text-ok-ink border-transparent",
    doing: "bg-coral-500 text-white border-transparent shadow-[0_2px_10px_rgba(255,107,94,0.35)]",
    todo: "bg-transparent text-charcoal-400 border-charcoal-200",
  };
  return (
    <button
      onClick={onClick}
      title={`${label}: ${status === "done" ? "done" : status === "doing" ? "in progress" : "not started"} (click to advance)`}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${styles[status]}`}
    >
      {label}
    </button>
  );
}

function MilestoneChip({
  label,
  status,
  onClick,
}: {
  label: string;
  status: PrepStatus;
  onClick: () => void;
}) {
  const dot: Record<PrepStatus, string> = {
    done: "var(--color-ok-bar)",
    doing: "var(--color-wait-bar)",
    todo: "var(--color-charcoal-200)",
  };
  const ring: Record<PrepStatus, string> = {
    done: "border-ok-border bg-ok-tint",
    doing: "border-wait-border bg-wait-tint",
    todo: "border-charcoal-200 bg-transparent",
  };
  return (
    <button
      onClick={onClick}
      title="Click to advance"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-charcoal-700 transition hover:opacity-80 ${ring[status]}`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot[status] }} />
      {label}
    </button>
  );
}
