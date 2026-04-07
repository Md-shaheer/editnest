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
      dateStyle: "medium",
      timeStyle: "short",
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
  };

  const topActions = useMemo(() => summary?.action_counts?.slice(0, 6) || [], [summary]);
  const recentUsers = useMemo(() => summary?.recent_users || [], [summary]);

  return (
    <section className="w-full max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#f5c800" }}>
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
              background: "#f5c800",
              color: "#0a0a0b",
            }}
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Events" value={totals.events} hint="All tracked actions" />
        <StatCard label="Visitors" value={totals.visitors} hint="Unique browser sessions" />
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
                            background: "rgba(245, 200, 0, 0.14)",
                            color: "#f5c800",
                            border: "1px solid rgba(245, 200, 0, 0.2)",
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
                    <span style={{ color: "#f5c800", fontWeight: 600 }}>{item.count}</span>
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
              Recent Users
            </h3>

            <div className="space-y-4">
              {recentUsers.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No signed-in users yet.</p>
              ) : (
                recentUsers.map((item) => (
                  <div key={`${item.email}-${item.last_seen}`} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-sm font-medium break-all" style={{ color: "var(--text-primary)" }}>
                      {item.email}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {item.event_count} events
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      Last seen: {formatDateTime(item.last_seen)}
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
