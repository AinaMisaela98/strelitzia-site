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

function parseJsonObject(value: any) {
  if (!value) return {} as Record<string, any>;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== "string") return {} as Record<string, any>;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : {};
  } catch {
    return {};
  }
}

function normalizeTarifName(value: any) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getSelectedTarifFromBody(body: any) {
  const raw =
    body?.tarifName ||
    body?.tarifReinscription ||
    body?.selectedTarif ||
    body?.tarifSelectionne ||
    body?.appliedTarif ||
    body?.tarifApplique ||
    body?.feeTarif ||
    "";

  const clean = cleanText(raw);
  if (!clean) return "";
  return normalizeTarifName(clean) === "principal" ? "Principal" : clean;
}


function getBodyAmount(body: any) {
  return toNumber(
    body?.montantTotal ??
      body?.total ??
      body?.totalAmount ??
      body?.amount ??
      body?.montant ??
      body?.montantFinal ??
      body?.amountFinal ??
      body?.selectedAmount ??
      body?.selectedTarifAmount ??
      body?.appliedAmount ??
      body?.amountApplied ??
      body?.tarifAmount ??
      body?.montantTarif ??
      body?.montantTarifSelectionne ??
      body?.montantChoisi ??
      body?.montantApplique ??
      body?.feeAmount ??
      body?.fraisAmount ??
      body?.fee?.montantTotal ??
      body?.fee?.amount ??
      body?.fee?.montant ??
      body?.selectedFee?.montantTotal ??
      body?.selectedFee?.amount ??
      body?.selectedFee?.montant
  );
}

function getBodyPaidAmount(body: any) {
  return toNumber(
    body?.montantPaye ??
      body?.paidAmount ??
      body?.amountPaid ??
      body?.paymentAmount ??
      body?.payAmount
  );
}

function getTrainingFeeSpecialTarifs(trainingFee: any) {
  return {
    ...parseJsonObject(trainingFee?.specials),
    ...parseJsonObject(trainingFee?.specialRates),
    ...parseJsonObject(trainingFee?.tarifsSpeciaux),
    ...parseJsonObject(trainingFee?.tarifs),
  } as Record<string, any>;
}

function resolveTrainingFeeAmountByTarif(trainingFee: any, selectedTarif: string, fallbackAmount = 0) {
  const principalAmount = toNumber(
    trainingFee?.montant ??
      trainingFee?.montantTotal ??
      trainingFee?.amount ??
      trainingFee?.tarif ??
      trainingFee?.value ??
      fallbackAmount
  );

  if (!selectedTarif || normalizeTarifName(selectedTarif) === "principal") {
    return principalAmount || fallbackAmount;
  }

  const specials = getTrainingFeeSpecialTarifs(trainingFee);

  const exact = specials[selectedTarif];
  if (exact !== undefined && exact !== null && cleanText(exact) !== "") {
    return toNumber(exact);
  }

  const matchedKey = Object.keys(specials).find(
    (key) => normalizeTarifName(key) === normalizeTarifName(selectedTarif)
  );

  if (matchedKey) {
    return toNumber(specials[matchedKey]);
  }

  // Raha tsy hita ilay tarif, dia tsy asiana mélange:
  // ampiasaina izay montant nalefan'ny page réinscription raha misy,
  // sinon principal no fallback farany.
  return fallbackAmount > 0 ? fallbackAmount : principalAmount;
}

function hasPositivePaymentAmount(body: any) {
  return getBodyPaidAmount(body) > 0;
}

function isCreateOnlyStudentFee(body: any) {
  const action = cleanText(body?.action).toUpperCase();
  const status = cleanText(body?.status || body?.statut).toUpperCase();

  return (
    action === "CREATE" ||
    action === "CREATE_ONLY" ||
    action === "REINSCRIPTION" ||
    action === "SYNC_REINSCRIPTION" ||
    status === "NON_PAYE" ||
    status === "NON_PAYÉ" ||
    status === "UNPAID" ||
    body?.createOnly === true ||
    body?.fromReinscription === true ||
    body?.isReinscription === true
  );
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
      const schoolYearName = await resolveSchoolYearName(getYearFromBody(body), tx);
      const selectedTarif = getSelectedTarifFromBody(body) || "Principal";

      if (!studentId) throw new Error("Étudiant obligatoire");
      if (!schoolYearName) throw new Error("Année scolaire obligatoire");

      const student = await tx.student.findFirst({
        where: {
          id: studentId,
          anneeScolaire: schoolYearName,
        },
      });

      if (!student) throw new Error("Étudiant introuvable pour cette année scolaire");

      // ---------------------------------------------------------------------
      // NOUVELLE LOGIQUE INSCRIPTION / RÉINSCRIPTION AVEC FEE-MODELS
      // ---------------------------------------------------------------------
      // Le frontend peut envoyer les frais ligne par ligne:
      // fees: [{ code, libelle, montant, tarifName, feeModelId }]
      // Dans ce cas, on ne demande PAS montantTotal global et on ne force PAS
      // trainingFeeId, car les lignes peuvent venir de /api/fee-models.
      // C'est exactement ce qui permet à StudentDetails d'afficher le tarif choisi
      // (ANCIEN, FAMILLE, PRINCIPAL, etc.) sans reprendre le principal.
      const bodyFeesRaw = Array.isArray(body.fees)
        ? body.fees
        : Array.isArray(body.rows)
          ? body.rows
          : Array.isArray(body.items)
            ? body.items
            : Array.isArray(body.selectedFees)
              ? body.selectedFees
              : [];

      if (bodyFeesRaw.length > 0) {
        const createdOrUpdatedFees: any[] = [];

        for (let index = 0; index < bodyFeesRaw.length; index += 1) {
          const row = bodyFeesRaw[index] || {};
          const rowTarif = getSelectedTarifFromBody(row) || selectedTarif || "Principal";
          const rowLibelle = cleanText(
            row.libelle || row.label || row.name || row.title || row.intitule || row.code || `Frais ${index + 1}`
          );
          const rowCode = cleanText(row.code || rowLibelle || `FRAIS-${index + 1}`).toUpperCase();

          const rowAmount = toNumber(
            row.montantTotal ??
              row.amount ??
              row.montant ??
              row.value ??
              row.tarifAmount ??
              row.selectedTarifAmount ??
              row.appliedAmount ??
              row.amountApplied ??
              row.montantTarifSelectionne ??
              row.montantChoisi ??
              row.montantApplique ??
              row.feeAmount ??
              row.fraisAmount
          );

          // On ignore seulement les lignes vides. Si toutes les lignes sont vides,
          // on renverra une erreur claire à la fin.
          if (!rowAmount || rowAmount <= 0) continue;

          const rowTrainingFeeId = Number(row.trainingFeeId || 0);
          let validTrainingFeeId: number | null = null;

          // Important: sourceTrainingFeeId / id venant des fee-models ne doit PAS
          // être forcé comme trainingFeeId. On n'associe trainingFeeId que si la
          // ligne existe vraiment dans la table TrainingFee.
          if (rowTrainingFeeId > 0) {
            const exists = await tx.trainingFee.findFirst({
              where: {
                id: rowTrainingFeeId,
                schoolYearName,
              },
              select: { id: true },
            });
            if (exists?.id) validTrainingFeeId = exists.id;
          }

          // Prisma schema-nao mbola mitaky trainingFeeId ao amin'ny StudentFee.
          // Noho izany, raha avy amin'ny fee-models ilay frais ka tsy manana
          // trainingFeeId marina, tadiavina amin'ny code + année + classe aloha
          // ilay TrainingFee mifanandrify aminy. Io no manakana ilay erreur:
          // "Argument trainingFeeId is missing".
          if (!validTrainingFeeId) {
            const matchedTrainingFee = await tx.trainingFee.findFirst({
              where: {
                schoolYearName,
                OR: [
                  { code: rowCode },
                  { libelle: rowLibelle },
                ],
                ...(student.classRoomId ? { classRoomId: Number(student.classRoomId) } : {}),
              },
              select: { id: true },
              orderBy: { id: "asc" },
            });

            if (matchedTrainingFee?.id) {
              validTrainingFeeId = matchedTrainingFee.id;
            }
          }

          // Raha mbola tsy misy TrainingFee mifanandrify, dia mamorona ligne
          // TrainingFee technique mifanaraka amin'ilay tarif sélectionné.
          // Tsy io no ampiasaina hitotaly, fa ilaina fotsiny satria required
          // ny relation StudentFee.trainingFeeId ao amin'ny schema.
          if (!validTrainingFeeId) {
            const createdTrainingFee = await tx.trainingFee.create({
              data: {
                schoolYearName,
                libelle: rowLibelle,
                code: rowCode,
                montant: rowAmount,
                ...(student.classRoomId ? { classRoomId: Number(student.classRoomId) } : {}),
                ...(student.classe ? { classe: String(student.classe) } : {}),
              },
              select: { id: true },
            });

            validTrainingFeeId = createdTrainingFee.id;
          }

          const montantPayeInput = toNumber(row.montantPaye || row.paidAmount || row.amountPaid || 0);
          const totalPaid = Math.min(rowAmount, montantPayeInput);
          const reste = Math.max(0, rowAmount - totalPaid);
          const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

          const existingFeeWhere = validTrainingFeeId
            ? {
                studentId,
                trainingFeeId: validTrainingFeeId,
                schoolYearName,
              }
            : {
                studentId,
                schoolYearName,
                code: rowCode,
                libelle: rowLibelle,
              };

          const existingFee = await tx.studentFee.findFirst({ where: existingFeeWhere });

          const data: any = {
            studentId,
            schoolYearName,
            libelle: rowLibelle,
            code: rowCode,
            montantTotal: rowAmount,
            montantPaye: totalPaid,
            reste,
            status,
            paidAt: status === "PAYE" ? safeDate(row.datePaiement || body.datePaiement || row.paymentDate || body.paymentDate || row.date || body.date) : null,
          };

          data.trainingFeeId = validTrainingFeeId;

          const studentFee = existingFee
            ? await tx.studentFee.update({
                where: { id: existingFee.id },
                data,
              })
            : await tx.studentFee.create({ data });

          createdOrUpdatedFees.push({
            ...studentFee,
            selectedTarif: rowTarif,
            amountApplied: rowAmount,
          });
        }

        if (createdOrUpdatedFees.length === 0) {
          throw new Error("Aucun frais valide trouvé dans le tarif sélectionné");
        }

        return {
          success: true,
          createOnly: true,
          selectedTarif,
          count: createdOrUpdatedFees.length,
          data: createdOrUpdatedFees,
          payment: null,
          movement: null,
        };
      }

      // ---------------------------------------------------------------------
      // ANCIENNE LOGIQUE COMPATIBLE: une seule ligne / paiement réel
      // ---------------------------------------------------------------------
      // IMPORTANT:
      // Aza ampiasaina sourceTrainingFeeId ho trainingFeeId.
      // sourceTrainingFeeId avy amin'ny fee-models dia tsy ID an'ny table TrainingFee.
      const trainingFeeId = Number(body.trainingFeeId || 0);
      const libelle = cleanText(
        body.libelle || body.label || body.name || body.code || "Frais"
      );
      const code = cleanText(body.code || libelle).toUpperCase();
      const bodyAmount = getBodyAmount(body);
      const shouldCreateOnly = isCreateOnlyStudentFee(body) || !hasPositivePaymentAmount(body);

      // Paiement réel: trainingFeeId reste obligatoire.
      // Création inscription/réinscription via fee-models: trainingFeeId peut être absent
      // si le frontend envoie déjà le montant réel du tarif sélectionné.
      if (!shouldCreateOnly && !trainingFeeId) {
        throw new Error("Frais obligatoire");
      }

      let trainingFee: any = null;
      if (trainingFeeId) {
        trainingFee = await tx.trainingFee.findFirst({
          where: {
            id: trainingFeeId,
            schoolYearName,
          },
        });

        if (!trainingFee && !shouldCreateOnly) {
          throw new Error("Frais de formation introuvable pour cette année scolaire");
        }
      }

      const montantTotal = trainingFee
        ? resolveTrainingFeeAmountByTarif(trainingFee, selectedTarif, bodyAmount)
        : bodyAmount;

      if (!montantTotal || montantTotal <= 0) {
        throw new Error("Aucun frais valide trouvé dans le tarif sélectionné");
      }

      const montantPayeInput = shouldCreateOnly ? 0 : getBodyPaidAmount(body);

      // Paiement réel: trésorerie obligatoire.
      // Création inscription/réinscription: pas besoin de trésorerie, car aucun mouvement n'est créé.
      const treasury = shouldCreateOnly ? null : await findTreasury(body, schoolYearName, tx);

      if (!shouldCreateOnly && !treasury) {
        throw new Error("Veuillez sélectionner une trésorerie valide pour cette année scolaire avant de payer.");
      }

      const existingFeeWhere = trainingFeeId
        ? {
            studentId,
            trainingFeeId,
            schoolYearName,
          }
        : {
            studentId,
            schoolYearName,
            code,
            libelle,
          };

      const existingFee = await tx.studentFee.findFirst({
        where: existingFeeWhere,
      });

      const previousPaid = Number(existingFee?.montantPaye || 0);
      const totalPaid = Math.min(montantTotal, previousPaid + montantPayeInput);
      const reste = Math.max(0, montantTotal - totalPaid);
      const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

      const baseStudentFeeData: any = {
        studentId,
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
      };

      // Ampidirina trainingFeeId ihany raha tena ID an'ny table TrainingFee izy.
      if (trainingFeeId && trainingFee) {
        baseStudentFeeData.trainingFeeId = trainingFeeId;
      }

      const studentFee = existingFee
        ? await tx.studentFee.update({
            where: { id: existingFee.id },
            data: baseStudentFeeData,
          })
        : await tx.studentFee.create({
            data: baseStudentFeeData,
          });

      // Création frais de réinscription fotsiny:
      // tsy misy paiement, tsy misy StudentPayment, tsy misy mouvement trésorerie.
      if (shouldCreateOnly || montantPayeInput <= 0) {
        return {
          success: true,
          createOnly: true,
          selectedTarif: selectedTarif || "Principal",
          amountApplied: montantTotal,
          data: studentFee,
          payment: null,
          movement: null,
        };
      }

      // Paiement réel: StudentPayment mila trainingFeeId tena izy.
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
          treasuryId: treasury!.id,
          treasuryName: treasury!.name,
          tresorerie: treasury!.name,
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
        selectedTarif: selectedTarif || "Principal",
        amountApplied: montantTotal,
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
