import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function text(v: unknown) {
  return String(v ?? "").trim();
}

function getSchoolYear(req: Request) {
  const url = new URL(req.url);
  return (
    text(url.searchParams.get("schoolYearName")) ||
    text(url.searchParams.get("anneeScolaire")) ||
    text(url.searchParams.get("year")) ||
    "2025-2026"
  );
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const schoolYearName = getSchoolYear(req);

    const treasuries = await prisma.treasury.findMany({
      where: {
        active: true,
        schoolYearName,
      },
      orderBy: [{ isPrincipal: "desc" }, { name: "asc" }],
    });

    const rows = await Promise.all(
      treasuries.map(async (t) => {
        const [entree, sortie] = await Promise.all([
          prisma.treasuryMovement.aggregate({
            where: {
              treasuryId: t.id,
              schoolYearName,
              movementType: "ENTREE",
            },
            _sum: { amount: true },
          }),
          prisma.treasuryMovement.aggregate({
            where: {
              treasuryId: t.id,
              schoolYearName,
              movementType: "SORTIE",
            },
            _sum: { amount: true },
          }),
        ]);

        const totalEntree = Number(entree._sum.amount || 0);
        const totalSortie = Number(sortie._sum.amount || 0);

        return {
          ...t,
          totalEntree,
          totalSortie,
          solde: totalEntree - totalSortie,
        };
      })
    );

    const totalEntree = rows.reduce((s, r) => s + r.totalEntree, 0);
    const totalSortie = rows.reduce((s, r) => s + r.totalSortie, 0);

    return NextResponse.json({
      schoolYearName,
      treasuries: rows,
      totals: {
        totalEntree,
        totalSortie,
        soldeGlobal: totalEntree - totalSortie,
      },
    });
  } catch (error: any) {
    console.error("TREASURY_DASHBOARD_ERROR", error);

    return NextResponse.json(
      {
        error: "Erreur chargement tableau trésorerie",
        message: error?.message || "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
