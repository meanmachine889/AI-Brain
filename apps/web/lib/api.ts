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

  if (res.status === 401) {
    // token missing/expired/revoked -> bounce to login
    if (typeof window !== "undefined") {
      clearToken();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  // 403 = authenticated but not allowed (role). Surface it; do NOT log out.

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : `Request failed: ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

// ---- log out: revoke the session server-side, then drop the local token ----
export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    // even if the call fails, clear locally
  }
  clearToken();
}

// ---- shared types (mirror the FastAPI responses) ----
export type Agency = { id: string; name: string; plan: string };

export type Role = "admin" | "viewer";

export type Membership = {
  client_id: string;
  client_name: string;
  role: Role;
};

// GET /auth/me  (and the principal returned by /auth/google + onboarding)
export type Principal = {
  id: string;
  email: string;
  name: string;
  tag: string | null;
  is_owner: boolean;
  agency: Agency;
  memberships: Membership[];
};

// POST /auth/google response (union)
export type InvitePreview = {
  agency_name: string;
  client_name: string;
  role: Role;
  tag: string | null;
};

export type GoogleAuthResponse =
  | { status: "ok"; token: string; principal: Principal }
  | {
      status: "needs_onboarding";
      identity: { email: string; name: string };
      onboarding_token: string;
      invites: InvitePreview[];
    };

// per-client member (GET /clients/{id}/members)
export type ClientMemberRow = {
  member_id: string;
  name: string;
  email: string;
  tag: string | null;
  role: Role;
};

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
