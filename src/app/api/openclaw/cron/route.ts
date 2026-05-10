import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { readOpenClawCronJobs } from "@/lib/openclaw";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Always read fresh from OpenClaw filesystem
    const openclawJobs = readOpenClawCronJobs();

    // Sync to DB first
    for (const cj of openclawJobs) {
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
      }
    }

    // Return fresh from OpenClaw (source of truth)
    return NextResponse.json(openclawJobs.map(j => ({
      id: j.id, name: j.name, description: j.description,
      schedule: j.schedule, tz: j.tz,
      nextRunAt: j.nextRunAt, lastRunAt: j.lastRunAt,
      enabled: j.enabled, agentId: j.agentId,
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}