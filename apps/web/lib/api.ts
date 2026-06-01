const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---- token storage (localStorage) ----
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export function setToken(t: string) {
  localStorage.setItem("token", t);
}
export function clearToken() {
  localStorage.removeItem("token");
}

// ---- single fetch chokepoint: attaches Bearer, throws on non-2xx ----
export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    // token missing/expired -> bounce to login
    if (typeof window !== "undefined") {
      clearToken();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : `Request failed: ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

// ---- shared types (mirror the FastAPI responses) ----
export type Agency = { id: string; name: string; email: string; plan: string };

export type Client = {
  id: string;
  name: string;
  domain: string | null;
  contact_emails: string[];
  slack_channel_ids: string[];
  jira_project_keys: string[];
  drive_folder_ids: string[];
  created_at: string;
};

export type DashboardClient = {
  id: string;
  name: string;
  domain: string | null;
  summary: string | null;
  last_activity_at: string | null;
  attention_score: number;
  alert_count: number;
};

export type Dashboard = {
  clients: DashboardClient[];
  total_alerts: number;
};

export type Alert = {
  id: string;
  client_id: string;
  client_name: string;
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SummaryResponse = {
  summary: string | null;
  generated_at: string | null;
  chunk_count: number;
  is_stale: boolean;
  refreshing: boolean;
};

export type AskSource = {
  source: "slack" | "gmail" | "jira" | "drive";
  content_preview: string;
  source_timestamp: string;
  metadata: Record<string, unknown>;
};

export type AskResponse = {
  answer: string;
  sources: AskSource[];
};

export type Integration = {
  provider: string;
  workspace_name: string | null;
  connected_at: string;
  scopes: string[];
};
