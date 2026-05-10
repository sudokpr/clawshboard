import { NextResponse } from "next/server";
import { readOpenClawAgents } from "@/lib/openclaw";

export async function GET() {
  return NextResponse.json(readOpenClawAgents());
}