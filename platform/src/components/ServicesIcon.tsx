// The Services nav icon. At rest it is the Win the Week logo mark (the two
// coral triangles). When the section becomes active — or on hover — the
// triangles split apart and a planning/checklist clipboard opens in their
// place. All motion is percentage/scale based so it stays crisp at any size.
// Animation states live in globals.css under `.services-icon`.
export function ServicesIcon({
  open,
  size = 18,
}: {
  open: boolean;
  size?: number;
}) {
  return (
    <span
      className="services-icon relative inline-block shrink-0"
      data-open={open ? "true" : undefined}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Top-right triangle of the logo */}
      <svg
        className="si-tri si-tri-top absolute inset-0 block h-full w-full"
        viewBox="248 347 1004 895"
        fill="currentColor"
      >
        <path
          d="M 644.914062 916.925781 L 1004.710938 347.28125 L 1.230469 718.039062 Z"
          transform="translate(247,0)"
        />
      </svg>

      {/* Bottom-left triangle of the logo */}
      <svg
        className="si-tri si-tri-bottom absolute inset-0 block h-full w-full"
        viewBox="248 347 1004 895"
        fill="currentColor"
      >
        <path
          d="M 641.828125 676.425781 L 1.046875 879.589844 L 1004.945312 1242.070312 Z"
          transform="translate(247,0)"
        />
      </svg>

      {/* The planning clipboard hidden underneath */}
      <svg
        className="si-plan absolute inset-0 block h-full w-full"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="3.5" rx="1" />
        <path d="M8.5 12.5l2 2 4-4" />
      </svg>
    </span>
  );
}
