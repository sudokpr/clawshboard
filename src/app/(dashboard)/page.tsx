"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Agent = { agentId: string; name: string; workspace: string; model?: string; isDefault: boolean };
type CronJob = { id: string; name: string; schedule: string; nextRunAt: string | null; enabled: boolean; agentId: string };
type RecurringTask = { id: string; name: string; reminderTime: string; logs: { date: string; status: string }[] };
type HealthEntry = { timestamp: string; value: string; note?: string };
type JournalEntry = { date: string; summary?: string };

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{title}</h3>
      {href && <Link href={href} style={{ fontSize: 12, color: "var(--accent)" }}>View all →</Link>}
    </div>
  );
}

function timeUntil(ts: string | null) {
  if (!ts) return "—";
  const diff = new Date(ts).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [bottle, setBottle] = useState<HealthEntry[]>([]);
  const [sleep, setSleep] = useState<HealthEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      let agentsData: Agent[] = [];
      let bottleData: HealthEntry[] = [];
      let sleepData: HealthEntry[] = [];
      let journalData: JournalEntry[] = [];

      try {
        const healthData = await fetch("/api/openclaw/health").then(r => r.json().catch(() => null));
        if (healthData) {
          if (Array.isArray(healthData)) agentsData = healthData as Agent[];
          else if (healthData.agents) agentsData = healthData.agents;
          if (healthData.bottle) bottleData = healthData.bottle;
          if (healthData.sleep) sleepData = healthData.sleep;
          if (healthData.journal) journalData = Array.isArray(healthData.journal) ? healthData.journal : [];
        }
      } catch {}

      const [cronData, recurringData] = await Promise.all([
        fetch("/api/openclaw/cron").then(r => r.json().catch(() => [])),
        fetch("/api/openclaw/recurring-tasks").then(r => r.json().catch(() => [])),
      ]);

      setAgents(agentsData);
      setBottle(bottleData);
      setSleep(sleepData);
      setCronJobs(Array.isArray(cronData) ? cronData : []);
      setRecurring(Array.isArray(recurringData) ? recurringData : []);
      setJournal(journalData);
      setLastSync(new Date().toLocaleTimeString());
    }

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayBottle = bottle.filter(e => e.timestamp.startsWith(today));
  const todayRecurring = recurring.map(t => ({
    ...t,
    todayStatus: t.logs.find(l => l.date === today)?.status,
  }));
  const activeCrons = cronJobs.filter(c => c.enabled);
  const nextCron = [...activeCrons].sort((a, b) => (a.nextRunAt || "").localeCompare(b.nextRunAt || ""))[0];
  const doneToday = todayRecurring.filter(t => t.todayStatus === "done").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Mission Control</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            {lastSync ? `Live from OpenClaw · synced ${lastSync}` : "Connecting to OpenClaw..."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/tasks" style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)" }}>Task Board →</Link>
          <Link href="/openclaw" style={{ padding: "7px 14px", background: "var(--accent)", borderRadius: 8, fontSize: 13, color: "white" }}>OpenClaw →</Link>
        </div>
      </div>

      {/* Agents */}
      {agents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Agents" href="/openclaw" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {agents.map(a => (
              <div key={a.agentId} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.model || "default model"}</div>
                </div>
                {a.isDefault && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--accent)", color: "white" }}>default</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Crons" value={activeCrons.length} color="#f59e0b" sub={nextCron ? `Next: ${timeUntil(nextCron.nextRunAt)}` : ""} />
        <StatCard label="Recurring Tasks" value={recurring.length} color="#22c55e" sub={recurring.length > 0 ? `${doneToday}/${recurring.length} done today` : ""} />
        <StatCard label="Bottle Today" value={todayBottle.length > 0 ? todayBottle.reduce((s, e) => s + (parseInt(e.value) || 0), 0) + "ml" : "—"} color="#6366f1" sub={todayBottle.length > 0 ? `${todayBottle.length} refill${todayBottle.length > 1 ? "s" : ""}` : "not logged"} />
        <StatCard label="Last Sleep" value={sleep[0]?.value || "—"} color="#8b5cf6" sub={sleep[0] ? new Date(sleep[0].timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "no data"} />
      </div>

      {/* Two column: Cron + Recurring */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionHeader title="Upcoming Cron Jobs" href="/openclaw" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeCrons.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No active cron jobs</p>
            ) : activeCrons.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.schedule}</div>
                </div>
                <div style={{ fontSize: 12, color: timeUntil(c.nextRunAt) === "overdue" ? "#ef4444" : "var(--text-muted)" }}>
                  {timeUntil(c.nextRunAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionHeader title="Today — Recurring Tasks" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayRecurring.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No recurring tasks configured</p>
            ) : todayRecurring.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 3, background: t.todayStatus === "done" ? "#22c55e" : "#71717a" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>⏰ {t.reminderTime}</div>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: t.todayStatus === "done" ? "#22c55e20" : "#71717a20", color: t.todayStatus === "done" ? "#22c55e" : "var(--text-muted)" }}>
                  {t.todayStatus || "pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Journal */}
      {journal.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionHeader title="Recent Journal Entries" href="/openclaw" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {journal.slice(0, 5).map(j => (
              <div key={j.date}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>
                  {new Date(j.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
                {j.summary && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text)" }}>
                    {j.summary.slice(0, 200)}{j.summary.length > 200 ? "..." : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}