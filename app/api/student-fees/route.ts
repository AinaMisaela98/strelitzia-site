import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const raw = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return new Date();

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function getYearFromBody(body: any) {
  return cleanText(
    body?.schoolYearName ||
      body?.anneeScolaire ||
      body?.annéeScolaire ||
      body?.year ||
      body?.schoolYear
  );
}

function getYearFromUrl(url: URL) {
  return cleanText(
    url.searchParams.get("schoolYearName") ||
      url.searchParams.get("anneeScolaire") ||
      url.searchParams.get("annéeScolaire") ||
      url.searchParams.get("year") ||
      url.searchParams.get("schoolYear")
  );
}

async function getActiveYear() {
  const year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  return year?.name || "2025-2026";
}

async function resolveSchoolYearName(value?: string) {
  return cleanText(value) || (await getActiveYear());
}

async function findTreasury(body: any, schoolYearName: string) {
  const treasuryId = Number(body.treasuryId || body.tresorerieId || 0);
  const treasuryName = cleanText(
    body.treasuryName || body.tresorerie || body.treasury || body.caisse
  );

  if (!schoolYearName) return null;

  if (treasuryId) {
    const treasury = await prisma.treasury.findFirst({
      where: {
        id: treasuryId,
        active: true,
        schoolYearName,
      },
    });

    if (treasury) return treasury;
  }

  if (treasuryName) {
    const treasury = await prisma.treasury.findFirst({
      where: {
        name: treasuryName,
        active: true,
        schoolYearName,
      },
    });

    if (treasury) return treasury;
  }

  return null;
}

function buildPaymentReference(body: any, studentId: number, trainingFeeId: number) {
  return (
    cleanText(body.reference) ||
    `PAY-${studentId}-${trainingFeeId}-${Date.now()}`
  );
}

async function upsertStudentPayment({
  studentId,
  trainingFeeId,
  schoolYearName,
  montantTotal,
  montantPaye,
  reste,
  status,
  treasuryId,
  treasuryName,
}: {
  studentId: number;
  trainingFeeId: number;
  schoolYearName: string;
  montantTotal: number;
  montantPaye: number;
  reste: number;
  status: string;
  treasuryId?: number | null;
  treasuryName?: string | null;
}) {
  const existing = await prisma.studentPayment.findFirst({
    where: {
      studentId,
      trainingFeeId,
      schoolYearName,
    },
  });

  if (existing) {
    return prisma.studentPayment.update({
      where: { id: existing.id },
      data: {
        montantTotal,
        montantPaye,
        reste,
        status,
        treasuryId: treasuryId || existing.treasuryId || null,
        treasuryName: treasuryName || existing.treasuryName || null,
      },
    });
  }

  return prisma.studentPayment.create({
    data: {
      studentId,
      trainingFeeId,
      schoolYearName,
      montantTotal,
      montantPaye,
      reste,
      status,
      treasuryId: treasuryId || null,
      treasuryName: treasuryName || null,
    },
  });
}

async function createTreasuryMovementOnce({
  body,
  user,
  studentFee,
  amount,
  movementType,
  description,
}: {
  body: any;
  user: any;
  studentFee: any;
  amount: number;
  movementType: "ENTREE" | "SORTIE";
  description: string;
}) {
  const schoolYearName = await resolveSchoolYearName(
    cleanText(studentFee.schoolYearName || getYearFromBody(body))
  );

  const treasury = await findTreasury(body, schoolYearName);

  if (!treasury) {
    throw new Error("Trésorerie obligatoire ou introuvable pour cette année scolaire");
  }

  const studentId = Number(studentFee.studentId || body.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || body.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || body.studentFeeId || 0);
  const baseReference = buildPaymentReference(body, studentId, trainingFeeId);
  const uniqueReference = `${baseReference}-${movementType}-${Date.now()}`;

  // Important:
  // On crée TOUJOURS un nouveau mouvement.
  // Paiement -> ENTREE
  // Annulation -> SORTIE
  // Paiement après annulation -> nouvelle ENTREE
  // Aucun findFirst / aucun overwrite, pour garder l'historique complet.
  return prisma.treasuryMovement.create({
    data: {
      treasuryId: treasury.id,
      movementType,
      category:
        movementType === "ENTREE"
          ? "PAIEMENT_FRAIS"
          : "ANNULATION_PAIEMENT_FRAIS",
      amount,
      description,
      reference: uniqueReference,
      studentId: studentId || null,
      trainingFeeId: trainingFeeId || null,
      studentFeeId: studentFeeId || null,
      schoolYearName,
      createdBy: user?.email || user?.name || null,
    },
  });
}

async function findPaymentForFee(studentFee: any) {
  return prisma.studentPayment.findFirst({
    where: {
      studentId: Number(studentFee.studentId || 0),
      trainingFeeId: Number(studentFee.trainingFeeId || 0),
      schoolYearName: String(studentFee.schoolYearName || ""),
    },
    orderBy: { id: "desc" },
  });
}

async function findOriginalPaymentMovement(studentFee: any, payment?: any) {
  const studentId = Number(studentFee.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || 0);
  const schoolYearName = String(studentFee.schoolYearName || "");

  return prisma.treasuryMovement.findFirst({
    where: {
      movementType: "ENTREE",
      category: "PAIEMENT_FRAIS",
      schoolYearName,
      OR: [
        ...(studentFeeId ? [{ studentFeeId }] : []),
        ...(studentId && trainingFeeId
          ? [{ studentId, trainingFeeId }]
          : []),
        ...(payment?.treasuryId && studentId && trainingFeeId
          ? [{ treasuryId: Number(payment.treasuryId), studentId, trainingFeeId }]
          : []),
      ],
    },
    orderBy: { id: "desc" },
  });
}

async function createCancellationMovementOnce({
  user,
  studentFee,
  payment,
  originalMovement,
  amount,
}: {
  user: any;
  studentFee: any;
  payment?: any;
  originalMovement?: any;
  amount: number;
}) {
  const studentId = Number(studentFee.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || 0);
  const schoolYearName = String(studentFee.schoolYearName || "");
  const treasuryId = Number(
    originalMovement?.treasuryId || payment?.treasuryId || 0
  );

  if (!treasuryId || amount <= 0) return null;

  const treasury = await prisma.treasury.findFirst({
    where: {
      id: treasuryId,
      schoolYearName,
    },
  });

  if (!treasury) return null;

  const reference = `CANCEL-FEE-${studentFeeId}-${schoolYearName}-${Date.now()}`;

  // Important:
  // On crée TOUJOURS une nouvelle sortie d'annulation.
  // Cela permet l'historique complet:
  // ENTREE -> SORTIE -> ENTREE -> SORTIE...
  return prisma.treasuryMovement.create({
    data: {
      treasuryId,
      movementType: "SORTIE",
      category: "ANNULATION_PAIEMENT_FRAIS",
      amount,
      description: `Annulation paiement frais ${studentFee.code} - ${studentFee.libelle}`,
      reference,
      studentId: studentId || null,
      trainingFeeId: trainingFeeId || null,
      studentFeeId: studentFeeId || null,
      schoolYearName,
      createdBy: user?.email || user?.name || null,
    },
  });
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const studentId = Number(url.searchParams.get("studentId") || 0);
    const trainingFeeId = Number(url.searchParams.get("trainingFeeId") || 0);
    const schoolYearName = await resolveSchoolYearName(getYearFromUrl(url));

    const fees = await prisma.studentFee.findMany({
      where: {
        schoolYearName,
        ...(studentId ? { studentId } : {}),
        ...(trainingFeeId ? { trainingFeeId } : {}),
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(fees);
  } catch (error: any) {
    console.error("STUDENT_FEES_GET_ERROR", error);
    return NextResponse.json(
      {
        error: "Erreur serveur student-fees",
        message: error?.message || String(error),
      },
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
    const body = await req.json().catch(() => ({}));

    const studentId = Number(body.studentId || 0);
    const trainingFeeId = Number(body.trainingFeeId || body.sourceTrainingFeeId || 0);
    const schoolYearName = await resolveSchoolYearName(getYearFromBody(body));

    const libelle = cleanText(
      body.libelle || body.label || body.name || body.code || "Frais"
    );
    const code = cleanText(body.code || libelle).toUpperCase();

    const montantTotal = toNumber(body.montantTotal || body.total || body.amount || body.montant);
    const montantPayeInput = toNumber(
      body.montantPaye || body.amount || body.montantTotal || body.montant
    );

    if (!studentId) {
      return NextResponse.json({ error: "Étudiant obligatoire" }, { status: 400 });
    }

    if (!trainingFeeId) {
      return NextResponse.json({ error: "Frais obligatoire" }, { status: 400 });
    }

    if (!schoolYearName) {
      return NextResponse.json({ error: "Année scolaire obligatoire" }, { status: 400 });
    }

    if (!montantTotal || montantTotal <= 0) {
      return NextResponse.json({ error: "Montant total invalide" }, { status: 400 });
    }

    if (!montantPayeInput || montantPayeInput <= 0) {
      return NextResponse.json({ error: "Montant payé invalide" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        anneeScolaire: schoolYearName,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant introuvable pour cette année scolaire" },
        { status: 404 }
      );
    }

    const trainingFee = await prisma.trainingFee.findFirst({
      where: {
        id: trainingFeeId,
        schoolYearName,
      },
    });

    if (!trainingFee) {
      return NextResponse.json(
        { error: "Frais de formation introuvable pour cette année scolaire" },
        { status: 404 }
      );
    }

    const treasury = await findTreasury(body, schoolYearName);

    if (!treasury) {
      return NextResponse.json(
        { error: "Veuillez sélectionner une trésorerie valide pour cette année scolaire avant de payer." },
        { status: 400 }
      );
    }

    const existingFee = await prisma.studentFee.findFirst({
      where: {
        studentId,
        trainingFeeId,
        schoolYearName,
      },
    });

    const previousPaid = Number(existingFee?.montantPaye || 0);
    const totalPaid = Math.min(montantTotal, previousPaid + montantPayeInput);
    const reste = Math.max(0, montantTotal - totalPaid);
    const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

    const studentFee = existingFee
      ? await prisma.studentFee.update({
          where: { id: existingFee.id },
          data: {
            libelle,
            code,
            montantTotal,
            montantPaye: totalPaid,
            reste,
            status,
            paidAt: status === "PAYE" ? safeDate(body.datePaiement) : existingFee.paidAt,
          },
        })
      : await prisma.studentFee.create({
          data: {
            studentId,
            trainingFeeId,
            schoolYearName,
            libelle,
            code,
            montantTotal,
            montantPaye: totalPaid,
            reste,
            status,
            paidAt: status === "PAYE" ? safeDate(body.datePaiement) : null,
          },
        });

    const payment = await upsertStudentPayment({
      studentId,
      trainingFeeId,
      schoolYearName,
      montantTotal,
      montantPaye: totalPaid,
      reste,
      status,
      treasuryId: treasury.id,
      treasuryName: treasury.name,
    });

    const movement = await createTreasuryMovementOnce({
      body: {
        ...body,
        studentId,
        trainingFeeId,
        schoolYearName,
        treasuryId: treasury.id,
        treasuryName: treasury.name,
        tresorerie: treasury.name,
        reference: buildPaymentReference(body, studentId, trainingFeeId),
      },
      user,
      studentFee,
      amount: montantPayeInput,
      movementType: "ENTREE",
      description: `Paiement frais ${code} - ${libelle}`,
    });

    return NextResponse.json({
      success: true,
      data: studentFee,
      payment,
      movement,
    });
  } catch (error: any) {
    console.error("STUDENT_FEES_POST_ERROR", error);
    return NextResponse.json(
      {
        error: "Erreur serveur pendant le paiement",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id || 0);
    const action = cleanText(body.action).toUpperCase();
    const requestedSchoolYearName = getYearFromBody(body);

    if (!id) {
      return NextResponse.json({ error: "ID frais obligatoire" }, { status: 400 });
    }

    const existingFee = await prisma.studentFee.findUnique({
      where: { id },
    });

    if (!existingFee) {
      return NextResponse.json({ error: "Frais introuvable" }, { status: 404 });
    }

    if (requestedSchoolYearName && requestedSchoolYearName !== existingFee.schoolYearName) {
      return NextResponse.json(
        { error: "Ce frais n'appartient pas à l'année scolaire sélectionnée" },
        { status: 400 }
      );
    }

    if (action === "PAY") {
      const montantPayeInput = toNumber(
        body.montantPaye || existingFee.reste || existingFee.montantTotal
      );

      if (montantPayeInput <= 0) {
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
      }

      const treasury = await findTreasury(body, existingFee.schoolYearName);

      if (!treasury) {
        return NextResponse.json(
          { error: "Veuillez sélectionner une trésorerie valide pour cette année scolaire avant de payer." },
          { status: 400 }
        );
      }

      const totalPaid = Math.min(
        Number(existingFee.montantTotal || 0),
        Number(existingFee.montantPaye || 0) + montantPayeInput
      );

      const reste = Math.max(0, Number(existingFee.montantTotal || 0) - totalPaid);
      const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

      const updatedFee = await prisma.studentFee.update({
        where: { id },
        data: {
          montantPaye: totalPaid,
          reste,
          status,
          paidAt: status === "PAYE" ? safeDate(body.datePaiement) : existingFee.paidAt,
        },
      });

      const payment = await upsertStudentPayment({
        studentId: existingFee.studentId,
        trainingFeeId: existingFee.trainingFeeId,
        schoolYearName: existingFee.schoolYearName,
        montantTotal: existingFee.montantTotal,
        montantPaye: totalPaid,
        reste,
        status,
        treasuryId: treasury.id,
        treasuryName: treasury.name,
      });

      const movement = await createTreasuryMovementOnce({
        body: {
          ...body,
          studentId: existingFee.studentId,
          trainingFeeId: existingFee.trainingFeeId,
          schoolYearName: existingFee.schoolYearName,
          treasuryId: treasury.id,
          treasuryName: treasury.name,
          tresorerie: treasury.name,
          reference: buildPaymentReference(
            body,
            existingFee.studentId,
            existingFee.trainingFeeId
          ),
        },
        user,
        studentFee: updatedFee,
        amount: montantPayeInput,
        movementType: "ENTREE",
        description: `Paiement frais ${existingFee.code} - ${existingFee.libelle}`,
      });

      return NextResponse.json({
        success: true,
        data: updatedFee,
        payment,
        movement,
      });
    }

    if (action === "CANCEL") {
      const payment = await findPaymentForFee(existingFee);
      const originalMovement = await findOriginalPaymentMovement(existingFee, payment);

      const paidAmount = Math.max(
        Number(existingFee.montantPaye || 0),
        Number(payment?.montantPaye || 0),
        Number(originalMovement?.amount || 0)
      );

      const updatedFee = await prisma.studentFee.update({
        where: { id },
        data: {
          montantPaye: 0,
          reste: existingFee.montantTotal,
          status: "NON_PAYE",
          paidAt: null,
        },
      });

      let updatedPayment = null;

      if (payment) {
        updatedPayment = await prisma.studentPayment.update({
          where: { id: payment.id },
          data: {
            montantPaye: 0,
            reste: existingFee.montantTotal,
            status: "NON_PAYE",
          },
        });
      }

      const movement = await createCancellationMovementOnce({
        user,
        studentFee: existingFee,
        payment,
        originalMovement,
        amount: paidAmount,
      });

      return NextResponse.json({
        success: true,
        cancelled: true,
        data: updatedFee,
        payment: updatedPayment,
        movement,
      });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("STUDENT_FEES_PATCH_ERROR", error);
    return NextResponse.json(
      {
        error: "Erreur serveur pendant la modification paiement",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
