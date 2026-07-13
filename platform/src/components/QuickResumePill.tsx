"use client";

// ============================================================
// QuickResumePill — get back into the 15-minute plan.
//
// The quick-plan flow stamps a sessionStorage marker (`wtw_quick_start_<id>`)
// while a session is running and clears it when the plan is finished (which
// also sets planSeconds). So a session is "in progress" when the marker is
// present AND planSeconds isn't set. When that's true and the leader has
// stepped away from /quick to do something (pick songs, assign a name), this
// floating pill offers a one-tap way back — and keeps the running time
// visible, reinforcing "how long did this take."
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function QuickResumePill() {
  const pathname = usePathname();
  const { activeService } = useStore();
  const [elapsed, setElapsed] = useState<number | null>(null);

  const svcId = activeService?.id;
  const planned = Boolean(activeService?.planSeconds && activeService.planSeconds > 0);
  const timerKey = svcId ? `wtw_quick_start_${svcId}` : null;

  useEffect(() => {
    // Not applicable: no service, plan already done, or we're on the flow.
    if (!timerKey || planned || pathname === "/quick") {
      setElapsed(null);
      return;
    }
    const read = () => {
      const start = Number(sessionStorage.getItem(timerKey));
      if (!start) {
        setElapsed(null);
        return;
      }
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, [timerKey, planned, pathname]);

  if (elapsed === null) return null;

  return (
    // A floating action chip — committed dark in BOTH themes (raw hex, like a
    // toast), since theme tokens would flip it light-on-light in dark mode.
    <Link
      href="/quick"
      className="no-print anim-fade-in fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-max max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-full bg-[#2e2e2e] py-2.5 pl-4 pr-3 text-sm font-bold text-[#ffffff] shadow-lg transition-transform hover:scale-[1.02] lg:bottom-6"
      aria-label="Back to the 15-minute plan"
    >
      <Icon name="sparkle" size={15} className="text-[#ff8c82]" />
      Back to the 15-minute plan
      <span className="rounded-full bg-[rgba(255,255,255,0.15)] px-2 py-0.5 tabular-nums text-[#ffb3ac]">
        {fmtClock(elapsed)}
      </span>
    </Link>
  );
}
