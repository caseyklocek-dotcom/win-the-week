import Link from "next/link";

// Shared frame for the public legal pages (/terms, /privacy).
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/welcome" className="inline-flex items-center gap-2.5">
          <svg viewBox="248 347 1004 895" className="h-8 w-8 text-coral-500" fill="currentColor" aria-hidden="true">
            <g transform="translate(247,0)">
              <path d="M 641.828125 676.425781 L 1.046875 879.589844 L 1004.945312 1242.070312 Z" />
              <path d="M 644.914062 916.925781 L 1004.710938 347.28125 L 1.230469 718.039062 Z" />
            </g>
          </svg>
          <span className="headline text-lg leading-none text-charcoal-900">
            Win the<br />Week
          </span>
        </Link>
        <div className="mt-8 rounded-2xl border border-charcoal-100 bg-white p-8 shadow-[var(--shadow-md)]">
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-charcoal-400">
          Questions? Email caseyklocek@gmail.com
        </p>
      </div>
    </div>
  );
}
