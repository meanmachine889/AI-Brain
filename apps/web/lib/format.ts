export function relativeTime(iso: string | null): string {
  if (!iso) return "no activity";
  // The API sends naive UTC timestamps (no 'Z'); browsers parse those as LOCAL
  // time, skewing "x ago" by the viewer's offset. Treat tz-less strings as UTC.
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const then = new Date(hasTz ? iso : `${iso}Z`).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// attention score -> color treatment for the score chip
export function scoreColor(score: number): string {
  if (score >= 60) return "bg-red-100 text-red-700 border-red-200";
  if (score >= 30) return "bg-stone-100 text-stone-700 border-stone-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

export function severityVariant(
  severity: string
): "destructive" | "secondary" | "outline" {
  if (severity === "high") return "destructive";
  if (severity === "medium") return "secondary";
  return "outline";
}

const SOURCE_LABEL: Record<string, string> = {
  slack: "Slack",
  gmail: "Gmail",
  jira: "Jira",
  drive: "Drive",
};
export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}
