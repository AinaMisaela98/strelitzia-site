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

function getOptionalSiteIdFromUrl(req: Request) {
  const url = new URL(req.url);
  const raw = text(url.searchParams.get("siteId") || url.searchParams.get("site"));
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function buildMovementWhere(params: { treasuryId?: number; treasuryIds?: number[]; schoolYearName: string; siteId?: number | null }) {
  const where: any = {
    schoolYearName: params.schoolYearName,
  };

  if (params.treasuryId) {
    where.treasuryId = params.treasuryId;
  } else if (params.treasuryIds) {
    where.treasuryId = { in: params.treasuryIds };
  }

  if (params.siteId) {
    where.siteId = params.siteId;
  }

  return where;
}

async function findTreasuryMovementsSafe(where: any) {
  try {
    return await prisma.treasuryMovement.findMany({ where });
  } catch (error: any) {
    // Raha tsy mbola manana siteId ny model TreasuryMovement dia fallback tsy misy siteId.
    if (where?.siteId && String(error?.message || "").includes("siteId")) {
      const { siteId, ...fallbackWhere } = where;
      return await prisma.treasuryMovement.findMany({ where: fallbackWhere });
    }
    throw error;
  }
}

async function deleteTreasuryMovementsSafe(tx: any, where: any) {
  try {
    return await tx.treasuryMovement.deleteMany({ where });
  } catch (error: any) {
    if (where?.siteId && String(error?.message || "").includes("siteId")) {
      const { siteId, ...fallbackWhere } = where;
      return await tx.treasuryMovement.deleteMany({ where: fallbackWhere });
    }
    throw error;
  }
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

  const category = text(movement?.category || movement?.categorie || movement?.motif).toUpperCase();

  if (
    raw === "DEBIT" ||
    raw === "SORTIE" ||
    raw === "DEPENSE" ||
    raw === "DÉPENSE" ||
    raw.includes("DEBIT") ||
    raw.includes("SORTIE") ||
    category.includes("ANNULATION") ||
    category.includes("SORTIE") ||
    category.includes("DEBIT") ||
    category.includes("DÉBIT")
  ) {
    return "DEBIT";
  }

  if (
    raw === "CREDIT" ||
    raw === "ENTREE" ||
    raw === "ENTRÉE" ||
    raw === "RECETTE" ||
    raw.includes("CREDIT") ||
    raw.includes("ENTREE") ||
    raw.includes("ENTRÉE") ||
    category.includes("PAIEMENT") ||
    category.includes("CREDIT") ||
    category.includes("CRÉDIT") ||
    category.includes("ENTREE") ||
    category.includes("ENTRÉE")
  ) {
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
    const siteId = getOptionalSiteIdFromUrl(req);

    const treasuries = await prisma.treasury.findMany({
      where: { schoolYearName },
      orderBy: [{ active: "desc" }, { isPrincipal: "desc" }, { name: "asc" }],
    });

    const treasuryIds = treasuries.map((t) => t.id);

    const movements =
      treasuryIds.length > 0
        ? await findTreasuryMovementsSafe(
            buildMovementWhere({ schoolYearName, treasuryIds, siteId })
          )
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
    const siteId = getOptionalSiteIdFromUrl(req);

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

    const movementWhere = buildMovementWhere({ treasuryId: id, schoolYearName, siteId });
    const movements = await findTreasuryMovementsSafe(movementWhere);

    const balance = computeTreasuryBalance(movements);
    const soldeReel = Math.round(toNumber(balance.soldeReel));

    // Sécurité principale: raha mbola misy solde dia tsy azo supprimena.
    if (soldeReel !== 0) {
      return NextResponse.json(
        {
          error:
            "Suppression impossible: cette trésorerie contient encore un solde. Le solde doit être 0 Ar avant suppression.",
          canDelete: false,
          deleted: false,
          schoolYearName,
          siteId,
          treasury: {
            ...treasury,
            ...balance,
          },
        },
        { status: 409 }
      );
    }

    // Raha 0 Ar ny solde dia tsy manao archive intsony: suppression réelle.
    // Ny olana mahazatra dia mbola misy foreign key hafa (StudentPayment, etc.).
    // Noho izany dia esorina/afindra aloha ireo liens, dia fafàna ny movements, avy eo ny trésorerie.
    const result = await prisma.$transaction(async (tx: any) => {
      let detachedPayments = 0;
      let reassignedPayments = 0;
      let fallbackTreasuryId: number | null = null;

      // 1) Andramana esorina mivantana ny lien StudentPayment.treasuryId raha nullable.
      try {
        if (tx.studentPayment?.updateMany) {
          const detached = await tx.studentPayment.updateMany({
            where: { treasuryId: id },
            data: { treasuryId: null },
          });
          detachedPayments = Number(detached?.count || 0);
        }
      } catch (_) {
        // Raha tsy nullable ny treasuryId dia afindra amin'ny trésorerie hafa.
      }

      // 2) Raha mbola misy paiement linked na tsy nullable ilay field,
      // mamorona/mitady caisse technique inactive ao amin'ilay année scolaire.
      // Izany no manala sakana FK nefa tsy mamela ilay trésorerie supprimée hijanona.
      try {
        if (tx.studentPayment?.count && tx.studentPayment?.updateMany) {
          const remainingLinkedPayments = await tx.studentPayment.count({
            where: { treasuryId: id },
          });

          if (remainingLinkedPayments > 0) {
            let fallbackTreasury = await tx.treasury.findFirst({
              where: {
                schoolYearName,
                NOT: { id },
              },
              orderBy: [{ active: "desc" }, { isPrincipal: "desc" }, { id: "asc" }],
            });

            if (!fallbackTreasury) {
              fallbackTreasury = await tx.treasury.create({
                data: {
                  name: `Archive technique ${schoolYearName}`,
                  type: "CAISSE",
                  active: false,
                  isPrincipal: false,
                  schoolYearName,
                },
              });
            }

            fallbackTreasuryId = Number(fallbackTreasury.id);

            const reassigned = await tx.studentPayment.updateMany({
              where: { treasuryId: id },
              data: { treasuryId: fallbackTreasury.id },
            });
            reassignedPayments = Number(reassigned?.count || 0);
          }
        }
      } catch (_) {
        // Raha tsy misy StudentPayment na tsy mitovy schema dia tsy atao erreur eto.
      }

      // 3) Fafana aloha ny mouvements satria izy ireo no relation principale.
      const deletedMovements = await deleteTreasuryMovementsSafe(tx, movementWhere);

      // 4) Fafana ilay trésorerie. Raha mbola misy relation hafa tsy fantatra,
      // io no hamoaka erreur mazava ka mora fantarina ilay model mampisakana.
      await tx.treasury.delete({
        where: { id },
      });

      return {
        deletedMovements: Number(deletedMovements?.count || 0),
        detachedPayments,
        reassignedPayments,
        fallbackTreasuryId,
      };
    });

    return NextResponse.json({
      ok: true,
      deleted: true,
      archived: false,
      canDelete: true,
      message: "Trésorerie supprimée avec succès parce que le solde est 0 Ar.",
      schoolYearName,
      siteId,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Suppression impossible malgré solde 0 Ar",
        message: error?.message || String(error),
        conseil:
          "Il reste probablement une relation obligatoire vers Treasury dans le schema Prisma. Envoyez-moi ce message d'erreur si cela bloque encore.",
      },
      { status: 500 }
    );
  }
}
