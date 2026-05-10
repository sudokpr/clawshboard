import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { readTodoRegistry, readRecurringTaskLog } from "@/lib/openclaw";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const registry = readTodoRegistry();
    const tasks = [];
    for (const rt of registry) {
      const dbTask = await prisma.recurringTask.findUnique({ where: { openclawId: rt.id } });
      const logs = readRecurringTaskLog(rt.logFile).slice(-14); // last 14 days
      tasks.push({
        id: dbTask?.id || rt.id,
        openclawId: rt.id,
        name: rt.name,
        logFile: rt.logFile,
        reminderTime: rt.reminderTime,
        notes: rt.notes,
        logs: logs.map(l => ({ date: l.date, status: l.status, note: l.note })),
      });
    }
    return NextResponse.json(tasks);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}