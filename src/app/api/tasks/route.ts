import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { assignee: true, project: true },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(tasks);
}

export async function POST(req: Request) {
  const { title, description, status, priority, assigneeId, projectId } = await req.json();
  const task = await prisma.task.create({
    data: { title, description, status, priority, assigneeId, projectId },
  });
  return Response.json(task);
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json();
  const task = await prisma.task.update({ where: { id }, data });
  return Response.json(task);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.task.delete({ where: { id } });
  return Response.json({ success: true });
}