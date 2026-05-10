"use client";
import { useState, useEffect } from "react";

type CronJob = { id: string; name: string; schedule: string; nextRun: string; lastRun: string | null; status: string; enabled: boolean };

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCron() {
      try {
        const res = await fetch("http://localhost:18789/cron/list");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch {
        setJobs([]);
      }
      setLoading(false);
    }
    fetchCron();
    const interval = setInterval(fetchCron, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading calendar...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Calendar</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>Scheduled cron jobs and tasks</p>
      </div>

      {jobs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          No scheduled jobs. Jobs set up in OpenClaw will appear here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map((job: CronJob) => (
            <div key={job.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: job.enabled ? "#22c55e" : "#71717a", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{job.name || job.id}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {job.schedule} · Next: {job.nextRun ? new Date(job.nextRun).toLocaleString() : "—"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {job.lastRun ? `Last ran ${new Date(job.lastRun).toLocaleString()}` : "Never run"}
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: job.enabled ? "#22c55e20" : "#71717a20", color: job.enabled ? "#22c55e" : "#71717a" }}>
                {job.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}