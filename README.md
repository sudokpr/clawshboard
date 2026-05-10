# Clawshboard

Mission control — a Linear-inspired operator dashboard built on Next.js 14, Prisma (SQLite), and OTP authentication.

## Features

- **Tasks** — Drag-and-drop kanban board (Backlog → In Progress → In Review → Done)
- **Calendar** — View scheduled cron jobs from OpenClaw
- **Projects** — Track projects with progress indicators and linked tasks
- **OTP Auth** — Magic link / email OTP login (6-digit code, 10-min expiry)

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Prisma** + SQLite (zero external dependencies)
- **Tailwind CSS** (dark Linear-inspired theme)
- **OTP Authentication** (stored in DB, console-logged for dev; swap for email provider in production)

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Vercel Deployment

1. Push to GitHub → Import to [vercel.com](https://vercel.com)
2. Add environment variables:
   - `DATABASE_URL` = `file:./dev.db` (Vercel Postgres recommended for production)
   - `NEXTAUTH_SECRET` = random 32+ char string
   - `NEXTAUTH_URL` = your Vercel domain (e.g. `https://clawshboard.vercel.app`)

For production, replace the OTP `console.log` with an email provider (Resend, SendGrid, etc.) in `src/app/api/auth/otp/send/route.ts`.