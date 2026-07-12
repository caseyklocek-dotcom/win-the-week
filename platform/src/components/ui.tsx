import React from "react";

export function Card({
  children,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-charcoal-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="label text-charcoal-400">{children}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  done: "bg-ok-tint text-ok-ink",
  doing: "bg-coral-100 text-coral-600",
  todo: "bg-cream-200 text-charcoal-400",
  ok: "bg-ok-tint text-ok-ink",
  wait: "bg-wait-tint text-wait-ink",
  no: "bg-no-tint text-no-ink",
};
const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  doing: "In progress",
  todo: "Not started",
  ok: "Confirmed",
  wait: "Awaiting",
  no: "Open",
};

export function Pill({ status, text }: { status: string; text?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-cream-200 text-charcoal-400"
      }`}
    >
      {text ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ProgressBar({
  pct,
  tone = "coral",
}: {
  pct: number;
  tone?: "coral" | "teal";
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
      <div
        className={`h-full rounded-full ${tone === "teal" ? "bg-teal-500" : "bg-coral-500"}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function KeyBadge({ k }: { k: string }) {
  return (
    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-charcoal-200 px-2 text-sm font-semibold text-charcoal-800">
      {k}
    </span>
  );
}
