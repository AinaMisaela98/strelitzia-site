import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

async function getActiveYear() {
  const year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  return year?.name || "2025-2026";
}

function amountToNumber(value: any) {
  return Number(String(value || "").replace(/\s/g, "").replace(/,/g, "")) || 0;
}

function getFeeValue(fee: any, names: string[], fallback: any = "") {
  for (const name of names) {
    if (fee?.[name] !== undefined && fee?.[name] !== null) {
      return fee[name];
    }
  }
  return fallback;
}

/* GET: mampiseho frais an'ilay étudiant */
export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const studentId = Number(url.searchParams.get("studentId"));
    const schoolYearName =
      url.searchParams.get("schoolYearName") || (await getActiveYear());

    if (!studentId) {
      return NextResponse.json({ error: "Étudiant manquant" }, { status: 400 });
    }

    const data = await prisma.studentFee.findMany({
      where: {
        studentId,
        schoolYearName,
      },
      orderBy: [
        { trainingFeeId: "asc" },
        { id: "asc" },
      ],
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/student-fees", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}

/* POST: mampiditra frais sélectionnés amin'ilay étudiant */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const studentId = Number(body.studentId);
    const schoolYearName = body.schoolYearName || (await getActiveYear());

    const trainingFeeIds: number[] = Array.isArray(body.trainingFeeIds)
      ? body.trainingFeeIds.map((id: any) => Number(id)).filter(Boolean)
      : [];

    if (!studentId || trainingFeeIds.length === 0) {
      return NextResponse.json(
        { error: "Étudiant ou frais manquant" },
        { status: 400 }
      );
    }

    const fees = await prisma.trainingFee.findMany({
      where: {
        id: { in: trainingFeeIds },
      },
      orderBy: { id: "asc" },
    });

    if (fees.length === 0) {
      return NextResponse.json(
        { error: "Aucun frais trouvé" },
        { status: 400 }
      );
    }

    const created = [];

    for (const fee of fees as any[]) {
      const trainingFeeId = Number(fee.id);

      const libelle = String(
        getFeeValue(fee, ["libelle", "intitule", "title", "name"], "Frais")
      ).trim();

      const code = String(getFeeValue(fee, ["code"], "-")).trim();

      const montantTotal = amountToNumber(
        getFeeValue(fee, ["montant", "amount", "tarif"], 0)
      );

      if (!trainingFeeId || !montantTotal) continue;

      const item = await prisma.studentFee.upsert({
        where: {
          studentId_trainingFeeId_schoolYearName: {
            studentId,
            trainingFeeId,
            schoolYearName,
          },
        },
        update: {
          libelle,
          code,
          montantTotal,
          reste: montantTotal,
        },
        create: {
          studentId,
          trainingFeeId,
          schoolYearName,
          libelle,
          code,
          montantTotal,
          montantPaye: 0,
          reste: montantTotal,
          status: "NON_PAYE",
        },
      });

      created.push(item);
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      data: created,
    });
  } catch (error: any) {
    console.error("POST /api/student-fees", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}

/* PATCH: PAY na CANCEL */
export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const id = Number(body.id);
    const action = String(body.action || "").toUpperCase();

    if (!id || !["PAY", "CANCEL"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const fee = await prisma.studentFee.findUnique({
      where: { id },
    });

    if (!fee) {
      return NextResponse.json(
        { error: "Frais étudiant introuvable" },
        { status: 404 }
      );
    }

    if (action === "PAY") {
      const updated = await prisma.studentFee.update({
        where: { id },
        data: {
          montantPaye: fee.montantTotal,
          reste: 0,
          status: "PAYE",
          paidAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    const updated = await prisma.studentFee.update({
      where: { id },
      data: {
        montantPaye: 0,
        reste: fee.montantTotal,
        status: "NON_PAYE",
        paidAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/student-fees", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}

/* DELETE: mamafa frais iray amin'ilay étudiant raha diso sélection */
export async function DELETE(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    await prisma.studentFee.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("DELETE /api/student-fees", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}