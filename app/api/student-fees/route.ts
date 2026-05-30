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
  return Number(String(value ?? "").replace(/\s/g, "").replace(/,/g, "")) || 0;
}

function toUpperStatus(value: any) {
  return String(value || "").trim().toUpperCase();
}

function isPaidStatus(value: any) {
  const status = toUpperStatus(value);
  return status === "PAYE" || status === "PAYÉ" || status === "PAID";
}

function cleanText(value: any, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getFeeCode(data: any) {
  return cleanText(data?.code || data?.month || data?.mois || data?.libelle || data?.name, "FRAIS").toUpperCase();
}

function getFeeLabel(data: any) {
  return cleanText(data?.libelle || data?.label || data?.name || data?.code, "Frais");
}

async function resolveSchoolYearName(bodyOrParams: any, studentId?: number) {
  const explicitYear =
    bodyOrParams?.schoolYearName ||
    bodyOrParams?.anneeScolaire ||
    bodyOrParams?.get?.("schoolYearName") ||
    bodyOrParams?.get?.("anneeScolaire");

  if (explicitYear) return String(explicitYear);

  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { anneeScolaire: true },
    });

    if (student?.anneeScolaire) return student.anneeScolaire;
  }

  return getActiveYear();
}

/**
 * GET /api/student-fees?studentId=1
 * Mamerina ny frais efa assigné/payé amin'ilay étudiant.
 */
export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const studentId = Number(url.searchParams.get("studentId"));

    if (!studentId) {
      return NextResponse.json({ error: "Étudiant manquant" }, { status: 400 });
    }

    const schoolYearName = await resolveSchoolYearName(url.searchParams, studentId);

    const data = await prisma.studentFee.findMany({
      where: {
        studentId,
        schoolYearName,
      },
      orderBy: [{ trainingFeeId: "asc" }, { id: "asc" }],
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

/**
 * POST /api/student-fees
 * Manampy na mandoa frais.
 *
 * BLOQUE DOUBLONS:
 * - Tsy manao create raha efa misy StudentFee mitovy studentId + trainingFeeId + schoolYearName.
 * - Raha efa misy dia update ilay existant.
 * - Raha efa PAYE dia tsy averina mandoa duplicate intsony.
 */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const studentId = Number(body.studentId);

    if (!studentId) {
      return NextResponse.json({ error: "Étudiant manquant" }, { status: 400 });
    }

    const schoolYearName = await resolveSchoolYearName(body, studentId);

    const trainingFeeIds: number[] = Array.isArray(body.trainingFeeIds)
      ? body.trainingFeeIds.map((id: any) => Number(id)).filter(Boolean)
      : body.trainingFeeId
      ? [Number(body.trainingFeeId)].filter(Boolean)
      : [];

    if (trainingFeeIds.length === 0) {
      return NextResponse.json({ error: "Frais manquant" }, { status: 400 });
    }

    // Esorina avy hatrany ny doublons ao amin'ny request: [1,1,2] => [1,2]
    const uniqueTrainingFeeIds = Array.from(new Set(trainingFeeIds));

    const trainingFees = await prisma.trainingFee.findMany({
      where: {
        id: { in: uniqueTrainingFeeIds },
      },
      orderBy: { id: "asc" },
    });

    if (trainingFees.length === 0) {
      return NextResponse.json({ error: "Aucun frais réel trouvé" }, { status: 404 });
    }

    const results: any[] = [];

    for (const trainingFee of trainingFees) {
      const trainingFeeId = Number(trainingFee.id);

      const existing = await prisma.studentFee.findUnique({
        where: {
          studentId_trainingFeeId_schoolYearName: {
            studentId,
            trainingFeeId,
            schoolYearName,
          },
        },
      });

      const requestedTotal = amountToNumber(body.montantTotal);
      const requestedPaid = amountToNumber(body.montantPaye);
      const requestedReste =
        body.reste !== undefined ? amountToNumber(body.reste) : undefined;

      const montantTotal =
        requestedTotal > 0 ? requestedTotal : Number(trainingFee.montant || 0);

      const isPayment =
        isPaidStatus(body.status) ||
        requestedPaid > 0 ||
        requestedReste === 0 ||
        body.action === "PAY";

      const montantPaye = isPayment
        ? requestedPaid > 0
          ? requestedPaid
          : montantTotal
        : 0;

      const reste = isPayment
        ? 0
        : requestedReste !== undefined
        ? requestedReste
        : montantTotal - montantPaye;

      const status = isPayment || reste <= 0 ? "PAYE" : "NON_PAYE";

      const data = {
        studentId,
        trainingFeeId,
        schoolYearName,
        libelle: getFeeLabel({
          libelle: body.libelle || trainingFee.libelle,
          code: body.code || trainingFee.code,
        }),
        code: getFeeCode({
          code: body.code || trainingFee.code,
          libelle: body.libelle || trainingFee.libelle,
        }),
        montantTotal,
        montantPaye,
        reste,
        status,
        paidAt: status === "PAYE" ? new Date() : null,
      };

      if (existing) {
        // Raha efa payé dia tsy mamorona duplicate, mamerina ilay izy fotsiny.
        if (existing.status === "PAYE" || existing.reste <= 0 || existing.paidAt) {
          results.push({
            ...existing,
            duplicatedBlocked: true,
            message: "Ce frais est déjà payé pour cet étudiant.",
          });
          continue;
        }

        const updated = await prisma.studentFee.update({
          where: { id: existing.id },
          data: {
            libelle: data.libelle,
            code: data.code,
            montantTotal: data.montantTotal,
            montantPaye: data.montantPaye,
            reste: data.reste,
            status: data.status,
            paidAt: data.paidAt,
          },
        });

        results.push({
          ...updated,
          duplicatedBlocked: true,
          updatedExisting: true,
        });
      } else {
        const created = await prisma.studentFee.create({
          data,
        });

        results.push({
          ...created,
          duplicatedBlocked: false,
          created: true,
        });
      }
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (error: any) {
    // Sécurité fanampiny raha misy race condition dia tsy ampidirina doublon.
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error: "Doublon bloqué",
          message:
            "Ce frais existe déjà pour cet étudiant dans cette année scolaire.",
        },
        { status: 409 }
      );
    }

    console.error("POST /api/student-fees", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student-fees
 * PAY / CANCEL amin'ny frais efa misy.
 */
export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const action = toUpperStatus(body.action);

    if (!id) {
      return NextResponse.json({ error: "Frais étudiant manquant" }, { status: 400 });
    }

    const fee = await prisma.studentFee.findUnique({
      where: { id },
    });

    if (!fee) {
      return NextResponse.json({ error: "Frais introuvable" }, { status: 404 });
    }

    if (action === "PAY") {
      if (fee.status === "PAYE" || fee.reste <= 0 || fee.paidAt) {
        return NextResponse.json({
          success: true,
          duplicatedBlocked: true,
          message: "Ce frais est déjà payé.",
          data: fee,
        });
      }

      const montantPaye = amountToNumber(body.montantPaye) || fee.montantTotal;

      const updated = await prisma.studentFee.update({
        where: { id },
        data: {
          montantPaye,
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

    if (action === "CANCEL") {
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
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/student-fees", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message },
      { status: 500 }
    );
  }
}
