"use client";

import { useTheme, type ThemePref } from "@/lib/theme";
import { Icon } from "./Icon";

const OPTIONS: { value: ThemePref; icon: string; label: string }[] = [
  { value: "light", icon: "sun", label: "Light" },
  { value: "dark", icon: "moon", label: "Dark" },
  { value: "system", icon: "monitor", label: "System" },
];

// A compact three-way segmented control: Light / Dark / System.
export function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { theme, setTheme } = useTheme();
  const pad = size === "sm" ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <div className="inline-flex rounded-lg border border-charcoal-100 bg-cream-100 p-0.5">
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={`flex items-center gap-1.5 rounded-md text-xs font-semibold transition ${pad} ${
              active
                ? "bg-white text-charcoal-800 shadow-[var(--shadow-sm)]"
                : "text-charcoal-400 hover:text-charcoal-700"
            }`}
          >
            <Icon name={opt.icon} size={14} />
            {size === "md" && opt.label}
          </button>
        );
      })}
    </div>
  );
}
