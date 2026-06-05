import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function getMovementStoredAmount(movement: any) {
  if (!movement) return 0;

  const debit = toNumber(movement.debit);
  const credit = toNumber(movement.credit);
  const amount = toNumber(movement.amount ?? movement.montant ?? movement.feeAmount);

  if (debit > 0) return debit;
  if (credit > 0) return credit;
  return amount;
}

function safeDate(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return new Date();

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
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

  if (matchedKey) return toNumber(specials[matchedKey]);

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


function normalizeAction(value: unknown) {
  return cleanText(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "_");
}

function isPayAction(value: unknown) {
  const action = normalizeAction(value);
  return action === "PAY" || action === "PAIEMENT" || action === "PAYER" || action === "PAID";
}

function isCancelAction(value: unknown) {
  const action = normalizeAction(value);
  return (
    action === "CANCEL" ||
    action === "ANNULER" ||
    action === "ANNULATION" ||
    action === "CANCEL_PAYMENT" ||
    action === "ANNULATION_PAIEMENT"
  );
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

function modelFieldMetas(modelName: string) {
  const runtimeModel = (prisma as any)?._runtimeDataModel?.models?.[modelName];
  return runtimeModel?.fields || [];
}

function modelFieldNames(modelName: string) {
  return modelFieldMetas(modelName).map((f: any) => f.name) as string[];
}

function modelHasField(modelName: string, fieldName: string) {
  return modelFieldNames(modelName).includes(fieldName);
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

async function getDefaultSite(tx: any = prisma) {
  let site = await tx.site.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true },
  });

  if (!site) {
    site = await tx.site.create({
      data: {
        name: "Strelitzia School",
        code: "STRELITZIA",
        active: true,
      },
      select: { id: true, name: true, code: true },
    });
  }

  return site;
}

async function resolveSiteFromBody(body: any, tx: any = prisma) {
  const rawSiteId = Number(body?.siteId || 0);
  const siteName = cleanText(body?.site || body?.siteName);
  const siteCode = cleanText(body?.siteCode);

  if (rawSiteId) {
    const site = await tx.site.findUnique({
      where: { id: rawSiteId },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  if (siteCode) {
    const site = await tx.site.findUnique({
      where: { code: siteCode },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  if (siteName) {
    const site = await tx.site.findFirst({
      where: { name: siteName },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  return getDefaultSite(tx);
}

async function resolveSiteFromUrl(url: URL, tx: any = prisma) {
  return resolveSiteFromBody(
    {
      siteId: url.searchParams.get("siteId"),
      site: url.searchParams.get("site"),
      siteName: url.searchParams.get("siteName"),
      siteCode: url.searchParams.get("siteCode"),
    },
    tx
  );
}

function addSiteWhere(modelName: string, where: any, site: any) {
  if (!site) return where;

  if (modelHasField(modelName, "siteId")) {
    where.siteId = Number(site.id);
  } else if (modelHasField(modelName, "site")) {
    where.site = String(site.name || "");
  }

  return where;
}

function addSiteData(modelName: string, data: any, site: any) {
  if (!site) return data;

  if (modelHasField(modelName, "siteId")) {
    data.siteId = Number(site.id);
  }

  if (modelHasField(modelName, "site")) {
    data.site = String(site.name || "");
  }

  return data;
}

async function findTreasury(body: any, schoolYearName: string, tx: any = prisma) {
  const treasuryId = Number(body.treasuryId || body.tresorerieId || 0);
  const treasuryName = cleanText(
    body.treasuryName || body.tresorerie || body.treasury || body.caisse
  );
  const selectedSite = await resolveSiteFromBody(body, tx);

  if (!schoolYearName) return null;

  // 1) Si l'utilisateur a sélectionné une trésorerie par ID, l'ID est prioritaire.
  // On essaie d'abord avec année + site, puis on relâche seulement le site.
  // Cela évite l'erreur quand l'étudiant/site envoyé par StudentDetails ne correspond
  // pas parfaitement au site enregistré sur la trésorerie.
  if (treasuryId) {
    const exactWhere: any = {
      id: treasuryId,
      active: true,
      schoolYearName,
    };

    addSiteWhere("Treasury", exactWhere, selectedSite);

    let treasury = await tx.treasury.findFirst({ where: exactWhere });
    if (treasury) return treasury;

    treasury = await tx.treasury.findFirst({
      where: {
        id: treasuryId,
        active: true,
        schoolYearName,
      },
    });
    if (treasury) return treasury;
  }

  // 2) Recherche par nom avec année + site, puis par nom + année uniquement.
  if (treasuryName) {
    const exactWhere: any = {
      name: treasuryName,
      active: true,
      schoolYearName,
    };

    addSiteWhere("Treasury", exactWhere, selectedSite);

    let treasury = await tx.treasury.findFirst({ where: exactWhere });
    if (treasury) return treasury;

    treasury = await tx.treasury.findFirst({
      where: {
        name: treasuryName,
        active: true,
        schoolYearName,
      },
    });
    if (treasury) return treasury;
  }

  // 3) Fallback: trésorerie principale active de l'année scolaire.
  const exactFallbackWhere: any = {
    active: true,
    schoolYearName,
  };

  addSiteWhere("Treasury", exactFallbackWhere, selectedSite);

  let treasury = await tx.treasury.findFirst({
    where: exactFallbackWhere,
    orderBy: [{ isPrincipal: "desc" }, { id: "asc" }],
  });
  if (treasury) return treasury;

  return tx.treasury.findFirst({
    where: {
      active: true,
      schoolYearName,
    },
    orderBy: [{ isPrincipal: "desc" }, { id: "asc" }],
  });
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
  return key ? `${key}-${movementType}` : `${baseReference}-${movementType}`;
}

async function upsertStudentPayment({
  studentId,
  trainingFeeId,
  studentFeeId,
  schoolYearName,
  montantTotal,
  montantPaye,
  reste,
  status,
  site,
  tx = prisma,
}: {
  studentId: number;
  trainingFeeId: number;
  studentFeeId?: number;
  schoolYearName: string;
  montantTotal: number;
  montantPaye: number;
  reste: number;
  status: string;
  site?: any;
  tx?: any;
}) {
  const where: any = modelHasField("StudentPayment", "studentFeeId") && studentFeeId
    ? { studentFeeId, schoolYearName }
    : { studentId, trainingFeeId, schoolYearName };

  addSiteWhere("StudentPayment", where, site);

  const existing = await tx.studentPayment.findFirst({ where });

  const data: any = {
    studentId,
    trainingFeeId,
    schoolYearName,
    montantTotal,
    montantPaye,
    reste,
    status,
  };

  if (modelHasField("StudentPayment", "studentFeeId") && studentFeeId) {
    data.studentFeeId = studentFeeId;
  }

  addSiteData("StudentPayment", data, site);

  if (existing) {
    return tx.studentPayment.update({
      where: { id: existing.id },
      data,
    });
  }

  return tx.studentPayment.create({ data });
}


async function getStudentMovementInfo(tx: any, studentId: number) {
  if (!studentId) {
    return { name: "Étudiant", matricule: "" };
  }

  try {
    const student = await tx.student.findUnique({
      where: { id: studentId },
    });

    const name = cleanText(
      [
        student?.nom,
        student?.prenoms || student?.prenom || student?.firstName,
      ]
        .filter(Boolean)
        .join(" ")
    );

    return {
      name: name || cleanText(student?.name) || `Étudiant #${studentId}`,
      matricule: cleanText(student?.matricule || student?.registrationNumber || student?.code),
      className: cleanText(student?.classe || student?.className || student?.classRoomName),
    };
  } catch {
    return { name: `Étudiant #${studentId}`, matricule: "", className: "" };
  }
}

function addMovementExtraData(modelName: string, data: any, extra: any = {}) {
  const setIfField = (field: string, value: any) => {
    if (modelHasField(modelName, field) && value !== undefined && value !== null && cleanText(value) !== "") {
      data[field] = value;
    }
  };

  // Champs séparés pour que la page Trésorerie Mouvement affiche proprement:
  // NOM = studentName, Matricule = studentMatricule, Motif = description/motif uniquement.
  setIfField("studentName", extra.studentName);
  setIfField("studentMatricule", extra.matricule);
  setIfField("matricule", extra.matricule);
  setIfField("studentClasse", extra.className);
  setIfField("studentClassLabel", extra.className);
  setIfField("className", extra.className);
  setIfField("feeCode", extra.feeCode);
  setIfField("feeLabel", extra.feeLabel);
  setIfField("code", extra.feeCode);
  setIfField("libelle", extra.feeLabel);
  setIfField("description", extra.description);
  setIfField("motif", extra.description);
  setIfField("source", "FRAIS_DE_FORMATION");
  setIfField("sourceType", "STUDENT_FEE");

  return data;
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

  const selectedSite =
    studentFee.siteId || studentFee.site
      ? {
          id: Number(studentFee.siteId || body.siteId || 0),
          name: String(studentFee.site || body.site || body.siteName || ""),
          code: body.siteCode || "",
        }
      : await resolveSiteFromBody(body, tx);

  const treasury = await findTreasury(
    { ...body, siteId: selectedSite.id, site: selectedSite.name },
    schoolYearName,
    tx
  );

  if (!treasury) {
    throw new Error("Trésorerie obligatoire ou introuvable pour cette année scolaire et ce site");
  }

  const studentId = Number(studentFee.studentId || body.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || body.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || body.studentFeeId || 0);
  const studentInfo = await getStudentMovementInfo(tx, studentId);
  const feeCode = cleanText(studentFee.code || body.code || body.feeCode || "");
  const feeLabel = cleanText(studentFee.libelle || body.libelle || body.feeLabel || "");
  const baseReference = buildPaymentReference(body, studentId, trainingFeeId, idempotencyKey);

  // ANTI-DOUBLON TRESORERIE:
  // On lie la référence au frais lui-même. Ainsi, si le frontend renvoie
  // deux fois le même paiement avec la même référence mais un autre header
  // Idempotency-Key, on retrouve le même mouvement au lieu de créer un doublon.
  // Un nouveau paiement après annulation aura une nouvelle référence PAY-...
  // et créera donc une nouvelle ENTREE normale.
  const stableReference = `${baseReference}-FEE-${studentFeeId || trainingFeeId || studentId}-${movementType}`;

  const movementWhere: any = {
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
  };

  addSiteWhere("TreasuryMovement", movementWhere, selectedSite);

  const existingMovement = await tx.treasuryMovement.findFirst({
    where: movementWhere,
    orderBy: { id: "desc" },
  });

  if (existingMovement) return existingMovement;

  // Sécurité supplémentaire contre les doublons historiques: même frais,
  // même sens, même catégorie, même montant, même baseReference => même mouvement.
  const logicalDuplicateWhere: any = {
    treasuryId: treasury.id,
    movementType,
    category:
      movementType === "ENTREE"
        ? "PAIEMENT_FRAIS"
        : "ANNULATION_PAIEMENT_FRAIS",
    amount,
    studentId: studentId || undefined,
    trainingFeeId: trainingFeeId || undefined,
    studentFeeId: studentFeeId || undefined,
    schoolYearName,
    reference: { contains: `${baseReference}-FEE-` },
  };

  addSiteWhere("TreasuryMovement", logicalDuplicateWhere, selectedSite);

  const logicalDuplicate = await tx.treasuryMovement.findFirst({
    where: logicalDuplicateWhere,
    orderBy: { id: "desc" },
  });

  if (logicalDuplicate) return logicalDuplicate;

  const movementMotif = cleanText(description) ||
    (movementType === "ENTREE" ? "Paiement frais de formation" : "Annulation frais de formation");

  const movementData: any = {
    treasuryId: treasury.id,
    movementType,
    category:
      movementType === "ENTREE"
        ? "PAIEMENT_FRAIS"
        : "ANNULATION_PAIEMENT_FRAIS",
    amount,
    // IMPORTANT: description/motif/libelle = motif uniquement.
    // Le nom, matricule et classe de l'élève sont stockés dans des champs séparés.
    description: movementMotif,
    reference: stableReference,
    studentId: studentId || null,
    trainingFeeId: trainingFeeId || null,
    studentFeeId: studentFeeId || null,
    schoolYearName,
    createdBy: user?.email || user?.name || null,
    createdAt: safeDate(body.createdAt || body.date || body.datePaiement || body.paymentDate),
  };

  addMovementExtraData("TreasuryMovement", movementData, {
    studentName: studentInfo.name,
    matricule: studentInfo.matricule,
    className: studentInfo.className,
    feeCode,
    feeLabel,
    description: movementMotif,
  });

  addSiteData("TreasuryMovement", movementData, selectedSite);

  return tx.treasuryMovement.create({ data: movementData });
}

async function findPaymentForFee(studentFee: any, tx: any = prisma) {
  const studentFeeId = Number(studentFee.id || studentFee.studentFeeId || 0);
  const where: any = modelHasField("StudentPayment", "studentFeeId") && studentFeeId
    ? {
        studentFeeId,
        schoolYearName: String(studentFee.schoolYearName || ""),
      }
    : {
        studentId: Number(studentFee.studentId || 0),
        trainingFeeId: Number(studentFee.trainingFeeId || 0),
        schoolYearName: String(studentFee.schoolYearName || ""),
      };

  const site =
    studentFee.siteId || studentFee.site
      ? { id: studentFee.siteId, name: studentFee.site || "" }
      : null;

  addSiteWhere("StudentPayment", where, site);

  return tx.studentPayment.findFirst({
    where,
    orderBy: { id: "desc" },
  });
}

async function findOriginalPaymentMovement(studentFee: any, tx: any = prisma) {
  const studentId = Number(studentFee.studentId || 0);
  const trainingFeeId = Number(studentFee.trainingFeeId || 0);
  const studentFeeId = Number(studentFee.id || 0);
  const schoolYearName = String(studentFee.schoolYearName || "");
  const amount = Number(studentFee.montantPaye || 0);

  const selectedSite =
    studentFee.siteId || studentFee.site
      ? { id: studentFee.siteId, name: studentFee.site || "" }
      : null;

  const baseWhere: any = {
    movementType: "ENTREE",
    category: "PAIEMENT_FRAIS",
    schoolYearName,
  };

  addSiteWhere("TreasuryMovement", baseWhere, selectedSite);

  // 1) Le vrai lien: même StudentFee.
  if (studentFeeId) {
    const byStudentFee = await tx.treasuryMovement.findFirst({
      where: {
        ...baseWhere,
        studentFeeId,
      },
      orderBy: { id: "desc" },
    });

    if (byStudentFee) return byStudentFee;
  }

  // 2) Fallback contrôlé: même étudiant + même frais + même montant payé.
  // Cela évite d'annuler le montant principal si c'est un tarif Ancien qui a été payé.
  if (studentId && trainingFeeId && amount > 0) {
    const byExactAmount = await tx.treasuryMovement.findFirst({
      where: {
        ...baseWhere,
        studentId,
        trainingFeeId,
        amount,
      },
      orderBy: { id: "desc" },
    });

    if (byExactAmount) return byExactAmount;
  }

  return null;
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

  const selectedSite =
    studentFee.siteId || studentFee.site
      ? { id: studentFee.siteId, name: studentFee.site || "" }
      : null;

  const treasuryWhere: any = {
    id: treasuryId,
    schoolYearName,
  };

  addSiteWhere("Treasury", treasuryWhere, selectedSite);

  const treasury = await tx.treasury.findFirst({
    where: treasuryWhere,
  });

  if (!treasury) return null;

  const reference = `CANCEL-FEE-${studentFeeId}-${schoolYearName}-MOVE-${originalMovementId}`;

  const cancelWhere: any = {
    treasuryId,
    movementType: "SORTIE",
    category: "ANNULATION_PAIEMENT_FRAIS",
    reference,
    studentId: studentId || undefined,
    trainingFeeId: trainingFeeId || undefined,
    studentFeeId: studentFeeId || undefined,
    schoolYearName,
  };

  addSiteWhere("TreasuryMovement", cancelWhere, selectedSite);

  const alreadyCancelled = await tx.treasuryMovement.findFirst({
    where: cancelWhere,
    orderBy: { id: "desc" },
  });

  if (alreadyCancelled) return alreadyCancelled;

  const studentInfo = await getStudentMovementInfo(tx, studentId);
  const feeCode = cleanText(studentFee.code || "");
  const feeLabel = cleanText(studentFee.libelle || "");
  const cancelMotif = cleanText(`Annulation paiement frais ${feeCode}${feeLabel ? ` - ${feeLabel}` : ""}`);

  const cancelData: any = {
    treasuryId,
    movementType: "SORTIE",
    category: "ANNULATION_PAIEMENT_FRAIS",
    amount,
    // Motif uniquement, sans nom/matricule.
    description: cancelMotif,
    reference,
    studentId: studentId || null,
    trainingFeeId: trainingFeeId || null,
    studentFeeId: studentFeeId || null,
    schoolYearName,
    createdBy: user?.email || user?.name || null,
    createdAt: new Date(),
  };

  addMovementExtraData("TreasuryMovement", cancelData, {
    studentName: studentInfo.name,
    matricule: studentInfo.matricule,
    className: studentInfo.className,
    feeCode,
    feeLabel,
    description: cancelMotif,
  });

  addSiteData("TreasuryMovement", cancelData, selectedSite);

  return tx.treasuryMovement.create({ data: cancelData });
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
    const selectedSite = await resolveSiteFromUrl(url);

    const where: any = {
      schoolYearName,
      ...(studentId ? { studentId } : {}),
      ...(trainingFeeId ? { trainingFeeId } : {}),
    };

    addSiteWhere("StudentFee", where, selectedSite);

    const fees = await prisma.studentFee.findMany({
      where,
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      data: fees,
      studentFees: fees,
      siteId: selectedSite.id,
      site: selectedSite.name,
      siteCode: selectedSite.code,
      schoolYearName,
      anneeScolaire: schoolYearName,
    });
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
      const selectedSite = await resolveSiteFromBody(body, tx);
      const selectedTarif = getSelectedTarifFromBody(body) || "Principal";

      if (!studentId) throw new Error("Étudiant obligatoire");
      if (!schoolYearName) throw new Error("Année scolaire obligatoire");

      const studentWhere: any = {
        id: studentId,
        anneeScolaire: schoolYearName,
      };

      addSiteWhere("Student", studentWhere, selectedSite);

      const student = await tx.student.findFirst({ where: studentWhere });

      if (!student) {
        throw new Error("Étudiant introuvable pour cette année scolaire et ce site");
      }

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

          if (!rowAmount || rowAmount <= 0) continue;

          const rowTrainingFeeId = Number(row.trainingFeeId || 0);
          let validTrainingFeeId: number | null = null;

          if (rowTrainingFeeId > 0) {
            const trainingFeeWhere: any = {
              id: rowTrainingFeeId,
              schoolYearName,
            };

            addSiteWhere("TrainingFee", trainingFeeWhere, selectedSite);

            const exists = await tx.trainingFee.findFirst({
              where: trainingFeeWhere,
              select: { id: true },
            });

            if (exists?.id) validTrainingFeeId = exists.id;
          }

          if (!validTrainingFeeId) {
            const matchedWhere: any = {
              schoolYearName,
              OR: [
                { code: rowCode },
                { libelle: rowLibelle },
              ],
              ...(student.classe ? { classe: student.classe } : {}),
            };

            addSiteWhere("TrainingFee", matchedWhere, selectedSite);

            const matchedTrainingFee = await tx.trainingFee.findFirst({
              where: matchedWhere,
              select: { id: true },
              orderBy: { id: "asc" },
            });

            if (matchedTrainingFee?.id) {
              validTrainingFeeId = matchedTrainingFee.id;
            }
          }

          if (!validTrainingFeeId) {
            const technicalTrainingFeeData: any = {
              schoolYearName,
              libelle: rowLibelle,
              code: rowCode,
              montant: rowAmount,
              classe: student.classe || "",
            };

            addSiteData("TrainingFee", technicalTrainingFeeData, selectedSite);

            const createdTrainingFee = await tx.trainingFee.create({
              data: technicalTrainingFeeData,
              select: { id: true },
            });

            validTrainingFeeId = createdTrainingFee.id;
          }

          const montantPayeInput = toNumber(row.montantPaye || row.paidAmount || row.amountPaid || 0);
          const totalPaid = Math.min(rowAmount, montantPayeInput);
          const reste = Math.max(0, rowAmount - totalPaid);
          const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

          const existingFeeWhere: any = validTrainingFeeId
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

          addSiteWhere("StudentFee", existingFeeWhere, selectedSite);

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
            paidAt:
              status === "PAYE"
                ? safeDate(row.datePaiement || body.datePaiement || row.paymentDate || body.paymentDate || row.date || body.date)
                : null,
            trainingFeeId: validTrainingFeeId,
          };

          addSiteData("StudentFee", data, selectedSite);

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
          siteId: selectedSite.id,
          site: selectedSite.name,
          schoolYearName,
          count: createdOrUpdatedFees.length,
          data: createdOrUpdatedFees,
          payment: null,
          movement: null,
        };
      }

      const trainingFeeId = Number(body.trainingFeeId || 0);
      const libelle = cleanText(
        body.libelle || body.label || body.name || body.code || "Frais"
      );
      const code = cleanText(body.code || libelle).toUpperCase();
      const bodyAmount = getBodyAmount(body);
      const shouldCreateOnly = isCreateOnlyStudentFee(body) || !hasPositivePaymentAmount(body);

      if (!shouldCreateOnly && !trainingFeeId) {
        throw new Error("Frais obligatoire");
      }

      let trainingFee: any = null;
      if (trainingFeeId) {
        const trainingFeeWhere: any = {
          id: trainingFeeId,
          schoolYearName,
        };

        addSiteWhere("TrainingFee", trainingFeeWhere, selectedSite);

        trainingFee = await tx.trainingFee.findFirst({
          where: trainingFeeWhere,
        });

        if (!trainingFee && !shouldCreateOnly) {
          throw new Error("Frais de formation introuvable pour cette année scolaire et ce site");
        }
      }

      const resolvedTrainingAmount = trainingFee
        ? resolveTrainingFeeAmountByTarif(trainingFee, selectedTarif, bodyAmount)
        : bodyAmount;

      // LOGIQUE REELLE TARIF:
      // Raha paiement avy amin'ny StudentDetails no mandefa montantTotal/montantPaye,
      // io montant nalefa io no tena tarif voafidy (oh: Ancien), fa tsy voatery ilay Principal.
      // Izany no miaro annulation tsy hiverina amin'ny frais principal.
      const montantTotal = !shouldCreateOnly && bodyAmount > 0
        ? bodyAmount
        : resolvedTrainingAmount;

      if (!montantTotal || montantTotal <= 0) {
        throw new Error("Aucun frais valide trouvé dans le tarif sélectionné");
      }

      const montantPayeInput = shouldCreateOnly ? 0 : getBodyPaidAmount(body);

      const treasury = shouldCreateOnly
        ? null
        : await findTreasury(
            { ...body, siteId: selectedSite.id, site: selectedSite.name },
            schoolYearName,
            tx
          );

      if (!shouldCreateOnly && !treasury) {
        throw new Error("Veuillez sélectionner une trésorerie valide pour cette année scolaire et ce site avant de payer.");
      }

      const existingFeeWhere: any = trainingFeeId
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

      addSiteWhere("StudentFee", existingFeeWhere, selectedSite);

      const existingFee = await tx.studentFee.findFirst({
        where: existingFeeWhere,
      });

      const previousPaid = Number(existingFee?.montantPaye || 0);

      if (!shouldCreateOnly && previousPaid >= montantTotal) {
        throw new Error("Ce frais est déjà payé. Annulez d'abord le paiement si vous voulez le refaire.");
      }

      const amountToPay = shouldCreateOnly ? 0 : Math.min(montantPayeInput, Math.max(0, montantTotal - previousPaid));
      const totalPaid = Math.min(montantTotal, previousPaid + amountToPay);
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

      addSiteData("StudentFee", baseStudentFeeData, selectedSite);

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

      if (shouldCreateOnly || amountToPay <= 0) {
        return {
          success: true,
          createOnly: true,
          selectedTarif: selectedTarif || "Principal",
          amountApplied: montantTotal,
          siteId: selectedSite.id,
          site: selectedSite.name,
          schoolYearName,
          data: studentFee,
          payment: null,
          movement: null,
        };
      }

      const payment = await upsertStudentPayment({
        studentId,
        trainingFeeId,
        studentFeeId: studentFee.id,
        schoolYearName,
        montantTotal,
        montantPaye: totalPaid,
        reste,
        status,
        site: selectedSite,
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
          siteId: selectedSite.id,
          site: selectedSite.name,
          siteName: selectedSite.name,
          siteCode: selectedSite.code,
          treasuryId: treasury!.id,
          treasuryName: treasury!.name,
          tresorerie: treasury!.name,
          reference: paymentReference,
        },
        user,
        studentFee,
        amount: amountToPay,
        movementType: "ENTREE",
        description: `Paiement frais ${code} - ${libelle}`,
        idempotencyKey: requestIdempotencyKey || `${paymentReference}-ENTREE`,
        tx,
      });

      return {
        success: true,
        selectedTarif: selectedTarif || "Principal",
        amountApplied: montantTotal,
        siteId: selectedSite.id,
        site: selectedSite.name,
        schoolYearName,
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
    const action = normalizeAction(body.action);
    const requestedSchoolYearName = getYearFromBody(body);
    const requestedSite = await resolveSiteFromBody(body);

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

      if (
        modelHasField("StudentFee", "siteId") &&
        existingFee.siteId &&
        Number(existingFee.siteId) !== Number(requestedSite.id)
      ) {
        throw new Error("Ce frais n'appartient pas au site sélectionné");
      }

      const existingSite =
        existingFee.siteId || existingFee.site
          ? {
              id: existingFee.siteId || requestedSite.id,
              name: existingFee.site || requestedSite.name,
              code: requestedSite.code,
            }
          : requestedSite;

      if (isPayAction(action)) {
        const montantPayeInput = toNumber(
          body.montantPaye || existingFee.reste || existingFee.montantTotal
        );

        if (montantPayeInput <= 0) throw new Error("Montant invalide");
        if (Number(existingFee.montantPaye || 0) >= Number(existingFee.montantTotal || 0)) {
          throw new Error("Ce frais est déjà payé. Annulez d'abord le paiement si vous voulez le refaire.");
        }

        const treasury = await findTreasury(
          {
            ...body,
            siteId: existingSite.id,
            site: existingSite.name,
          },
          existingFee.schoolYearName,
          tx
        );

        if (!treasury) {
          throw new Error("Veuillez sélectionner une trésorerie valide pour cette année scolaire et ce site avant de payer.");
        }

        const bodyTotalAmount = getBodyAmount(body);
        const realMontantTotal = bodyTotalAmount > 0 && Number(existingFee.montantPaye || 0) <= 0
          ? bodyTotalAmount
          : Number(existingFee.montantTotal || 0);

        const amountToPay = Math.min(
          montantPayeInput,
          Math.max(0, realMontantTotal - Number(existingFee.montantPaye || 0))
        );

        const totalPaid = Math.min(
          realMontantTotal,
          Number(existingFee.montantPaye || 0) + amountToPay
        );

        const reste = Math.max(0, realMontantTotal - totalPaid);
        const status = reste <= 0 ? "PAYE" : totalPaid > 0 ? "PARTIEL" : "NON_PAYE";

        const updateData: any = {
          montantTotal: realMontantTotal,
          montantPaye: totalPaid,
          reste,
          status,
          paidAt:
            status === "PAYE"
              ? safeDate(body.datePaiement || body.paymentDate || body.date)
              : existingFee.paidAt,
        };

        addSiteData("StudentFee", updateData, existingSite);

        const updatedFee = await tx.studentFee.update({
          where: { id },
          data: updateData,
        });

        const payment = await upsertStudentPayment({
          studentId: existingFee.studentId,
          trainingFeeId: existingFee.trainingFeeId,
          studentFeeId: existingFee.id,
          schoolYearName: existingFee.schoolYearName,
          montantTotal: existingFee.montantTotal,
          montantPaye: totalPaid,
          reste,
          status,
          site: existingSite,
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
            siteId: existingSite.id,
            site: existingSite.name,
            siteName: existingSite.name,
            siteCode: existingSite.code,
            treasuryId: treasury.id,
            treasuryName: treasury.name,
            tresorerie: treasury.name,
            reference: paymentReference,
          },
          user,
          studentFee: updatedFee,
          amount: amountToPay,
          movementType: "ENTREE",
          description: `Paiement frais ${existingFee.code} - ${existingFee.libelle}`,
          idempotencyKey: requestIdempotencyKey || `${paymentReference}-ENTREE`,
          tx,
        });

        return {
          success: true,
          siteId: existingSite.id,
          site: existingSite.name,
          data: updatedFee,
          payment,
          movement,
        };
      }

      if (isCancelAction(action)) {
        const payment = await findPaymentForFee(existingFee, tx);
        const originalMovement = await findOriginalPaymentMovement(existingFee, tx);

        // Annulation réelle: on sort exactement le montant entré lors du paiement.
        // Priorité: mouvement ENTREE original -> StudentPayment -> StudentFee.
        // Cela évite qu'un tarif "Ancien" annulé devienne le montant principal.
        const paidAmount =
          getMovementStoredAmount(originalMovement) ||
          toNumber(payment?.montantPaye || payment?.amount || payment?.montantTotal) ||
          toNumber(existingFee.montantPaye || 0);

        if (paidAmount <= 0 || existingFee.status === "NON_PAYE") {
          throw new Error("Aucun paiement à annuler pour ce frais.");
        }

        // ANNULATION TRESORERIE SECURISEE:
        // Avant, l'annulation refusait ou ne créait rien si le mouvement ENTREE original
        // n'était pas retrouvé. Maintenant, dès que le StudentFee est vraiment PAYE,
        // on crée toujours une SORTIE liée au frais, sans doublon grâce à la référence stable.
        const cancelReference = cleanText(body.reference).startsWith("CANCEL-") ||
          cleanText(body.reference).startsWith("ANNULATION-")
            ? cleanText(body.reference)
            : `CANCEL-FEE-${existingFee.id}-${existingFee.schoolYearName}-${cleanText(body.reference) || requestIdempotencyKey || "NOREF"}`;

        const movement = await createTreasuryMovementOnce({
          body: {
            ...body,
            studentId: existingFee.studentId,
            trainingFeeId: existingFee.trainingFeeId,
            studentFeeId: existingFee.id,
            schoolYearName: existingFee.schoolYearName,
            siteId: existingSite.id,
            site: existingSite.name,
            siteName: existingSite.name,
            siteCode: existingSite.code,
            treasuryId: originalMovement?.treasuryId || body.treasuryId,
            treasuryName: body.treasuryName || body.tresorerie,
            tresorerie: body.tresorerie || body.treasuryName,
            reference: cancelReference,
            date: body.date || body.datePaiement || body.paymentDate || new Date(),
            datePaiement: body.datePaiement || body.date || body.paymentDate || new Date(),
            paymentDate: body.paymentDate || body.datePaiement || body.date || new Date(),
            createdAt: body.createdAt || body.insertedAt || body.actionAt || new Date(),
          },
          user,
          studentFee: existingFee,
          amount: paidAmount,
          movementType: "SORTIE",
          description: `Annulation paiement frais ${existingFee.code || ""} - ${existingFee.libelle || ""}`,
          idempotencyKey: requestIdempotencyKey || `${cancelReference}-SORTIE`,
          tx,
        });

        const updateData: any = {
          montantPaye: 0,
          reste: existingFee.montantTotal,
          status: "NON_PAYE",
          paidAt: null,
        };

        addSiteData("StudentFee", updateData, existingSite);

        const updatedFee = await tx.studentFee.update({
          where: { id },
          data: updateData,
        });

        let updatedPayment = null;

        if (payment) {
          const paymentData: any = {
            montantPaye: 0,
            reste: existingFee.montantTotal,
            status: "NON_PAYE",
          };

          addSiteData("StudentPayment", paymentData, existingSite);

          updatedPayment = await tx.studentPayment.update({
            where: { id: payment.id },
            data: paymentData,
          });
        }

        return {
          success: true,
          cancelled: true,
          siteId: existingSite.id,
          site: existingSite.name,
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
