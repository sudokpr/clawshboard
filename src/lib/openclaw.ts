// Reads OpenClaw data from the local filesystem (RPi)
// This runs on the same machine as OpenClaw, so we can read
// workspace files, cron configs, and task logs directly.

import fs from "fs";
import path from "path";

const WORKSPACE = "/home/kp/.openclaw/workspace";
const CRON_JOBS_FILE = `${process.env.HOME || "/home/kp"}/.openclaw/cron/jobs.json`;
const TASKS_DIR = `${WORKSPACE}/tasks`;

export interface OpenClawCronJob {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  tz: string;
  nextRunAt?: string;
  lastRunAt?: string;
  enabled: boolean;
  agentId: string;
}

export interface OpenClawRecurringTask {
  id: string;
  name: string;
  logFile: string;
  reminderTime: string;
  notes?: string;
}

export interface RecurringTaskLog {
  date: string; // YYYY-MM-DD
  status: "done" | "missed" | "snoozed";
  note?: string;
}

// ── Cron Jobs ─────────────────────────────────────────────────────────────────

export function readOpenClawCronJobs(): OpenClawCronJob[] {
  try {
    const raw = fs.readFileSync(CRON_JOBS_FILE, "utf-8");
    const data = JSON.parse(raw);
    return (data.jobs || []).map((j: any) => ({
      id: j.id,
      name: j.name || j.id,
      description: j.description,
      schedule: j.schedule?.expr || "",
      tz: j.schedule?.tz || "Asia/Calcutta",
      nextRunAt: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : undefined,
      lastRunAt: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : undefined,
      enabled: j.enabled !== false,
      agentId: j.agentId || "main",
    }));
  } catch {
    return [];
  }
}

// ── Todo Registry ─────────────────────────────────────────────────────────────

export function readTodoRegistry(): OpenClawRecurringTask[] {
  try {
    const file = fs.readFileSync(`${TASKS_DIR}/todo-registry.md`, "utf-8");
    const tasks: OpenClawRecurringTask[] = [];
    const lines = file.split("\n");
    for (const line of lines) {
      const m = line.match(/^\| (\S+) \| (.+?) \| (.+?) \| (.+?) \|$/);
      if (m) {
        tasks.push({
          id: m[1],
          name: m[2].trim(),
          logFile: `tasks/${m[3].trim()}`,
          reminderTime: m[4].trim(),
          notes: "",
        });
      }
    }
    return tasks;
  } catch {
    return [];
  }
}

export function readRecurringTaskLog(logFile: string): RecurringTaskLog[] {
  try {
    const file = fs.readFileSync(`${WORKSPACE}/${logFile}`, "utf-8");
    const logs: RecurringTaskLog[] = [];
    const lines = file.split("\n");
    for (const line of lines) {
      // Markdown table: | date | status | notes |
      const m = line.match(/^\| (\S+) \| (.+?) \|(.*)\|$/);
      if (m) {
        const statusRaw = m[2].trim();
        let status: RecurringTaskLog["status"] = "missed";
        if (statusRaw.includes("yes") || statusRaw.includes("✅")) status = "done";
        else if (statusRaw.includes("snooze") || statusRaw.includes("⏰")) status = "snoozed";
        logs.push({ date: m[1], status, note: m[3]?.trim() });
      }
    }
    return logs;
  } catch {
    return [];
  }
}

// ── Health Logs ───────────────────────────────────────────────────────────────

export function readHealthLogs(type: "bottle" | "sleep" | "urine"): Array<{ timestamp: string; value: string; note?: string }> {
  try {
    const dir = `${TASKS_DIR}/${type}`;
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".jsonl"));
    const entries: Array<{ timestamp: string; value: string; note?: string }> = [];
    for (const file of files) {
      const raw = fs.readFileSync(`${dir}/${file}`, "utf-8");
      for (const line of raw.split("\n").filter(Boolean)) {
        try {
          const obj = JSON.parse(line);
          entries.push({
            timestamp: obj.timestamp,
            value: obj.ml ? `${obj.ml}ml` : obj.event || "",
            note: obj.note || "",
          });
        } catch {}
      }
    }
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

// ── Journal Entries ────────────────────────────────────────────────────────────

export function readJournalEntries(): Array<{ date: string; rawEntries?: string; summary?: string }> {
  try {
    const dir = `${TASKS_DIR}/journal`;
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
    const entries = [];
    for (const file of files) {
      const date = file.replace(".md", "");
      const raw = fs.readFileSync(`${dir}/${file}`, "utf-8");
      const summaryMatch = raw.match(/### Summary\n([\s\S]+?)(?=^##|\n##)/);
      const rawMatch = raw.match(/### Raw Entries\n([\s\S]+?)(?=^###|\n##)/);
      entries.push({
        date,
        rawEntries: rawMatch?.[1]?.trim(),
        summary: summaryMatch?.[1]?.trim(),
      });
    }
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

// ── OpenClaw Agent Config ─────────────────────────────────────────────────────

export function readOpenClawAgents(): Array<{ agentId: string; name: string; workspace: string; model?: string; isDefault: boolean }> {
  try {
    const raw = fs.readFileSync(`${process.env.HOME || "/home/kp"}/.openclaw/openclaw.json`, "utf-8");
    const config = JSON.parse(raw);
    const agents = config.agents?.list || [];
    const defaults = config.agents?.defaults || {};
    return agents.map((a: any) => ({
      agentId: a.id,
      name: a.name || a.id,
      workspace: a.workspace || defaults.workspace || "/home/kp/.openclaw/workspace",
      model: a.model?.primary || defaults.model?.primary,
      isDefault: a.id === config.agents?.defaults,
    }));
  } catch {
    return [{ agentId: "main", name: "Main Agent", workspace: "/home/kp/.openclaw/workspace", isDefault: true }];
  }
}