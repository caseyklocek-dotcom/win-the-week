"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { countLabel } from "@/lib/music";
import {
  SELF_ID,
  CATEGORY_LABELS,
  avatarColor,
  buildSetSnapshot,
  memberById,
  newPostId,
  newCommentId,
  timeAgo,
  initials,
} from "@/lib/community";
import type {
  CommunityCategory,
  CommunityMember,
  CommunityPost,
  PostAttachment,
} from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CommunityCategory[];

type Tab = "feed" | "members" | "messages" | "connections";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
function Avatar({ member, size = 36 }: { member: CommunityMember; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: avatarColor(member),
        fontSize: size * 0.36,
      }}
    >
      {initials(member.name) || "?"}
    </span>
  );
}

function fmtSetDate(iso: string) {
  const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Page shell + top nav
// ---------------------------------------------------------------------------
export default function CommunityPage() {
  const { community } = useStore();
  const [tab, setTab] = useState<Tab>("feed");
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const unread = useMemo(
    () => community.threads.reduce((n, t) => n + t.unread, 0),
    [community.threads],
  );

  const openConversation = (memberId: string) => {
    setActiveMemberId(memberId);
    setTab("messages");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="headline text-charcoal-900">COMMUNITY</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          A room of worship leaders who get it. Post a question, share a set,
          message a leader who&apos;s been where you are.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-coral-200 bg-coral-50 px-3 py-2.5 text-xs text-charcoal-600 dark:bg-coral-100/10">
        <Icon name="sparkle" size={15} className="mt-0.5 shrink-0 text-coral-500" />
        <span>
          Preview. The other leaders and their posts are sample content while the
          community runs on this device. Anything you post, share, or send is real
          to you and will carry over when the shared network goes live.
        </span>
      </div>

      <div className="flex gap-1 rounded-lg border border-charcoal-100 bg-white p-1">
        <TabButton active={tab === "feed"} onClick={() => setTab("feed")} icon="message">
          Feed
        </TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")} icon="community">
          Members
        </TabButton>
        <TabButton
          active={tab === "messages"}
          onClick={() => setTab("messages")}
          icon="mail"
          badge={unread}
        >
          Messages
        </TabButton>
        <TabButton active={tab === "connections"} onClick={() => setTab("connections")} icon="community">
          Connections
        </TabButton>
      </div>

      {tab === "feed" && <Feed onMessage={openConversation} />}
      {tab === "members" && <Members onMessage={openConversation} />}
      {tab === "messages" && (
        <Messages
          activeMemberId={activeMemberId}
          setActiveMemberId={setActiveMemberId}
        />
      )}
      {tab === "connections" && <Saved onMessage={openConversation} setTab={setTab} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold transition ${
        active ? "bg-coral-100 text-coral-600" : "text-charcoal-500 hover:bg-cream-200"
      }`}
    >
      <Icon name={icon} size={16} />
      <span className="hidden sm:inline">{children}</span>
      {badge ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[0.6rem] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// FEED
// ---------------------------------------------------------------------------
function Feed({ onMessage }: { onMessage: (id: string) => void }) {
  const { community, addCommunityPost } = useStore();
  const [filter, setFilter] = useState<CommunityCategory | "all">("all");

  const posts = useMemo(() => {
    const sorted = [...community.posts].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
    return filter === "all" ? sorted : sorted.filter((p) => p.category === filter);
  }, [community.posts, filter]);

  const handlePost = (
    category: CommunityCategory,
    title: string,
    body: string,
    attachment?: PostAttachment,
  ) => {
    addCommunityPost({
      id: newPostId(),
      authorId: SELF_ID,
      category,
      title,
      body,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      shares: 0,
      sharedByMe: false,
      savedByMe: false,
      attachment,
      comments: [],
    });
  };

  return (
    <div className="space-y-5">
      <Composer onPost={handlePost} />

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

      {posts.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-charcoal-400">
            Nothing here yet. Be the first to start the conversation.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onMessage={onMessage} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-charcoal-800 text-white dark:bg-coral-500"
          : "bg-cream-200 text-charcoal-500 hover:bg-cream-300"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Composer (post + Share a Set / chart / link)
// ---------------------------------------------------------------------------
function Composer({
  onPost,
}: {
  onPost: (
    category: CommunityCategory,
    title: string,
    body: string,
    attachment?: PostAttachment,
  ) => void;
}) {
  const { community } = useStore();
  const self = community.members.find((m) => m.isSelf);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CommunityCategory>("ask");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<PostAttachment | undefined>();
  const [picker, setPicker] = useState<null | "set" | "chart" | "link">(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory("ask");
    setAttachment(undefined);
    setPicker(null);
    setOpen(false);
  };

  const submit = () => {
    if (!title.trim()) return;
    onPost(category, title.trim(), body.trim(), attachment);
    reset();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-charcoal-100 bg-white p-4 text-left transition hover:border-coral-300"
      >
        {self && <Avatar member={self} size={36} />}
        <span className="text-sm text-charcoal-400">
          Share a question, a win, or a set with the room…
        </span>
      </button>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <Label>Category</Label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CommunityCategory)}
          className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none focus:border-coral-400"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Title</Label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to say?"
          className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
        />
      </div>
      <div>
        <Label>Details</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add context, what you've tried, what you're hoping for…"
          className="mt-1 w-full resize-none rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
        />
      </div>

      {attachment ? (
        <div className="relative">
          <AttachmentCard attachment={attachment} />
          <button
            onClick={() => setAttachment(undefined)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-charcoal-500 shadow-sm transition hover:text-charcoal-800"
            aria-label="Remove attachment"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AttachButton icon="book" onClick={() => setPicker("set")}>
            Share a set
          </AttachButton>
          <AttachButton icon="music" onClick={() => setPicker("chart")}>
            Share a chart
          </AttachButton>
          <AttachButton icon="link" onClick={() => setPicker("link")}>
            Attach link
          </AttachButton>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-charcoal-100 pt-3">
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
        >
          Post
        </button>
      </div>

      {picker === "set" && (
        <SetPicker
          onPick={(a) => {
            setAttachment(a);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "chart" && (
        <ChartLinkForm
          kind="chart"
          onSave={(a) => {
            setAttachment(a);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "link" && (
        <ChartLinkForm
          kind="link"
          onSave={(a) => {
            setAttachment(a);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </Card>
  );
}

function AttachButton({
  icon,
  onClick,
  children,
}: {
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-charcoal-600 transition hover:border-coral-300 hover:text-coral-600"
    >
      <Icon name={icon} size={14} className="text-coral-500" />
      {children}
    </button>
  );
}

// Modal-ish overlay for picking a real set from the leader's services.
function SetPicker({
  onPick,
  onClose,
}: {
  onPick: (a: PostAttachment) => void;
  onClose: () => void;
}) {
  const { state } = useStore();
  const services = useMemo(
    () =>
      [...state.services].sort(
        (a, b) => +new Date(b.date) - +new Date(a.date),
      ),
    [state.services],
  );

  return (
    <Overlay onClose={onClose} title="Share a set">
      {services.length === 0 ? (
        <p className="text-sm text-charcoal-400">
          No services yet. Build a set under Services and it&apos;ll show here.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((svc) => {
            const snap = buildSetSnapshot(svc);
            return (
              <button
                key={svc.id}
                onClick={() => onPick({ kind: "set", set: snap })}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-charcoal-100 bg-cream-50 px-3 py-2.5 text-left transition hover:border-coral-300"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-charcoal-800">
                    {snap.serviceTitle}
                  </div>
                  <div className="text-xs text-charcoal-400">
                    {fmtSetDate(snap.date)} · {countLabel(snap.songs.length, "song")}
                    {snap.totalMin ? ` · ${snap.totalMin} min` : ""}
                  </div>
                </div>
                <Icon name="arrowRight" size={16} className="shrink-0 text-coral-500" />
              </button>
            );
          })}
        </div>
      )}
    </Overlay>
  );
}

function ChartLinkForm({
  kind,
  onSave,
  onClose,
}: {
  kind: "chart" | "link";
  onSave: (a: PostAttachment) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [url, setUrl] = useState("");
  const save = () => {
    if (!title.trim()) return;
    onSave({
      kind,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      url: kind === "link" ? url.trim() || undefined : undefined,
    });
  };
  return (
    <Overlay onClose={onClose} title={kind === "chart" ? "Share a chart" : "Attach a link"}>
      <div className="space-y-3">
        <div>
          <Label>{kind === "chart" ? "Song / chart name" : "Label"}</Label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "chart" ? "e.g. Goodness of God · numbers" : "What is it?"}
            className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
          />
        </div>
        <div>
          <Label>{kind === "chart" ? "Key / notes" : "Description"}</Label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder={kind === "chart" ? "e.g. Nashville numbers · any key" : "Optional"}
            className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
          />
        </div>
        {kind === "link" && (
          <div>
            <Label>URL</Label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
            />
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={save}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            Attach
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-charcoal-100 bg-white p-5 shadow-[var(--shadow-lg)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal-800">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-cream-200 hover:text-charcoal-800"
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attachment rendering
// ---------------------------------------------------------------------------
function AttachmentCard({ attachment }: { attachment: PostAttachment }) {
  if (attachment.kind === "set" && attachment.set) {
    const set = attachment.set;
    return (
      <div className="overflow-hidden rounded-xl border border-coral-200 bg-coral-50/60 dark:bg-coral-100/5">
        <div className="flex items-center gap-2 border-b border-coral-200/70 px-4 py-2.5">
          <Icon name="book" size={15} className="text-coral-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-coral-600">
            Shared set
          </span>
          <span className="ml-auto text-xs text-charcoal-400">
            {fmtSetDate(set.date)}
            {set.totalMin ? ` · ${set.totalMin} min` : ""}
          </span>
        </div>
        <div className="px-4 py-3">
          <div className="text-sm font-semibold text-charcoal-900">
            {set.serviceTitle}
          </div>
          <ol className="mt-2 space-y-1.5">
            {set.songs.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-4 shrink-0 text-right text-xs font-semibold text-charcoal-400">
                  {i + 1}
                </span>
                <span className="truncate font-medium text-charcoal-800">
                  {s.title}
                </span>
                {s.artist && (
                  <span className="hidden truncate text-xs text-charcoal-400 sm:inline">
                    {s.artist}
                  </span>
                )}
                {s.key && (
                  <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-charcoal-200 px-1 text-xs font-semibold text-charcoal-700">
                    {s.key}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  const icon = attachment.kind === "chart" ? "music" : "link";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-charcoal-100 bg-cream-50 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-coral-600">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-charcoal-800">
          {attachment.title}
        </div>
        {attachment.subtitle && (
          <div className="truncate text-xs text-charcoal-400">{attachment.subtitle}</div>
        )}
        {attachment.url && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs font-semibold text-coral-600 hover:underline"
          >
            {attachment.url}
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------
function PostCard({
  post,
  onMessage,
}: {
  post: CommunityPost;
  onMessage: (id: string) => void;
}) {
  const {
    community,
    addCommunityComment,
    toggleLikePost,
    toggleLikeComment,
    toggleSharePost,
    toggleSavePost,
  } = useStore();
  const author = memberById(community.members, post.authorId);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const submitComment = () => {
    if (!comment.trim()) return;
    addCommunityComment(post.id, {
      id: newCommentId(),
      authorId: SELF_ID,
      body: comment.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
    });
    setComment("");
    setShowComments(true);
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar member={author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-charcoal-800">{author.name}</span>
            {author.isSelf && (
              <span className="rounded-full bg-coral-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-coral-600">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-charcoal-400">
            {author.churchName} · {timeAgo(post.createdAt)}
          </div>
        </div>
        {!author.isSelf && (
          <button
            onClick={() => onMessage(author.id)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-charcoal-200 px-2.5 py-1 text-xs font-semibold text-charcoal-600 transition hover:border-coral-300 hover:text-coral-600"
          >
            <Icon name="mail" size={13} /> Message
          </button>
        )}
        <span className="hidden shrink-0 rounded-full bg-cream-200 px-2.5 py-0.5 text-[0.65rem] font-semibold text-charcoal-500 sm:inline">
          {CATEGORY_LABELS[post.category]}
        </span>
      </div>

      <div>
        <h3 className="text-base font-semibold text-charcoal-900">{post.title}</h3>
        {post.body && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-charcoal-600">
            {post.body}
          </p>
        )}
      </div>

      {post.attachment && <AttachmentCard attachment={post.attachment} />}

      <div className="flex items-center gap-1 border-t border-charcoal-100 pt-2.5 text-sm">
        <ActionButton
          active={post.likedByMe}
          onClick={() => toggleLikePost(post.id)}
          icon="heart"
          label={post.likes}
          name={post.likedByMe ? "Unlike post" : "Like post"}
        />
        <ActionButton
          active={showComments}
          onClick={() => setShowComments((s) => !s)}
          icon="message"
          label={post.comments.length}
          name={showComments ? "Hide comments" : "Show comments"}
        />
        <ActionButton
          active={post.sharedByMe}
          onClick={() => toggleSharePost(post.id)}
          icon="share"
          label={post.shares}
          name={post.sharedByMe ? "Unshare post" : "Share post"}
        />
        <div className="ml-auto">
          <ActionButton
            active={post.savedByMe}
            onClick={() => toggleSavePost(post.id)}
            icon="bookmark"
            label={post.savedByMe ? "Saved" : "Save"}
            name={post.savedByMe ? "Remove saved post" : "Save post"}
          />
        </div>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-charcoal-100 pt-3">
          {post.comments.map((c) => {
            const ca = memberById(community.members, c.authorId);
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar member={ca} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="rounded-xl bg-cream-100 px-3 py-2 dark:bg-cream-200">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-charcoal-800">{ca.name}</span>
                      <span className="text-charcoal-400">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-charcoal-700">
                      {c.body}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleLikeComment(post.id, c.id)}
                    aria-label={c.likedByMe ? "Unlike comment" : "Like comment"}
                    aria-pressed={c.likedByMe}
                    className={`mt-1 flex items-center gap-1 pl-1 text-xs font-semibold transition ${
                      c.likedByMe ? "text-coral-600" : "text-charcoal-400 hover:text-charcoal-700"
                    }`}
                  >
                    <Icon name="heart" size={12} /> {c.likes > 0 ? c.likes : "Like"}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex items-end gap-2">
            <textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
              }}
              rows={1}
              placeholder="Write a comment…"
              className="w-full resize-none rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
            />
            <button
              onClick={submitComment}
              className="flex shrink-0 items-center justify-center rounded-lg bg-coral-500 px-3 py-2 text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
              aria-label="Send comment"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ActionButton({
  active,
  onClick,
  icon,
  label,
  name,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: React.ReactNode;
  name: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={name}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-coral-100 text-coral-600"
          : "text-charcoal-400 hover:bg-cream-200 hover:text-charcoal-700"
      }`}
    >
      <Icon name={icon} size={16} /> {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MEMBERS directory
// ---------------------------------------------------------------------------
function Members({ onMessage }: { onMessage: (id: string) => void }) {
  const { community } = useStore();
  const [q, setQ] = useState("");

  const members = useMemo(() => {
    const others = community.members.filter((m) => !m.isSelf);
    const term = q.trim().toLowerCase();
    if (!term) return others;
    return others.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.churchName.toLowerCase().includes(term) ||
        (m.location ?? "").toLowerCase().includes(term) ||
        (m.specialties ?? []).some((s) => s.toLowerCase().includes(term)),
    );
  }, [community.members, q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, church, place, or specialty…"
          className="w-full rounded-lg border border-charcoal-200 bg-white py-2.5 pl-9 pr-3 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
        />
      </div>

      {members.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-charcoal-400">No leaders match that search.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} onMessage={onMessage} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  onMessage,
}: {
  member: CommunityMember;
  onMessage: (id: string) => void;
}) {
  const { community, toggleSaveContact } = useStore();
  const saved = community.savedContactIds.includes(member.id);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar member={member} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-charcoal-900">
            {member.name}
          </div>
          <div className="truncate text-xs text-charcoal-400">{member.role}</div>
        </div>
      </div>
      <div className="space-y-1 text-xs text-charcoal-500">
        <div className="flex items-center gap-1.5">
          <Icon name="home" size={13} className="shrink-0 text-charcoal-400" />
          <span className="truncate">{member.churchName}</span>
        </div>
        {member.location && (
          <div className="flex items-center gap-1.5">
            <Icon name="mapPin" size={13} className="shrink-0 text-charcoal-400" />
            <span className="truncate">{member.location}</span>
          </div>
        )}
      </div>
      {member.bio && (
        <p className="text-xs leading-relaxed text-charcoal-600">{member.bio}</p>
      )}
      {member.specialties && member.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.specialties.map((s) => (
            <span
              key={s}
              className="rounded-full bg-cream-200 px-2 py-0.5 text-[0.65rem] font-semibold text-charcoal-500"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex gap-2 border-t border-charcoal-100 pt-3">
        <button
          onClick={() => onMessage(member.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-3 py-2 text-xs font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
        >
          <Icon name="mail" size={14} /> Message
        </button>
        <button
          onClick={() => toggleSaveContact(member.id)}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            saved
              ? "border-coral-300 bg-coral-100 text-coral-600"
              : "border-charcoal-200 text-charcoal-600 hover:border-coral-300 hover:text-coral-600"
          }`}
        >
          <Icon name={saved ? "check" : "userPlus"} size={14} />
          {saved ? "Connected" : "Connect"}
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------
function Messages({
  activeMemberId,
  setActiveMemberId,
}: {
  activeMemberId: string | null;
  setActiveMemberId: (id: string | null) => void;
}) {
  const { community, markThreadRead } = useStore();

  const threads = useMemo(
    () =>
      [...community.threads].sort((a, b) => {
        const la = a.messages[a.messages.length - 1]?.createdAt ?? "";
        const lb = b.messages[b.messages.length - 1]?.createdAt ?? "";
        return +new Date(lb) - +new Date(la);
      }),
    [community.threads],
  );

  // Default to the first thread on desktop so the pane isn't empty.
  const effectiveActive = activeMemberId ?? threads[0]?.memberId ?? null;

  useEffect(() => {
    if (effectiveActive) markThreadRead(effectiveActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveActive]);

  if (threads.length === 0 && !activeMemberId) {
    return (
      <Card className="text-center">
        <p className="text-sm text-charcoal-400">
          No conversations yet. Open Members and message a leader to start one.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-[260px_1fr]">
      {/* Thread list — hidden on mobile when a conversation is open */}
      <div className={`${activeMemberId ? "hidden md:block" : "block"} space-y-2`}>
        {threads.map((t) => {
          const m = memberById(community.members, t.memberId);
          const last = t.messages[t.messages.length - 1];
          const isActive = effectiveActive === t.memberId;
          return (
            <button
              key={t.id}
              onClick={() => setActiveMemberId(t.memberId)}
              className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                isActive
                  ? "border-coral-300 bg-coral-50 dark:bg-coral-100/10"
                  : "border-charcoal-100 bg-white hover:border-coral-200"
              }`}
            >
              <Avatar member={m} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-charcoal-800">
                    {m.name}
                  </span>
                  {last && (
                    <span className="ml-auto shrink-0 text-[0.65rem] text-charcoal-400">
                      {timeAgo(last.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs text-charcoal-400">
                    {last
                      ? (last.fromId === SELF_ID ? "You: " : "") + last.body
                      : "No messages yet"}
                  </span>
                  {t.unread > 0 && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-coral-500" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conversation */}
      <div className={`${activeMemberId ? "block" : "hidden md:block"}`}>
        {effectiveActive ? (
          <Conversation
            memberId={effectiveActive}
            onBack={() => setActiveMemberId(null)}
          />
        ) : (
          <Card className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-charcoal-400">
              Pick a conversation to read it.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Conversation({
  memberId,
  onBack,
}: {
  memberId: string;
  onBack: () => void;
}) {
  const { community, sendDirectMessage } = useStore();
  const member = memberById(community.members, memberId);
  const thread = community.threads.find((t) => t.memberId === memberId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  const send = () => {
    if (!text.trim()) return;
    sendDirectMessage(memberId, text.trim());
    setText("");
  };

  return (
    <Card className="flex h-[28rem] flex-col gap-0 p-0">
      <div className="flex items-center gap-2.5 border-b border-charcoal-100 p-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-cream-200 md:hidden"
          aria-label="Back"
        >
          <Icon name="chevronDown" size={18} className="rotate-90" />
        </button>
        <Avatar member={member} size={36} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-charcoal-800">
            {member.name}
          </div>
          <div className="truncate text-xs text-charcoal-400">
            {member.churchName}
            {member.location ? ` · ${member.location}` : ""}
          </div>
        </div>
      </div>

      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-3">
        {thread && thread.messages.length > 0 ? (
          thread.messages.map((m) => {
            const mine = m.fromId === SELF_ID;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-sm bg-coral-500 text-white"
                      : "rounded-bl-sm bg-cream-200 text-charcoal-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <div
                    className={`mt-0.5 text-[0.6rem] ${
                      mine ? "text-white/70" : "text-charcoal-400"
                    }`}
                  >
                    {timeAgo(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-charcoal-400">
            Say hello. Start the conversation.
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-charcoal-100 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={`Message ${member.name.split(" ")[0]}…`}
          className="max-h-28 w-full resize-none rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
        />
        <button
          onClick={send}
          className="flex shrink-0 items-center justify-center rounded-lg bg-coral-500 px-3 py-2 text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          aria-label="Send"
        >
          <Icon name="send" size={16} />
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SAVED
// ---------------------------------------------------------------------------
function Saved({
  onMessage,
  setTab,
}: {
  onMessage: (id: string) => void;
  setTab: (t: Tab) => void;
}) {
  const { community } = useStore();
  const savedPosts = community.posts.filter((p) => p.savedByMe);
  const contacts = community.members.filter((m) =>
    community.savedContactIds.includes(m.id),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="userPlus" size={16} className="text-coral-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal-800">
            My Connections
          </h2>
        </div>
        {contacts.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-charcoal-400">
              No connections yet.{" "}
              <button
                onClick={() => setTab("members")}
                className="font-semibold text-coral-600 hover:underline"
              >
                Browse members
              </button>{" "}
              and connect with the leaders you want to stay close to.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map((m) => (
              <MemberCard key={m.id} member={m} onMessage={onMessage} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="bookmark" size={16} className="text-coral-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal-800">
            Saved posts
          </h2>
        </div>
        {savedPosts.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-charcoal-400">
              Nothing saved yet. Tap the bookmark on any post to keep it here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {savedPosts.map((p) => (
              <PostCard key={p.id} post={p} onMessage={onMessage} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
