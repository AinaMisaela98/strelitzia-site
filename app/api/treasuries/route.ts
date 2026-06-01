import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function text(v: unknown) {
  return String(v ?? "").trim();
}

function getSchoolYearFromUrl(req: Request) {
  const url = new URL(req.url);
  return (
    text(url.searchParams.get("schoolYearName")) ||
    text(url.searchParams.get("anneeScolaire")) ||
    text(url.searchParams.get("year")) ||
    "2025-2026"
  );
}

function getSchoolYearFromBody(body: any) {
  return (
    text(body?.schoolYearName) ||
    text(body?.anneeScolaire) ||
    text(body?.year) ||
    "2025-2026"
  );
}

function toNumber(value: unknown) {
  const cleaned = String(value ?? "0").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMovementType(movement: any) {
  const raw = text(
    movement?.type ||
      movement?.movementType ||
      movement?.operation ||
      movement?.sens ||
      movement?.nature
  ).toUpperCase();

  if (raw === "DEBIT" || raw === "SORTIE" || raw === "DEPENSE" || raw === "DÉPENSE") {
    return "DEBIT";
  }

  if (raw === "CREDIT" || raw === "ENTREE" || raw === "ENTRÉE" || raw === "RECETTE") {
    return "CREDIT";
  }

  // Sécurité: raha tsy mazava ny type dia jerena aloha debit/credit.
  if (toNumber(movement?.debit) > 0) return "DEBIT";
  if (toNumber(movement?.credit) > 0) return "CREDIT";

  return "CREDIT";
}

function getMovementAmount(movement: any) {
  const type = normalizeMovementType(movement);

  if (type === "DEBIT") {
    return (
      toNumber(movement?.debit) ||
      toNumber(movement?.amount) ||
      toNumber(movement?.montant)
    );
  }

  return (
    toNumber(movement?.credit) ||
    toNumber(movement?.amount) ||
    toNumber(movement?.montant)
  );
}

function computeTreasuryBalance(movements: any[]) {
  let totalCredit = 0;
  let totalDebit = 0;

  for (const movement of movements) {
    const type = normalizeMovementType(movement);
    const amount = getMovementAmount(movement);

    if (type === "DEBIT") {
      totalDebit += amount;
    } else {
      totalCredit += amount;
    }
  }

  const soldeReel = totalCredit - totalDebit;

  return {
    totalCredit,
    totalDebit,
    soldeReel,
    balance: soldeReel,
    solde: soldeReel,
    isNegative: soldeReel < 0,
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const schoolYearName = getSchoolYearFromUrl(req);

    const treasuries = await prisma.treasury.findMany({
      where: { schoolYearName },
      orderBy: [{ active: "desc" }, { isPrincipal: "desc" }, { name: "asc" }],
    });

    const treasuryIds = treasuries.map((t) => t.id);

    const movements =
      treasuryIds.length > 0
        ? await prisma.treasuryMovement.findMany({
            where: {
              schoolYearName,
              treasuryId: { in: treasuryIds },
            },
          })
        : [];

    const balanceByTreasury = new Map<number, ReturnType<typeof computeTreasuryBalance>>();

    for (const treasury of treasuries) {
      const treasuryMovements = movements.filter(
        (movement: any) => Number(movement.treasuryId) === Number(treasury.id)
      );

      balanceByTreasury.set(treasury.id, computeTreasuryBalance(treasuryMovements));
    }

    const treasuriesWithRealBalance = treasuries.map((treasury) => {
      const balance = balanceByTreasury.get(treasury.id) || {
        totalCredit: 0,
        totalDebit: 0,
        soldeReel: 0,
        balance: 0,
        solde: 0,
        isNegative: false,
      };

      return {
        ...treasury,
        ...balance,
      };
    });

    const globalTotals = computeTreasuryBalance(movements);

    return NextResponse.json({
      treasuries: treasuriesWithRealBalance,
      totals: globalTotals,
      schoolYearName,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
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
    const name = text(body.name);
    const type = text(body.type || "CAISSE").toUpperCase();
    const schoolYearName = getSchoolYearFromBody(body);
    const active = body.active !== false;
    const isPrincipal = body.isPrincipal === true;

    if (!name) {
      return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
    }

    if (!schoolYearName) {
      return NextResponse.json({ error: "Année scolaire obligatoire" }, { status: 400 });
    }

    const existing = await prisma.treasury.findFirst({
      where: {
        name,
        schoolYearName,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `La trésorerie "${name}" existe déjà pour ${schoolYearName}` },
        { status: 409 }
      );
    }

    if (isPrincipal) {
      await prisma.treasury.updateMany({
        where: { schoolYearName },
        data: { isPrincipal: false },
      });
    }

    const treasury = await prisma.treasury.create({
      data: {
        name,
        type,
        active,
        isPrincipal,
        schoolYearName,
      },
    });

    return NextResponse.json(
      {
        treasury: {
          ...treasury,
          totalCredit: 0,
          totalDebit: 0,
          soldeReel: 0,
          balance: 0,
          solde: 0,
          isNegative: false,
        },
        schoolYearName,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
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
    const id = Number(body.id);
    const name = text(body.name);
    const type = text(body.type || "CAISSE").toUpperCase();
    const schoolYearName = getSchoolYearFromBody(body);
    const active = body.active !== false;
    const isPrincipal = body.isPrincipal === true;

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
    }

    const current = await prisma.treasury.findFirst({
      where: {
        id,
        schoolYearName,
      },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Trésorerie introuvable pour cette année scolaire" },
        { status: 404 }
      );
    }

    const duplicate = await prisma.treasury.findFirst({
      where: {
        name,
        schoolYearName,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `La trésorerie "${name}" existe déjà pour ${schoolYearName}` },
        { status: 409 }
      );
    }

    if (isPrincipal) {
      await prisma.treasury.updateMany({
        where: {
          schoolYearName,
          NOT: { id },
        },
        data: { isPrincipal: false },
      });
    }

    const treasury = await prisma.treasury.update({
      where: { id },
      data: {
        name,
        type,
        active,
        isPrincipal,
        schoolYearName,
      },
    });

    const movements = await prisma.treasuryMovement.findMany({
      where: {
        treasuryId: id,
        schoolYearName,
      },
    });

    const balance = computeTreasuryBalance(movements);

    return NextResponse.json({
      treasury: {
        ...treasury,
        ...balance,
      },
      schoolYearName,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
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
    const id = Number(url.searchParams.get("id"));
    const schoolYearName = getSchoolYearFromUrl(req);

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    const treasury = await prisma.treasury.findFirst({
      where: {
        id,
        schoolYearName,
      },
    });

    if (!treasury) {
      return NextResponse.json(
        { error: "Trésorerie introuvable pour cette année scolaire" },
        { status: 404 }
      );
    }

    const movements = await prisma.treasuryMovement.count({
      where: {
        treasuryId: id,
        schoolYearName,
      },
    });

    if (movements > 0) {
      await prisma.treasury.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({ ok: true, archived: true, schoolYearName });
    }

    await prisma.treasury.delete({ where: { id } });

    return NextResponse.json({ ok: true, deleted: true, schoolYearName });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
