// ============================================================
// Community Space — a peer network for worship leaders.
//
// A social feed (posts, comments, likes, shares), a member directory you can
// save people from, and one-to-one private messaging. Posts can carry a shared
// set list, a charted song, or a link.
//
// PROTOTYPE: single-user / localStorage phase. The other members, their posts,
// and a couple of seeded message threads are simulated so the experience is
// fully clickable before the Supabase backend exists. The signed-in leader
// ("self") is derived from the profile, and everything they post/comment/share/
// message is attributed to them. The `authorId` / `memberId` shape stays the
// same when the real multi-user backend lands — it becomes a data-source swap,
// not a rewrite.
// ============================================================

import type {
  AppState,
  CommunityState,
  CommunityMember,
  CommunityPost,
  CommunityCategory,
  DirectThread,
  Service,
  SharedSetSnapshot,
} from "./types";
import { sectionSongIds } from "./set";

export const SELF_ID = "self";

// Bump when the seed shape changes so existing testers pick up the new content.
export const COMMUNITY_VERSION = 2;

function id(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

// ISO timestamp N hours ago, so the feed always looks recent relative to today.
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export const CATEGORY_LABELS: Record<CommunityCategory, string> = {
  ask: "Ask the room",
  wins: "Sunday wins",
  "set-lists": "Set lists",
  team: "Team & volunteers",
  gear: "Gear & tech",
  general: "General",
};

// In-token avatar palette (brand coral + charcoal + the two status hues).
const AVATAR_COLORS = ["#ff6b5e", "#2e2e2e", "#3d9970", "#e8952a", "#4a4a4a", "#e85a4d"];

export function avatarColor(member: CommunityMember): string {
  if (member.avatarColor) return member.avatarColor;
  if (member.isSelf) return "#ff6b5e";
  let h = 0;
  for (const c of member.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Seed "neighbors" — other worship leaders in the community.
function seedMembers(): CommunityMember[] {
  return [
    {
      id: "m-marcus",
      name: "Marcus Reyes",
      churchName: "Grace Fellowship",
      role: "Worship Leader",
      location: "Tulsa, OK",
      bio: "Full-band Sundays, two services. Big on click tracks and tight transitions.",
      specialties: ["Electric", "Click tracks", "Team building"],
      avatarColor: "#2e2e2e",
    },
    {
      id: "m-tasha",
      name: "Tasha Bell",
      churchName: "Riverside Community",
      role: "Bivocational",
      location: "Asheville, NC",
      bio: "Teacher by day, worship leader on weekends. Learning to lead without burning out.",
      specialties: ["Acoustic", "Vocals", "Solo Sundays"],
      avatarColor: "#3d9970",
    },
    {
      id: "m-david",
      name: "David Okafor",
      churchName: "Hope City Church",
      role: "Worship Leader",
      location: "Houston, TX",
      bio: "Recovering perfectionist. I chart everything in numbers so we can move keys fast.",
      specialties: ["Nashville numbers", "Keys", "Charting"],
      avatarColor: "#e8952a",
    },
    {
      id: "m-lena",
      name: "Lena Whitfield",
      churchName: "Cornerstone Baptist",
      role: "Volunteer Lead",
      location: "Macon, GA",
      bio: "Lead a volunteer team of eight. Hymns reworked for a modern band are my thing.",
      specialties: ["Hymns", "Volunteers", "Vocals"],
      avatarColor: "#4a4a4a",
    },
    {
      id: "m-sam",
      name: "Sam Trujillo",
      churchName: "New Life Chapel",
      role: "Worship Leader",
      location: "Albuquerque, NM",
      bio: "Church plant, no budget, lots of heart. I run sound and lead at the same time.",
      specialties: ["Tech / AVL", "Acoustic", "Small rooms"],
      avatarColor: "#e85a4d",
    },
    {
      id: "m-priya",
      name: "Priya Anand",
      churchName: "Redeemer Downtown",
      role: "Worship Director",
      location: "Chicago, IL",
      bio: "Direct three campuses. Happy to talk planning systems and developing leaders.",
      specialties: ["Planning", "Leadership", "Songwriting"],
      avatarColor: "#ff6b5e",
    },
    {
      id: "m-jonah",
      name: "Jonah Brewer",
      churchName: "Field Street Church",
      role: "Bivocational",
      location: "Boise, ID",
      bio: "Welder Monday to Friday, worship leader Sunday. Trying to prep without losing my evenings.",
      specialties: ["Acoustic", "Time-saving", "Solo Sundays"],
      avatarColor: "#3d9970",
    },
  ];
}

function seedPosts(): CommunityPost[] {
  return [
    {
      id: id("post"),
      authorId: "m-tasha",
      category: "ask",
      title: "How do you rehearse when half the band can't make Thursdays?",
      body: "I'm bivocational and so is most of my team. Getting everyone in one room midweek is almost impossible. What's working for you — recorded run-throughs, Sunday-morning-only, something else?",
      createdAt: hoursAgo(5),
      likes: 7,
      likedByMe: false,
      shares: 1,
      sharedByMe: false,
      savedByMe: false,
      comments: [
        {
          id: id("c"),
          authorId: "m-marcus",
          body: "We moved to a 30-min pre-service run-through plus a shared reference playlist everyone listens to during the week. Cut our Thursday rehearsals entirely and Sundays got tighter, not looser.",
          createdAt: hoursAgo(4),
          likes: 5,
          likedByMe: false,
        },
        {
          id: id("c"),
          authorId: "m-david",
          body: "Click tracks + charts in everyone's hands ahead of time. The prep happens solo, the room just confirms it.",
          createdAt: hoursAgo(3),
          likes: 3,
          likedByMe: false,
        },
      ],
    },
    {
      id: id("post"),
      authorId: "m-sam",
      category: "set-lists",
      title: "Communion Sunday set that landed well — sharing the running order",
      body: "Kept it all in the key of B/A so the transitions were seamless. The reflective instrumental during the table was the moment everything settled. Steal it if it helps.",
      createdAt: hoursAgo(20),
      likes: 12,
      likedByMe: false,
      shares: 4,
      sharedByMe: false,
      savedByMe: true,
      attachment: {
        kind: "set",
        set: {
          serviceTitle: "Communion Sunday",
          date: hoursAgo(20).slice(0, 10),
          season: "Communion",
          totalMin: 24,
          songs: [
            { title: "Goodness of God", artist: "Bethel", key: "B", flow: "Opener" },
            { title: "Jesus Paid It All", artist: "Kristian Stanfill", key: "A", flow: "Adoration" },
            { title: "O Come to the Altar", artist: "Elevation", key: "B", flow: "Response" },
            { title: "Reflective instrumental", key: "A", flow: "Communion" },
          ],
        },
      },
      comments: [
        {
          id: id("c"),
          authorId: "m-lena",
          body: "Saved. We have communion next week and this flow is exactly the feel I was after.",
          createdAt: hoursAgo(18),
          likes: 2,
          likedByMe: false,
        },
      ],
    },
    {
      id: id("post"),
      authorId: "m-marcus",
      category: "wins",
      title: "First Sunday I didn't feel behind all week",
      body: "Planned the set Monday, charts done Tuesday, team confirmed Wednesday. Walked in Sunday actually able to pastor my people instead of scrambling. Sharing in case anyone needs the reminder that it's possible.",
      createdAt: hoursAgo(26),
      likes: 19,
      likedByMe: true,
      shares: 2,
      sharedByMe: false,
      savedByMe: false,
      comments: [
        {
          id: id("c"),
          authorId: "m-priya",
          body: "This is the goal. Congrats — what changed for you?",
          createdAt: hoursAgo(22),
          likes: 4,
          likedByMe: false,
        },
        {
          id: id("c"),
          authorId: "m-marcus",
          body: "Honestly just blocking one hour Monday to plan the whole thing instead of touching it every day. Front-loading it killed the low-grade dread.",
          createdAt: hoursAgo(21),
          likes: 6,
          likedByMe: true,
        },
      ],
    },
    {
      id: id("post"),
      authorId: "m-david",
      category: "gear",
      title: "Charted 'Goodness of God' in Nashville numbers — transposes to any key",
      body: "For any band that reads numbers, this saves so much time when the singer wants a different key on a Sunday morning. Marked the build and the dynamic drop before the bridge.",
      createdAt: hoursAgo(44),
      likes: 15,
      likedByMe: false,
      shares: 6,
      sharedByMe: false,
      savedByMe: false,
      attachment: {
        kind: "chart",
        title: "Goodness of God — number chart",
        subtitle: "Nashville numbers · works in any key",
      },
      comments: [],
    },
    {
      id: id("post"),
      authorId: "m-jonah",
      category: "general",
      title: "Anyone else lead and run sound at the same time?",
      body: "Solo plant, no tech volunteer yet. I've got a tablet for the board mounted on my mic stand. Feels chaotic but it works. Tips for keeping it sane welcome.",
      createdAt: hoursAgo(60),
      likes: 8,
      likedByMe: false,
      shares: 0,
      sharedByMe: false,
      savedByMe: false,
      comments: [
        {
          id: id("c"),
          authorId: "m-sam",
          body: "Same boat. Build a scene per song ahead of time so during service you're just recalling, never mixing from scratch. Game changer.",
          createdAt: hoursAgo(58),
          likes: 5,
          likedByMe: false,
        },
      ],
    },
  ];
}

function seedThreads(): DirectThread[] {
  return [
    {
      id: id("thr"),
      memberId: "m-marcus",
      unread: 1,
      messages: [
        {
          id: id("dm"),
          fromId: "m-marcus",
          body: "Hey! Saw your post about pre-service run-throughs. Mind if I ask how long yours run?",
          createdAt: hoursAgo(3),
        },
        {
          id: id("dm"),
          fromId: SELF_ID,
          body: "Not at all — usually 25 to 30 minutes, just confirming arrangements not learning them.",
          createdAt: hoursAgo(2.5),
        },
        {
          id: id("dm"),
          fromId: "m-marcus",
          body: "That's the dream. Could you send me the order you used last week?",
          createdAt: hoursAgo(1),
        },
      ],
    },
    {
      id: id("thr"),
      memberId: "m-priya",
      unread: 0,
      messages: [
        {
          id: id("dm"),
          fromId: SELF_ID,
          body: "Loved your planning-systems comment. Do you plan a whole month at once or week to week?",
          createdAt: hoursAgo(30),
        },
        {
          id: id("dm"),
          fromId: "m-priya",
          body: "A month of themes, then the songs week to week. Happy to walk you through it sometime.",
          createdAt: hoursAgo(28),
        },
      ],
    },
  ];
}

// Build a shareable snapshot of a service's set list from its sections.
export function buildSetSnapshot(svc: Service): SharedSetSnapshot {
  const songs: SharedSetSnapshot["songs"] = [];
  let totalSec = 0;
  for (const section of svc.setSections) {
    for (const songId of sectionSongIds(section)) {
      const s = svc.songs.find((x) => x.id === songId);
      if (!s) continue;
      songs.push({
        title: s.title,
        artist: s.artist || undefined,
        key: s.serviceKey || s.originalKey || undefined,
        flow: s.flow || section.label || undefined,
      });
      totalSec += s.durationSec || 0;
    }
  }
  return {
    serviceTitle: svc.title || svc.season || "Sunday set",
    date: svc.date,
    season: svc.season || undefined,
    totalMin: totalSec ? Math.round(totalSec / 60) : undefined,
    songs,
  };
}

function buildSelf(state: AppState): CommunityMember {
  return {
    id: SELF_ID,
    name: state.profile.name || "You",
    churchName: state.profile.churchName || "Your church",
    role: state.profile.role || "Worship Leader",
    isSelf: true,
    avatarColor: "#ff6b5e",
  };
}

// Lazy seed / upgrade. Builds the community once, attributing the signed-in
// leader from the profile. When an older-version community exists, it re-seeds
// the simulated content while keeping the self identity fresh from the profile.
export function migrateCommunity(state: AppState): AppState {
  if (state.community && state.community.version === COMMUNITY_VERSION) {
    return state;
  }

  const self = buildSelf(state);
  const community: CommunityState = {
    version: COMMUNITY_VERSION,
    members: [self, ...seedMembers()],
    posts: seedPosts(),
    threads: seedThreads(),
    savedContactIds: ["m-priya"],
  };

  return { ...state, community };
}

// Resolve a member record by id, with a safe fallback.
export function memberById(
  members: CommunityMember[],
  authorId: string,
): CommunityMember {
  return (
    members.find((m) => m.id === authorId) ?? {
      id: authorId,
      name: "Worship leader",
      churchName: "",
      role: "",
    }
  );
}

export function newPostId() {
  return id("post");
}
export function newCommentId() {
  return id("c");
}
export function newThreadId() {
  return id("thr");
}
export function newMessageId() {
  return id("dm");
}

// Human-friendly relative time for the feed ("3h ago", "2d ago").
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
