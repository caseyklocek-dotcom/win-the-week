"use client";

import { useEffect, useRef, useState } from "react";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// A text/textarea field that commits to the store on blur (and shows a saved tick briefly).
export function EditableText({
  value,
  onCommit,
  multiline = false,
  phone = false,
  placeholder,
  className = "",
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  phone?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(phone ? formatPhone(value) : value);
  const ref = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  // Resize on mount so pre-filled content displays at the right height.
  useEffect(() => { autoResize(); }, []);

  useEffect(() => {
    const formatted = phone ? formatPhone(value) : value;
    setDraft(formatted);
    ref.current = value;
    setTimeout(autoResize, 0);
  }, [value, phone]);

  const commit = () => {
    if (draft !== ref.current) {
      ref.current = draft;
      onCommit(draft);
    }
  };

  const handleChange = (raw: string) => {
    setDraft(phone ? formatPhone(raw) : raw);
  };

  const base =
    "w-full rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2 text-sm text-charcoal-800 outline-none transition focus:border-coral-400 focus:bg-white";

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => { handleChange(e.target.value); autoResize(); }}
        onBlur={commit}
        rows={1}
        className={`${base} resize-none overflow-hidden ${className}`}
      />
    );
  }
  return (
    <input
      value={draft}
      placeholder={placeholder}
      type={phone ? "tel" : "text"}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={commit}
      className={`${base} ${className}`}
    />
  );
}

// Segmented control for a small set of options.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-cream-200 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            value === o.value
              ? "bg-coral-500 text-white shadow-sm"
              : "text-charcoal-500 hover:text-charcoal-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
