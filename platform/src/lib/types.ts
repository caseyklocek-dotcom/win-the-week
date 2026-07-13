// ============================================================
// Win the Week Platform — domain model (V1, local-data phase)
// ============================================================

export type PrepStatus = "todo" | "doing" | "done";
export type RoleStatus = "ok" | "wait" | "no"; // confirmed / awaiting / unassigned
export type CapacityLevel = "low" | "medium" | "high";

// ---- Profile / account ----
export interface Profile {
  name: string;
  churchName: string;
  role: string;
  photo: string | null; // data URL
  serviceDay: string; // e.g. "Sunday"
  serviceTime: string; // e.g. "10:00am"
  timezone: string;
  // dashboard customization — which cards show, in order
  dashboardCards: string[];
  // when on (default), creating a new service opens the step-by-step setup;
  // experienced leaders can switch it off and drop straight into the plan.
  guidedSetup?: boolean;
  // V2 experience mode. Guided walks each week step by step with coaching;
  // Fast is one-screen, keyboard-first, no hand-holding. Absent = derive from
  // guidedSetup (see profileMode in lib/mode.ts).
  mode?: "guided" | "fast";
}

// ---- Chord chart (built-in, transposable) ----
export interface ChartLine {
  // a line of lyrics with chords positioned above by character index
  lyrics: string;
  chords: { sym: string; pos: number }[];
}
export interface ChartSection {
  id: string;
  label: string; // Intro, Verse 1, Chorus, Bridge...
  abbr: string; // I, V1, C, B
  lines: ChartLine[];
}
export type ChartDisplay = "chords" | "numbers" | "numerals" | "solfege";
export type ChartType = "chords_lyrics" | "lyrics" | "chords_only" | "song_map";
export interface ChartSettings {
  key: string; // the working key, e.g. "C"
  capo: number; // 0 = none
  display: ChartDisplay;
  chartType: ChartType;
  columns: 1 | 2;
  style: "full" | "condensed";
  font: string;
  color: boolean; // true = color, false = B&W
}

// ---- Song in a set ----
export type ChartSource = "builtin" | "pdf" | "none";
export interface Song {
  id: string;
  libraryId?: string; // links this service copy back to its catalog record
  title: string;
  artist: string;
  originalKey: string; // key the chart is written in
  serviceKey: string; // key chosen for this Sunday
  durationSec: number;
  flow: string; // Opener, Adoration, Communion, Sending, Response...
  leadName: string;
  chartSource: ChartSource;
  chart?: { sections: ChartSection[]; settings: ChartSettings };
  pdfName?: string; // uploaded chart filename
  pdfPath?: string; // path in Supabase Storage (charts bucket) for an uploaded PDF
  multitracksUrl?: string;
  songSelectUrl?: string;
  ccli?: string;
  notes?: string;
  tempo?: number; // BPM, usually read off an imported chart
  timeSignature?: string; // e.g. "4/4", "6/8"
}

// ---- Song library (reusable catalog) ----
// The durable record for a song the leader can pull into any set. Per-service
// choices (serviceKey, flow, leadName) live on Song, not here.
export interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  durationSec: number;
  defaultFlow: string; // where it usually lands in a service
  chartSource: ChartSource;
  chart?: { sections: ChartSection[]; settings: ChartSettings };
  pdfName?: string;
  pdfPath?: string; // path in Supabase Storage (charts bucket) for an uploaded PDF
  multitracksUrl?: string;
  songSelectUrl?: string;
  ccli?: string;
  notes?: string;
  tags?: string[];
  tempo?: number; // BPM
  timeSignature?: string; // e.g. "4/4"
}
// ---- Element in a set ----
// A non-song, manually-timed moment in the service: welcome, testimony,
// baptism, offering, prayer, communion instructions, etc.
export interface SetElement {
  id: string;
  title: string;
  durationSec: number;
  notes?: string;
}

// One ordered slot inside a section, pointing at a Song or a SetElement.
export type SetRow =
  | { kind: "song"; refId: string }
  | { kind: "element"; refId: string };

export interface SetSection {
  id: string;
  label: string; // Preservice, Worship, The Word, Response, Sending
  rows: SetRow[]; // ordered, typed content (songs + elements)
  songIds?: string[]; // legacy: pre-rows data, migrated into rows on load
}

// ---- Team ----
export interface RoleSlot {
  id: string;
  position: string;
  person: string; // display snapshot; canonical name resolves via personId when set
  personId?: string; // links this assignment to a Person in the library
  status: RoleStatus;
}
// The three always-present sections a service's people fall into: the band on
// stage, the tech booth (AVL, cameras, slides), and up front teaching. Every
// service gets one Team per group; a leader can still add ad-hoc teams beyond
// these three (group left undefined) for anything unusual.
export type PositionGroup = "band" | "tech" | "teaching";
export interface Team {
  id: string;
  name: string;
  color: string;
  roles: RoleSlot[];
  group?: PositionGroup;
}

// ---- Position Library ----
// The stock + custom role labels offered when building a team, so a leader
// taps instead of types. `label` is exactly what displays everywhere (charts,
// packet, printed order of service) — abbreviations like "BGV" or "AG" live
// IN the label, there's no separate full-name field to keep in sync.
export interface PositionDef {
  id: string;
  label: string;
  group: PositionGroup;
  stacks: boolean; // tapping again adds a numbered instance: BGV1, BGV2...
  custom?: boolean; // leader-added; built-ins are never removable
}
export interface BenchPerson {
  id: string;
  name: string;
  role: string;
  nextStep: string;
}

// ---- People library (reusable roster) ----
// The durable record for someone on the team. Per-service assignment (which
// position, confirmed/awaiting) lives on RoleSlot, not here.
export interface Person {
  id: string;
  name: string;
  roles: string[]; // positions / instruments they can fill
  mainRole?: string; // their primary role (one of `roles`)
  email?: string;
  phone?: string;
  notes?: string;
  active: boolean; // currently serving on the team
}

// ---- Team Templates (reusable scheduling scaffolds) ----
// A named list of role slots, each with a priority-ordered pool of people.
// Auto-scheduling picks the first eligible person per slot based on frequency.
export type TeamFrequency = "weekly" | "biweekly" | "monthly" | "custom";

export interface TeamTemplatePoolEntry {
  personId: string;
  frequency: TeamFrequency;
  // For "custom": which occurrences of the service day in the month they serve
  // (1=1st, 2=2nd, …). Multi-select — e.g. [1, 3] = 1st & 3rd Sunday.
  customWeeks?: number[];
}

export interface TeamTemplateSlot {
  id: string;
  position: string; // role label, e.g. "Acoustic Guitar"
  pool: TeamTemplatePoolEntry[]; // priority-ordered pool
  group: PositionGroup; // which section this slot lands in when applied
}

export interface TeamTemplate {
  id: string;
  name: string;
  starred: boolean; // the auto-loaded default when applying a template
  slots: TeamTemplateSlot[];
}

// ---- Goals / schedule ----
// An ordered, concrete step that moves a goal forward. Progress is driven by
// completing steps rather than dragging an abstract slider.
export interface GoalMilestone {
  id: string;
  label: string;
  done: boolean;
}
export interface Goal {
  id: string;
  label: string;
  source: string;
  pct: number;
  compassDimId?: string; // when set, this goal tracks a Compass dimension
  milestones?: GoalMilestone[]; // when present, pct is derived from completed steps
}

// ---- Worship Leadership Compass ----
// A completed assessment: raw answers keyed by statement id, plus computed
// 0–100 scores per dimension. History lets us show progress across retakes.
export interface CompassResult {
  id: string;
  date: string; // ISO date taken
  answers: Record<string, number>; // statementId -> selected scale value
  scores: Record<string, number>; // dimensionId -> 0–100
}
export interface CompassState {
  history: CompassResult[]; // chronological; last entry is most recent
}
export interface BlockTask {
  id: string;
  label: string;
  kind: "pray" | "plan" | "admin" | "prep";
  done: boolean;
  // where this task is actually done in the app — the guided coach navigates
  // here. Undefined = reflective/in-place (pray, name a win), no page to visit.
  target?: string;
  how?: string; // one concrete sentence of what to actually do (coach focus card)
}
export interface HourBlock {
  hour: number;
  when: string;
  focus: string;
  type: "pray" | "plan" | "prep";
  outcome?: string; // the "so that" — what this hour produces (Loop view)
  tasks: BlockTask[];
}

// ---- Comms ----
export interface CommItem {
  id: string;
  title: string;
  audience: string;
  deadline: string;
  status: "draft" | "sent" | "todo";
  body: string;
}

// ---- A single Sunday's service plan ----
export interface Service {
  id: string;
  date: string; // ISO date
  season: string; // liturgical / occasion label, e.g. "Communion", "Ordinary Time"
  title: string; // series / message title
  scripture: string;
  theme: string;
  oneThing: string; // the one takeaway
  status: { pray: PrepStatus; plan: PrepStatus; prep: PrepStatus };
  milestones: Record<string, PrepStatus>; // runway checklist (themeSet, setDrafted, ...)
  capacity: { level: CapacityLevel; note: string };
  blocks: HourBlock[];
  loopSeconds?: Record<number, number>; // guided-coach time banked per hour index
  loopHour?: number; // where the guided coach left off (hour index)
  songs: Song[];
  elements?: SetElement[]; // non-song moments referenced by SetRow (lazily migrated)
  setSections: SetSection[];
  teams: Team[];
  // Which team template this service is currently built from, if any. Applying
  // a template replaces the roster and sets this; any manual structural change
  // (add/remove a role, a preset) clears it. Drives the "selected" coral state.
  appliedTemplateId?: string;
  comms: CommItem[];
  avlNotes: string;
  rehearsalNotes: string;
  watchFor: string;
  carryForward: string;
  rehearsal?: RehearsalPlan; // guided rehearsal run-sheet (lazily created)
}

// ---- Rehearsal Planner (per service) ----
export interface FlowBlock {
  id: string;
  start: string; // e.g. "7:00 PM"
  end: string; // e.g. "7:30 PM"
  title: string;
  items: string[];
}
// A named group of checklist items (e.g. "Technology setup").
export interface CheckGroup {
  id: string;
  label: string;
  icon: string;
  items: { id: string; text: string }[];
}
export interface SongRehearsalNote {
  startingPosition: string;
  intro: string;
  build: string;
  ending: string;
  transitionIn: string;
  transitionOut: string;
  special: string;
}
// A reusable, named rehearsal scaffold. Lives at app level, edited in Tools,
// stamped into a service's RehearsalPlan when chosen in the Rehearse tab.
export interface RehearsalTemplate {
  id: string;
  name: string; // e.g. "Full band Sunday"
  starred: boolean; // the auto-loaded default for new services
  checklist: CheckGroup[]; // pre-rehearsal checklist structure
  evaluation: CheckGroup[]; // post-rehearsal debrief structure
  flow: FlowBlock[]; // default run-of-night
}
export interface RehearsalPlan {
  templateId?: string; // which template this week was stamped from
  // Structure snapshots, frozen at stamp time so later template edits never
  // rewrite a week already in progress. When absent, fall back to constants.
  checklistGroups?: CheckGroup[];
  evalGroups?: CheckGroup[];
  checklist: Record<string, boolean>; // checklistItemId -> done
  evaluation: Record<string, boolean>; // evalItemId -> done
  flow: FlowBlock[];
  songNotes: Record<string, SongRehearsalNote>; // songId -> notes
  nextWeek: string;
}

// ---- Community Space ----
// A peer network for worship leaders: a discussion feed plus shared resources.
// PROTOTYPE NOTE: in the current localStorage phase this is single-user — the
// "members" and seeded posts are simulated so the experience is clickable. Real
// cross-user posting requires the Supabase backend (Phase 2). The `authorId`
// fields and member records are modeled now so the move to a real backend is a
// data-source swap, not a rewrite.
export interface CommunityMember {
  id: string;
  name: string;
  churchName: string;
  role: string; // e.g. "Worship Leader", "Bivocational"
  isSelf?: boolean; // the signed-in leader (this device)
  location?: string; // city, state
  bio?: string; // short tagline shown in the directory
  specialties?: string[]; // e.g. "Acoustic", "Tech / AVL", "Songwriting"
  avatarColor?: string; // hex background for the avatar
}
export type CommunityCategory =
  | "ask"
  | "wins"
  | "set-lists"
  | "team"
  | "gear"
  | "general";

// A post can carry one attachment: a shared set, a charted song, or a link.
// Sets are stored as a denormalized SNAPSHOT so the post stays stable even if
// the underlying service later changes.
export type AttachmentKind = "set" | "chart" | "link";
export interface SharedSetSnapshot {
  serviceTitle: string;
  date: string; // ISO date of the service
  season?: string;
  totalMin?: number;
  songs: { title: string; artist?: string; key?: string; flow?: string }[];
}
export interface PostAttachment {
  kind: AttachmentKind;
  set?: SharedSetSnapshot; // kind === "set"
  title?: string; // chart name or link label
  subtitle?: string; // chart key/artist, or link description
  url?: string; // kind === "link"
}

export interface CommunityComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO timestamp
  likes: number;
  likedByMe: boolean;
}
export interface CommunityPost {
  id: string;
  authorId: string;
  category: CommunityCategory;
  title: string;
  body: string;
  createdAt: string; // ISO timestamp
  likes: number;
  likedByMe: boolean;
  shares: number;
  sharedByMe: boolean;
  savedByMe: boolean;
  attachment?: PostAttachment;
  comments: CommunityComment[];
}

// ---- Private messaging ----
export interface DirectMessage {
  id: string;
  fromId: string; // SELF_ID or a member id
  body: string;
  createdAt: string; // ISO timestamp
}
export interface DirectThread {
  id: string;
  memberId: string; // the other participant (one-to-one)
  messages: DirectMessage[];
  unread: number; // unread count for self
}

export interface CommunityState {
  version: number; // seed/shape version, for in-place upgrades
  members: CommunityMember[];
  posts: CommunityPost[];
  threads: DirectThread[];
  savedContactIds: string[]; // members the leader saved to their contacts
}

// ---- Leader Track (discipleship, from the developing leader's POV) ----
// A worship leader raises someone up across several areas of serving. Each
// area moves Watch → Help → Lead with help → Lead → Sent — not a ladder to
// climb, but a journey walked alongside that ends in being sent.
export type TrackStage = "watch" | "help" | "lead-with-help" | "lead" | "sent";
export interface TrackArea {
  id: string; // stable area key: plan | colead | rehearsal | tech | service
  label: string;
  blurb: string;
  stage: TrackStage;
  sentDate?: string; // ISO date stamped when the area reaches "sent"
  note?: string; // mentor's note / encouragement for this area
}
export interface LeaderTrack {
  id: string;
  personId?: string; // links to a Person in the roster when chosen
  name: string;
  startedDate: string; // ISO
  areas: TrackArea[];
  notes?: string;
}

// ---- Guided coach session (the "walk me through it" work session) ----
// Lives in app state so it persists across navigation and reloads. Time is
// banked per hour onto the service (loopSeconds); this holds the live position.
export interface CoachSession {
  serviceId: string;
  hourIndex: number; // 0..4 — which hour the coach is on
  status: "active" | "paused";
  runningSince?: number; // epoch ms the current segment started (active only)
}

// ---- Plan / subscription tier ----
// Which tier this account is on. Billing is NOT enforced yet — during the free
// beta the tier only drives what the app shows (Growth section gating). Stripe
// enforcement lands at the end of the beta.
//   base     — $15/mo: planner, 8-week framework, community
//   advanced — $30/mo: Base + Leader Compass + goals + Leaders on Deck
//   beta     — founding beta member: everything unlocked, free until beta ends
export type PlanTier = "base" | "advanced" | "beta";
export interface PlanState {
  tier: PlanTier;
  trialStartedAt?: string; // ISO — set when a self-signup trial account is created
}

// ---- Top-level app state ----
export interface AppState {
  version: number;
  onboarded: boolean;
  plan?: PlanState; // lazily migrated; missing = founding beta (full access)
  profile: Profile;
  bench: BenchPerson[];
  goals: Goal[];
  compass?: CompassState; // Worship Leadership Compass results (lazily created)
  rehearsalTemplates?: RehearsalTemplate[]; // reusable rehearsal scaffolds (lazily created)
  teamTemplates?: TeamTemplate[]; // reusable team scheduling scaffolds (lazily created)
  positionLibrary?: PositionDef[]; // stock + custom role labels (lazily created)
  songLibrary?: LibrarySong[]; // reusable song catalog (lazily migrated)
  people?: Person[]; // reusable roster (lazily migrated)
  community?: CommunityState; // peer discussion + resource sharing (lazily seeded)
  leaders?: LeaderTrack[]; // Leader Track — people the leader is discipling (lazily seeded)
  coach?: CoachSession | null; // active guided "walk me through it" session
  services: Service[];
  activeServiceId: string;
}
