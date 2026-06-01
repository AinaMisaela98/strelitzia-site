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

async function getActiveYear(tx: any = prisma) {
  const year = await tx.schoolYear.findFirst({
    where: { active: true },
  });

  return year?.name || "2025-2026";
}

async function resolveSchoolYearName(value?: string, tx: any = prisma) {
  return cleanText(value) || (await getActiveYear(tx));
}

async function findTreasury(body: any, schoolYearName: string, tx: any = prisma) {
  const treasuryId = Number(body.treasuryId || body.tresorerieId || 0);
  const treasuryName = cleanText(
    body.treasuryName || body.tresorerie || body.treasury || body.caisse
  );

  if (!schoolYearName) return null;

  if (treasuryId) {
    const treasury = await tx.treasury.findFirst({
      where: {
        id: treasuryId,
        active: true,
        schoolYearName,
      },
    });

    if (treasury) return treasury;
  }

  if (treasuryName) {
    const treasury = await tx.treasury.findFirst({
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

function getRequestIdempotencyKey(req: Request, body: any) {
  return cleanText(
    req.headers.get("Idempotency-Key") ||
      body.idempotencyKey ||
      body.idempotency ||
      body.uniqueKey ||
      ""
  );
}

function buildPaymentReference(
  body: any,
  studentId: number,
  trainingFeeId: number,
  fallbackKey?: string
) {
  return (
    cleanText(body.reference) ||
    cleanText(fallbackKey) ||
    cleanText(body.idempotencyKey) ||
    `PAY-${studentId}-${trainingFeeId}-${Date.now()}`
  );
}

function buildStableMovementReference({
  baseReference,
  movementType,
  idempotencyKey,
}: {
  baseReference: string;
  movementType: "ENTREE" | "SORTIE";
  idempotencyKey?: string;
}) {
  const key = cleanText(idempotencyKey);
  return key || `${baseReference}-${movementType}`;
}

async function upsertStudentPayment({
  studentId,
  trainingFeeId,
  schoolYearName,
  montantTotal,
  montantPaye,
  reste,
  status,
  tx = prisma,
}: {
  studentId: number;
  trainingFeeId: number;
  schoolYearName: string;
  montantTotal: number;
  montantPaye: number;
  reste: number;
  status: string;
  tx?: any;
}) {
  const existing = await tx.studentPayment.findFirst({
    where: {
      studentId,
      trainingFeeId,
      schoolYearName,
    },
  });

  // IMPORTANT:
  // Aza asiana treasuryId / treasuryName eto.
  // Tsy ao amin'ny model StudentPayment ireo champs ireo amin'ny schema-nao.
  // Ny trésorerie dia ao amin'ny TreasuryMovement ihany.
  if (existing) {
    return tx.studentPayment.update({
      where: { id: existing.id },
      data: {
        montantTotal,
        montantPaye,
        reste,
        status,
      },
    });
  }

  return tx.studentPayment.create({
    data: {
      studentId,
      trainingFeeId,
      schoolYearName,
      montantTotal,
      montantPaye,
      reste,
      status,
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
  idempotencyKey,
  tx = prisma,
}: {
  body: any;
  user: any;
  studentFee: any;
  amount: number;
  movementType: "ENTREE" | "SORTIE";
  description: string;
  idempotencyKey?: string;
  tx?: any;
}) {
  const schoolYearName = await resolveSchoolYearName(
    cleanText(studentFee.schoolYearName || getYearFromBody(body)),
    tx
  );

  const treasury = await findTreasury(body, schoolYearName, tx);

  if (!treasury) {
    throw new Error("Trésorerie obligatoire ou introuvable pour cette année scolaire");
  }

  const studentId = Number(studentFee.studentId || body.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || body.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || body.studentFeeId || 0);
  const baseReference = buildPaymentReference(body, studentId, trainingFeeId, idempotencyKey);
  const stableReference = buildStableMovementReference({
    baseReference,
    movementType,
    idempotencyKey,
  });

  // Sécurité connexion/retry:
  // Raha miverina ilay request mitovy dia averina ilay movement efa misy,
  // fa tsy mamorona movement vaovao.
  const existingMovement = await tx.treasuryMovement.findFirst({
    where: {
      treasuryId: treasury.id,
      movementType,
      category:
        movementType === "ENTREE"
          ? "PAIEMENT_FRAIS"
          : "ANNULATION_PAIEMENT_FRAIS",
      reference: stableReference,
      studentId: studentId || undefined,
      trainingFeeId: trainingFeeId || undefined,
      studentFeeId: studentFeeId || undefined,
      schoolYearName,
    },
    orderBy: { id: "desc" },
  });

  if (existingMovement) return existingMovement;

  return tx.treasuryMovement.create({
    data: {
      treasuryId: treasury.id,
      movementType,
      category:
        movementType === "ENTREE"
          ? "PAIEMENT_FRAIS"
          : "ANNULATION_PAIEMENT_FRAIS",
      amount,
      description,
      reference: stableReference,
      studentId: studentId || null,
      trainingFeeId: trainingFeeId || null,
      studentFeeId: studentFeeId || null,
      schoolYearName,
      createdBy: user?.email || user?.name || null,
      createdAt: safeDate(body.createdAt || body.date || body.datePaiement || body.paymentDate),
    },
  });
}

async function findPaymentForFee(studentFee: any, tx: any = prisma) {
  return tx.studentPayment.findFirst({
    where: {
      studentId: Number(studentFee.studentId || 0),
      trainingFeeId: Number(studentFee.trainingFeeId || 0),
      schoolYearName: String(studentFee.schoolYearName || ""),
    },
    orderBy: { id: "desc" },
  });
}

async function findOriginalPaymentMovement(studentFee: any, tx: any = prisma) {
  const studentId = Number(studentFee.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || 0);
  const schoolYearName = String(studentFee.schoolYearName || "");

  return tx.treasuryMovement.findFirst({
    where: {
      movementType: "ENTREE",
      category: "PAIEMENT_FRAIS",
      schoolYearName,
      OR: [
        ...(studentFeeId ? [{ studentFeeId }] : []),
        ...(studentId && trainingFeeId ? [{ studentId, trainingFeeId }] : []),
      ],
    },
    orderBy: { id: "desc" },
  });
}

async function createCancellationMovementOnce({
  user,
  studentFee,
  originalMovement,
  amount,
  tx = prisma,
}: {
  user: any;
  studentFee: any;
  originalMovement?: any;
  amount: number;
  tx?: any;
}) {
  const studentId = Number(studentFee.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || 0);
  const schoolYearName = String(studentFee.schoolYearName || "");
  const treasuryId = Number(originalMovement?.treasuryId || 0);
  const originalMovementId = Number(originalMovement?.id || 0);

  if (!treasuryId || !originalMovementId || amount <= 0) return null;

  const treasury = await tx.treasury.findFirst({
    where: {
      id: treasuryId,
      schoolYearName,
    },
  });

  if (!treasury) return null;

  // Référence stable:
  // ilay paiement ENTREE iray ihany = annulation SORTIE iray ihany.
  // Raha manao re-paiement avy eo dia ENTREE vaovao manana id vaovao,
  // ka mahazo annulation vaovao ara-dalàna indray izy.
  const reference = `CANCEL-FEE-${studentFeeId}-${schoolYearName}-MOVE-${originalMovementId}`;

  const alreadyCancelled = await tx.treasuryMovement.findFirst({
    where: {
      treasuryId,
      movementType: "SORTIE",
      category: "ANNULATION_PAIEMENT_FRAIS",
      reference,
      studentId: studentId || undefined,
      trainingFeeId: trainingFeeId || undefined,
      studentFeeId: studentFeeId || undefined,
      schoolYearName,
    },
    orderBy: { id: "desc" },
  });

  if (alreadyCancelled) return alreadyCancelled;

  return tx.treasuryMovement.create({
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
    const requestIdempotencyKey = getRequestIdempotencyKey(req, body);

    const result = await prisma.$transaction(async (tx) => {
      const studentId = Number(body.studentId || 0);
      const trainingFeeId = Number(body.trainingFeeId || body.sourceTrainingFeeId || 0);
      const schoolYearName = await resolveSchoolYearName(getYearFromBody(body), tx);

      const libelle = cleanText(
        body.libelle || body.label || body.name || body.code || "Frais"
      );
      const code = cleanText(body.code || libelle).toUpperCase();

      const montantTotal = toNumber(body.montantTotal || body.total || body.amount || body.montant);
      const montantPayeInput = toNumber(
        body.montantPaye || body.amount || body.montantTotal || body.montant
      );

      if (!studentId) throw new Error("Étudiant obligatoire");
      if (!trainingFeeId) throw new Error("Frais obligatoire");
      if (!schoolYearName) throw new Error("Année scolaire obligatoire");
      if (!montantTotal || montantTotal <= 0) throw new Error("Montant total invalide");
      if (!montantPayeInput || montantPayeInput <= 0) throw new Error("Montant payé invalide");

      const student = await tx.student.findFirst({
        where: {
          id: studentId,
          anneeScolaire: schoolYearName,
        },
      });

      if (!student) throw new Error("Étudiant introuvable pour cette année scolaire");

      const trainingFee = await tx.trainingFee.findFirst({
        where: {
          id: trainingFeeId,
          schoolYearName,
        },
      });

      if (!trainingFee) {
        throw new Error("Frais de formation introuvable pour cette année scolaire");
      }

      const treasury = await findTreasury(body, schoolYearName, tx);

      if (!treasury) {
        throw new Error("Veuillez sélectionner une trésorerie valide pour cette année scolaire avant de payer.");
      }

      const existingFee = await tx.studentFee.findFirst({
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
        ? await tx.studentFee.update({
            where: { id: existingFee.id },
            data: {
              libelle,
              code,
              montantTotal,
              montantPaye: totalPaid,
              reste,
              status,
              paidAt:
                status === "PAYE"
                  ? safeDate(body.datePaiement || body.paymentDate || body.date)
                  : existingFee.paidAt,
            },
          })
        : await tx.studentFee.create({
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
              paidAt:
                status === "PAYE"
                  ? safeDate(body.datePaiement || body.paymentDate || body.date)
                  : null,
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
        tx,
      });

      const paymentReference = buildPaymentReference(
        body,
        studentId,
        trainingFeeId,
        requestIdempotencyKey
      );

      const movement = await createTreasuryMovementOnce({
        body: {
          ...body,
          studentId,
          trainingFeeId,
          schoolYearName,
          treasuryId: treasury.id,
          treasuryName: treasury.name,
          tresorerie: treasury.name,
          reference: paymentReference,
        },
        user,
        studentFee,
        amount: montantPayeInput,
        movementType: "ENTREE",
        description: `Paiement frais ${code} - ${libelle}`,
        idempotencyKey: requestIdempotencyKey || `${paymentReference}-ENTREE`,
        tx,
      });

      return {
        success: true,
        data: studentFee,
        payment,
        movement,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("STUDENT_FEES_POST_ERROR", error);
    return NextResponse.json(
      {
        error: error?.message || "Erreur serveur pendant le paiement",
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
    const requestIdempotencyKey = getRequestIdempotencyKey(req, body);
    const id = Number(body.id || 0);
    const action = cleanText(body.action).toUpperCase();
    const requestedSchoolYearName = getYearFromBody(body);

    if (!id) {
      return NextResponse.json({ error: "ID frais obligatoire" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingFee = await tx.studentFee.findUnique({
        where: { id },
      });

      if (!existingFee) throw new Error("Frais introuvable");

      if (requestedSchoolYearName && requestedSchoolYearName !== existingFee.schoolYearName) {
        throw new Error("Ce frais n'appartient pas à l'année scolaire sélectionnée");
      }

      if (action === "PAY") {
        const montantPayeInput = toNumber(
          body.montantPaye || existingFee.reste || existingFee.montantTotal
        );

        if (montantPayeInput <= 0) throw new Error("Montant invalide");

        const treasury = await findTreasury(body, existingFee.schoolYearName, tx);

        if (!treasury) {
          throw new Error("Veuillez sélectionner une trésorerie valide pour cette année scolaire avant de payer.");
        }

        const totalPaid = Math.min(
          Number(existingFee.montantTotal || 0),
          Number(existingFee.montantPaye || 0) + montantPayeInput
        );

        const reste = Math.max(0, Number(existingFee.montantTotal || 0) - totalPaid);
        const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

        const updatedFee = await tx.studentFee.update({
          where: { id },
          data: {
            montantPaye: totalPaid,
            reste,
            status,
            paidAt:
              status === "PAYE"
                ? safeDate(body.datePaiement || body.paymentDate || body.date)
                : existingFee.paidAt,
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
          tx,
        });

        const paymentReference = buildPaymentReference(
          body,
          existingFee.studentId,
          existingFee.trainingFeeId,
          requestIdempotencyKey
        );

        const movement = await createTreasuryMovementOnce({
          body: {
            ...body,
            studentId: existingFee.studentId,
            trainingFeeId: existingFee.trainingFeeId,
            schoolYearName: existingFee.schoolYearName,
            treasuryId: treasury.id,
            treasuryName: treasury.name,
            tresorerie: treasury.name,
            reference: paymentReference,
          },
          user,
          studentFee: updatedFee,
          amount: montantPayeInput,
          movementType: "ENTREE",
          description: `Paiement frais ${existingFee.code} - ${existingFee.libelle}`,
          idempotencyKey: requestIdempotencyKey || `${paymentReference}-ENTREE`,
          tx,
        });

        return {
          success: true,
          data: updatedFee,
          payment,
          movement,
        };
      }

      if (action === "CANCEL") {
        const payment = await findPaymentForFee(existingFee, tx);
        const originalMovement = await findOriginalPaymentMovement(existingFee, tx);

        const paidAmount = Math.max(
          Number(existingFee.montantPaye || 0),
          Number(payment?.montantPaye || 0),
          Number(originalMovement?.amount || 0)
        );

        // Atao aloha ny movement miaraka amin'ny référence stable.
        // Raha efa nisy annulation tamin'io ENTREE io dia tsy mamorona doublon.
        const movement = await createCancellationMovementOnce({
          user,
          studentFee: existingFee,
          originalMovement,
          amount: paidAmount,
          tx,
        });

        const updatedFee = await tx.studentFee.update({
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
          updatedPayment = await tx.studentPayment.update({
            where: { id: payment.id },
            data: {
              montantPaye: 0,
              reste: existingFee.montantTotal,
              status: "NON_PAYE",
            },
          });
        }

        return {
          success: true,
          cancelled: true,
          data: updatedFee,
          payment: updatedPayment,
          movement,
        };
      }

      throw new Error("Action invalide");
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("STUDENT_FEES_PATCH_ERROR", error);
    return NextResponse.json(
      {
        error: error?.message || "Erreur serveur pendant la modification paiement",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
