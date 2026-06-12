"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Multi-value field: existing values render as removable rows; a draft input +
// a circular "+" adds more (Enter also adds). Replaces comma-joined text fields.
export function MultiInput({
  values,
  onChange,
  placeholder,
  mono,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="space-y-1">
          {values.map((v) => (
            <div
              key={v}
              className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5"
            >
              <span className={cn("truncate text-[13px]", mono && "mono")}>{v}</span>
              <button
                type="button"
                onClick={() => remove(v)}
                aria-label={`Remove ${v}`}
                className="ml-2 grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "h-9 flex-1 rounded-lg border border-input bg-transparent px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
            mono && "mono",
          )}
        />
        <button
          type="button"
          onClick={add}
          aria-label="Add"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:bg-input/30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
