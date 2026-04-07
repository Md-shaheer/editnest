import { API_URL } from "./api";

const SESSION_KEY = "editnest_session_id";

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId() {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existingSessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = createSessionId();
  window.sessionStorage.setItem(SESSION_KEY, nextSessionId);
  return nextSessionId;
}

export async function trackClientEvent(event, token = null, options = {}) {
  if (!event) return;

  try {
    await fetch(`${API_URL}/analytics/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getSessionId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event,
        page: options.page || null,
        session_id: getSessionId(),
        details: options.details || null,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics should never block the main user flow.
  }
}
