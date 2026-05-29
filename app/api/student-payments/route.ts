import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function toNumber(value: any) {
  return Number(String(value || "").replace(/\s/g, "")) || 0;
}

async function getActiveYear() {
  const year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  return year?.name || "2025-2026";
}

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

    const payments = await prisma.studentPayment.findMany({
      where: {
        studentId,
        schoolYearName,
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const studentId = Number(body.studentId);
    const trainingFeeId = Number(body.trainingFeeId);
    const montantTotal = toNumber(body.montantTotal);
    const montantPayeInput = toNumber(body.montantPaye);
    const schoolYearName = body.schoolYearName || (await getActiveYear());

    if (!studentId || !trainingFeeId || !montantTotal || !montantPayeInput) {
      return NextResponse.json(
        { error: "Données paiement incomplètes" },
        { status: 400 }
      );
    }

    const existing = await prisma.studentPayment.findFirst({
      where: {
        studentId,
        trainingFeeId,
        schoolYearName,
      },
    });

    const dejaPaye = existing?.montantPaye || 0;
    const nouveauTotalPaye = dejaPaye + montantPayeInput;

    if (nouveauTotalPaye > montantTotal) {
      return NextResponse.json(
        { error: "Le montant payé dépasse le montant total" },
        { status: 400 }
      );
    }

    const reste = montantTotal - nouveauTotalPaye;
    const status = reste <= 0 ? "PAYE" : "PARTIEL";

    if (existing) {
      const updated = await prisma.studentPayment.update({
        where: { id: existing.id },
        data: {
          montantPaye: nouveauTotalPaye,
          reste,
          status,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const created = await prisma.studentPayment.create({
      data: {
        studentId,
        trainingFeeId,
        schoolYearName,
        montantTotal,
        montantPaye: montantPayeInput,
        reste,
        status,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}