// ============================================================
// Worship Team Rehearsal Planner — templates
// Source: "Worship Team Rehearsal Planner"
// ============================================================

import type {
  AppState,
  CheckGroup,
  FlowBlock,
  RehearsalPlan,
  RehearsalTemplate,
  SongRehearsalNote,
} from "./types";

export type { CheckGroup };

// Pre-rehearsal checklist, grouped.
export const PRE_CHECKLIST: CheckGroup[] = [
  {
    id: "tech",
    label: "Technology setup",
    icon: "sliders",
    items: [
      { id: "t1", text: "Sound system powered on and tested" },
      { id: "t2", text: "Monitors / IEMs checked and working" },
      { id: "t3", text: "Cables checked and positioned" },
      { id: "t4", text: "Mics tested, batteries checked" },
      { id: "t5", text: "Click / backing tracks prepared" },
      { id: "t6", text: "Stage lighting set" },
      { id: "t7", text: "Lyrics / charts on screens" },
      { id: "t8", text: "Recording gear ready (if used)" },
      { id: "t9", text: "Internet verified for Planning Center" },
      { id: "t10", text: "All instruments plugged in and tested" },
    ],
  },
  {
    id: "music",
    label: "Music preparation",
    icon: "music",
    items: [
      { id: "m1", text: "Charts / lead sheets ready" },
      { id: "m2", text: "Song order finalized" },
      { id: "m3", text: "Transitions planned and noted" },
      { id: "m4", text: "Key changes documented" },
      { id: "m5", text: "Special arrangements marked" },
      { id: "m6", text: "Click / track tempos verified" },
      { id: "m7", text: "Reference recordings shared" },
      { id: "m8", text: "Band positions mapped" },
      { id: "m9", text: "Vocal harmonies charted" },
    ],
  },
  {
    id: "spiritual",
    label: "Spiritual & relational",
    icon: "heart",
    items: [
      { id: "s1", text: "Devotional prepared" },
      { id: "s2", text: "Prayer points identified" },
      { id: "s3", text: "Ice-breaker question chosen" },
      { id: "s4", text: "Prayer requests reviewed" },
      { id: "s5", text: "Scripture passage chosen" },
      { id: "s6", text: "Vision / theme for Sunday named" },
    ],
  },
];

// Post-rehearsal evaluation, grouped.
export const POST_EVAL: CheckGroup[] = [
  {
    id: "tech",
    label: "Technical",
    icon: "sliders",
    items: [
      { id: "et1", text: "Sound balance achieved" },
      { id: "et2", text: "Monitor mixes satisfactory" },
      { id: "et3", text: "Technology issues resolved" },
      { id: "et4", text: "Equipment functioning properly" },
    ],
  },
  {
    id: "music",
    label: "Musical",
    icon: "music",
    items: [
      { id: "em1", text: "Songs well-prepared" },
      { id: "em2", text: "Transitions smooth" },
      { id: "em3", text: "Team confident with material" },
      { id: "em4", text: "Timing / tempo addressed" },
    ],
  },
  {
    id: "spiritual",
    label: "Spiritual & relational",
    icon: "heart",
    items: [
      { id: "es1", text: "Team unity strong" },
      { id: "es2", text: "Prayer time meaningful" },
      { id: "es3", text: "Vision clearly communicated" },
      { id: "es4", text: "Team encouraged" },
    ],
  },
];

export const TOTAL_CHECK_ITEMS = PRE_CHECKLIST.reduce((n, g) => n + g.items.length, 0);
export const TOTAL_EVAL_ITEMS = POST_EVAL.reduce((n, g) => n + g.items.length, 0);

export function defaultFlow(): FlowBlock[] {
  return [
    {
      id: "f_connect",
      start: "7:00 PM",
      end: "7:30 PM",
      title: "Team connection",
      items: ["Welcome & ice-breaker", "Devotional", "Prayer"],
    },
    {
      id: "f_rehearse",
      start: "7:45 PM",
      end: "8:45 PM",
      title: "Musical rehearsal",
      items: [
        "Quick sound check per instrument",
        "Run the set in order",
        "Note major issues without stopping",
        "Technical adjustments as needed",
      ],
    },
    {
      id: "f_tighten",
      start: "8:45 PM",
      end: "9:00 PM",
      title: "Tighten-up",
      items: [
        "Re-run any messy transitions",
        "Cover focus areas",
        "Final questions from the team",
      ],
    },
  ];
}

export function emptySongNote(): SongRehearsalNote {
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

export const TRANSITION_TYPES = [
  { title: "Direct flow", detail: "Same key, similar tempo, continuous motion." },
  { title: "Key-change bridge", detail: "Instrumental bridge, pad transition, modulation." },
  { title: "Prayer / Scripture moment", detail: "Soft pad, underscoring, or silence." },
  { title: "Spoken leadership", detail: "Welcome, Scripture reading, or prayer prompt." },
];

// ============================================================
// Rehearsal templates — reusable, named scaffolds
// ============================================================

function tid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

// Deep-clone a checklist structure with fresh item ids so each template /
// stamped plan owns its own items (renaming one never touches another).
export function cloneGroups(groups: CheckGroup[], freshIds = false): CheckGroup[] {
  return groups.map((g) => ({
    id: freshIds ? tid("grp") : g.id,
    label: g.label,
    icon: g.icon,
    items: g.items.map((it) => ({ id: freshIds ? tid("it") : it.id, text: it.text })),
  }));
}

function cloneFlow(flow: FlowBlock[], freshIds = false): FlowBlock[] {
  return flow.map((b) => ({
    id: freshIds ? tid("f") : b.id,
    start: b.start,
    end: b.end,
    title: b.title,
    items: [...b.items],
  }));
}

export function countItems(groups: CheckGroup[]): number {
  return groups.reduce((n, g) => n + g.items.length, 0);
}

// A lighter flow for stripped / midweek rehearsals.
function acousticFlow(): FlowBlock[] {
  return [
    {
      id: tid("f"),
      start: "7:00 PM",
      end: "7:20 PM",
      title: "Connect & pray",
      items: ["Welcome & check-in", "Short devotional", "Prayer"],
    },
    {
      id: tid("f"),
      start: "7:20 PM",
      end: "8:15 PM",
      title: "Run the set",
      items: ["Quick line check", "Run songs in order", "Tighten transitions"],
    },
  ];
}

// The three starter templates every account begins with. The first is starred
// (the default that auto-loads for new services).
export function defaultRehearsalTemplates(): RehearsalTemplate[] {
  return [
    {
      id: tid("tpl"),
      name: "Full band Sunday",
      starred: true,
      checklist: cloneGroups(PRE_CHECKLIST, true),
      evaluation: cloneGroups(POST_EVAL, true),
      flow: defaultFlow(),
    },
    {
      id: tid("tpl"),
      name: "Acoustic / stripped",
      starred: false,
      checklist: cloneGroups(
        PRE_CHECKLIST.map((g) =>
          g.id === "tech"
            ? {
                ...g,
                items: g.items.filter((it) =>
                  ["t1", "t2", "t4", "t7"].includes(it.id),
                ),
              }
            : g,
        ),
        true,
      ),
      evaluation: cloneGroups(POST_EVAL, true),
      flow: acousticFlow(),
    },
    {
      id: tid("tpl"),
      name: "Midweek run-through",
      starred: false,
      checklist: cloneGroups(
        PRE_CHECKLIST.filter((g) => g.id !== "tech"),
        true,
      ),
      evaluation: cloneGroups(POST_EVAL, true),
      flow: acousticFlow(),
    },
  ];
}

export function blankTemplate(name = "New template"): RehearsalTemplate {
  return {
    id: tid("tpl"),
    name,
    starred: false,
    checklist: [
      { id: tid("grp"), label: "Checklist", icon: "check", items: [{ id: tid("it"), text: "First item" }] },
    ],
    evaluation: cloneGroups(POST_EVAL, true),
    flow: defaultFlow(),
  };
}

// Stamp a template into a fresh per-service plan (snapshots its structure).
export function instantiatePlan(template: RehearsalTemplate): RehearsalPlan {
  return {
    templateId: template.id,
    checklistGroups: cloneGroups(template.checklist, true),
    evalGroups: cloneGroups(template.evaluation, true),
    checklist: {},
    evaluation: {},
    flow: cloneFlow(template.flow, true),
    songNotes: {},
    nextWeek: "",
  };
}

// Lazy migration: ensure the account has starter templates. Idempotent.
export function migrateRehearsal(state: AppState): AppState {
  if (state.rehearsalTemplates && state.rehearsalTemplates.length > 0) return state;
  return { ...state, rehearsalTemplates: defaultRehearsalTemplates() };
}
