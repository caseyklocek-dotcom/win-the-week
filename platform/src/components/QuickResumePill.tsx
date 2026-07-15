"use client";

// ============================================================
// QuickResumePill — get back into the 15-minute plan.
//
// A quick-plan sitting is "in progress" whenever lib/quickTimer has an
// active session for the current service and it isn't finished yet
// (planSeconds unset). When that's true and the leader has stepped away
// from /quick — to pick songs, assign a name — this floating pill offers a
// one-tap way back, the running time, and controls for real interruptions:
// pause (stop the clock without losing the sitting) and exit (abandon
// tracking for this sitting; nothing already entered is lost).
//
// Structural note: the outer shell is a plain div, not a Link/button — a
// <button> can never nest inside an <a>, so the "go to /quick" area and the
// pause/exit controls are SIBLINGS, not parent/child.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import * as quickTimer from "@/lib/quickTimer";
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
  const [running, setRunning] = useState(true);

  const svcId = activeService?.id;
  const planned = Boolean(activeService?.planSeconds && activeService.planSeconds > 0);
  const applicable = Boolean(svcId) && !planned && pathname !== "/quick";

  useEffect(() => {
    if (!svcId || !applicable) {
      setElapsed(null);
      return;
    }
    const read = () => {
      if (!quickTimer.isActive(svcId)) {
        setElapsed(null);
        return;
      }
      setElapsed(quickTimer.elapsedSec(svcId));
      setRunning(quickTimer.isRunning(svcId));
    };
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, [svcId, applicable]);

  if (elapsed === null || !svcId) return null;

  const togglePause = () => {
    if (running) quickTimer.pause(svcId);
    else quickTimer.resume(svcId);
    setRunning(quickTimer.isRunning(svcId));
    setElapsed(quickTimer.elapsedSec(svcId));
  };

  const handleExit = () => {
    quickTimer.exit(svcId);
    setElapsed(null);
  };

  return (
    // A floating action chip — committed dark in BOTH themes (raw hex, like a
    // toast), since theme tokens would flip it light-on-light in dark mode.
    <div
      className="no-print anim-fade-in fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-40 flex w-max max-w-[calc(100%-2rem)] items-center gap-1 rounded-full bg-[#2e2e2e] py-1.5 pl-1.5 pr-1.5 text-sm font-bold text-[#ffffff] shadow-lg lg:bottom-6 lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
    >
      <Link
        href="/quick"
        aria-label="Back to the 15-minute plan"
        className="flex items-center gap-2.5 rounded-full py-1 pl-2.5 pr-1 transition-transform hover:scale-[1.01]"
      >
        <Icon
          name="sparkle"
          size={15}
          className={running ? "text-[#ff8c82]" : "text-[#8d877e]"}
        />
        <span className="hidden whitespace-nowrap sm:inline">{running ? "Back to the 15-minute plan" : "Plan paused"}</span>
        <span
          className={`rounded-full px-2 py-0.5 tabular-nums ${
            running
              ? "bg-[rgba(255,255,255,0.15)] text-[#ffb3ac]"
              : "bg-[rgba(255,255,255,0.1)] text-[#8d877e]"
          }`}
        >
          {fmtClock(elapsed)}
        </span>
      </Link>

      {/* Real controls for a real interruption — stop the clock, or drop the
          sitting entirely. Siblings of the Link above, never nested in it. */}
      <button
        onClick={togglePause}
        title={running ? "Pause" : "Resume"}
        aria-label={running ? "Pause the timer" : "Resume the timer"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b0aca6] transition hover:bg-[rgba(255,255,255,0.12)] hover:text-[#ffffff]"
      >
        <Icon name={running ? "pause" : "play"} size={13} />
      </button>
      <button
        onClick={handleExit}
        title="Exit — stop tracking this sitting"
        aria-label="Exit the 15-minute plan"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8d877e] transition hover:bg-[rgba(255,255,255,0.12)] hover:text-[#ffffff]"
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}
