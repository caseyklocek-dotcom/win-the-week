// ============================================================
// Worship Leadership Compass — content + scoring
// Source: "The Worship Leadership Compass" (Worshiping Musician | Win the Week)
// ============================================================

export interface ScaleOption {
  value: number; // points contributed
  label: string;
  hint?: string;
}
export interface CompassStatement {
  id: string;
  text: string;
}
export interface CompassDimension {
  id: string;
  label: string;
  short?: string; // short axis label for the radar chart
  blurb: string; // one-line description shown in the wizard header
  statements: CompassStatement[];
}
export interface CompassPart {
  id: string;
  title: string;
  intro: string;
  scale: ScaleOption[]; // ordered low → high
  dimensions: CompassDimension[];
}

// Part 1 — Leadership self-assessment (1–5)
const LEADERSHIP_SCALE: ScaleOption[] = [
  { value: 1, label: "1", hint: "Needs development" },
  { value: 2, label: "2" },
  { value: 3, label: "3", hint: "Getting there" },
  { value: 4, label: "4" },
  { value: 5, label: "5", hint: "Area of strength" },
];

// Part 2 — Team engagement diagnostic (No / Not sure / Somewhat / Yes)
const TEAM_SCALE: ScaleOption[] = [
  { value: 1, label: "No" },
  { value: 2, label: "Not sure" },
  { value: 3, label: "Somewhat" },
  { value: 4, label: "Yes" },
];

export const COMPASS_PARTS: CompassPart[] = [
  {
    id: "leadership",
    title: "Leadership self-assessment",
    intro:
      "Rate yourself honestly. There are no wrong answers — this is a mirror, not a scorecard.",
    scale: LEADERSHIP_SCALE,
    dimensions: [
      {
        id: "spiritual",
        label: "Spiritual leadership",
        short: "Spiritual",
        blurb: "Leading from conviction, not just musical preference.",
        statements: [
          { id: "sp1", text: "I maintain consistent personal worship practices outside of my role." },
          { id: "sp2", text: "I can clearly articulate my theology of worship." },
          { id: "sp3", text: "I regularly invest in my spiritual growth through study and mentorship." },
          { id: "sp4", text: "I model authenticity and vulnerability appropriate to my position." },
          { id: "sp5", text: "I lead from spiritual conviction rather than musical preference." },
        ],
      },
      {
        id: "organizational",
        label: "Organizational leadership",
        short: "Organizational",
        blurb: "Systems, clarity, and follow-through.",
        statements: [
          { id: "or1", text: "I have clear systems for planning and preparation." },
          { id: "or2", text: "I communicate expectations clearly and consistently." },
          { id: "or3", text: "I follow through on commitments and deadlines." },
          { id: "or4", text: "I delegate effectively rather than doing everything myself." },
          { id: "or5", text: "I provide resources and support for team members to succeed." },
        ],
      },
      {
        id: "relational",
        label: "Relational leadership",
        short: "Relational",
        blurb: "Knowing and growing the people, not just the parts.",
        statements: [
          { id: "re1", text: "I know personal details about each team member's life." },
          { id: "re2", text: "I regularly express appreciation to individual team members." },
          { id: "re3", text: "I address conflicts directly and healthily." },
          { id: "re4", text: "I seek and implement feedback from team members." },
          { id: "re5", text: "I invest in developing potential leaders within my team." },
        ],
      },
      {
        id: "musical",
        label: "Musical leadership",
        short: "Musical",
        blurb: "Excellence and accessibility, held together.",
        statements: [
          { id: "mu1", text: "I continually develop my musical skills and knowledge." },
          { id: "mu2", text: "I balance excellence and accessibility in our musical choices." },
          { id: "mu3", text: "I help team members grow in their musical abilities." },
          { id: "mu4", text: "I communicate musical direction clearly during rehearsals." },
          { id: "mu5", text: "I understand the technical aspects of our worship environment." },
        ],
      },
    ],
  },
  {
    id: "team",
    title: "Team engagement diagnostic",
    intro:
      "Now read the room. Answer for the team as it actually is today, not as you hope it will be.",
    scale: TEAM_SCALE,
    dimensions: [
      {
        id: "purpose",
        label: "Purpose & vision",
        short: "Purpose",
        blurb: "A reason beyond \u201cplaying music.\u201d",
        statements: [
          { id: "pu1", text: "Our team has a clearly defined purpose beyond \u201cplaying music.\u201d" },
          { id: "pu2", text: "Team members can articulate why we do what we do." },
          { id: "pu3", text: "We regularly discuss the \u201cwhy\u201d behind our ministry decisions." },
          { id: "pu4", text: "Our team understands how our role supports the church's mission." },
          { id: "pu5", text: "We celebrate when our purpose is being fulfilled." },
        ],
      },
      {
        id: "community",
        label: "Community & belonging",
        short: "Community",
        blurb: "Caring for whole people, not just musicians.",
        statements: [
          { id: "co1", text: "Team members genuinely care about each other's lives." },
          { id: "co2", text: "People feel safe to share struggles and challenges." },
          { id: "co3", text: "We spend time together outside of ministry responsibilities." },
          { id: "co4", text: "New members are intentionally welcomed and integrated." },
          { id: "co5", text: "Our team reflects healthy conflict resolution." },
        ],
      },
      {
        id: "growth",
        label: "Growth & development",
        short: "Growth",
        blurb: "Everyone has a next step.",
        statements: [
          { id: "gr1", text: "Each team member has identified areas for personal growth." },
          { id: "gr2", text: "We provide resources and opportunities for skill development." },
          { id: "gr3", text: "Team members receive regular, constructive feedback." },
          { id: "gr4", text: "We celebrate progress and improvement." },
          { id: "gr5", text: "Team members are growing spiritually through their involvement." },
        ],
      },
      {
        id: "trust",
        label: "Communication & trust",
        short: "Trust",
        blurb: "Information and trust flow in every direction.",
        statements: [
          { id: "tr1", text: "Information flows clearly and consistently to all team members." },
          { id: "tr2", text: "Team members feel heard and valued in discussions." },
          { id: "tr3", text: "Expectations are communicated well in advance." },
          { id: "tr4", text: "Feedback flows in multiple directions (not just top-down)." },
          { id: "tr5", text: "Trust is high among team members and leadership." },
        ],
      },
    ],
  },
];

// All dimensions, flat, in wizard order.
export const COMPASS_DIMENSIONS = COMPASS_PARTS.flatMap((p) =>
  p.dimensions.map((d) => ({ ...d, partId: p.id, scale: p.scale })),
);

export const TOTAL_STATEMENTS = COMPASS_DIMENSIONS.reduce(
  (n, d) => n + d.statements.length,
  0,
);

export function dimensionLabel(dimId: string): string {
  return COMPASS_DIMENSIONS.find((d) => d.id === dimId)?.label ?? dimId;
}

// Compute a 0–100 score for one dimension from raw answers.
export function scoreDimension(
  dim: { statements: CompassStatement[]; scale: ScaleOption[] },
  answers: Record<string, number>,
): number {
  const max = Math.max(...dim.scale.map((s) => s.value));
  let sum = 0;
  let answered = 0;
  for (const st of dim.statements) {
    const v = answers[st.id];
    if (typeof v === "number") {
      sum += v;
      answered += 1;
    }
  }
  if (answered === 0) return 0;
  return Math.round((sum / (answered * max)) * 100);
}

// Compute scores for every dimension.
export function scoreAll(answers: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of COMPASS_DIMENSIONS) out[d.id] = scoreDimension(d, answers);
  return out;
}

export type Band = "attention" | "developing" | "strength";
export function band(score: number): Band {
  if (score < 40) return "attention";
  if (score < 70) return "developing";
  return "strength";
}
export const BAND_META: Record<Band, { label: string; text: string; bg: string; bar: string }> = {
  attention: { label: "Needs attention", text: "var(--color-no-ink)", bg: "var(--color-no-tint)", bar: "var(--color-no-bar)" },
  developing: { label: "Developing", text: "var(--color-wait-ink)", bg: "var(--color-wait-tint)", bar: "var(--color-wait-bar)" },
  strength: { label: "Strength", text: "var(--color-ok-ink)", bg: "var(--color-ok-tint)", bar: "var(--color-ok-bar)" },
};

// A suggested growth focus, used to pre-fill quarterly goals from the weakest areas.
export function suggestedGoalLabel(dimId: string): string {
  const map: Record<string, string> = {
    spiritual: "Deepen my spiritual leadership",
    organizational: "Tighten my planning systems",
    relational: "Invest in team relationships",
    musical: "Grow my musical leadership",
    purpose: "Clarify the team's purpose & vision",
    community: "Build community & belonging",
    growth: "Create growth paths for the team",
    trust: "Strengthen communication & trust",
  };
  return map[dimId] ?? dimensionLabel(dimId);
}

// ---- Suggested milestones ----
// Concrete, escalating steps that actually move each dimension forward. These
// pre-fill a goal so the leader sees what progress looks like, not an abstract
// percentage. They're starting points — every step is editable once added.
export const DIMENSION_MILESTONES: Record<string, string[]> = {
  spiritual: [
    "Set a fixed weekly time for personal worship off the platform",
    "Write a one-paragraph theology of worship in my own words",
    "Start a monthly check-in with a mentor or pastor",
    "Lead a team devotional from what I'm personally learning",
  ],
  organizational: [
    "Pick one tool to hold every plan, song, and schedule in one place",
    "Set a repeatable weekly prep rhythm with a day and a deadline",
    "Send the team the plan a full week ahead, every week",
    "Hand off one recurring task I currently do myself",
  ],
  relational: [
    "Learn one personal detail about each team member's life",
    "Send a specific thank-you to one person every week",
    "Have one honest conversation I've been avoiding",
    "Name a potential leader and give them something to own",
  ],
  musical: [
    "Block 30 minutes a week to grow my own musicianship",
    "Choose songs by both excellence and singability, not just taste",
    "Give one player a specific skill to work on this month",
    "Run a rehearsal with clear musical direction written ahead of time",
  ],
  purpose: [
    "Write our team's purpose in one sentence beyond \u201cplaying music\u201d",
    "Open one rehearsal by saying why we do this",
    "Tie a recent decision back to the church's mission out loud",
    "Celebrate a moment where our purpose actually showed up",
  ],
  community: [
    "Start each gathering with five minutes of real check-in",
    "Plan one hangout outside of ministry responsibilities",
    "Create a simple way to welcome and onboard a new member",
    "Address one unspoken tension before it grows",
  ],
  growth: [
    "Ask each member to name one area they want to grow in",
    "Share a resource or opportunity that fits someone's next step",
    "Give one piece of specific, constructive feedback this week",
    "Publicly celebrate someone's progress or improvement",
  ],
  trust: [
    "Set one reliable channel where all team info lives",
    "Ask for feedback and visibly act on one piece of it",
    "Communicate expectations a full week before they matter",
    "Have a one-on-one that's all listening, no agenda",
  ],
};

// Build a fresh, undone milestone list for a dimension.
export function makeMilestones(dimId: string): {
  id: string;
  label: string;
  done: boolean;
}[] {
  const steps = DIMENSION_MILESTONES[dimId] ?? [];
  return steps.map((label, i) => ({
    id: `m_${dimId}_${i}`,
    label,
    done: false,
  }));
}
