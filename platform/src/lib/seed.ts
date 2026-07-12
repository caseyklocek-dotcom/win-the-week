import type {
  AppState,
  Service,
  ChartSection,
  Team,
  HourBlock,
  CommItem,
  Song,
  SetSection,
  PrepStatus,
} from "./types";
import { migrateLibrary } from "./library";
import { migratePeople } from "./people";

export const SEED_VERSION = 2;

function id(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

// Next Sunday from a given date (local time, no UTC drift), plus N weeks.
export function nextSunday(base: Date, weeksAhead = 0): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const day = d.getDay();
  let add = (7 - day) % 7;
  if (add === 0) add = 7; // always the upcoming Sunday
  add += weeksAhead * 7;
  d.setDate(d.getDate() + add);
  return toISO(d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// ---- built-in chart sample (Steadfast) ----
const steadfastSections: ChartSection[] = [
  {
    id: id("sec"), label: "Intro", abbr: "I",
    lines: [{ lyrics: "", chords: [{ sym: "C", pos: 0 }, { sym: "G", pos: 4 }, { sym: "Am", pos: 8 }, { sym: "F", pos: 12 }] }],
  },
  {
    id: id("sec"), label: "Verse 1", abbr: "V1",
    lines: [
      { lyrics: "When the night is closing in around me", chords: [{ sym: "C", pos: 0 }, { sym: "G", pos: 12 }] },
      { lyrics: "And the morning feels so far away", chords: [{ sym: "Am", pos: 0 }, { sym: "F", pos: 12 }] },
    ],
  },
  {
    id: id("sec"), label: "Chorus", abbr: "C",
    lines: [
      { lyrics: "You are steadfast, You are faithful", chords: [{ sym: "Am", pos: 0 }, { sym: "F", pos: 12 }] },
      { lyrics: "You will never let me go", chords: [{ sym: "C", pos: 0 }, { sym: "G", pos: 12 }] },
    ],
  },
  {
    id: id("sec"), label: "Bridge", abbr: "B",
    lines: [
      { lyrics: "Through it all, You remain", chords: [{ sym: "F", pos: 0 }, { sym: "C", pos: 10 }] },
      { lyrics: "Forever the same", chords: [{ sym: "G", pos: 0 }, { sym: "Am", pos: 8 }] },
    ],
  },
];

// ---- the eight-week runway (demo content) ----
const WEEKS: {
  season: string;
  title: string;
  scripture: string;
  theme: string;
  oneThing: string;
}[] = [
  {
    season: "This Sunday",
    title: "A Lamp for the Next Step",
    scripture: "Psalm 119:105",
    theme: "God's word gives enough light for the next step",
    oneThing: "God's word lights the next step, and so we can walk forward in trust even when the road is unclear.",
  },
  {
    season: "Ordinary Time",
    title: "Walk While You Have the Light",
    scripture: "John 12:35-36",
    theme: "Walk in the light while it is here",
    oneThing: "The light is here now, and so we keep walking while we have it.",
  },
  {
    season: "Communion",
    title: "The Table and the Trust",
    scripture: "Luke 22:14-20",
    theme: "The table is where trust is remembered",
    oneThing: "We come to the table and remember that He gave Himself, and so we trust Him again.",
  },
  {
    season: "Ordinary Time",
    title: "Steady Hands",
    scripture: "Isaiah 41:10",
    theme: "He holds us with a steady hand",
    oneThing: "He upholds us with His righteous right hand, and so we do not have to be afraid.",
  },
  {
    season: "Baptism Sunday",
    title: "Buried and Raised",
    scripture: "Romans 6:4",
    theme: "Raised to walk in new life",
    oneThing: "We were buried with Him and raised with Him, and so we walk in newness of life.",
  },
  {
    season: "Ordinary Time",
    title: "Songs in the Night",
    scripture: "Psalm 42",
    theme: "His song stays with us in the dark",
    oneThing: "His song is with us in the night, and so we put our hope in God again.",
  },
  {
    season: "Communion",
    title: "Daily Bread",
    scripture: "Matthew 6:11",
    theme: "Enough for today is enough",
    oneThing: "He gives us this day our daily bread, and so we trust Him for today.",
  },
  {
    season: "Back to Church",
    title: "Come Home",
    scripture: "Luke 15:20",
    theme: "The Father runs to meet us",
    oneThing: "While we are still a long way off the Father runs to us, and so everyone is welcome home.",
  },
];

// ---- shared templates (the leader's saved setup) ----
function teamTemplate(week: number): Team[] {
  // week 0 has realistic mixed confirmations; later weeks default to awaiting/open.
  const s = (def: RoleStatusSeed): RoleStatusSeed =>
    week === 0 ? def : { position: def.position, person: def.person, status: def.person ? "wait" : "no" };

  const mk = (defs: RoleStatusSeed[]) =>
    defs.map((d) => ({ id: id("r"), position: d.position, person: d.person, status: d.status }));

  return [
    {
      id: id("team"),
      name: "Band",
      color: "#ff6b5e",
      roles: mk([
        s({ position: "Worship Leader", person: "Derek Volkmann", status: "ok" }),
        s({ position: "Co-leader", person: "Naomi Cash", status: "ok" }),
        s({ position: "Vocals 1", person: "Lauren Fountain", status: "ok" }),
        s({ position: "Vocals 2", person: "Grace Park", status: "wait" }),
        s({ position: "Acoustic Gtr", person: "Sam Ortiz", status: "ok" }),
        s({ position: "Electric Gtr", person: "Marcus Lee", status: "ok" }),
        s({ position: "Keys", person: "Hannah Boyd", status: "ok" }),
        s({ position: "Drums", person: "Theo Reyes", status: "wait" }),
        s({ position: "Bass", person: "Devin Carter", status: "ok" }),
      ]),
    },
    {
      id: id("team"),
      name: "Production",
      color: "#2e2e2e",
      roles: mk([
        s({ position: "Audio", person: "Heather Long", status: "ok" }),
        s({ position: "ProPresenter", person: "Caleb Wynn", status: "ok" }),
        s({ position: "Lighting", person: "", status: "no" }),
        s({ position: "Producer", person: "Casey Klocek", status: "ok" }),
      ]),
    },
    {
      id: id("team"),
      name: "The Word",
      color: "#3d9970",
      roles: mk([
        s({ position: "Teaching", person: "Pastor Tom R.", status: "ok" }),
        s({ position: "Scripture", person: "Lauren Fountain", status: "ok" }),
      ]),
    },
  ];
}

export function blocksTemplate(week: number): HourBlock[] {
  // week 0 carries the screenshot's done-states (9 of 15). Later weeks start fresh.
  const d0 = (v: boolean) => (week === 0 ? v : false);
  const t = (
    label: string,
    kind: "pray" | "plan" | "admin" | "prep",
    done: boolean,
    target?: string,
    how?: string,
  ) => ({
    id: id("t"),
    label,
    kind,
    target,
    how,
    done,
  });
  // Casey's canonical Five Hours (workbook: Part Three). Order is load-bearing:
  // pray + the 8-week sweep first, leadership check-in BEFORE planning details,
  // then set, then personal/tech prep — and Hour 5 happens AFTER Sunday and
  // feeds the next week's Hour 1. The loop.
  return [
    {
      hour: 1, when: "Mon 6:00am", focus: "Strategic planning", type: "pray",
      outcome: "Next 8 weeks have a skeleton; this week is protected.",
      tasks: [
        t("Pray and self check-in", "pray", d0(true), "/plan?tab=pray", "Step away from screens for a few minutes. Pray, then name honestly how much time and energy you have this week."),
        t("Scan the week for anything that interrupts it", "plan", d0(true), "/calendar", "Open your personal and work calendars. Flag anything that collides with your planning time or with Sunday."),
        t("Sweep 8 → 4 → 3 → 2 → 1: set themes, refine the runway", "plan", d0(true), "/calendar", "On the runway, touch each upcoming Sunday: set a theme eight weeks out, then refine as each one gets closer."),
      ],
    },
    {
      hour: 2, when: "Mon 7:00pm", focus: "Leadership & team", type: "plan",
      outcome: "You and your leadership agree on this week before you build it.",
      tasks: [
        t("Leadership check-in — before you plan", "plan", d0(true), undefined, "Before you plan anything, message or meet your pastor/leadership. Ask how last week went and what's coming this week."),
        t("Name one Kingdom Win from last week", "pray", d0(true), undefined, "Write down one specific way God moved last week. Name it plainly."),
        t("Name one EBI — with a solution and a name", "plan", d0(false), undefined, "Name one thing to improve as 'even better if…', bring a solution with it, and assign it to a person."),
        t("Send team comms — end every text with a question", "admin", d0(false), "/team", "Send this week's note to the team in one place — and end with a question so they have to reply."),
      ],
    },
    {
      hour: 3, when: "Tue 8:30pm", focus: "Worship set design", type: "plan",
      outcome: "The set serves the theme and flows; keys and roles are set.",
      tasks: [
        t("Pray, then choose songs that serve the theme", "pray", d0(false), "/set", "Pray over the theme, then pick the songs that serve it and add them to the set."),
        t("Set the flow and transitions (week of)", "plan", d0(false), "/set", "Order the songs and decide how each one moves into the next — endings and keys."),
        t("Lock keys and who plays what", "plan", d0(false), "/set", "Set the key for each song and who is leading or playing each part."),
      ],
    },
    {
      hour: 4, when: "Thu 7:00pm", focus: "Personal & technical prep", type: "prep",
      outcome: "You can lead it freely; tech won't surprise you.",
      tasks: [
        t("Pray the set; sing it through", "pray", d0(false), undefined, "Sing the set through on your own. Pray over each song and over the people who'll be there."),
        t("Practice your parts — and the vocals", "prep", d0(false), "/rehearse", "Run your parts, including the vocals. Nail the spots you'll need to teach the team."),
        t("Test the tech before rehearsal", "prep", d0(false), "/rehearse", "Turn everything on and test it before the team arrives, so no one waits on tech."),
        t("Write the backup plan", "prep", d0(false), "/plan?tab=prep", "Decide what you'll do if a key person or piece of tech drops out. Write it down."),
      ],
    },
    {
      hour: 5, when: "Mon (after Sunday)", focus: "Evaluation & refinement", type: "prep",
      outcome: "Sunday's win and one fix flow into next week's Hour 1.",
      tasks: [
        t("Kingdom Win + EBI on Sunday with your people", "plan", d0(false), undefined, "With your people, name one Kingdom Win and one 'even better if' from Sunday. No holding back, no taking offense."),
        t("Gather one piece of team feedback", "admin", d0(false), "/team", "Ask the whole team for one win and one thing to work on — one place, everyone gives input."),
        t("Carry one thing into next week's prayer", "pray", d0(false), "/plan?tab=prep", "Pick the one thing to carry forward and drop it into next week's Hour 1 prayer."),
      ],
    },
  ];
}

function commsTemplate(week: number): CommItem[] {
  const st = (s: CommItem["status"]) => (week === 0 ? s : "todo");
  return [
    { id: id("c"), title: "Team confirmation text", audience: "Sunday team", deadline: "tonight", status: st("draft"), body: "Hey team, here's the plan for Sunday. Please confirm you're in." },
    { id: id("c"), title: "Set and charts email", audience: "Full band", deadline: "Tuesday", status: st("todo"), body: "Charts and stems attached. Keys are set. Reply with any questions." },
    { id: id("c"), title: "Lighting ask", audience: "Production", deadline: "this week", status: st("todo"), body: "Can you cover lighting from the booth on Sunday?" },
  ];
}

const RUNWAY_KEYS = [
  "themeSet", "scriptureChosen", "songsDrafted",
  "setDrafted", "teamsAdded", "slidesStarted",
  "teamEmailSent", "rehearsalOutlined", "setListLocked",
  "rehearsalNotesLocked", "reminderTextsSent", "chordChartsSent", "allRehearsalNotesSent",
  "weekOfPray", "weekOfPrep", "weekOfRehearsal",
];

function freshMilestones(): Record<string, PrepStatus> {
  return Object.fromEntries(RUNWAY_KEYS.map((k) => [k, "todo"]));
}

function milestonesFor(week: number): Record<string, PrepStatus> {
  const m = freshMilestones();
  // seed a believable cadence: far weeks have early stages moving, near weeks later stages
  const set = (k: string, v: PrepStatus) => (m[k] = v);
  if (week >= 7) { set("themeSet", "done"); set("scriptureChosen", "done"); set("songsDrafted", "doing"); }
  if (week === 4) { set("themeSet", "done"); set("scriptureChosen", "done"); set("songsDrafted", "done"); set("setDrafted", "done"); set("teamsAdded", "doing"); }
  if (week === 3) { set("setDrafted", "done"); set("teamEmailSent", "done"); set("rehearsalOutlined", "doing"); }
  if (week === 2) { set("setDrafted", "done"); set("rehearsalNotesLocked", "doing"); }
  if (week === 1) { set("setDrafted", "done"); set("weekOfPray", "doing"); set("weekOfPrep", "todo"); set("weekOfRehearsal", "todo"); }
  if (week === 0) { RUNWAY_KEYS.forEach((k) => set(k, "done")); }
  return m;
}

function statusFor(week: number): { pray: PrepStatus; plan: PrepStatus; prep: PrepStatus } {
  if (week === 0) return { pray: "done", plan: "doing", prep: "todo" };
  if (week === 1) return { pray: "doing", plan: "todo", prep: "todo" };
  return { pray: "todo", plan: "todo", prep: "todo" };
}

// week 0 carries a real worship set + a built-in chart; future weeks start empty.
function songsFor(week: number): { songs: Song[]; setSections: SetSection[] } {
  if (week !== 0) {
    return {
      songs: [],
      setSections: [
        { id: id("setsec"), label: "Preservice", rows: [] },
        { id: id("setsec"), label: "Worship", rows: [] },
        { id: id("setsec"), label: "The Word", rows: [] },
        { id: id("setsec"), label: "Response", rows: [] },
        { id: id("setsec"), label: "Sending", rows: [] },
      ],
    };
  }
  const songs: Song[] = [
    {
      id: id("song"), title: "By Your Word", artist: "CityAlight", originalKey: "G", serviceKey: "A",
      durationSec: 330, flow: "Opener", leadName: "Derek Volkmann", chartSource: "pdf",
      pdfName: "by-your-word-A.pdf", multitracksUrl: "https://www.multitracks.com/songs/", ccli: "7138782",
    },
    {
      id: id("song"), title: "Steadfast", artist: "Sandra McCracken", originalKey: "C", serviceKey: "G",
      durationSec: 285, flow: "Adoration", leadName: "Naomi Cash", chartSource: "builtin",
      chart: {
        sections: steadfastSections,
        settings: { key: "G", capo: 0, display: "chords", chartType: "chords_lyrics", columns: 2, style: "full", font: "Open Sans", color: true },
      },
      multitracksUrl: "", songSelectUrl: "", ccli: "7016161",
    },
    {
      id: id("song"), title: "Hold Fast My Soul", artist: "Local Worship", originalKey: "D", serviceKey: "D",
      durationSec: 300, flow: "Communion / Reflection", leadName: "Naomi Cash", chartSource: "none",
      songSelectUrl: "https://songselect.ccli.com/", ccli: "7070345",
    },
    {
      id: id("song"), title: "Morning Mercies", artist: "Pat Barrett", originalKey: "F", serviceKey: "F",
      durationSec: 240, flow: "Sending", leadName: "Naomi Cash", chartSource: "none", ccli: "7146228",
    },
  ];
  const setSections: SetSection[] = [
    {
      id: id("setsec"),
      label: "Worship",
      rows: [
        { kind: "song", refId: songs[0].id },
        { kind: "song", refId: songs[1].id },
      ],
    },
    { id: id("setsec"), label: "Response", rows: [{ kind: "song", refId: songs[2].id }] },
    { id: id("setsec"), label: "Sending", rows: [{ kind: "song", refId: songs[3].id }] },
  ];
  return { songs, setSections };
}

function capacityFor(week: number): Service["capacity"] {
  if (week === 0)
    return { level: "medium", note: "Short week. Protect rest Friday and keep the set lean." };
  return { level: "medium", note: "" };
}

function buildService(week: number, date: string): Service {
  const w = WEEKS[week] ?? WEEKS[WEEKS.length - 1];
  const { songs, setSections } = songsFor(week);
  return {
    id: id("svc"),
    date,
    season: w.season,
    title: w.title,
    scripture: w.scripture,
    theme: w.theme,
    oneThing: w.oneThing,
    status: statusFor(week),
    milestones: milestonesFor(week),
    capacity: capacityFor(week),
    blocks: blocksTemplate(week),
    songs,
    elements: [],
    setSections,
    teams: teamTemplate(week),
    comms: commsTemplate(week),
    avlNotes: week === 0 ? "Lower lights for Response. Pad in D under the prayer. Confirm lyric spelling on the Steadfast bridge." : "",
    rehearsalNotes: week === 0 ? "Run the Steadfast bridge. Tighten the By Your Word turnaround." : "",
    watchFor: week === 0 ? "Watch the transition out of the message into the response. Keep it quiet." : "",
    carryForward: week === 0 ? "Pour into Grace on harmonies. She's close to leading a song." : "",
  };
}

// Create a new service that inherits the leader's saved setup from a template.
// Lazy migration: refresh schedule blocks to Casey's canonical Five Hours for
// testers whose localStorage still holds the old (pre-`outcome`) framework.
// Idempotent — detects the old shape by the absent `outcome` field, and rebuilds
// each service's blocks from the template (soonest service = week 0). Other data
// (services, teams, goals, leaders, compass) is untouched.
export function migrateSchedule(state: AppState): AppState {
  const stale = state.services.some(
    (s) =>
      s.blocks?.[0] &&
      (s.blocks[0].outcome === undefined ||
        s.blocks[0].tasks?.[0]?.target === undefined ||
        s.blocks[0].tasks?.[0]?.how === undefined),
  );
  if (!stale) return state;
  const order = [...state.services].sort((a, b) => a.date.localeCompare(b.date));
  const weekOf = new Map(order.map((s, i) => [s.id, i]));
  return {
    ...state,
    services: state.services.map((s) => ({ ...s, blocks: blocksTemplate(weekOf.get(s.id) ?? 1) })),
  };
}

export function makeServiceFromTemplate(prev: Service, date: string, season = "Ordinary Time"): Service {
  return {
    id: id("svc"),
    date,
    season,
    title: "",
    scripture: "",
    theme: "",
    oneThing: "",
    status: { pray: "todo", plan: "todo", prep: "todo" },
    milestones: freshMilestones(),
    capacity: { level: "medium", note: "" },
    blocks: prev.blocks.map((b) => ({
      ...b,
      tasks: b.tasks.map((t) => ({ ...t, id: id("t"), done: false })),
    })),
    songs: [],
    elements: [],
    setSections: prev.setSections.map((s) => ({ id: id("setsec"), label: s.label, rows: [] })),
    teams: prev.teams.map((t) => ({
      ...t,
      id: id("team"),
      roles: t.roles.map((r) => ({
        id: id("r"),
        position: r.position,
        person: r.person,
        status: r.person ? ("wait" as const) : ("no" as const),
      })),
    })),
    comms: prev.comms.map((c) => ({ ...c, id: id("c"), status: "todo" as const })),
    avlNotes: "",
    rehearsalNotes: "",
    watchFor: "",
    carryForward: "",
  };
}

// ---- Fresh start (new tester) ----
// A valid-but-empty state: one upcoming Sunday skeleton, a blank profile, and a
// light team scaffold (positions, no people) so the surfaces have structure to
// fill in. No demo songs, people, goals, or past weeks. `onboarded: false` so the
// first-run tour fires. The shell requires at least one service (activeService
// falls back to services[0]), so we always seed exactly one.
function emptyRole(position: string) {
  return { id: id("r"), position, person: "", status: "no" as const };
}

function freshService(): Service {
  const now = new Date();
  return {
    id: id("svc"),
    date: nextSunday(now, 0),
    season: "This Sunday",
    title: "",
    scripture: "",
    theme: "",
    oneThing: "",
    status: { pray: "todo", plan: "todo", prep: "todo" },
    milestones: freshMilestones(),
    capacity: { level: "medium", note: "" },
    blocks: blocksTemplate(1), // week 1 template = nothing pre-completed
    songs: [],
    elements: [],
    setSections: [
      { id: id("setsec"), label: "Preservice", rows: [] },
      { id: id("setsec"), label: "Worship", rows: [] },
      { id: id("setsec"), label: "The Word", rows: [] },
      { id: id("setsec"), label: "Response", rows: [] },
      { id: id("setsec"), label: "Sending", rows: [] },
    ],
    teams: [
      {
        id: id("team"),
        name: "Band",
        color: "#ff6b5e",
        roles: [
          emptyRole("Worship Leader"),
          emptyRole("Vocals"),
          emptyRole("Acoustic Gtr"),
          emptyRole("Keys"),
          emptyRole("Drums"),
          emptyRole("Bass"),
        ],
      },
      {
        id: id("team"),
        name: "Production",
        color: "#2e2e2e",
        roles: [emptyRole("Audio"), emptyRole("ProPresenter")],
      },
    ],
    comms: [],
    avlNotes: "",
    rehearsalNotes: "",
    watchFor: "",
    carryForward: "",
  };
}

export function makeFreshSeed(): AppState {
  const svc = freshService();
  return migratePeople(
    migrateLibrary({
      version: SEED_VERSION,
      onboarded: false,
      profile: {
        name: "",
        churchName: "",
        role: "Worship Leader",
        photo: null,
        serviceDay: "Sunday",
        serviceTime: "10:00am",
        timezone: "America/Chicago",
        dashboardCards: ["nextSunday", "progress", "team", "set", "capacity", "goals"],
        guidedSetup: true,
      },
      bench: [],
      goals: [],
      services: [svc],
      activeServiceId: svc.id,
    }),
  );
}

export function makeSeed(): AppState {
  const now = new Date(2026, 5, 16); // local June 16, 2026
  const services = WEEKS.map((_, i) => buildService(i, nextSunday(now, i)));

  return migratePeople(migrateLibrary({
    version: SEED_VERSION,
    onboarded: false,
    profile: {
      name: "Casey Klocek",
      churchName: "Grace Community Church",
      role: "Worship Leader",
      photo: null,
      serviceDay: "Sunday",
      serviceTime: "10:00am",
      timezone: "America/Chicago",
      dashboardCards: ["nextSunday", "progress", "team", "set", "capacity", "goals"],
    },
    bench: [
      { id: id("b"), name: "Grace Park", role: "Vocals", nextStep: "Take a harmony line solo" },
      { id: id("b"), name: "Marcus Lee", role: "Electric guitar", nextStep: "Lead one song next month" },
    ],
    goals: [
      { id: id("g"), label: "Develop a co-leader", source: "Worship Leadership Compass", pct: 45 },
      { id: id("g"), label: "Protect a weekly sabbath", source: "Rhythms of rest", pct: 70 },
      { id: id("g"), label: "Deepen the team's theology of worship", source: "Quarterly focus", pct: 30 },
    ],
    services,
    activeServiceId: services[0].id,
  }));
}

// ---- local seed-only helper types ----
type RoleStatusSeed = { position: string; person: string; status: "ok" | "wait" | "no" };
