import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: [
        { active: "desc" },
        { createdAt: "desc" },
      ],
    });

    const classRooms = await prisma.classRoom.findMany({
      include: {
        series: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const activeYear =
      schoolYears.find((year) => year.active)?.name ||
      schoolYears[0]?.name ||
      "";

    return NextResponse.json({
      activeYear,
      schoolYears,
      classRooms,
    });
  } catch (error) {
    console.error("Erreur API /api/reinscription/options:", error);

    return NextResponse.json(
      { message: "Erreur chargement options réinscription" },
      { status: 500 }
    );
  }
}