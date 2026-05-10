import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";

const prisma = new PrismaClient();

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otp.upsert({
      where: { email },
      create: { code, email, expiresAt },
      update: { code, expiresAt, usedAt: null },
    });

    // TODO: In production, send email via Resend/SendGrid/etc.
    // For now, OTP is logged to console — check Vercel logs or local server output
    console.log(`[OTP] ${email} → ${code}`);

    return NextResponse.json({ message: "OTP sent", email });
  } catch (e) {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}