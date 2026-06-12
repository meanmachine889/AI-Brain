import type { ReactNode } from "react";

// Shared page chrome — one title scale everywhere so the app reads as a
// single tool rather than a collection of screens.
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-lg font-[590] tracking-[-0.012em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </header>
  );
}
