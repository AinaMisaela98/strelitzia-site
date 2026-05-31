import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function getSchoolYear(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  return (
    sp.get("schoolYearName") ||
    sp.get("anneeScolaire") ||
    sp.get("year") ||
    "2025-2026"
  ).trim();
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const schoolYearName = getSchoolYear(req);
    const search = (req.nextUrl.searchParams.get("search") || "").trim();

    const students = await prisma.student.findMany({
      where: {
        anneeScolaire: schoolYearName,
        ...(search
          ? {
              OR: [
                { matricule: { contains: search } },
                { nom: { contains: search } },
                { prenoms: { contains: search } },
                { classe: { contains: search } },
                { section: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ nom: "asc" }, { prenoms: "asc" }, { id: "desc" }],
    });

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("PAYMENT_STUDENTS_GET_ERROR", error);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: error?.message || "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
