import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { tasks: true, owner: true },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(projects);
}

export async function POST(req: Request) {
  const { name, description, color } = await req.json();
  let user = await prisma.user.findFirst();
  if (!user) user = await prisma.user.create({ data: { email: "demo@local", name: "Demo User" } });
  const project = await prisma.project.create({
    data: { name, description, color, ownerId: user.id },
  });
  return Response.json(project);
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json();
  const project = await prisma.project.update({ where: { id }, data });
  return Response.json(project);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.project.delete({ where: { id } });
  return Response.json({ success: true });
}