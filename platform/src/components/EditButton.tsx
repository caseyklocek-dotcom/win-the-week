import Link from "next/link";
import { Icon } from "@/components/Icon";

/**
 * Fun, satisfying "Edit" control. A coral pill that lifts and fills on
 * hover, with the pencil giving a little wiggle, and presses down with a
 * springy scale on click. Renders as a Link by default, or a <button>
 * when an onClick is passed instead of an href.
 */
export function EditButton({
  href,
  onClick,
  label = "Edit",
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const classes =
    "group/edit inline-flex items-center gap-1.5 rounded-lg bg-coral-100 px-3 py-1.5 " +
    "text-sm font-semibold text-coral-600 transition-all duration-200 ease-out " +
    "hover:-translate-y-0.5 hover:bg-coral-500 hover:text-white hover:shadow-coral " +
    "active:translate-y-0 active:scale-95 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 " +
    className;

  const inner = (
    <>
      <Icon
        name="pencil"
        size={14}
        className="origin-bottom-left transition-transform duration-200 ease-out group-hover/edit:-rotate-12"
      />
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}
