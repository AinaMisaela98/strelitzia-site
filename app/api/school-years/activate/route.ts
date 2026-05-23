import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  if (!year) {
    year = await prisma.schoolYear.create({
      data: {
        name: "2025-2026",
        active: true,
      },
    });
  }

  return NextResponse.json(year);
}