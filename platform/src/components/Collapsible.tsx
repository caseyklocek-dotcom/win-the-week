"use client";

import { useState } from "react";
import { Card } from "./ui";
import { Icon } from "./Icon";

// A Card whose body folds away. Header is any node (left), with an optional
// `right` slot that stays visible when collapsed (e.g. a status pill), plus a
// chevron. Used to tame the long, line-after-line Growth detail pages.
export function Collapsible({
  header,
  right,
  defaultOpen = false,
  children,
  className = "",
}: {
  header: React.ReactNode;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">{header}</div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <Icon
            name={open ? "chevronUp" : "chevronDown"}
            size={16}
            className="text-charcoal-400"
          />
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </Card>
  );
}
