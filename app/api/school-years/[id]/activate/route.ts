import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.schoolYear.updateMany({
    data: { active: false },
  });

  const year = await prisma.schoolYear.update({
    where: { id: Number(id) },
    data: { active: true },
  });

  return NextResponse.json(year);
}