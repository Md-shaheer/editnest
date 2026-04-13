import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL } from "../api";

function StatCard({ label, value, hint }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(24, 24, 26, 0.88)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDetails(details) {
  if (!details) return "-";
  const text = JSON.stringify(details);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function ActivityDashboard({ user, onClose, onError }) {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const headers = {
        Authorization: `Bearer ${user.token}`,
      };

      const [summaryResponse, eventsResponse] = await Promise.all([
        fetch(`${API_URL}/analytics/summary`, { headers }),
        fetch(`${API_URL}/analytics/events?limit=100`, { headers }),
      ]);

      if (!summaryResponse.ok || !eventsResponse.ok) {
        const failedResponse = !summaryResponse.ok ? summaryResponse : eventsResponse;
        const errorPayload = await failedResponse.json().catch(() => ({}));
        throw new Error(errorPayload.detail || "Unable to load activity data");
      }

      const summaryPayload = await summaryResponse.json();
      const eventsPayload = await eventsResponse.json();
      setSummary(summaryPayload);
      setEvents(eventsPayload.events || []);
    } catch (error) {
      onError?.(error.message || "Activity data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [onError, user.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = summary?.totals || {
    events: 0,
    visitors: 0,
    logged_in_users: 0,
    uploads: 0,
    active_sessions: 0,
    avg_session_seconds: 0,
  };

  const topActions = useMemo(() => summary?.action_counts?.slice(0, 6) || [], [summary]);
  const recentSessions = useMemo(() => summary?.recent_sessions || [], [summary]);

  return (
    <section className="w-full max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#3b82f6" }}>
            Admin View
          </p>
          <h2
            className="mt-2 text-4xl md:text-5xl"
            style={{ color: "var(--text-primary)", fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Activity Dashboard
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Website-il aar vannu, login cheythu, upload cheythu ennokke ivide kaanam.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: "#3b82f6",
              color: "#ffffff",
              boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)",
            }}
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Events" value={totals.events} hint="All tracked actions" />
        <StatCard label="Visitors" value={totals.visitors} hint="Unique browser sessions" />
        <StatCard label="Active Now" value={totals.active_sessions} hint="Sessions still active" />
        <StatCard label="Avg Stay" value={formatDuration(totals.avg_session_seconds)} hint="Average session duration" />
        <StatCard label="Logged-in Users" value={totals.logged_in_users} hint="Users with email" />
        <StatCard label="Uploads" value={totals.uploads} hint="Completed background removals" />
      </div>

      <div className="grid gap-6 mt-8 xl:grid-cols-[1.1fr,0.9fr]">
        <div
          className="rounded-3xl p-6"
          style={{
            background: "rgba(20, 20, 22, 0.88)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent Activity
            </h3>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Latest 100 events
            </span>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="py-3 pr-4 text-left font-medium" style={{ color: "var(--text-muted)" }}>Time</th>
                  <th className="py-3 pr-4 text-left font-medium" style={{ color: "var(--text-muted)" }}>User</th>
                  <th className="py-3 pr-4 text-left font-medium" style={{ color: "var(--text-muted)" }}>Action</th>
                  <th className="py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center" style={{ color: "var(--text-secondary)" }}>
                      Loading activity...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center" style={{ color: "var(--text-secondary)" }}>
                      No activity yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="py-3 pr-4 align-top" style={{ color: "var(--text-secondary)" }}>
                        {formatDateTime(event.created_at)}
                      </td>
                      <td className="py-3 pr-4 align-top" style={{ color: "var(--text-primary)" }}>
                        {event.email || event.session_id || "Anonymous"}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            background: "rgba(59, 130, 246, 0.14)",
                            color: "#3b82f6",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                          }}
                        >
                          {event.event}
                        </span>
                      </td>
                      <td className="py-3 align-top break-all" style={{ color: "var(--text-secondary)" }}>
                        {formatDetails(event.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div
            className="rounded-3xl p-6"
            style={{
              background: "rgba(20, 20, 22, 0.88)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Top Actions
            </h3>

            <div className="space-y-3">
              {topActions.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No actions tracked yet.</p>
              ) : (
                topActions.map((item) => (
                  <div key={item.event} className="flex items-center justify-between gap-4">
                    <span style={{ color: "var(--text-secondary)" }}>{item.event}</span>
                    <span style={{ color: "#3b82f6", fontWeight: 600 }}>{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            className="rounded-3xl p-6"
            style={{
              background: "rgba(20, 20, 22, 0.88)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Recent Sessions
            </h3>

            <div className="space-y-4">
              {recentSessions.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No session data yet.</p>
              ) : (
                recentSessions.map((item) => (
                  <div key={`${item.session_id}-${item.last_seen_at}`} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium break-all" style={{ color: "var(--text-primary)" }}>
                        {item.email || item.session_id}
                      </p>
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: item.is_active ? "rgba(52, 211, 153, 0.14)" : "rgba(148, 163, 184, 0.12)",
                          color: item.is_active ? "#34d399" : "#cbd5e1",
                          border: item.is_active ? "1px solid rgba(52, 211, 153, 0.2)" : "1px solid rgba(148, 163, 184, 0.18)",
                        }}
                      >
                        {item.is_active ? "Active" : "Closed"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      Page: {item.current_page || item.exit_page || item.landing_page || "-"}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      Stay time: {formatDuration(item.duration_seconds)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {item.total_events} events, {item.total_page_views} page views, {item.total_uploads} uploads
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      Last seen: {formatDateTime(item.last_seen_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
