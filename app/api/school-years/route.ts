import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    };
  }

  return { user, response: null };
}

async function ensureActiveSchoolYear() {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    orderBy: { id: "desc" },
  });

  if (activeYear) return activeYear;

  const firstYear = await prisma.schoolYear.findFirst({
    orderBy: { id: "desc" },
  });

  if (firstYear) {
    return await prisma.schoolYear.update({
      where: { id: firstYear.id },
      data: { active: true },
    });
  }

  return await prisma.schoolYear.create({
    data: {
      name: "2025-2026",
      active: true,
    },
  });
}

async function getYearLinks(yearName: string) {
  const [
    students,
    levels,
    classes,
    series,
    feeModels,
    trainingFees,
    studentFees,
    studentPayments,
    treasuries,
    treasuryMovements,
  ] = await Promise.all([
    prisma.student.count({
      where: { anneeScolaire: yearName },
    }),

    prisma.level.count({
      where: { schoolYearName: yearName },
    }),

    prisma.classRoom.count({
      where: { schoolYearName: yearName },
    }),

    prisma.serie.count({
      where: { schoolYearName: yearName },
    }),

    prisma.feeModel.count({
      where: { schoolYearName: yearName },
    }),

    prisma.trainingFee.count({
      where: { schoolYearName: yearName },
    }),

    prisma.studentFee.count({
      where: { schoolYearName: yearName },
    }),

    prisma.studentPayment.count({
      where: { schoolYearName: yearName },
    }),

    prisma.treasury.count({
      where: { schoolYearName: yearName },
    }),

    prisma.treasuryMovement.count({
      where: { schoolYearName: yearName },
    }),
  ]);

  const total =
    students +
    levels +
    classes +
    series +
    feeModels +
    trainingFees +
    studentFees +
    studentPayments +
    treasuries +
    treasuryMovements;

  return {
    total,
    details: {
      students,
      levels,
      classes,
      series,
      feeModels,
      trainingFees,
      studentFees,
      studentPayments,
      treasuries,
      treasuryMovements,
    },
  };
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    await ensureActiveSchoolYear();

    const years = await prisma.schoolYear.findMany({
      orderBy: [{ active: "desc" }, { id: "desc" }],
    });

    return NextResponse.json(years, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("GET /api/school-years:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erreur chargement années scolaires.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const name = cleanText(body?.name);

    if (!name) {
      return NextResponse.json(
        { error: "Nom année scolaire obligatoire" },
        { status: 400 }
      );
    }

    const existing = await prisma.schoolYear.findFirst({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cette année scolaire existe déjà" },
        { status: 400 }
      );
    }

    const year = await prisma.schoolYear.create({
      data: {
        name,
        active: body?.active === true,
      },
    });

    if (year.active) {
      await prisma.schoolYear.updateMany({
        where: {
          id: { not: year.id },
        },
        data: { active: false },
      });
    }

    return NextResponse.json(year, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/school-years:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erreur création année scolaire.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    const id = Number(body?.id);
    const name = cleanText(body?.name);
    const active = body?.active === true;

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nom année scolaire obligatoire" },
        { status: 400 }
      );
    }

    const existing = await prisma.schoolYear.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cette année scolaire existe déjà" },
        { status: 400 }
      );
    }

    const year = await prisma.schoolYear.update({
      where: { id },
      data: {
        name,
        active,
      },
    });

    if (active) {
      await prisma.schoolYear.updateMany({
        where: {
          id: { not: id },
        },
        data: { active: false },
      });
    }

    return NextResponse.json(year);
  } catch (error: any) {
    console.error("PUT /api/school-years:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erreur modification année scolaire.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    const year = await prisma.schoolYear.findUnique({
      where: { id },
    });

    if (!year) {
      return NextResponse.json(
        { error: "Année scolaire introuvable" },
        { status: 404 }
      );
    }

    if (year.active) {
      return NextResponse.json(
        { error: "Impossible de supprimer l’année scolaire active." },
        { status: 400 }
      );
    }

    const links = await getYearLinks(year.name);

    if (links.total > 0) {
      return NextResponse.json(
        {
          error:
            "Suppression impossible : cette année scolaire contient déjà des données liées.",
          details: links.details,
        },
        { status: 409 }
      );
    }

    await prisma.schoolYear.delete({
      where: { id },
    });

    await ensureActiveSchoolYear();

    return NextResponse.json({
      success: true,
      message: "Année scolaire supprimée avec succès.",
    });
  } catch (error: any) {
    console.error("DELETE /api/school-years:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erreur suppression année scolaire.",
      },
      { status: 500 }
    );
  }
}