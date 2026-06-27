import { cn } from "@/lib/utils";

// Page-level frame: thin vertical hairlines at the content's max-width edges and
// a horizontal divider on top, so every section reads as part of one gridded
// layout (Aside-style). Wrap each section's content in this.
export function SectionFrame({
  className,
  innerClassName,
  divider = true,
  children,
}: {
  className?: string;
  innerClassName?: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative", divider && "border-t border-border", className)}>
      {/* Centered frame: max-width box with vertical side rules */}
      <div className="relative mx-auto max-w-6xl border-x border-border">
        <div className={cn("px-6", innerClassName)}>{children}</div>
      </div>
    </div>
  );
}
