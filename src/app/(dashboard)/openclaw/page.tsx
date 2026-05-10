"use client";
import { useState, useEffect, useCallback } from "react";

type CronJob = {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  timezone: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  enabled: boolean;
  agentId: string;
  agent: { name: string };
};
type RecurringTask = {
  id: string;
  name: string;
  logFile: string;
  reminderTime: string;
  notes: string | null;
  logs: { date: string; status: string; note: string | null }[];
};

const STATUS_COLORS: Record<string, string> = {
  done: "#22c55e",
  missed: "#ef4444",
  snoozed: "#f59e0b",
};

function formatNextRun(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 0) return "overdue";
  if (diffH < 24) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function OpenClawSyncPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cron" | "recurring">("cron");

  const fetchData = useCallback(async () => {
    const [cronRes, taskRes, agentRes, syncRes] = await Promise.all([
      fetch("/api/openclaw/cron").then(r => r.ok ? r.json() : []),
      fetch("/api/openclaw/recurring-tasks").then(r => r.ok ? r.json() : []),
      fetch("/api/openclaw/agents").then(r => r.ok ? r.json() : []),
      fetch("/api/openclaw/sync").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    setCronJobs(cronRes);
    setRecurringTasks(taskRes);
    setAgents(agentRes);
    if (syncRes?.success) {
      setLastSync(new Date().toLocaleTimeString());
      setSyncResult(syncRes.synced?.slice(-5).join(", ") || "synced");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    await fetch("/api/openclaw/sync");
    await fetchData();
    setSyncing(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>OpenClaw Sync</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            {lastSync ? `Last synced at ${lastSync}` : "Not synced yet"} · OpenClaw is the source of truth
          </p>
        </div>
        <button onClick={triggerSync} disabled={syncing} style={{ padding: "8px 16px", background: "var(--accent)", borderRadius: 8, fontWeight: 500, fontSize: 13, opacity: syncing ? 0.6 : 1 }}>
          {syncing ? "Syncing..." : "⟳ Sync Now"}
        </button>
      </div>

      {/* Status bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Agents", value: agents.length, color: "#6366f1" },
          { label: "Cron Jobs", value: cronJobs.length, color: "#f59e0b" },
          { label: "Recurring Tasks", value: recurringTasks.length, color: "#22c55e" },
          { label: "Health Logs", value: "7d", color: "#8b5cf6" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {(["cron", "recurring"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "8px 16px", background: "transparent", borderRadius: "8px 8px 0 0", fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "var(--text)" : "var(--text-muted)", borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1 }}>
            {tab === "cron" ? "Cron Jobs" : "Recurring Tasks"}
          </button>
        ))}
      </div>

      {activeTab === "cron" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cronJobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No cron jobs found. Sync to import from OpenClaw.</div>
          ) : cronJobs.map(job => (
            <div key={job.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: job.enabled ? "#22c55e" : "#71717a", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{job.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {job.schedule} · Agent: {job.agent?.name || job.agentId}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{formatNextRun(job.nextRunAt)}</div>
                {job.lastRunAt && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Last: {new Date(job.lastRunAt).toLocaleString()}</div>}
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: job.enabled ? "#22c55e20" : "#71717a20", color: job.enabled ? "#22c55e" : "#71717a" }}>
                {job.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "recurring" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recurringTasks.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No recurring tasks. Add them to todo-registry.md in OpenClaw workspace.</div>
          ) : recurringTasks.map(task => {
            const todayDone = task.logs.some(l => l.date === new Date().toISOString().slice(0, 10) && l.status === "done");
            const todayStatus = task.logs.find(l => l.date === new Date().toISOString().slice(0, 10));
            return (
              <div key={task.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: todayDone ? "#22c55e" : "#71717a" }} />
                  <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{task.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>⏰ {task.reminderTime}</span>
                  {todayStatus && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: `${STATUS_COLORS[todayStatus.status]}20`, color: STATUS_COLORS[todayStatus.status] }}>
                      {todayStatus.status}
                    </span>
                  )}
                </div>
                {task.notes && <p style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 24 }}>{task.notes}</p>}
                <div style={{ display: "flex", gap: 4, marginTop: 8, marginLeft: 24 }}>
                  {task.logs.slice(-7).map(log => (
                    <div key={log.date} title={`${log.date}: ${log.status}`}
                      style={{ width: 28, height: 28, borderRadius: 6, background: `${STATUS_COLORS[log.status] || "#71717a"}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: STATUS_COLORS[log.status] || "#71717a" }}>
                      {log.date.slice(-2)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}