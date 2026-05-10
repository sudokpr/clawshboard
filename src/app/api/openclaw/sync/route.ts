import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  readOpenClawCronJobs,
  readTodoRegistry,
  readRecurringTaskLog,
  readHealthLogs,
  readJournalEntries,
  readOpenClawAgents,
} from "@/lib/openclaw";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const results: string[] = [];

    // 1. Sync agents
    const agents = readOpenClawAgents();
    for (const agent of agents) {
      await prisma.openClawAgent.upsert({
        where: { openclawId: agent.agentId },
        create: {
          openclawId: agent.agentId,
          name: agent.name,
          workspace: agent.workspace,
          model: agent.model,
          isDefault: agent.isDefault,
        },
        update: { name: agent.name, workspace: agent.workspace, model: agent.model },
      });
      results.push(`agent:${agent.agentId}`);
    }

    // 2. Sync cron jobs
    const cronJobs = readOpenClawCronJobs();
    for (const cj of cronJobs) {
      const agent = await prisma.openClawAgent.findUnique({ where: { openclawId: cj.agentId } });
      if (agent) {
        await prisma.cronJob.upsert({
          where: { openclawId: cj.id },
          create: {
            openclawId: cj.id, name: cj.name, description: cj.description,
            schedule: cj.schedule, timezone: cj.tz,
            nextRunAt: cj.nextRunAt ? new Date(cj.nextRunAt) : null,
            lastRunAt: cj.lastRunAt ? new Date(cj.lastRunAt) : null,
            enabled: cj.enabled, openclawAgentId: agent.id,
          },
          update: {
            name: cj.name, description: cj.description, schedule: cj.schedule,
            nextRunAt: cj.nextRunAt ? new Date(cj.nextRunAt) : null,
            lastRunAt: cj.lastRunAt ? new Date(cj.lastRunAt) : null,
            enabled: cj.enabled,
          },
        });
        results.push(`cron:${cj.name}`);
      }
    }

    // 3. Sync recurring tasks
    const registry = readTodoRegistry();
    for (const rt of registry) {
      const defaultAgent = await prisma.openClawAgent.findFirst({ where: { isDefault: true } });
      if (!defaultAgent) continue;
      const task = await prisma.recurringTask.upsert({
        where: { openclawId: rt.id },
        create: {
          openclawId: rt.id, name: rt.name, logFile: rt.logFile,
          reminderTime: rt.reminderTime, notes: rt.notes, openclawAgentId: defaultAgent.id,
        },
        update: { name: rt.name, logFile: rt.logFile, reminderTime: rt.reminderTime, notes: rt.notes },
      });
      const logs = readRecurringTaskLog(rt.logFile);
      for (const log of logs.slice(-30)) {
        await prisma.recurringTaskLog.upsert({
          where: { taskId_date: { taskId: task.id, date: log.date } },
          create: { taskId: task.id, date: log.date, status: log.status, note: log.note },
          update: { status: log.status, note: log.note },
        });
      }
      results.push(`task:${rt.name}`);
    }

    // 4. Sync health logs (last 7 days)
    for (const type of ["bottle", "sleep", "urine"] as const) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const entries = readHealthLogs(type);
      for (const entry of entries) {
        if (new Date(entry.timestamp) < cutoff) continue;
        const id = `${type}-${entry.timestamp}`.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 100);
        await prisma.healthLog.upsert({
          where: { id },
          create: { id, type, timestamp: new Date(entry.timestamp), value: entry.value, note: entry.note },
          update: { value: entry.value, note: entry.note },
        });
      }
      results.push(`health:${type}`);
    }

    // 5. Sync journal (last 30 days)
    const journalCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const journalEntries = readJournalEntries();
    for (const entry of journalEntries) {
      if (new Date(entry.date) < journalCutoff) continue;
      const defaultAgent = await prisma.openClawAgent.findFirst({ where: { isDefault: true } });
      await prisma.journalEntry.upsert({
        where: { date: entry.date },
        create: { date: entry.date, rawEntries: entry.rawEntries, summary: entry.summary, openclawAgentId: defaultAgent?.id },
        update: { rawEntries: entry.rawEntries, summary: entry.summary },
      });
      results.push(`journal:${entry.date}`);
    }

    return NextResponse.json({ success: true, synced: results.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}