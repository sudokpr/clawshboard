import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { readHealthLogs, readJournalEntries, readOpenClawAgents } from "@/lib/openclaw";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "bottle" | "sleep" | "urine" | "journal" | null;

    if (type === "journal") {
      return NextResponse.json(readJournalEntries().slice(0, 30));
    }

    if (type === "bottle" || type === "sleep" || type === "urine") {
      const entries = readHealthLogs(type);
      return NextResponse.json(entries.slice(0, 50));
    }

    if (type === "agents") {
      return NextResponse.json(readOpenClawAgents());
    }

    // Return all health data
    const agents = readOpenClawAgents();
    return NextResponse.json({ bottle: readHealthLogs("bottle").slice(0, 50), sleep: readHealthLogs("sleep").slice(0, 50), urine: readHealthLogs("urine").slice(0, 50), journal: readJournalEntries().slice(0, 30), agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}