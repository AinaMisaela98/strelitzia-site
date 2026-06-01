import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function amountToNumber(value: unknown) {
  const n = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(n) ? n : 0;
}

function safeDate(value: unknown) {
  const raw = text(value);
  if (!raw) return new Date();

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function getActiveSchoolYear() {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { name: true },
  });

  return activeYear?.name || "2025-2026";
}

async function resolveSchoolYear(input?: unknown) {
  return text(input) || (await getActiveSchoolYear());
}

function makeStudentLabel(student?: any | null) {
  if (!student) return "-";
  return `${student.nom || ""} ${student.prenoms || ""}`.trim() || "-";
}

function makeFeeLabel(fee?: any | null, movement?: any | null) {
  if (fee?.libelle && fee?.code) return `${fee.code} - ${fee.libelle}`;
  if (fee?.libelle) return fee.libelle;
  if (fee?.code) return fee.code;

  const desc = text(movement?.description);
  if (desc) return desc;

  return "-";
}

async function findTreasury({
  treasuryId,
  treasuryName,
  schoolYearName,
}: {
  treasuryId?: number;
  treasuryName?: string;
  schoolYearName: string;
}) {
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

async function enrichMovements(rawMovements: any[]) {
  const studentIds = new Set<number>();
  const studentFeeIds = new Set<number>();
  const trainingFeeIds = new Set<number>();

  for (const movement of rawMovements) {
    if (movement.studentId) studentIds.add(Number(movement.studentId));
    if (movement.studentFeeId) studentFeeIds.add(Number(movement.studentFeeId));
    if (movement.trainingFeeId) trainingFeeIds.add(Number(movement.trainingFeeId));
  }

  const studentFees = studentFeeIds.size
    ? await prisma.studentFee.findMany({
        where: {
          id: { in: Array.from(studentFeeIds) },
        },
        select: {
          id: true,
          studentId: true,
          trainingFeeId: true,
          schoolYearName: true,
          libelle: true,
          code: true,
          montantTotal: true,
          montantPaye: true,
          reste: true,
          status: true,
          paidAt: true,
        },
      })
    : [];

  const studentFeeMap = new Map(studentFees.map((item) => [Number(item.id), item]));

  for (const movement of rawMovements) {
    const fee = movement.studentFeeId
      ? studentFeeMap.get(Number(movement.studentFeeId))
      : null;

    if (fee?.studentId) studentIds.add(Number(fee.studentId));
    if (fee?.trainingFeeId) trainingFeeIds.add(Number(fee.trainingFeeId));
  }

  const movementsSchoolYears = Array.from(
    new Set(rawMovements.map((m) => text(m.schoolYearName)).filter(Boolean))
  );

  const students = studentIds.size
    ? await prisma.student.findMany({
        where: {
          id: { in: Array.from(studentIds) },
          ...(movementsSchoolYears.length === 1
            ? { anneeScolaire: movementsSchoolYears[0] }
            : {}),
        },
        select: {
          id: true,
          matricule: true,
          nom: true,
          prenoms: true,
          classe: true,
          section: true,
          anneeScolaire: true,
        },
      })
    : [];

  const trainingFees = trainingFeeIds.size
    ? await prisma.trainingFee.findMany({
        where: {
          id: { in: Array.from(trainingFeeIds) },
          ...(movementsSchoolYears.length === 1
            ? { schoolYearName: movementsSchoolYears[0] }
            : {}),
        },
        select: {
          id: true,
          libelle: true,
          code: true,
          montant: true,
          classe: true,
          schoolYearName: true,
        },
      })
    : [];

  const studentMap = new Map(students.map((student) => [Number(student.id), student]));
  const trainingFeeMap = new Map(trainingFees.map((fee) => [Number(fee.id), fee]));

  return rawMovements.map((movement) => {
    const studentFee = movement.studentFeeId
      ? studentFeeMap.get(Number(movement.studentFeeId))
      : null;

    const trainingFeeId = Number(
      movement.trainingFeeId || studentFee?.trainingFeeId || 0
    );

    const trainingFee = trainingFeeId ? trainingFeeMap.get(trainingFeeId) : null;

    const finalStudentId = Number(movement.studentId || studentFee?.studentId || 0);
    const student = finalStudentId ? studentMap.get(finalStudentId) : null;

    const feeCode = studentFee?.code || trainingFee?.code || "";
    const feeLibelle = studentFee?.libelle || trainingFee?.libelle || "";
    const feeLabel = makeFeeLabel(studentFee || trainingFee, movement);

    return {
      ...movement,
      studentId: finalStudentId || movement.studentId || null,
      student,
      studentName: makeStudentLabel(student),
      studentMatricule: student?.matricule || "-",
      studentClasse: student?.classe || "-",
      studentSection: student?.section || "-",
      studentLabel: student
        ? `${student.matricule || "-"} - ${makeStudentLabel(student)}`
        : "-",
      trainingFeeId: trainingFeeId || null,
      studentFee,
      trainingFee,
      feeCode,
      feeLibelle,
      feeLabel,
      treasuryName: movement.treasury?.name || "-",
      treasuryType: movement.treasury?.type || "-",
      amount: Number(movement.amount || 0),
    };
  });
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);

    const schoolYearName = await resolveSchoolYear(
      url.searchParams.get("schoolYearName") ||
        url.searchParams.get("anneeScolaire") ||
        url.searchParams.get("year")
    );

    const treasuryId = Number(url.searchParams.get("treasuryId") || 0);
    const studentId = Number(url.searchParams.get("studentId") || 0);
    const studentFeeId = Number(url.searchParams.get("studentFeeId") || 0);
    const trainingFeeId = Number(url.searchParams.get("trainingFeeId") || 0);
    const movementType = text(url.searchParams.get("movementType")).toUpperCase();
    const category = text(url.searchParams.get("category"));
    const q = text(url.searchParams.get("q")).toLowerCase();

    const limitParam = Number(url.searchParams.get("limit") || 200);
    const limit = Math.min(Math.max(limitParam || 200, 1), 1000);

    const movements = await prisma.treasuryMovement.findMany({
      where: {
        schoolYearName,
        ...(treasuryId ? { treasuryId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(studentFeeId ? { studentFeeId } : {}),
        ...(trainingFeeId ? { trainingFeeId } : {}),
        ...(movementType ? { movementType } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        treasury: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    let rows = await enrichMovements(movements);

    if (q) {
      rows = rows.filter((row) => {
        const haystack = [
          row.reference,
          row.description,
          row.category,
          row.movementType,
          row.treasuryName,
          row.studentName,
          row.studentMatricule,
          row.studentClasse,
          row.studentSection,
          row.feeCode,
          row.feeLibelle,
          row.feeLabel,
          row.createdBy,
        ]
          .map((item) => text(item).toLowerCase())
          .join(" ");

        return haystack.includes(q);
      });
    }

    const totalEntree = rows
      .filter((row) => row.movementType === "ENTREE")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const totalSortie = rows
      .filter((row) => row.movementType === "SORTIE")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return NextResponse.json({
      movements: rows,
      rows,
      totals: {
        totalEntree,
        totalSortie,
        solde: totalEntree - totalSortie,
        soldeGlobal: totalEntree - totalSortie,
      },
      schoolYearName,
    });
  } catch (error: any) {
    console.error("TREASURY_MOVEMENTS_GET_ERROR", error);
    return NextResponse.json(
      {
        error: "Erreur chargement mouvements trésorerie",
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

    const schoolYearName = await resolveSchoolYear(
      body.schoolYearName || body.anneeScolaire || body.year
    );

    const treasuryId = Number(body.treasuryId || body.tresorerieId || 0);
    const treasuryName = text(
      body.treasuryName || body.tresorerie || body.treasury || body.caisse
    );

    const treasury = await findTreasury({
      treasuryId,
      treasuryName,
      schoolYearName,
    });

    if (!treasury) {
      return NextResponse.json(
        {
          error:
            "Trésorerie obligatoire ou introuvable pour cette année scolaire.",
        },
        { status: 400 }
      );
    }

   const rawMovementType = text(
  body.movementType || body.type
).toUpperCase();

let movementType = "CREDIT";

if (
  rawMovementType === "DEBIT" ||
  rawMovementType === "SORTIE" ||
  rawMovementType === "DEPENSE"
) {
  movementType = "DEBIT";
}

if (
  rawMovementType === "CREDIT" ||
  rawMovementType === "ENTREE" ||
  rawMovementType === "RECETTE"
) {
  movementType = "CREDIT";
}
    const amount = amountToNumber(body.amount || body.montant);
    const category = text(body.category || body.categorie || "AUTRE").toUpperCase();
    const description = text(body.description || body.motif || body.note);
    const reference =
      text(body.reference) ||
      `${movementType}-${treasury.id}-${Date.now()}`;

    const studentId = Number(body.studentId || 0);
    const trainingFeeId = Number(body.trainingFeeId || 0);
    const studentFeeId = Number(body.studentFeeId || 0);

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          anneeScolaire: schoolYearName,
        },
        select: { id: true },
      });

      if (!student) {
        return NextResponse.json(
          { error: "Étudiant introuvable dans cette année scolaire." },
          { status: 400 }
        );
      }
    }

    if (trainingFeeId) {
      const trainingFee = await prisma.trainingFee.findFirst({
        where: {
          id: trainingFeeId,
          schoolYearName,
        },
        select: { id: true },
      });

      if (!trainingFee) {
        return NextResponse.json(
          { error: "Frais introuvable dans cette année scolaire." },
          { status: 400 }
        );
      }
    }

    if (studentFeeId) {
      const studentFee = await prisma.studentFee.findFirst({
        where: {
          id: studentFeeId,
          schoolYearName,
        },
        select: { id: true },
      });

      if (!studentFee) {
        return NextResponse.json(
          { error: "Frais étudiant introuvable dans cette année scolaire." },
          { status: 400 }
        );
      }
    }

    const duplicate = await prisma.treasuryMovement.findFirst({
      where: {
        treasuryId: treasury.id,
        schoolYearName,
        movementType,
        reference,
        ...(studentId ? { studentId } : {}),
        ...(trainingFeeId ? { trainingFeeId } : {}),
        ...(studentFeeId ? { studentFeeId } : {}),
      },
    });

    if (duplicate) {
      return NextResponse.json({
        movement: duplicate,
        duplicated: true,
        schoolYearName,
      });
    }

    const movement = await prisma.treasuryMovement.create({
      data: {
        treasuryId: treasury.id,
        movementType,
        category,
        amount,
        description: description || null,
        reference,
        studentId: studentId || null,
        trainingFeeId: trainingFeeId || null,
        studentFeeId: studentFeeId || null,
        schoolYearName,
        createdBy: user?.email || user?.name || null,
        createdAt: safeDate(body.createdAt || body.date || body.datePaiement),
      },
      include: {
        treasury: true,
      },
    });

    const [row] = await enrichMovements([movement]);

    return NextResponse.json({
      movement: row,
      success: true,
      schoolYearName,
    });
  } catch (error: any) {
    console.error("TREASURY_MOVEMENTS_POST_ERROR", error);
    return NextResponse.json(
      {
        error: "Erreur création mouvement trésorerie",
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
    const schoolYearName = await resolveSchoolYear(
      url.searchParams.get("schoolYearName") ||
        url.searchParams.get("anneeScolaire") ||
        url.searchParams.get("year")
    );

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    const existing = await prisma.treasuryMovement.findFirst({
      where: {
        id,
        schoolYearName,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Mouvement introuvable dans cette année scolaire." },
        { status: 404 }
      );
    }

    await prisma.treasuryMovement.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      deleted: true,
      schoolYearName,
    });
  } catch (error: any) {
    console.error("TREASURY_MOVEMENTS_DELETE_ERROR", error);
    return NextResponse.json(
      {
        error: "Erreur suppression mouvement trésorerie",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
