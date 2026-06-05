import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const cleaned = String(value ?? "0").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value: unknown) {
  const raw = text(value);
  if (!raw) return new Date();

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function getActiveYear() {
  const year = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { name: true },
  });

  return year?.name || "2025-2026";
}

function getSchoolYearFromUrl(req: Request) {
  const url = new URL(req.url);

  return (
    text(url.searchParams.get("schoolYearName")) ||
    text(url.searchParams.get("anneeScolaire")) ||
    text(url.searchParams.get("year"))
  );
}

function getSchoolYearFromBody(body: any) {
  return (
    text(body?.schoolYearName) ||
    text(body?.anneeScolaire) ||
    text(body?.year)
  );
}

async function resolveSchoolYearName(value?: string) {
  return text(value) || (await getActiveYear());
}

async function getDefaultSite() {
  let site = await prisma.site.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true },
  });

  if (!site) {
    site = await prisma.site.create({
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

async function resolveSiteFromBody(body: any) {
  const siteId = Number(body?.siteId || 0);
  const siteName = text(body?.site || body?.siteName);
  const siteCode = text(body?.siteCode);

  if (siteId) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  if (siteCode) {
    const site = await prisma.site.findUnique({
      where: { code: siteCode },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  if (siteName) {
    const site = await prisma.site.findFirst({
      where: { name: siteName },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  return getDefaultSite();
}

async function resolveSiteFromUrl(req: Request) {
  const url = new URL(req.url);

  return resolveSiteFromBody({
    siteId: url.searchParams.get("siteId"),
    site: url.searchParams.get("site"),
    siteName: url.searchParams.get("siteName"),
    siteCode: url.searchParams.get("siteCode"),
  });
}

function normalizeMovementType(value: any) {
  const raw = text(value).toUpperCase();

  if (
    raw === "DEBIT" ||
    raw === "SORTIE" ||
    raw === "DEPENSE" ||
    raw === "DÉPENSE"
  ) {
    return "SORTIE";
  }

  if (
    raw === "CREDIT" ||
    raw === "ENTREE" ||
    raw === "ENTRÉE" ||
    raw === "RECETTE"
  ) {
    return "ENTREE";
  }

  return "ENTREE";
}

function normalizeCategory(value: any, movementType: string) {
  const raw = text(value).toUpperCase();

  if (raw) return raw;

  return movementType === "SORTIE" ? "SORTIE_MANUELLE" : "ENTREE_MANUELLE";
}

function getAmountFromBody(body: any) {
  const movementType = normalizeMovementType(
    body?.movementType || body?.type || body?.operation || body?.sens || body?.nature
  );

  if (movementType === "SORTIE") {
    return (
      toNumber(body?.amount) ||
      toNumber(body?.montant) ||
      toNumber(body?.debit)
    );
  }

  return (
    toNumber(body?.amount) ||
    toNumber(body?.montant) ||
    toNumber(body?.credit)
  );
}

function modelFieldMetas(modelName: string) {
  const runtimeModel = (prisma as any)?._runtimeDataModel?.models?.[modelName];
  return runtimeModel?.fields || [];
}

function modelFieldNames(modelName: string) {
  return modelFieldMetas(modelName).map((field: any) => field.name) as string[];
}

function modelHasField(modelName: string, fieldName: string) {
  return modelFieldNames(modelName).includes(fieldName);
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

function getRelationInclude(modelName: string) {
  const include: any = {};

  if (modelHasField(modelName, "treasury")) include.treasury = true;

  if (modelHasField(modelName, "student")) {
    include.student = {
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenoms: true,
        classe: true,
        section: true,
      },
    };
  }

  if (modelHasField(modelName, "studentFee")) {
    include.studentFee = {
      select: {
        id: true,
        libelle: true,
        code: true,
        montantTotal: true,
        montantPaye: true,
        reste: true,
        status: true,
        studentId: true,
        trainingFeeId: true,
      },
    };
  }

  if (modelHasField(modelName, "trainingFee")) {
    include.trainingFee = {
      select: {
        id: true,
        libelle: true,
        code: true,
        montant: true,
      },
    };
  }

  return include;
}

async function getStudentInfo(studentId: number) {
  if (!studentId) return null;

  try {
    return await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenoms: true,
        classe: true,
        section: true,
      },
    });
  } catch {
    return null;
  }
}

function buildStudentName(student: any, body: any = {}) {
  return (
    text(body.studentName) ||
    text(body.nomComplet) ||
    `${text(student?.nom)} ${text(student?.prenoms)}`.trim() ||
    "-"
  );
}

function buildStudentMatricule(student: any, body: any = {}) {
  return text(body.studentMatricule || body.matricule) || text(student?.matricule) || "-";
}

function buildStudentClasse(student: any, body: any = {}) {
  const direct =
    text(body.studentClassLabel) ||
    text(body.studentClasse) ||
    text(body.studentClass) ||
    text(body.className);

  if (direct) return direct;

  const classe = text(student?.classe);
  const section = text(student?.section);

  if (!classe && !section) return "-";
  return `${classe || "-"}${section ? ` / ${section}` : ""}`;
}

function buildFeeCode(body: any = {}, movement: any = {}) {
  return (
    text(body.feeCode) ||
    text(body.code) ||
    text(body.studentFee?.code) ||
    text(body.trainingFee?.code) ||
    text(movement.studentFee?.code) ||
    text(movement.trainingFee?.code) ||
    ""
  );
}

function buildFeeLabel(body: any = {}, movement: any = {}) {
  return (
    text(body.feeLabel) ||
    text(body.feeLibelle) ||
    text(body.libelleFrais) ||
    text(body.studentFee?.libelle) ||
    text(body.trainingFee?.libelle) ||
    text(movement.studentFee?.libelle) ||
    text(movement.trainingFee?.libelle) ||
    ""
  );
}

function buildMotifOnly(body: any, movementType: string, category: string) {
  const normalizedCategory = text(category).toUpperCase();
  const feeCode = buildFeeCode(body);
  const feeLabel = buildFeeLabel(body);

  if (normalizedCategory === "PAIEMENT_FRAIS") {
    return feeCode
      ? `Paiement frais de formation - ${feeCode}`
      : feeLabel
        ? `Paiement frais de formation - ${feeLabel}`
        : "Paiement frais de formation";
  }

  if (normalizedCategory === "ANNULATION_PAIEMENT_FRAIS") {
    return feeCode
      ? `Annulation frais de formation - ${feeCode}`
      : feeLabel
        ? `Annulation frais de formation - ${feeLabel}`
        : "Annulation frais de formation";
  }

  return (
    text(body.motif) ||
    text(body.description) ||
    text(body.libelle) ||
    text(body.label) ||
    (movementType === "SORTIE" ? "Sortie manuelle" : "Entrée manuelle")
  );
}

function addMovementStudentData(data: any, student: any, body: any = {}) {
  const studentName = buildStudentName(student, body);
  const studentMatricule = buildStudentMatricule(student, body);
  const studentClasse = buildStudentClasse(student, body);

  if (modelHasField("TreasuryMovement", "studentName")) data.studentName = studentName;
  if (modelHasField("TreasuryMovement", "studentMatricule")) data.studentMatricule = studentMatricule;
  if (modelHasField("TreasuryMovement", "studentClasse")) data.studentClasse = studentClasse;
  if (modelHasField("TreasuryMovement", "studentClassLabel")) data.studentClassLabel = studentClasse;
  if (modelHasField("TreasuryMovement", "studentSection")) {
    data.studentSection = text(body.studentSection) || text(student?.section) || null;
  }

  const feeCode = buildFeeCode(body);
  const feeLabel = buildFeeLabel(body);

  if (feeCode && modelHasField("TreasuryMovement", "feeCode")) data.feeCode = feeCode;
  if (feeLabel && modelHasField("TreasuryMovement", "feeLabel")) data.feeLabel = feeLabel;

  return data;
}

function formatMovementForClient(movement: any) {
  const type = normalizeMovementType(movement?.movementType);
  const amount = Number(movement?.amount || 0);

  const studentName =
    text(movement?.studentName) ||
    `${text(movement?.student?.nom)} ${text(movement?.student?.prenoms)}`.trim() ||
    "-";

  const studentMatricule =
    text(movement?.studentMatricule) ||
    text(movement?.student?.matricule) ||
    "-";

  const classe = text(movement?.studentClasse) || text(movement?.student?.classe);
  const section = text(movement?.studentSection) || text(movement?.student?.section);
  const studentClassLabel =
    text(movement?.studentClassLabel) ||
    (classe || section ? `${classe || "-"}${section ? ` / ${section}` : ""}` : "-");

  const feeCode =
    text(movement?.feeCode) ||
    text(movement?.studentFee?.code) ||
    text(movement?.trainingFee?.code) ||
    "";

  const feeLabel =
    text(movement?.feeLabel) ||
    text(movement?.studentFee?.libelle) ||
    text(movement?.trainingFee?.libelle) ||
    "";

  const category = text(movement?.category).toUpperCase();
  const motif =
    category === "PAIEMENT_FRAIS"
      ? feeCode
        ? `Paiement frais de formation - ${feeCode}`
        : feeLabel
          ? `Paiement frais de formation - ${feeLabel}`
          : "Paiement frais de formation"
      : category === "ANNULATION_PAIEMENT_FRAIS"
        ? feeCode
          ? `Annulation frais de formation - ${feeCode}`
          : feeLabel
            ? `Annulation frais de formation - ${feeLabel}`
            : "Annulation frais de formation"
        : text(movement?.motif || movement?.description || movement?.libelle);

  return {
    ...movement,
    type: type === "SORTIE" ? "DEBIT" : "CREDIT",
    debit: type === "SORTIE" ? amount : 0,
    credit: type === "ENTREE" ? amount : 0,
    montant: amount,

    // Champs propres pour la page Trésorerie mouvements
    studentName,
    studentMatricule,
    studentClasse: classe || "-",
    studentSection: section || "",
    studentClassLabel,
    feeCode,
    feeLabel,
    motif,
    libelle: motif,
    description: motif,
  };
}

async function findTreasury({
  treasuryId,
  treasuryName,
  schoolYearName,
  site,
}: {
  treasuryId?: number;
  treasuryName?: string;
  schoolYearName: string;
  site: any;
}) {
  const id = Number(treasuryId || 0);
  const name = text(treasuryName);

  // Correction mouvement manuel:
  // Ny ID treasury dia unique ao amin'ny base, ka raha voafidy amin'ny dropdown ilay id
  // dia tsy tokony hosakanana amin'ny filtre site/year tery loatra.
  // Izay no niteraka: "Trésorerie obligatoire ou introuvable..."
  if (id) {
    const byId = await prisma.treasury.findUnique({
      where: { id },
    });

    if (byId) return byId;
  }

  // Fallback par nom, raha tsy tonga ny id fa tonga ny anarana.
  if (name) {
    const byName = await prisma.treasury.findFirst({
      where: {
        name,
        active: true,
      },
      orderBy: { id: "asc" },
    });

    if (byName) return byName;
  }

  // Fallback principal amin'ny site/year raha mbola tsy hita.
  const fallbackWhere: any = { active: true };

  if (modelHasField("Treasury", "schoolYearName")) {
    fallbackWhere.schoolYearName = schoolYearName;
  }

  addSiteWhere("Treasury", fallbackWhere, site);

  let principal = await prisma.treasury.findFirst({
    where: {
      ...fallbackWhere,
      isPrincipal: true,
    },
    orderBy: { id: "asc" },
  });

  if (principal) return principal;

  const fallback = await prisma.treasury.findFirst({
    where: fallbackWhere,
    orderBy: { id: "asc" },
  });

  if (fallback) return fallback;

  // Dernier fallback global raha tsy mitovy site/year ny ancien trésorerie.
  principal = await prisma.treasury.findFirst({
    where: { active: true, isPrincipal: true },
    orderBy: { id: "asc" },
  });

  if (principal) return principal;

  return prisma.treasury.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
  });
}

function computeTotals(movements: any[]) {
  let totalCredit = 0;
  let totalDebit = 0;

  for (const movement of movements) {
    const type = normalizeMovementType(movement?.movementType);
    const amount = Number(movement?.amount || 0);

    if (type === "SORTIE") {
      totalDebit += amount;
    } else {
      totalCredit += amount;
    }
  }

  const solde = totalCredit - totalDebit;

  return {
    totalCredit,
    totalDebit,
    solde,
    balance: solde,
    soldeReel: solde,
    isNegative: solde < 0,
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);

    const schoolYearName = await resolveSchoolYearName(getSchoolYearFromUrl(req));
    const site = await resolveSiteFromUrl(req);

    const treasuryId = Number(url.searchParams.get("treasuryId") || 0);
    const studentId = Number(url.searchParams.get("studentId") || 0);
    const trainingFeeId = Number(url.searchParams.get("trainingFeeId") || 0);
    const studentFeeId = Number(url.searchParams.get("studentFeeId") || 0);
    const movementType = text(url.searchParams.get("movementType"));
    const category = text(url.searchParams.get("category"));
    const q = text(url.searchParams.get("q"));

    const dateFrom = text(url.searchParams.get("dateFrom") || url.searchParams.get("from"));
    const dateTo = text(url.searchParams.get("dateTo") || url.searchParams.get("to"));

    const where: any = {
      schoolYearName,
    };

    addSiteWhere("TreasuryMovement", where, site);

    if (treasuryId) where.treasuryId = treasuryId;
    if (studentId) where.studentId = studentId;
    if (trainingFeeId) where.trainingFeeId = trainingFeeId;
    if (studentFeeId) where.studentFeeId = studentFeeId;
    if (movementType) where.movementType = normalizeMovementType(movementType);
    if (category) where.category = category;

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
      }
    }

    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const movements = await prisma.treasuryMovement.findMany({
      where,
      include: getRelationInclude("TreasuryMovement"),
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    const formatted = movements.map(formatMovementForClient);
    const totals = computeTotals(movements);

    return NextResponse.json({
      movements: formatted,
      treasuryMovements: formatted,
      data: formatted,
      totals,
      siteId: site.id,
      site: site.name,
      siteCode: site.code,
      schoolYearName,
      anneeScolaire: schoolYearName,
    });
  } catch (error: any) {
    console.error("GET /api/treasury-movements:", error);

    return NextResponse.json(
      {
        error: "Erreur serveur",
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
    const body = await req.json();

    const schoolYearName = await resolveSchoolYearName(getSchoolYearFromBody(body));
    const site = await resolveSiteFromBody(body);

    const treasuryId = Number(body.treasuryId || body.tresorerieId || 0);
    const treasuryName = text(body.treasuryName || body.tresorerie || body.treasury || body.caisse);

    const treasury = await findTreasury({
      treasuryId,
      treasuryName,
      schoolYearName,
      site,
    });

    if (!treasury) {
      return NextResponse.json(
        { error: "Trésorerie obligatoire ou introuvable pour cette année scolaire et ce site" },
        { status: 400 }
      );
    }

    const movementType = normalizeMovementType(
      body.movementType || body.type || body.operation || body.sens || body.nature
    );
    const category = normalizeCategory(body.category, movementType);
    const amount = getAmountFromBody(body);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Montant obligatoire" },
        { status: 400 }
      );
    }

    const studentId = Number(body.studentId || 0) || null;
    const student = studentId ? await getStudentInfo(studentId) : null;
    const motifOnly = buildMotifOnly(body, movementType, category);

    const reference = text(body.reference || body.ref || body.idempotencyKey || "");

    if (reference) {
      const existingWhere: any = {
        treasuryId: treasury.id,
        schoolYearName,
        reference,
      };

      addSiteWhere("TreasuryMovement", existingWhere, site);

      const existing = await prisma.treasuryMovement.findFirst({
        where: existingWhere,
        orderBy: { id: "desc" },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          movement: formatMovementForClient(existing),
          data: formatMovementForClient(existing),
          siteId: site.id,
          site: site.name,
          schoolYearName,
        });
      }
    }

    const data: any = {
      treasuryId: treasury.id,
      movementType,
      category,
      amount,
      description: motifOnly,
      reference: reference || null,
      studentId,
      trainingFeeId: Number(body.trainingFeeId || 0) || null,
      studentFeeId: Number(body.studentFeeId || 0) || null,
      schoolYearName,
      createdBy: user?.email || user?.name || null,
      createdAt: safeDate(body.createdAt || body.date || body.datePaiement || body.paymentDate),
    };

    if (modelHasField("TreasuryMovement", "motif")) data.motif = motifOnly;
    if (modelHasField("TreasuryMovement", "libelle")) data.libelle = motifOnly;
    if (modelHasField("TreasuryMovement", "debit")) data.debit = movementType === "SORTIE" ? amount : 0;
    if (modelHasField("TreasuryMovement", "credit")) data.credit = movementType === "ENTREE" ? amount : 0;

    addMovementStudentData(data, student, body);
    addSiteData("TreasuryMovement", data, site);

    const movement = await prisma.treasuryMovement.create({
      data,
      include: getRelationInclude("TreasuryMovement"),
    });

    return NextResponse.json(
      {
        success: true,
        movement: formatMovementForClient(movement),
        data: formatMovementForClient(movement),
        siteId: site.id,
        site: site.name,
        schoolYearName,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/treasury-movements:", error);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const id = Number(body.id || 0);
    const schoolYearName = await resolveSchoolYearName(getSchoolYearFromBody(body));
    const site = await resolveSiteFromBody(body);

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    const where: any = {
      id,
      schoolYearName,
    };

    addSiteWhere("TreasuryMovement", where, site);

    const current = await prisma.treasuryMovement.findFirst({
      where,
      include: getRelationInclude("TreasuryMovement"),
    });

    if (!current) {
      return NextResponse.json(
        { error: "Mouvement introuvable pour cette année scolaire et ce site" },
        { status: 404 }
      );
    }

    const movementType = normalizeMovementType(
      body.movementType || body.type || current.movementType
    );
    const category = normalizeCategory(body.category || current.category, movementType);

    const amount =
      body.amount !== undefined ||
      body.montant !== undefined ||
      body.credit !== undefined ||
      body.debit !== undefined
        ? getAmountFromBody({ ...body, movementType })
        : Number(current.amount || 0);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Montant obligatoire" },
        { status: 400 }
      );
    }

    const nextStudentId =
      body.studentId !== undefined
        ? Number(body.studentId || 0) || null
        : current.studentId;

    const student = nextStudentId ? await getStudentInfo(Number(nextStudentId)) : current.student || null;
    const motifOnly = buildMotifOnly(
      {
        ...body,
        feeCode: body.feeCode || (current as any).feeCode || (current as any).studentFee?.code || (current as any).trainingFee?.code,
        feeLabel: body.feeLabel || (current as any).feeLabel || (current as any).studentFee?.libelle || (current as any).trainingFee?.libelle,
        description: body.description ?? current.description,
        libelle: body.libelle ?? (current as any).libelle,
        motif: body.motif ?? (current as any).motif,
      },
      movementType,
      category
    );

    const updateData: any = {
      movementType,
      category,
      amount,
      description: motifOnly,
      reference: text(body.reference ?? current.reference ?? "") || null,
      studentId: nextStudentId,
      trainingFeeId:
        body.trainingFeeId !== undefined
          ? Number(body.trainingFeeId || 0) || null
          : current.trainingFeeId,
      studentFeeId:
        body.studentFeeId !== undefined
          ? Number(body.studentFeeId || 0) || null
          : current.studentFeeId,
      schoolYearName,
      createdAt:
        body.createdAt || body.date || body.datePaiement || body.paymentDate
          ? safeDate(body.createdAt || body.date || body.datePaiement || body.paymentDate)
          : current.createdAt,
    };

    if (modelHasField("TreasuryMovement", "motif")) updateData.motif = motifOnly;
    if (modelHasField("TreasuryMovement", "libelle")) updateData.libelle = motifOnly;
    if (modelHasField("TreasuryMovement", "debit")) updateData.debit = movementType === "SORTIE" ? amount : 0;
    if (modelHasField("TreasuryMovement", "credit")) updateData.credit = movementType === "ENTREE" ? amount : 0;

    addMovementStudentData(updateData, student, body);
    addSiteData("TreasuryMovement", updateData, site);

    const movement = await prisma.treasuryMovement.update({
      where: { id },
      data: updateData,
      include: getRelationInclude("TreasuryMovement"),
    });

    return NextResponse.json({
      success: true,
      movement: formatMovementForClient(movement),
      data: formatMovementForClient(movement),
      siteId: site.id,
      site: site.name,
      schoolYearName,
    });
  } catch (error: any) {
    console.error("PUT /api/treasury-movements:", error);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);

    const id = Number(url.searchParams.get("id") || 0);
    const schoolYearName = await resolveSchoolYearName(getSchoolYearFromUrl(req));
    const site = await resolveSiteFromUrl(req);

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    const where: any = {
      id,
      schoolYearName,
    };

    addSiteWhere("TreasuryMovement", where, site);

    const current = await prisma.treasuryMovement.findFirst({ where });

    if (!current) {
      return NextResponse.json(
        { error: "Mouvement introuvable pour cette année scolaire et ce site" },
        { status: 404 }
      );
    }

    await prisma.treasuryMovement.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      deleted: true,
      siteId: site.id,
      site: site.name,
      schoolYearName,
    });
  } catch (error: any) {
    console.error("DELETE /api/treasury-movements:", error);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
