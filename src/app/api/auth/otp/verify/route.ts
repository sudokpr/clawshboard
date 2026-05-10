import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: "Email and code required" }, { status: 400 });

    const otp = await prisma.otp.findUnique({ where: { email } });
    if (!otp || otp.expiresAt < new Date() || otp.usedAt) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }
    if (otp.code !== code) return NextResponse.json({ error: "Wrong OTP" }, { status: 401 });

    await prisma.otp.update({ where: { email }, data: { usedAt: new Date() } });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name: email.split("@")[0] } });
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { sessionToken: token, userId: user.id, expires } });

    const res = NextResponse.json({ success: true, user: { email: user.email, name: user.name } });
    res.cookies.set("next-auth-session-token", token, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}